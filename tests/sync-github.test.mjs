import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

async function runFixture(responses, verify) {
	const directory = await mkdtemp(join(tmpdir(), "blog-github-"));
	try {
		await mkdir(join(directory, "scripts"));
		await mkdir(join(directory, "src", "data"), { recursive: true });
		await copyFile(new URL("../scripts/sync-github.mjs", import.meta.url), join(directory, "scripts", "sync-github.mjs"));
		const previous = '{"username":"liushuai-man","updatedAt":"old","profile":null,"repositories":[]}\n';
		const destination = join(directory, "src", "data", "github-profile.json");
		await writeFile(destination, previous);
		await writeFile(join(directory, "responses.json"), JSON.stringify(responses));
		const mock = join(directory, "mock.mjs");
		await writeFile(mock, `
import { readFileSync, writeFileSync } from 'node:fs';
const responses = JSON.parse(readFileSync(new URL('./responses.json', import.meta.url)));
const calls = [];
globalThis.fetch = async (url) => {
  calls.push(url);
  writeFileSync(new URL('./calls.json', import.meta.url), JSON.stringify(calls));
  const fixture = responses.shift();
  if (!fixture) throw new Error('Unexpected request');
  return { ok: fixture.status === 200, status: fixture.status, json: async () => fixture.body };
};
`);
		const environment = { ...process.env };
		delete environment.GITHUB_TOKEN;
		const result = spawnSync(process.execPath, ["--import", pathToFileURL(mock).href, join(directory, "scripts", "sync-github.mjs")], { env: environment, encoding: "utf8" });
		assert.ifError(result.error);
		await verify({ result, previous, contents: await readFile(destination, "utf8"), calls: JSON.parse(await readFile(join(directory, "calls.json"), "utf8")) });
	} finally {
		// This recursively removes only the verified temporary fixture created above.
		assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
		assert.ok(directory.includes("blog-github-"));
		await rm(directory, { recursive: true, force: true });
	}
}

test("failed repository refresh preserves the previous snapshot byte for byte", async () => {
	await runFixture([{ status: 200, body: { public_repos: 101, followers: 2, following: 0 } }, { status: 403 }], ({ result, contents, previous }) => {
		assert.equal(result.status, 1);
		assert.equal(contents, previous);
		assert.match(result.stderr, /previous snapshot preserved/);
	});
});

test("repository pagination, filtering and sorting produce a complete public snapshot", async () => {
	const makeRepo = (index) => ({ name: `repo-${index}`, description: "test", language: "TypeScript", fork: index === 0, archived: index === 1, stargazers_count: index, forks_count: 0, pushed_at: index === 2 ? null : "2026-10-14T00:00:00Z" });
	await runFixture([
		{ status: 200, body: { public_repos: 101, followers: 2, following: 0 } },
		{ status: 200, body: Array.from({ length: 100 }, (_, index) => makeRepo(index)) },
		{ status: 200, body: [makeRepo(100)] },
	], ({ result, contents, calls }) => {
		assert.equal(result.status, 0, result.stderr);
		const snapshot = JSON.parse(contents);
		assert.equal(snapshot.profile.publicRepos, 101);
		assert.equal(snapshot.repositories.length, 99);
		assert.equal(snapshot.repositories[0].name, "repo-100");
		assert.equal(snapshot.repositories.find((repo) => repo.name === "repo-2").updatedAt, null);
		assert.ok(!snapshot.repositories.some((repo) => ["repo-0", "repo-1"].includes(repo.name)));
		assert.match(calls[2], /page=2$/);
		assert.ok(!contents.includes("Authorization"));
	});
});

import assert from "node:assert/strict";
import test from "node:test";
import { getLanguageDistribution, selectRepositories } from "../src/utils/about-data.ts";

const repo = (name, stars = 0, updatedAt = null, language = null) =>
	({ name, stars, updatedAt, language, description: null, forks: 0 });

test("featured order, case-insensitive deduplication, missing fallback and automatic sorting", () => {
	const input = [repo("latest", 1, "2026-10-14"), repo("popular", 2), repo("blog"), repo("older", 1)];
	const original = structuredClone(input);
	const result = selectRepositories(input, [{ name: "BLOG", note: " Author note " }, { name: "blog" }, { name: "removed" }], 3);
	assert.deepEqual(result.repositories.map((item) => item.name), ["blog", "popular", "latest"]);
	assert.equal(result.repositories[0].note, "Author note");
	assert.equal(result.repositories[0].featured, true);
	assert.equal(result.repositories[1].featured, false);
	assert.deepEqual(result.missing, ["removed"]);
	assert.deepEqual(input, original);
	assert.deepEqual(selectRepositories(input, [], 0).repositories, []);
});

test("language counts use the whole snapshot and include unmarked repositories", () => {
	const result = getLanguageDistribution([repo("a", 0, null, "TypeScript"), repo("b", 0, null, "TypeScript"), repo("c")]);
	assert.equal(result[0].count, 2);
	assert.equal(result[0].share, 2 / 3);
	assert.equal(result[1].name, "未标记语言");
	assert.equal(result.reduce((sum, item) => sum + item.count, 0), 3);
	assert.deepEqual(getLanguageDistribution([]), []);
	assert.deepEqual(selectRepositories([], [{ name: "blog" }], 6), { repositories: [], missing: ["blog"] });
});

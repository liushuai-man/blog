import { readFile, writeFile, rename } from "node:fs/promises";

// Builds read the committed snapshot; refresh is explicit and optional.
const destination = new URL("../src/data/github-profile.json", import.meta.url);
const previous = JSON.parse(await readFile(destination, "utf8"));
const username = previous.username;
if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(username)) throw new Error("Invalid GitHub username");
const headers = { Accept: "application/vnd.github+json", "User-Agent": "personal-blog-snapshot" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function request(path) {
	const response = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(15000) });
	if (!response.ok) throw new Error(`GitHub responded ${response.status}`);
	return response.json();
}
try {
	const user = await request(`/users/${username}`);
	const repositories = [];
	for (let page = 1; page <= 10; page++) {
		const batch = await request(`/users/${username}/repos?per_page=100&sort=updated&page=${page}`);
		repositories.push(...batch);
		if (batch.length < 100) break;
		if (page === 10) throw new Error("Repository pagination exceeded safety bound");
	}
	const snapshot = {
		username, updatedAt: new Date().toISOString(),
		profile: { publicRepos: user.public_repos, followers: user.followers, following: user.following },
		repositories: repositories.filter((repo) => !repo.fork && !repo.archived).map((repo) => ({
			name: repo.name, description: repo.description, language: repo.language,
			stars: repo.stargazers_count, forks: repo.forks_count, updatedAt: repo.pushed_at ?? repo.updated_at ?? null,
		})).sort((a, b) => b.stars - a.stars || (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")),
	};
	const temporary = new URL("../src/data/github-profile.json.tmp", import.meta.url);
	await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
	await rename(temporary, destination);
	console.log(`GitHub snapshot refreshed: ${snapshot.repositories.length} original repositories.`);
} catch (error) {
	console.error(`GitHub refresh failed; previous snapshot preserved: ${error.message}`);
	process.exitCode = 1;
}

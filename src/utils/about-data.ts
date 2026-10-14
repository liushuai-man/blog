import type { GitHubSnapshot } from "../types/github.ts";

type Repository = GitHubSnapshot["repositories"][number];
export interface FeaturedRepository { name: string; note?: string }

export function selectRepositories(
	repositories: Repository[], featured: FeaturedRepository[], limit: number,
) {
	const sorted = [...repositories].sort((a, b) => b.stars - a.stars ||
		(b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || a.name.localeCompare(b.name));
	const selected: Array<Repository & { featured: boolean; note: string }> = [];
	const used = new Set<string>();
	const missing: string[] = [];
	for (const item of featured) {
		const key = item.name.toLowerCase();
		if (used.has(key)) continue;
		used.add(key);
		const repo = sorted.find((repo) => repo.name.toLowerCase() === key);
		if (repo) selected.push({ ...repo, featured: true, note: item.note?.trim() ?? "" });
		else missing.push(item.name);
	}
	for (const repo of sorted) {
		if (!used.has(repo.name.toLowerCase())) {
			selected.push({ ...repo, featured: false, note: "" });
			used.add(repo.name.toLowerCase());
		}
	}
	return { repositories: selected.slice(0, Math.max(0, limit)), missing };
}

// One repository contributes one count, including those with no main language.
export function getLanguageDistribution(repositories: Repository[]) {
	const counts = new Map<string, number>();
	for (const repo of repositories) {
		const name = repo.language?.trim() || "未标记语言";
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return [...counts].map(([name, count]) => ({ name, count, share: count / repositories.length }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

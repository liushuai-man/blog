export interface GitHubSnapshot {
	username: string;
	updatedAt: string | null;
	profile: { publicRepos: number; followers: number; following: number } | null;
	repositories: Array<{
		name: string;
		description: string | null;
		language: string | null;
		stars: number;
		forks: number;
		updatedAt: string | null;
	}>;
}

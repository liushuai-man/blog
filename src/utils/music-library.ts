import fs from "node:fs";
import path from "node:path";

// 音乐库曲目（构建期由 public/music/ 扫描得到）
export type MusicLibraryTrack = {
	id: string; // 稳定标识，取文件名
	name: string; // 歌曲名，默认取文件名（不含扩展名）
	artist: string; // 歌手，默认空
	url: string; // 相对于 public 目录的路径，如 /music/song.mp3
	cover?: string; // 封面图路径
	lrc?: string; // 歌词文件路径或 LRC 文本
};

const AUDIO_EXTENSIONS = [
	".mp3",
	".flac",
	".m4a",
	".aac",
	".ogg",
	".opus",
	".wav",
];
const COVER_EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg", ".avif", ".gif"];

type ManifestEntry = {
	file?: string;
	name?: string;
	artist?: string;
	cover?: string;
	lrc?: string;
};

// public/music/library.json（可选）：按文件名覆盖标题/歌手/封面/歌词
function readManifest(dir: string): Record<string, ManifestEntry> {
	const manifestPath = path.join(dir, "library.json");
	if (!fs.existsSync(manifestPath)) return {};

	try {
		const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		const list: ManifestEntry[] = Array.isArray(raw) ? raw : (raw?.tracks ?? []);
		const map: Record<string, ManifestEntry> = {};
		for (const entry of list) {
			if (entry?.file) map[entry.file] = entry;
		}
		return map;
	} catch (error) {
		console.warn("[music-library] 解析 library.json 失败，已忽略：", error);
		return {};
	}
}

// 构建期扫描 public/music/，生成音乐库曲目列表。
// 只能在服务端代码（Astro 组件的 frontmatter）里调用，不能进入客户端 bundle。
export function scanMusicLibrary(): MusicLibraryTrack[] {
	const dir = path.join(process.cwd(), "public", "music");
	if (!fs.existsSync(dir)) return [];

	const files = fs.readdirSync(dir).filter((name) => !name.startsWith("."));
	const manifest = readManifest(dir);

	const audioFiles = files
		.filter((name) => AUDIO_EXTENSIONS.includes(path.extname(name).toLowerCase()))
		.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

	return audioFiles.map((file) => {
		const ext = path.extname(file);
		const base = path.basename(file, ext);
		const override = manifest[file] ?? {};
		// 与音频同名的图片自动作为封面
		const coverFile = files.find(
			(candidate) =>
				path.basename(candidate, path.extname(candidate)) === base &&
				COVER_EXTENSIONS.includes(path.extname(candidate).toLowerCase()),
		);

		return {
			id: file,
			name: override.name || base,
			artist: override.artist || "",
			url: `/music/${encodeURIComponent(file)}`,
			cover:
				override.cover ||
				(coverFile ? `/music/${encodeURIComponent(coverFile)}` : undefined),
			lrc: override.lrc,
		};
	});
}
import type { MusicPlayerConfig } from "../types/config";

// 音乐播放器配置
export const musicPlayerConfig: MusicPlayerConfig = {
	// 禁用音乐播放器方法：
	// 模板默认侧边栏和导航栏两个都显示
	// 1. 侧边栏：在sidebarConfig.ts侧边栏配置把音乐组件enable设为false禁用即可
	// 2. 导航栏：在本配置文件把showInNavbar设为false禁用即可

	// 是否在导航栏显示音乐播放器入口
	showInNavbar: true,

	// 音乐库来源：public/music/ 下的本地音频文件（构建期自动扫描）
	mode: "local",

	// 默认音量 (0-1)
	volume: 0.7,

	// 播放模式：'list'=列表循环, 'one'=单曲循环, 'random'=随机播放
	playMode: "list",

	// 是否显启用歌词
	showLyrics: true,

	// 本地音乐配置
	// 一般情况下留空即可：直接往 public/music/ 放音频文件，重新构建后自动进库；
	// 同名图片（如 song.mp3 + song.webp）会自动作为封面；
	// 也可在 public/music/library.json 里按文件名覆盖标题/歌手/封面/歌词。
	// 若在此手动填写 playlist，则忽略自动扫描结果。
	local: {
		playlist: [],
	},
};

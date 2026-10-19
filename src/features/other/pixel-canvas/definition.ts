import { otherConfig } from "@/config/otherConfig";
import type { ToolDefinition } from "../types";
import cover from "./cover.png";

const pixelCanvas: ToolDefinition = {
	id: "pixel-canvas",
	title: "像素画布",
	badge: "MOD 02 · PIXEL CANVAS",
	description: "一格一色 · 随手画出像素灵感",
	instructions:
		"在可缩放的方格画布上点涂或滑动画画，左键填色、右键擦除。支持自动缓存、撤回和 PNG 导出。",
	cover: { src: cover, alt: "像素猫画布与彩色方块的独立生成概念插画" },
	route: "/other/pixel-canvas/",
	enabled: otherConfig.enabled && otherConfig.pixelCanvas,
	capabilities: ["keyboard", "pointer"],
};

export default pixelCanvas;

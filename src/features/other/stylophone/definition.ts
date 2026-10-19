import { otherConfig } from "@/config/otherConfig";
import cover from "./cover.png";
import type { ToolDefinition } from "../types";

const stylophone: ToolDefinition = {
	id: "stylophone",
	title: "触笔电子琴",
	badge: "MOD 01 · STYLOPHONE",
	description: "Stylophone · 点触与滑奏",
	instructions: "按住金属音片并滑动即可演奏，也可以用电脑键盘弹奏。松开触笔，声音就会停下。",
	cover: { src: cover, alt: "触笔电子琴与金属触笔的独立生成示意封面，非实物照片" },
	route: "/other/stylophone/",
	enabled: otherConfig.enabled && otherConfig.stylophone,
	capabilities: ["audio", "keyboard", "pointer"],
};

export default stylophone;

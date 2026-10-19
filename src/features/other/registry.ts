import { otherConfig } from "../../config/otherConfig";
import type { ToolDefinition } from "./types";
import type { Component } from "svelte";

export const tools: ToolDefinition[] = [{
	id: "stylophone",
	title: "触笔电子琴",
	badge: "MOD 01 · STYLOPHONE",
	description: "Stylophone · 点触与滑奏",
	route: "/other/stylophone/",
	enabled: otherConfig.enabled && otherConfig.stylophone,
	capabilities: ["audio", "keyboard", "pointer"],
	// Astro's .svelte declarations describe page props rather than Svelte's runtime signature.
	load: async () => ({ default: (await import("./stylophone/StylophoneTool.svelte")).default as unknown as Component }),
}];

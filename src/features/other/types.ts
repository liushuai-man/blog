import type { Component } from "svelte";

export interface ToolDefinition {
	id: string;
	title: string;
	badge: string;
	description: string;
	route: string;
	enabled: boolean;
	capabilities: Array<"audio" | "keyboard" | "pointer">;
	load: () => Promise<{ default: Component }>;
}

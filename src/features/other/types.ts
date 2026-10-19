import type { Component } from "svelte";
import type { ImageMetadata } from "astro";

export interface ToolDefinition {
	id: string;
	title: string;
	badge: string;
	description: string;
	instructions: string;
	cover: { src: ImageMetadata; alt: string };
	route: string;
	enabled: boolean;
	capabilities: Array<"audio" | "keyboard" | "pointer">;
}

export interface ToolController {
	pause(): void;
	reset(): void;
	dispose(): void;
	activate(): Promise<void>;
}

export interface ToolModule {
	default: Component<Record<string, never>, ToolController>;
}

export type ToolLoader = () => Promise<ToolModule>;

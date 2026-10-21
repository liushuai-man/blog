import pixelCanvas from "./pixel-canvas/definition";
import stylophone from "./stylophone/definition";
import type { ToolDefinition } from "./types";

// Only metadata belongs here; the gallery never imports a tool runtime.
export const tools: ToolDefinition[] = [stylophone, pixelCanvas];

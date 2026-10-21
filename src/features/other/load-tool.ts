import { resolveToolModule } from "./module-loader";
import type { ToolModule } from "./types";

const loaders = import.meta.glob<ToolModule>("./*/index.ts");

export function loadTool(id: string) {
	return resolveToolModule(id, loaders);
}

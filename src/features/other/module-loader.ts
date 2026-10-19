import type { ToolLoader, ToolModule } from "./types";

export async function resolveToolModule(
	id: string,
	loaders: Record<string, ToolLoader>,
): Promise<ToolModule> {
	const path = `./${id}/index.ts`;
	if (!Object.hasOwn(loaders, path)) throw new Error("Unknown tool");
	const module = await loaders[path]();
	if (typeof module?.default !== "function") throw new Error("Invalid tool module");
	return module;
}

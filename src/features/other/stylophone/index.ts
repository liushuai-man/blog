import type { ToolModule } from "../types";
import StylophoneTool from "./StylophoneTool.svelte";

// Astro's .svelte declarations describe page props rather than runtime exports.
export default StylophoneTool as unknown as ToolModule["default"];

<script lang="ts">
	import { onMount } from "svelte";
	import { loadTool } from "@/features/other/load-tool";
	import type { ToolController, ToolModule } from "@/features/other/types";
	import ToolFailure from "./ToolFailure.svelte";
	let { id }: { id: string } = $props();
	let Tool = $state<ToolModule["default"] | null>(null);
	let loadFailed = $state(false);
	let instance = $state<ToolController | undefined>();
	let disposed = false;
	let generation = 0;

	function release() {
		try { instance?.dispose(); } catch { /* A broken cleanup must not break the shell. */ }
		instance = undefined;
	}
	async function load() {
		const attempt = ++generation;
		loadFailed = false;
		release();
		Tool = null;
		try {
			const module = await loadTool(id);
			if (!disposed && generation === attempt) Tool = module.default;
		} catch { if (!disposed && generation === attempt) loadFailed = true; }
	}

	onMount(() => {
		void load();
		return () => { disposed = true; generation++; release(); };
	});
</script>

<svelte:boundary onerror={release}>
	{#if Tool}
		<Tool bind:this={instance} />
	{:else if loadFailed}
		<ToolFailure onretry={load} />
	{:else}
		<p role="status" class="p-6 text-75">正在准备模块…</p>
	{/if}
	{#snippet failed(_error, reset)}
		<ToolFailure onretry={() => { Tool = null; reset(); void load(); }} />
	{/snippet}
</svelte:boundary>

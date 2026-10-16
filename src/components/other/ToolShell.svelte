<script lang="ts">
	import { onMount } from "svelte";
	import type { Component } from "svelte";
	import { tools } from "@/features/other/registry";
	let { id }: { id: string } = $props();
	let Tool = $state<Component | null>(null);
	let failed = $state(false);
	let disposed = false;
	async function load() {
		failed = false;
		try {
			const definition = tools.find((tool) => tool.id === id && tool.enabled);
			if (!definition) throw new Error("Tool disabled");
			const module = await definition.load();
			if (!disposed) Tool = module.default;
		} catch { if (!disposed) failed = true; }
	}
	onMount(() => { void load(); return () => { disposed = true; }; });
</script>

{#if Tool}
	<Tool />
{:else if failed}
	<div role="alert" class="p-6 text-75">
		<p>乐器暂时无法加载，请检查网络后重试。</p>
		<button class="btn-regular px-4 py-2 rounded-lg mt-3" onclick={load}>重新加载</button>
	</div>
{:else}
	<p role="status" class="p-6 text-75">正在准备乐器…</p>
{/if}

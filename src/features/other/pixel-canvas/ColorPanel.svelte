<script lang="ts">
	import { onMount } from "svelte";

	let { color, recent, onselect, onclose }: {
		color: string;
		recent: string[];
		onselect: (color: string) => void;
		onclose: () => void;
	} = $props();
	const palette = [
		"#ffffff", "#e5e7eb", "#9ca3af", "#6b7280", "#374151", "#222222", "#111827", "#000000",
		"#fee2e2", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#991b1b", "#7f1d1d", "#450a0a",
		"#fff7ed", "#fed7aa", "#fb923c", "#f97316", "#facc15", "#ca8a04", "#92400e", "#78350f",
		"#ecfccb", "#bef264", "#84cc16", "#22c55e", "#16a34a", "#15803d", "#166534", "#14532d",
		"#ccfbf1", "#5eead4", "#14b8a6", "#06b6d4", "#38bdf8", "#3b82f6", "#2563eb", "#1e3a8a",
		"#ede9fe", "#c4b5fd", "#8b5cf6", "#7c3aed", "#d946ef", "#ec4899", "#f9a8d4", "#831843",
	];
	let host: HTMLDivElement;
	let picker = $state<HTMLElement>();
	let failed = $state(false);
	let hex = $state(color);
	const invalid = $derived(!/^#?[0-9a-f]{6}$/i.test(hex));
	$effect(() => { hex = color; picker?.setAttribute("color", color); });

	function applyHex() {
		if (!invalid) onselect(`#${hex.replace(/^#/, "").toLowerCase()}`);
	}
	onMount(() => {
		let destroyed = false;
		let element: HTMLElement | undefined;
		const change = (event: Event) => {
			const value = (event as CustomEvent<{ value: string }>).detail.value;
			if (/^#[0-9a-f]{6}$/i.test(value)) onselect(value.toLowerCase());
		};
		import("vanilla-colorful/hex-color-picker.js").then(() => {
			if (destroyed) return;
			element = document.createElement("hex-color-picker");
			element.setAttribute("color", color);
			element.addEventListener("color-changed", change);
			host.append(element);
			picker = element;
		}).catch(() => { if (!destroyed) failed = true; });
		return () => { destroyed = true; element?.removeEventListener("color-changed", change); element?.remove(); };
	});
</script>

<section class="color-panel" aria-label="调色面板">
	<div class="panel-heading"><strong>调色板</strong><button type="button" aria-label="关闭调色面板" onclick={onclose}>关闭</button></div>
	<div class="picker" bind:this={host}></div>
	{#if !picker && !failed}<p role="status">正在加载调色器…</p>{/if}
	{#if failed}<label class="fallback">调色器加载失败，使用系统选色 <input type="color" value={color} oninput={(event) => onselect(event.currentTarget.value)} /></label>{/if}
	<form onsubmit={(event) => { event.preventDefault(); applyHex(); }}>
		<span class="preview" style:background={color} aria-label={`当前颜色 ${color}`}></span>
		<label for="pixel-color-hex">HEX</label>
		<input id="pixel-color-hex" aria-invalid={invalid} aria-describedby={invalid ? "pixel-color-error" : undefined} bind:value={hex} maxlength="7" spellcheck="false" autocomplete="off" />
		<button type="submit" disabled={invalid}>应用</button>
	</form>
	{#if invalid}<p id="pixel-color-error">请输入 6 位十六进制颜色，例如 #f97316</p>{/if}
	<div class="swatches" aria-label="48 种预设颜色">
		{#each palette as swatch}<button type="button" class:selected={color === swatch} style:background={swatch} title={swatch} aria-label={`预设颜色 ${swatch}`} aria-pressed={color === swatch} onclick={() => onselect(swatch)}></button>{/each}
	</div>
	{#if recent.length}
		<p class="caption">最近用色</p>
		<div class="swatches" aria-label="最近用色">{#each recent as swatch}<button type="button" class:selected={color === swatch} style:background={swatch} title={swatch} aria-label={`最近用色 ${swatch}`} aria-pressed={color === swatch} onclick={() => onselect(swatch)}></button>{/each}</div>
	{/if}
</section>

<style>
	.color-panel { padding: 1rem; border: 1px solid var(--line-divider); border-radius: .75rem; background: var(--card-bg); box-shadow: 0 8px 32px #0003; }
	.panel-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: .75rem; }
	button { cursor: pointer; border-radius: .35rem; }
	.panel-heading button, form button { padding: .4rem .6rem; background: var(--btn-regular-bg); font-size: .8rem; }
	button:disabled { opacity: .4; cursor: default; }
	button:focus-visible, input:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
	.picker :global(hex-color-picker) { width: 100%; height: 160px; }
	.picker :global(hex-color-picker::part(hue)) { height: 24px; }
	form { display: flex; align-items: center; gap: .5rem; margin: .85rem 0; font-size: .8rem; }
	.preview { width: 28px; height: 28px; flex-shrink: 0; border: 1px solid #8888; border-radius: .35rem; }
	form input { width: 0; flex: 1; min-width: 0; padding: .4rem; border: 1px solid var(--line-divider); border-radius: .35rem; background: var(--btn-regular-bg); color: inherit; font-family: monospace; }
	.swatches { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: .45rem; padding: 3px; }
	.swatches button { width: 100%; aspect-ratio: 1; border: 1px solid #8888; }
	.swatches button.selected { outline: 2px solid var(--primary); outline-offset: 2px; }
	p, .fallback { font-size: .75rem; margin-bottom: .5rem; }
	.caption { margin: .85rem 0 .4rem; }
</style>

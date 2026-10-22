<script lang="ts">
	import { onMount } from "svelte";
	import Icon from "@/components/common/Icon.svelte";
	import ColorPanel from "./ColorPanel.svelte";
	import { cellAt, lineCells, PixelDrawing, pixelBounds, restorePixels, restoreView, serializePixels, STORAGE_KEY, zoomView, type Cell, type Pixel, type View } from "./model";

	const palette = ["#222222", "#ffffff", "#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"];
	let drawing = new PixelDrawing();
	let color = $state("#f97316");
	let showColors = $state(false);
	let recentColors = $state<string[]>([]);
	let colorButton: HTMLButtonElement;
	let tool = $state<"pen" | "eraser" | "hand">("pen");
	let view = $state<View>({ x: 0, y: 0, size: 20 });
	let canUndo = $state(false);
	let status = $state("画作自动保存在此浏览器");
	let saveFailed = $state(false);
	let saving = $state(false);
	let exportError = $state("");
	let exportUrl = $state("");
	let showHelp = $state(false);
	let cursor = $state<Cell>({ x: 0, y: 0 });
	let focused = false;
	let surface: HTMLCanvasElement;
	let width = 0;
	let height = 0;
	let pointer: number | null = null;
	let last: Cell | null = null;
	let pan: { x: number; y: number; view: View } | null = null;
	let strokeColor: Pixel = null;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let dirty = false;
	let disposed = false;

	function render() {
		if (disposed || !surface) return;
		const ctx = surface.getContext("2d"); if (!ctx) return;
		const ratio = window.devicePixelRatio || 1;
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
		for (const [key, pixel] of drawing.pixels) {
			const [x, y] = key.split(",").map(Number);
			const left = (x - view.x) * view.size; const top = (y - view.y) * view.size;
			if (left + view.size < 0 || top + view.size < 0 || left > width || top > height) continue;
			ctx.fillStyle = pixel; ctx.fillRect(left, top, view.size, view.size);
		}
		ctx.beginPath(); ctx.strokeStyle = "#d8dce2"; ctx.lineWidth = .6;
		for (let x = ((-view.x * view.size) % view.size + view.size) % view.size; x <= width; x += view.size) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
		for (let y = ((-view.y * view.size) % view.size + view.size) % view.size; y <= height; y += view.size) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
		ctx.stroke();
		if (focused) { ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.strokeRect((cursor.x - view.x) * view.size + 1, (cursor.y - view.y) * view.size + 1, view.size - 2, view.size - 2); }
	}
	function save() {
		clearTimeout(timer); timer = undefined; if (!dirty) return;
		try { localStorage.setItem(STORAGE_KEY, serializePixels(drawing.pixels, view)); dirty = false; saving = false; saveFailed = false; status = "已自动保存到此浏览器"; }
		catch { saving = false; saveFailed = true; status = "保存失败，请导出备份"; }
	}
	function update() { canUndo = drawing.canUndo; dirty = true; saving = true; clearTimeout(timer); timer = setTimeout(save, 150); render(); }
	function finish() {
		const previous = pointer; if (pan) dirty = true; pointer = null; last = null; pan = null;
		drawing.commit(); canUndo = drawing.canUndo;
		if (previous !== null && surface?.hasPointerCapture(previous)) surface.releasePointerCapture(previous);
		save();
	}
	function position(event: PointerEvent) { const rect = surface.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
	function paintTo(cell: Cell) {
		let changed = false;
		for (const point of lineCells(last ?? cell, cell)) changed = drawing.paint(point, strokeColor) || changed;
		last = cell; cursor = cell; if (changed) update();
	}
	function rememberColor(value: Pixel) { if (value) recentColors = [value, ...recentColors.filter((entry) => entry !== value)].slice(0, 16); }
	function selectColor(value: string) { finish(); color = value; tool = "pen"; }
	function closeColors() { showColors = false; colorButton?.focus(); }
	function down(event: PointerEvent) {
		if (disposed || pointer !== null || ![0, 1, 2].includes(event.button)) return;
		event.preventDefault(); const point = position(event);
		pointer = event.pointerId; surface.setPointerCapture(pointer); surface.focus({ preventScroll: true });
		if ((tool === "hand" && event.button === 0) || event.button === 1) { pan = { ...point, view: { ...view } }; return; }
		strokeColor = event.button === 2 || tool === "eraser" ? null : color;
		rememberColor(strokeColor);
		paintTo(cellAt(view, point.x, point.y));
	}
	function move(event: PointerEvent) {
		if (pointer !== event.pointerId) return;
		if (!event.buttons) { finish(); return; }
		const point = position(event);
		if (pan) { view = { ...pan.view, x: pan.view.x - (point.x - pan.x) / view.size, y: pan.view.y - (point.y - pan.y) / view.size }; render(); return; }
		if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) { last = null; return; }
		paintTo(cellAt(view, point.x, point.y));
	}
	function zoom(factor: number) { finish(); view = zoomView(view, Math.max(4, Math.min(96, view.size * factor)), width / 2, height / 2); cursor = cellAt(view, width / 2, height / 2); dirty = true; save(); render(); }
	function choose(next: typeof tool) { finish(); tool = next; }
	function undo() { finish(); if (drawing.undo()) { update(); save(); } }
	function key(event: KeyboardEvent) {
		if (event.isComposing) return;
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); undo(); return; }
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		const offsets: Record<string, Cell> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
		const offset = offsets[event.key];
		if (offset) {
			event.preventDefault(); cursor = { x: cursor.x + offset.x, y: cursor.y + offset.y };
			view = { ...view, x: Math.max(cursor.x - width / view.size + 1, Math.min(view.x, cursor.x)), y: Math.max(cursor.y - height / view.size + 1, Math.min(view.y, cursor.y)) }; render(); return;
		}
		if ([" ", "Enter", "Delete", "Backspace"].includes(event.key)) {
			event.preventDefault(); if (event.repeat || pointer !== null) return;
			const next = ["Delete", "Backspace"].includes(event.key) || tool === "eraser" ? null : color;
			rememberColor(next); drawing.paint(cursor, next); drawing.commit(); update(); save();
		}
		if (event.key === "+" || event.key === "=") { event.preventDefault(); zoom(1.25); }
		if (event.key === "-") { event.preventDefault(); zoom(.8); }
	}
	function download() {
		finish(); exportError = "";
		try {
			const bounds = pixelBounds(drawing.pixels);
			if (!bounds) { exportError = "先画几格，再导出"; return; }
			const scale = Math.max(1, Math.min(16, Math.floor(4096 / Math.max(bounds.width, bounds.height))));
			if (bounds.width > 8192 || bounds.height > 8192 || bounds.width * bounds.height * scale * scale > 32_000_000) { exportError = "画作范围过大，无法导出 PNG"; return; }
			const canvas = document.createElement("canvas"); canvas.width = bounds.width * scale; canvas.height = bounds.height * scale;
			const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas unavailable");
			for (const [key, pixel] of drawing.pixels) { const [x, y] = key.split(",").map(Number); context.fillStyle = pixel; context.fillRect((x - bounds.left) * scale, (y - bounds.top) * scale, scale, scale); }
			exportUrl = canvas.toDataURL("image/png");
			const link = document.createElement("a"); link.download = "pixel-canvas.png"; link.href = exportUrl; document.body.append(link); link.click(); link.remove();
		} catch { exportError = "导出失败，请重试"; }
	}
	export function pause() { finish(); }
	export function reset() { finish(); view = { x: 0, y: 0, size: 20 }; tool = "pen"; render(); }
	export function dispose() { if (disposed) return; finish(); clearTimeout(timer); disposed = true; }
	export async function activate() {}
	onMount(() => {
		try { const cached = localStorage.getItem(STORAGE_KEY); drawing = new PixelDrawing(restorePixels(cached)); view = restoreView(cached); }
		catch { saveFailed = true; status = "无法读取缓存，请及时导出"; }
		const resize = () => { finish(); const rect = surface.getBoundingClientRect(); width = rect.width; height = rect.height; const ratio = window.devicePixelRatio || 1; surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio); render(); };
		const observer = new ResizeObserver(resize); observer.observe(surface); resize();
		const visibility = () => { if (document.hidden) finish(); };
		const release = (event: PointerEvent) => { if (pointer === event.pointerId) finish(); };
		window.addEventListener("blur", finish); window.addEventListener("pagehide", finish); window.addEventListener("pointerup", release); window.addEventListener("pointercancel", release);
		document.addEventListener("visibilitychange", visibility); document.addEventListener("swup:visit:start", finish);
		return () => { dispose(); observer.disconnect(); window.removeEventListener("blur", finish); window.removeEventListener("pagehide", finish); window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release); document.removeEventListener("visibilitychange", visibility); document.removeEventListener("swup:visit:start", finish); };
	});
</script>

<svelte:window onkeydown={(event) => { if (showColors && event.key === "Escape") { event.preventDefault(); closeColors(); } }} />

<div class="studio text-75">
	<div class="toolbar" aria-label="画布工具">
		<div class="tool-group">
			<button class:chosen={tool === "pen"} title="画笔" aria-label="画笔" aria-pressed={tool === "pen"} onclick={() => choose("pen")}><Icon icon="material-symbols:edit-rounded" size="xl" /></button>
			<button class:chosen={tool === "eraser"} title="橡皮擦" aria-label="橡皮擦" aria-pressed={tool === "eraser"} onclick={() => choose("eraser")}><Icon icon="material-symbols:ink-eraser-outline-rounded" size="xl" /></button>
			<button class:chosen={tool === "hand"} title="移动画布" aria-label="移动画布" aria-pressed={tool === "hand"} onclick={() => choose("hand")}><Icon icon="material-symbols:pan-tool-outline-rounded" size="xl" /></button>
			<button title="撤回一笔" aria-label="撤回一笔" disabled={!canUndo} onclick={undo}><Icon icon="material-symbols:undo-rounded" size="xl" /></button>
		</div>
		<div class="palette" aria-label="颜色">
			{#each palette as swatch}<button class="swatch" class:selected={color === swatch} style:background={swatch} title={swatch} aria-label={`颜色 ${swatch}`} aria-pressed={color === swatch} onclick={() => selectColor(swatch)}></button>{/each}
			<button bind:this={colorButton} class="color-toggle" title="更多颜色" aria-label={`更多颜色，当前 ${color}`} aria-expanded={showColors} aria-controls="pixel-colors" onclick={() => { finish(); showColors = !showColors; }}><span style:background={color}></span><span>调色</span></button>
		</div>
		{#if showColors}
			<div id="pixel-colors" class="color-popover">
				<ColorPanel {color} recent={recentColors} onselect={selectColor} onclose={closeColors} />
			</div>
		{/if}
		<div class="tool-group zoom">
			<button title="缩小" aria-label="缩小" disabled={view.size <= 4} onclick={() => zoom(.8)}><Icon icon="material-symbols:remove-rounded" size="xl" /></button>
			<output aria-label="缩放比例">{Math.round(view.size / 20 * 100)}%</output>
			<button title="放大" aria-label="放大" disabled={view.size >= 96} onclick={() => zoom(1.25)}><Icon icon="material-symbols:add-rounded" size="xl" /></button>
		</div>
		<div class="tool-group actions">
			<span class="save" class:error={saveFailed} title={status} role="status" aria-label={saving ? "正在保存" : status}><Icon icon="material-symbols:cloud-done-outline-rounded" size="lg" /></span>
			<button title="导出 PNG" aria-label="导出 PNG" onclick={download}><Icon icon="material-symbols:download-rounded" size="xl" /></button>
			<button title="操作说明" aria-label="操作说明" aria-expanded={showHelp} onclick={() => { showHelp = !showHelp; }}><Icon icon="material-symbols:help-outline-rounded" size="xl" /></button>
		</div>
	</div>
	<div class="drawing-area">
		<canvas bind:this={surface} class:hand={tool === "hand"} tabindex="0" aria-label="像素画布" aria-describedby="pixel-help" onpointerdown={down} onpointermove={move} onlostpointercapture={(event) => { if (event.pointerId === pointer) finish(); }} oncontextmenu={(event) => event.preventDefault()} onkeydown={key} onfocus={() => { focused = true; render(); }} onblur={() => { focused = false; finish(); render(); }}>像素画布需要支持 Canvas 的浏览器。</canvas>
		{#if showHelp}<div class="help-panel" id="pixel-help">左键涂色 · 右键擦除 · 手掌拖动视野<br />缩小看更多格子，放大画细节<br />方向键移动 · 空格填色 · Delete 擦除 · Ctrl / ⌘ Z 撤回<br />自动保存到此浏览器，PNG 导出全部已绘制内容</div>{:else}<span id="pixel-help" class="sr-only">左键或触摸绘画，右键擦除，手掌工具移动画布。方向键移动，空格填色，Delete 擦除，Ctrl 或 Command 加 Z 撤回。</span>{/if}
		{#if exportError}<p class="notice" role="alert">{exportError}</p>{:else if saveFailed}<p class="notice" role="alert">{status}</p>{/if}
		{#if exportUrl}<a class="download-again" href={exportUrl} download="pixel-canvas.png" title="再次下载刚才导出的 PNG" aria-label="再次下载刚才导出的 PNG"><Icon icon="material-symbols:download-rounded" size="lg" /></a>{/if}
	</div>
	<span class="sr-only" aria-live="polite">画格 {cursor.x}, {cursor.y}</span>
</div>

<style>
	.studio { display: flex; flex-direction: column; height: max(430px, calc(100svh - 11rem)); min-width: 0; }
	.toolbar { position: relative; display: flex; align-items: center; gap: .65rem; flex-wrap: wrap; padding: .65rem .8rem; border-bottom: 1px solid var(--line-divider); }
	.tool-group, .palette { display: flex; align-items: center; gap: .25rem; }
	.tool-group + .palette, .zoom { border-left: 1px solid var(--line-divider); padding-left: .65rem; }
	button { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: .5rem; color: inherit; cursor: pointer; }
	button:hover { background: var(--btn-regular-bg); }
	button.chosen { background: var(--primary); color: var(--deep-text); }
	button:disabled { opacity: .3; cursor: default; }
	button:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
	.palette { gap: .45rem; }
	.palette .swatch { width: 22px; height: 22px; border: 1px solid #8886; border-radius: 5px; }
	.swatch.selected { outline: 2px solid var(--primary); outline-offset: 2px; }
	.color-toggle { width: auto; gap: .35rem; padding: 0 .4rem; font-size: .75rem; }
	.color-toggle span:first-child { width: 20px; height: 20px; border: 1px solid #8886; border-radius: 4px; }
	.color-popover { position: absolute; z-index: 10; left: .5rem; top: calc(100% + .35rem); width: min(330px, calc(100% - 1rem)); max-height: min(65svh, 570px); overflow-y: auto; overscroll-behavior: contain; }
	output { width: 3.2rem; text-align: center; font-size: .75rem; font-variant-numeric: tabular-nums; }
	.actions { margin-left: auto; }
	.save { display: flex; padding: .3rem; opacity: .6; }
	.save.error { color: #e25050; opacity: 1; }
	.drawing-area { position: relative; flex: 1; min-height: 0; overflow: hidden; background: white; }
	canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: crosshair; outline: none; }
	canvas:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
	canvas.hand { cursor: grab; }
	canvas.hand:active { cursor: grabbing; }
	.help-panel, .notice { position: absolute; right: 12px; top: 12px; max-width: calc(100% - 24px); padding: .85rem 1rem; border: 1px solid var(--line-divider); border-radius: .75rem; background: var(--card-bg); font-size: .8rem; line-height: 1.9; box-shadow: 0 6px 24px #0001; }
	.notice { top: auto; bottom: 12px; }
	.download-again { position: absolute; right: 12px; bottom: 12px; padding: .6rem; border-radius: .5rem; background: var(--card-bg); }
	@media (max-width: 640px) {
		.toolbar { gap: .45rem; padding: .5rem; }
		.palette { order: 4; width: 100%; justify-content: center; border-left: 0 !important; padding: .3rem 0 .1rem !important; }
		.palette .swatch { width: 25px; height: 25px; }
		.zoom { padding-left: .25rem; }
		button { width: 31px; height: 34px; }
		output { width: 2.8rem; }
		.actions { gap: 0; }
		.save { display: none; }
	}
</style>

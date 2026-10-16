<script lang="ts">
	import { onMount } from "svelte";
	import { createAudio, type StylophoneAudio } from "./audio";
	import { createInput, hitPad, isSharp, keyNotes, midiNote, pads, shortcuts } from "./input";
	let frame: HTMLDivElement;
	let surface: HTMLDivElement;
	let ready = $state(false);
	let loading = $state(false);
	let error = $state("");
	let active = $state<number | null>(null);
	let octave = $state(0);
	let volume = $state(50);
	let muted = $state(false);
	let vibrato = $state(false);
	let compact = $state(false);
	let windowIndex = $state(0);
	let pen = $state<{ x: number; y: number } | null>(null);
	let visible = true;
	let disposed = false;
	let generation = 0;
	let audio: StylophoneAudio | null = null;
	let pending: AbortController | null = null;
	const input = createInput();
	const notes = $derived(pads.map((name, index) => ({ name, index })).filter(({ index }) => !compact || (windowIndex === 0 ? index <= 6 : index >= 7)));
	const noteLabel = (index: number) => `${pads[index]}${(index === 12 ? 5 : 4) + octave}`;
	const digits = ["1", "♯1", "2", "♯2", "3", "4", "♯4", "5", "♯5", "6", "♯6", "7", "1"];
	const relativeOctave = (index: number) => octave + (index === 12 ? 1 : 0);
	const digitLabel = (index: number) => `${relativeOctave(index) === -1 ? "低音" : relativeOctave(index) === 1 ? "高音" : relativeOctave(index) === 2 ? "倍高音" : "中音"} ${digits[index]}`;

	function sound(index: number | null) {
		if (!ready || muted || !visible || disposed) index = null;
		if (index === active) return;
		active = index;
		if (index === null) audio?.stop();
		else audio?.play(midiNote(index, octave));
	}
	export function pause() { pending?.abort(); input.clear(); sound(null); pen = null; }
	export function reset() { pause(); octave = 0; windowIndex = 0; volume = 50; vibrato = false; audio?.volume(0.5); audio?.vibrato(false); }
	export function dispose() {
		if (disposed) return;
		pause(); disposed = true; generation++; audio?.dispose(); audio = null;
	}
	async function start() {
		if (loading || ready || disposed) return;
		loading = true; error = "";
		const attempt = ++generation;
		pending = new AbortController();
		try {
			const result = await createAudio(() => !disposed && generation === attempt && visible && !document.hidden, pending.signal);
			if (!result) return;
			audio = result; audio.volume(volume / 100); audio.vibrato(vibrato); ready = true;
		} catch { if (!disposed) error = "声音启动失败，请检查浏览器是否支持音频，然后重试。"; }
		finally { pending = null; if (!disposed) loading = false; }
	}
	export async function activate() { await start(); }
	function move(event: PointerEvent) {
		if (!input.owns(event.pointerId)) return;
		const box = surface.getBoundingClientRect();
		pen = { x: event.clientX - box.left, y: event.clientY - box.top };
		const rects = [...surface.querySelectorAll<HTMLButtonElement>("[data-pad]")].map((button) => ({ index: Number(button.dataset.pad), ...rect(button) }));
		sound(hitPad(event.clientX, event.clientY, rects));
	}
	function rect(button: HTMLButtonElement) { const { left, right, top, bottom } = button.getBoundingClientRect(); return { left, right, top, bottom }; }
	function down(event: PointerEvent) {
		if (!ready || muted || event.button !== 0 || !visible) return;
		if (!input.claim(event.pointerId)) return;
		event.preventDefault(); surface.setPointerCapture(event.pointerId); move(event);
	}
	function up(event: PointerEvent) {
		if (!input.release(event.pointerId)) return;
		sound(null); pen = null;
		if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
	}
	function keydown(event: KeyboardEvent) {
		if (!ready || muted || !visible || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		const target = event.target instanceof HTMLElement ? event.target : null;
		const focusedPad = target?.closest<HTMLButtonElement>("[data-pad]");
		if (target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), button, summary, [role='slider'], [role='combobox']") && !focusedPad) return;
		const index = focusedPad && (event.code === "Space" || event.code === "Enter") ? Number(focusedPad.dataset.pad) : keyNotes.get(event.key.toLowerCase());
		if (index === undefined || !input.press(event.code, index)) return;
		event.preventDefault(); sound(index);
	}
	function keyup(event: KeyboardEvent) {
		if (input.lift(event.code)) { event.preventDefault(); sound(input.current()); }
	}
	function changeOctave(value: number) { pause(); octave = value; }
	function changeWindow(value: number) { pause(); windowIndex = value; }
	function toggleMute() { pause(); muted = !muted; }
	function setVolume(event: Event) { volume = Number((event.target as HTMLInputElement).value); if (volume === 0) pause(); audio?.volume(volume / 100); }
	function toggleVibrato() { vibrato = !vibrato; audio?.vibrato(vibrato); }

	onMount(() => {
		const visibility = () => { if (document.hidden) { generation++; pause(); } };
		const blur = () => { generation++; pause(); };
		const resize = new ResizeObserver(() => { const next = frame.clientWidth < 520; if (next !== compact) { pause(); compact = next; windowIndex = 0; } });
		resize.observe(frame);
		const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) { generation++; pause(); } });
		observer.observe(frame);
		window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup);
		window.addEventListener("blur", blur); window.addEventListener("pagehide", blur);
		document.addEventListener("visibilitychange", visibility);
		document.addEventListener("astro:before-swap", dispose);
		document.addEventListener("swup:visit:start", blur);
		return () => {
			dispose(); resize.disconnect(); observer.disconnect();
			window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup);
			window.removeEventListener("blur", blur); window.removeEventListener("pagehide", blur);
			document.removeEventListener("visibilitychange", visibility);
			document.removeEventListener("astro:before-swap", dispose);
			document.removeEventListener("swup:visit:start", blur);
		};
	});
</script>

<div class="instrument text-90" bind:this={frame}>
	<div class="instrument-top">
		<div><p class="brand">STYLOPHONE</p><p class="subtitle">触笔电子琴 · 自由演奏</p></div>
		<div class="speaker" aria-hidden="true"></div>
	</div>
	<div class="controls">
		{#if !ready}<button class="control start" onclick={start} disabled={loading}>{loading ? "正在开启声音…" : error ? "重试开启声音" : "开始演奏"}</button>{/if}
		<div class="octaves" role="group" aria-label="演奏音区">
			{#each [{ value: -1, label: "低" }, { value: 0, label: "中" }, { value: 1, label: "高" }] as range}
				<button class="control" class:selected={octave === range.value} aria-pressed={octave === range.value} aria-label={`${range.label}音区`} onclick={() => changeOctave(range.value)}>{range.label}</button>
			{/each}
		</div>
		<button class="control" class:selected={vibrato} aria-pressed={vibrato} onclick={toggleVibrato}>颤音</button>
		<button class="control" aria-pressed={muted} onclick={toggleMute}>{muted ? "取消静音" : "静音"}</button>
		<label class="volume">音量 <input aria-label="演奏音量" type="range" min="0" max="100" value={volume} oninput={setVolume} /><span>{volume}%</span></label>
	</div>
	{#if error}<p role="alert" class="error">{error}</p>{/if}
	<div class="readout"><span class:lit={ready && !muted} class="led" aria-hidden="true"></span><span role="status">{!ready ? "点击开始演奏，开启声音" : muted ? "已静音" : active === null ? "按住音片 · 滑动演奏" : `正在演奏 ${noteLabel(active)}`}</span><span class="range">{noteLabel(notes[0].index)} — {noteLabel(notes.at(-1)!.index)}</span></div>
	<div class="surface" bind:this={surface} role="group" aria-label="金属音片演奏区" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onlostpointercapture={up}>
		{#each notes as note (note.index)}
			<button type="button" class="pad" class:sharp={isSharp(note.index)} class:active={active === note.index} data-pad={note.index} aria-label={`${digitLabel(note.index)}（${noteLabel(note.index)}），快捷键 ${shortcuts[note.index]}`} aria-pressed={active === note.index} disabled={!ready || muted}>
				<span class="engraving" class:low={relativeOctave(note.index) < 0} class:high={relativeOctave(note.index) > 0} class:double-high={relativeOctave(note.index) > 1} aria-hidden="true">{digits[note.index]}</span><span class="shortcut" aria-hidden="true">{shortcuts[note.index]}</span>
			</button>
		{/each}
		{#if pen}<span class="pen" style={`left:${pen.x}px;top:${pen.y}px`} aria-hidden="true"></span>{/if}
	</div>
	<div class="bottom"><span>接触发声，抬起停音。</span>{#if compact}<div class="windows" role="group" aria-label="音片窗口"><button class="control" aria-label="前半音片 C 至 F 升" aria-pressed={windowIndex === 0} onclick={() => changeWindow(0)}>C — F♯</button><button class="control" aria-label="后半音片 G 至 C" aria-pressed={windowIndex === 1} onclick={() => changeWindow(1)}>G — C</button></div>{/if}</div>
</div>
<details class="help text-90"><summary>键盘演奏与操作说明</summary><p>音片上的 1–7 对应 do、re、mi、fa、sol、la、si，♯ 表示升音。下方小点表示低音，上方小点表示高音，两个上点表示倍高音。</p><p>点击「开始演奏」后，按住 A S D F G H J K 演奏自然音，W E T Y U 演奏升音。多键按下时，最后按下的音优先。</p><p>也可以用 Tab 聚焦音片，再按住空格或 Enter。鼠标或手指按住音片并滑动，进入间隙会停音。切换音区、静音或离开页面也会停音。</p></details>

<style>
	.instrument { padding:clamp(16px,4vw,32px); border-radius:20px; background:var(--btn-regular-bg); border:1px solid var(--line-divider); box-shadow:inset 0 1px 0 #ffffff30; }
	.instrument-top { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:24px; }
	.brand { font-size:clamp(20px,4vw,30px); letter-spacing:.16em; font-weight:800; color:var(--primary); }
	.subtitle { font-size:12px; opacity:.65; margin-top:5px; }
	.speaker { width:96px; height:48px; opacity:.35; background:radial-gradient(circle,var(--primary) 1px,transparent 2px) 0 0/7px 7px; border-radius:8px; }
	.controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
	.control { min-height:42px; padding:8px 14px; border:1px solid var(--line-divider); border-radius:8px; background:var(--card-bg); color:inherit; font-weight:600; font-size:14px; }
	.control:hover,.control.selected { border-color:var(--primary); background:var(--btn-regular-bg-hover); }
	.control.start { border-color:var(--primary); }
	.control:disabled { opacity:.5; cursor:wait; }
	.octaves,.windows { display:flex; gap:5px; }
	.volume { display:flex; gap:8px; align-items:center; font-size:13px; flex-wrap:wrap; }
	.volume input { width:90px; accent-color:var(--primary); }
	.volume span { min-width:34px; }
	.readout { display:flex; align-items:center; gap:8px; font-size:12px; margin:24px 0 12px; min-height:20px; flex-wrap:wrap; }
	.led { width:7px; height:7px; border-radius:50%; background:var(--line-divider); }
	.led.lit { background:var(--primary); }
	.range { margin-left:auto; opacity:.6; }
	.surface { position:relative; display:flex; gap:4px; align-items:flex-end; height:168px; padding:12px 6px; border-radius:12px; background:#20252c; touch-action:none; user-select:none; }
	.pad { flex:1; min-width:0; height:144px; border:1px solid #f4f6f7; border-radius:3px; background:linear-gradient(100deg,#b0b8bd,#e3e7e9 45%,#c2cace 60%,#929da5); color:#27313a; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding:12px 0; gap:10px; cursor:crosshair; box-shadow:inset 0 0 0 2px #ffffff30; }
	.pad.sharp { height:110px; background:linear-gradient(100deg,#849098,#bac3c8 45%,#8f9ca5); }
	.pad:disabled { cursor:default; }
	.pad.active { background:var(--primary); color:var(--card-bg); border-color:var(--primary); }
	.engraving { position:relative; font-weight:700; font-size:15px; line-height:1; }
	.engraving.low::before,.engraving.high::before,.engraving.double-high::after { content:"•"; position:absolute; left:50%; transform:translateX(-50%); font-size:12px; line-height:1; }
	.engraving.low::before { top:100%; }
	.engraving.high::before { bottom:100%; }
	.engraving.double-high::after { bottom:calc(100% + 7px); }
	.shortcut { font-size:10px; opacity:.6; }
	.pen { position:absolute; width:9px; height:66px; border-radius:5px; background:linear-gradient(90deg,#525d66,#e4eaef,#66737e); transform:translate(-50%,-95%) rotate(25deg); transform-origin:bottom; pointer-events:none; box-shadow:2px 2px 4px #0004; }
	.bottom { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; font-size:12px; margin-top:16px; opacity:.85; }
	.help { margin-top:20px; font-size:14px; line-height:1.8; }
	.help summary { cursor:pointer; color:var(--primary); padding:8px 0; }
	.help p { margin-top:8px; opacity:.75; }
	.error { padding-top:12px; color:var(--primary); font-size:14px; }
	button:focus-visible,input:focus-visible,summary:focus-visible { outline:3px solid var(--primary); outline-offset:3px; }
	@media(max-width:480px) { .speaker { width:56px; } .control { padding:8px 10px; } .brand { letter-spacing:.08em; } }
</style>

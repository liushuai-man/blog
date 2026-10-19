<script lang="ts">
	import { isSharp, padPolygon } from "./input";
	import aluminium from "./brushed-aluminium.webp";
	let { index, active }: { index: number; active: boolean } = $props();
	const id = $props.id();
	const points = $derived(padPolygon(index).map(([x, y]) => `${x * 100},${y * 100}`).join(" "));
	const textureHeight = $derived(isSharp(index) ? 100 / .43 : 100);
</script>

<svg class="metal-contact" class:active viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
	<defs>
		<linearGradient id={`${id}-silver`} x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#83898c" />
			<stop offset=".08" stop-color="#e9ebeb" />
			<stop offset=".28" stop-color="#cbd0d1" />
			<stop offset=".65" stop-color="#b4bbbf" />
			<stop offset=".9" stop-color="#d3d8da" />
			<stop offset="1" stop-color="#91989b" />
		</linearGradient>
		<linearGradient id={`${id}-light`} x1="0" y1="0" x2=".15" y2="1">
			<stop offset="0" stop-color="white" stop-opacity=".32" />
			<stop offset=".34" stop-color="white" stop-opacity=".04" />
			<stop offset=".74" stop-color="#353b40" stop-opacity=".025" />
			<stop offset="1" stop-color="#252c30" stop-opacity=".15" />
		</linearGradient>
		<pattern id={`${id}-grain`} width="100" height={textureHeight} patternUnits="userSpaceOnUse">
			<image href={aluminium.src} width="100" height={textureHeight} preserveAspectRatio="none" />
		</pattern>
	</defs>
	<polygon {points} fill={`url(#${id}-silver)`} />
	<polygon {points} fill={`url(#${id}-grain)`} opacity=".82" />
	<polygon {points} fill={`url(#${id}-light)`} />
	<polygon class="contact-tint" {points} fill="var(--primary)" />
	<polygon class="rim" {points} fill="none" stroke="#50565a" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
	<polygon {points} fill="none" stroke="white" stroke-opacity=".85" stroke-width=".75" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
</svg>

<style>
	.metal-contact { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
	.contact-tint { opacity:0; }
	.active .contact-tint { opacity:.28; }
	.active .rim { stroke:var(--primary); stroke-width:2; }
	:global(.pad:focus-visible) .rim { stroke:var(--primary); stroke-width:3; }
	:global(.pad:focus-visible) .contact-tint { opacity:.2; }
</style>

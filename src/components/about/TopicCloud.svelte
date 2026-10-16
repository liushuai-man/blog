<script lang="ts">
	import { onMount } from "svelte";
	import type { Word } from "d3-cloud";
	import { getTagUrl } from "@/utils/url-utils";
	import type { Tag } from "@/utils/content-utils";
	let { tags }: { tags: Tag[] } = $props();
	let container: HTMLDivElement;
	let words = $state<Word[]>([]);
	let width = $state(600);
	const height = 280;
	onMount(() => {
		let disposed = false;
		let layout: ReturnType<typeof import("d3-cloud")["default"]> | undefined;
		let observer: ResizeObserver | undefined;
		void import("d3-cloud").then(({ default: cloud }) => {
			if (disposed) return;
			const draw = () => {
				layout?.stop();
				width = Math.max(240, Math.floor(container.clientWidth));
				const max = Math.max(1, ...tags.map((tag) => tag.count));
				layout = cloud().size([width, height]).padding(7).rotate(0)
					.font("sans-serif").fontWeight("600").timeInterval(12)
					.words(tags.map((tag) => ({ text: tag.name, size: 14 + 30 * Math.sqrt(tag.count / max) })))
					.fontSize((word) => word.size ?? 14)
					.on("end", (placed) => { if (!disposed) words = placed; });
				layout.start();
			};
			draw();
			observer = new ResizeObserver(draw);
			observer.observe(container);
		}).catch((error) => console.warn("Topic cloud unavailable; tag links remain accessible.", error));
		return () => { disposed = true; observer?.disconnect(); layout?.stop(); };
	});
</script>

<div bind:this={container}>
	{#if words.length > 0}
		<svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} aria-hidden="true">
			<g transform={`translate(${width / 2}, ${height / 2})`}>
				{#each words as word}
					<a href={getTagUrl(word.text ?? "")} tabindex="-1"><text transform={`translate(${word.x}, ${word.y})`} text-anchor="middle" style={`font-size:${word.size}px`} fill="var(--primary)" font-family="sans-serif" font-weight="600">{word.text}</text></a>
				{/each}
			</g>
		</svg>
	{/if}
	<ul class="flex flex-wrap gap-2 mt-4" aria-label="博客标签及文章数量">
		{#each tags as tag}
			<li><a class="btn-regular rounded-lg px-3 py-1 inline-flex gap-2" href={getTagUrl(tag.name)}>{tag.name}<span class="opacity-60">{tag.count}</span></a></li>
		{/each}
	</ul>
</div>

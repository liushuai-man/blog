<script lang="ts">
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";

export type LibraryTrack = {
	id: string;
	name: string;
	artist: string;
	url: string;
	cover?: string;
	lrc?: string;
};

interface Props {
	tracks?: LibraryTrack[];
	class?: string;
}

let { tracks = [], class: className = "" }: Props = $props();

// 浏览器端无法写仓库，因此排序/隐藏/改名/换封面只持久化到 localStorage
const STORAGE_KEY = "music-library-state";

type LibraryState = {
	order: string[];
	hidden: string[];
	meta: Record<string, { name?: string; cover?: string }>;
	view: "list" | "grid";
};

let lib = $state<LibraryState>({
	order: [],
	hidden: [],
	meta: {},
	view: "list",
});
let ready = $state(false);
let currentId = $state<string | null>(null);
let isPlaying = $state(false);
let editingId = $state<string | null>(null);
let editTitle = $state("");
let editCover = $state("");
let dragId = $state<string | null>(null);
let dragOverId = $state<string | null>(null);
let showHidden = $state(false);

function loadState() {
	if (typeof localStorage === "undefined") return;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw) as Partial<LibraryState>;
		if (Array.isArray(parsed.order)) lib.order = parsed.order;
		if (Array.isArray(parsed.hidden)) lib.hidden = parsed.hidden;
		if (parsed.meta && typeof parsed.meta === "object") lib.meta = parsed.meta;
		if (parsed.view === "grid" || parsed.view === "list") lib.view = parsed.view;
	} catch (e) {
		console.warn("[music-library] 读取本地状态失败:", e);
	}
}

function saveState() {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
	} catch (e) {
		console.warn("[music-library] 保存本地状态失败:", e);
	}
}

// 应用本地编辑（标题/封面）后的全部曲目
const metaTracks = $derived(
	tracks.map((t) => {
		const m = lib.meta[t.id];
		return {
			...t,
			name: m?.name ?? t.name,
			cover: m?.cover !== undefined ? m.cover : t.cover,
		};
	}),
);

// 按本地排序排列，构建期新增的曲目自动追加在末尾
const orderedTracks = $derived.by(() => {
	const byId = new Map(metaTracks.map((t) => [t.id, t] as const));
	const result: typeof metaTracks = [];
	for (const id of lib.order) {
		const t = byId.get(id);
		if (t) {
			result.push(t);
			byId.delete(id);
		}
	}
	for (const t of metaTracks) {
		if (byId.has(t.id)) {
			result.push(t);
			byId.delete(t.id);
		}
	}
	return result;
});

const hiddenSet = $derived(new Set(lib.hidden));
const visibleTracks = $derived(
	orderedTracks.filter((t) => !hiddenSet.has(t.id)),
);
const hiddenTracks = $derived(orderedTracks.filter((t) => hiddenSet.has(t.id)));
const hasTracks = $derived(tracks.length > 0);

function toPlayable(t: {
	id: string;
	name: string;
	artist: string;
	url: string;
	cover?: string;
	lrc?: string;
}) {
	return {
		id: t.id,
		name: t.name,
		artist: t.artist,
		url: t.url,
		pic: t.cover,
		lrc: t.lrc,
	};
}

// 用当前（排序+过滤后）的歌单替换播放器列表，再播放指定曲目
function playTrack(id: string) {
	const idx = visibleTracks.findIndex((t) => t.id === id);
	if (idx < 0) return;
	const mgr = window.__fireflyMusic;
	if (!mgr?.setPlaylist) return;
	mgr.setPlaylist(visibleTracks.map(toPlayable));
	mgr.playTrackByIndex(idx);
}

function toggleView() {
	lib.view = lib.view === "list" ? "grid" : "list";
	saveState();
}

function removeTrack(id: string) {
	if (!lib.hidden.includes(id)) lib.hidden = [...lib.hidden, id];
	if (dragId === id) dragId = null;
	saveState();
}

function restoreTrack(id: string) {
	lib.hidden = lib.hidden.filter((v) => v !== id);
	saveState();
}

function startEdit(t: { id: string; name: string; cover?: string }) {
	editingId = t.id;
	editTitle = t.name;
	editCover = t.cover ?? "";
}

function saveEdit() {
	if (!editingId) return;
	const name = editTitle.trim();
	const cover = editCover.trim();
	const next = { ...lib.meta };
	if (name || cover) {
		next[editingId] = { name: name || undefined, cover };
	} else {
		delete next[editingId];
	}
	lib.meta = next;
	editingId = null;
	saveState();
}

function cancelEdit() {
	editingId = null;
}

function onDragStart(id: string) {
	dragId = id;
}

function onDragOver(e: DragEvent, id: string) {
	e.preventDefault();
	if (dragId && dragId !== id) dragOverId = id;
}

function onDrop(targetId: string) {
	const from = dragId;
	dragId = null;
	dragOverId = null;
	if (!from || from === targetId) return;

	const ids = visibleTracks.map((t) => t.id);
	const fromIndex = ids.indexOf(from);
	const toIndex = ids.indexOf(targetId);
	if (fromIndex < 0 || toIndex < 0) return;

	ids.splice(fromIndex, 1);
	ids.splice(toIndex, 0, from);
	lib.order = [...ids, ...lib.hidden];
	saveState();
}

function onDragEnd() {
	dragId = null;
	dragOverId = null;
}

// 歌单变化时同步给播放器（侧边栏/导航栏的列表随之更新）
$effect(() => {
	const list = visibleTracks;
	if (!ready) return;
	window.__fireflyMusic?.setPlaylist?.(list.map(toPlayable));
});

onMount(() => {
	loadState();
	ready = true;

	const onTrack = (e: Event) => {
		currentId = (e as CustomEvent).detail?.track?.id ?? null;
	};
	const onPlayState = (e: Event) => {
		isPlaying = !!(e as CustomEvent).detail?.isPlaying;
	};
	window.addEventListener("fm:track", onTrack);
	window.addEventListener("fm:play-state", onPlayState);

	const s = window.__fireflyMusic?.getState();
	if (s?.track?.id) currentId = s.track.id;
	isPlaying = !!s?.isPlaying;

	return () => {
		window.removeEventListener("fm:track", onTrack);
		window.removeEventListener("fm:play-state", onPlayState);
	};
});
</script>

<div class:list={["card-base p-4 md:p-6 w-full", className]}>
	<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
		<div
			class="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
                before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2"
		>
			<Icon icon="material-symbols:library-music-rounded" class="text-[1.25rem] text-(--primary)" />
			<span>{i18n(I18nKey.musicLibrary)}</span>
			{#if hasTracks}
				<span class="text-sm font-normal text-neutral-400">· {visibleTracks.length}</span>
			{/if}
		</div>

		<div class="flex items-center gap-1 p-0.5 rounded-lg bg-(--btn-regular-bg) text-sm shrink-0" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={lib.view === "list"}
				title={i18n(I18nKey.musicLibraryViewList)}
				class:list={[
					"px-2.5 py-1 rounded-md transition-all active:scale-95",
					lib.view === "list" ? "text-(--primary) bg-white/70 dark:bg-white/10" : "text-neutral-500 hover:text-(--primary)",
				]}
				onclick={() => lib.view !== "list" && toggleView()}
			>
				<Icon icon="material-symbols:list-rounded" />
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={lib.view === "grid"}
				title={i18n(I18nKey.musicLibraryViewGrid)}
				class:list={[
					"px-2.5 py-1 rounded-md transition-all active:scale-95",
					lib.view === "grid" ? "text-(--primary) bg-white/70 dark:bg-white/10" : "text-neutral-500 hover:text-(--primary)",
				]}
				onclick={() => lib.view !== "grid" && toggleView()}
			>
				<Icon icon="material-symbols:grid-view-rounded" />
			</button>
		</div>
	</div>

	{#if editingId}
		<div class="mb-3 p-3 rounded-lg bg-neutral-50 dark:bg-white/5 flex flex-col gap-2">
			<label class="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
				{i18n(I18nKey.musicLibraryEditTitle)}
				<input
					class="px-2 py-1.5 rounded-md text-sm text-neutral-800 dark:text-neutral-100 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-(--primary)"
					bind:value={editTitle}
					onkeydown={(e) => e.key === "Enter" && saveEdit()}
				/>
			</label>
			<label class="flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
				{i18n(I18nKey.musicLibraryEditCover)}
				<input
					class="px-2 py-1.5 rounded-md text-sm text-neutral-800 dark:text-neutral-100 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:border-(--primary)"
					bind:value={editCover}
					placeholder="/music/cover.jpg"
					onkeydown={(e) => e.key === "Enter" && saveEdit()}
				/>
			</label>
			<div class="flex justify-end gap-2 pt-1">
				<button
					type="button"
					class="px-3 py-1 rounded-md text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
					onclick={cancelEdit}
				>
					{i18n(I18nKey.musicLibraryCancel)}
				</button>
				<button
					type="button"
					class="px-3 py-1 rounded-md text-sm bg-(--primary) text-white hover:brightness-110 transition-all active:scale-95"
					onclick={saveEdit}
				>
					{i18n(I18nKey.musicLibrarySave)}
				</button>
			</div>
		</div>
	{/if}

	{#if !hasTracks}
		<div class="flex flex-col items-center justify-center gap-2 py-10 text-center text-neutral-400">
			<Icon icon="material-symbols:music-off-rounded" class="text-4xl opacity-60" />
			<p class="font-medium">{i18n(I18nKey.musicLibraryEmpty)}</p>
			<p class="text-xs">{i18n(I18nKey.musicLibraryEmptyHint)}</p>
		</div>
	{:else if lib.view === "list"}
		<div class="flex flex-col gap-1">
			{#each visibleTracks as t (t.id)}
				<div
					class:list={[
						"group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/5",
						currentId === t.id && "bg-neutral-100 dark:bg-white/10",
						dragOverId === t.id && dragId !== t.id && "bg-(--primary)/10",
						dragId === t.id && "opacity-40",
					]}
					draggable="true"
					ondragstart={() => onDragStart(t.id)}
					ondragover={(e) => onDragOver(e, t.id)}
					ondrop={() => onDrop(t.id)}
					ondragend={onDragEnd}
					onclick={() => playTrack(t.id)}
					role="button"
					tabindex="0"
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && playTrack(t.id)}
				>
					<span class="cursor-grab text-neutral-300 dark:text-neutral-600 shrink-0" aria-hidden="true">
						<Icon icon="material-symbols:drag-indicator" />
					</span>

					<div class="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-neutral-200 dark:bg-neutral-700">
						{#if t.cover}
							<img src={t.cover} alt="" class="w-full h-full object-cover" loading="lazy" />
						{/if}
						<span
							class:list={[
								"absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity",
								currentId === t.id ? "opacity-100" : "opacity-0 group-hover:opacity-100",
							]}
						>
							<Icon
								icon={currentId === t.id && isPlaying ? "material-symbols:graphic-eq-rounded" : "material-symbols:play-arrow-rounded"}
								class="text-xl"
							/>
						</span>
					</div>

					<div class="flex-1 min-w-0">
						<div class:list={["text-sm font-bold truncate", currentId === t.id ? "text-(--primary)" : "text-neutral-700 dark:text-neutral-200"]}>
							{t.name}
						</div>
						{#if t.artist}
							<div class="text-xs text-neutral-400 truncate">{t.artist}</div>
						{/if}
					</div>

					<div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
						<button
							type="button"
							title={i18n(I18nKey.musicLibraryEdit)}
							aria-label={i18n(I18nKey.musicLibraryEdit)}
							class="p-1.5 rounded-md text-neutral-400 hover:text-(--primary) transition-colors active:scale-95"
							onclick={(e) => {
								e.stopPropagation();
								startEdit(t);
							}}
						>
							<Icon icon="material-symbols:edit-rounded" />
						</button>
						<button
							type="button"
							title={i18n(I18nKey.musicLibraryRemove)}
							aria-label={i18n(I18nKey.musicLibraryRemove)}
							class="p-1.5 rounded-md text-neutral-400 hover:text-red-500 transition-colors active:scale-95"
							onclick={(e) => {
								e.stopPropagation();
								removeTrack(t.id);
							}}
						>
							<Icon icon="material-symbols:delete-outline-rounded" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
			{#each visibleTracks as t (t.id)}
				<div
					class:list={[
						"group flex flex-col rounded-lg overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5",
						dragOverId === t.id && dragId !== t.id && "ring-2 ring-(--primary)",
						dragId === t.id && "opacity-40",
					]}
					draggable="true"
					ondragstart={() => onDragStart(t.id)}
					ondragover={(e) => onDragOver(e, t.id)}
					ondrop={() => onDrop(t.id)}
					ondragend={onDragEnd}
					onclick={() => playTrack(t.id)}
					role="button"
					tabindex="0"
					onkeydown={(e) => (e.key === "Enter" || e.key === " ") && playTrack(t.id)}
				>
					<div class="relative aspect-square bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
						{#if t.cover}
							<img src={t.cover} alt="" class="w-full h-full object-cover" loading="lazy" />
						{/if}
						<span
							class:list={[
								"absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity",
								currentId === t.id ? "opacity-100" : "opacity-0 group-hover:opacity-100",
							]}
						>
							<Icon
								icon={currentId === t.id && isPlaying ? "material-symbols:graphic-eq-rounded" : "material-symbols:play-arrow-rounded"}
								class="text-3xl"
							/>
						</span>
						<div class="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<button
								type="button"
								title={i18n(I18nKey.musicLibraryEdit)}
								aria-label={i18n(I18nKey.musicLibraryEdit)}
								class="p-1 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
								onclick={(e) => {
									e.stopPropagation();
									startEdit(t);
								}}
							>
								<Icon icon="material-symbols:edit-rounded" class="text-sm" />
							</button>
							<button
								type="button"
								title={i18n(I18nKey.musicLibraryRemove)}
								aria-label={i18n(I18nKey.musicLibraryRemove)}
								class="p-1 rounded-md bg-black/50 text-white hover:bg-red-500 transition-colors"
								onclick={(e) => {
									e.stopPropagation();
									removeTrack(t.id);
								}}
							>
								<Icon icon="material-symbols:delete-outline-rounded" class="text-sm" />
							</button>
						</div>
					</div>
					<div class="pt-1.5 px-0.5">
						<div class:list={["text-xs font-bold truncate", currentId === t.id ? "text-(--primary)" : "text-neutral-700 dark:text-neutral-200"]}>
							{t.name}
						</div>
						{#if t.artist}
							<div class="text-[10px] text-neutral-400 truncate">{t.artist}</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if hiddenTracks.length > 0}
		<div class="mt-4 pt-3 border-t border-neutral-100 dark:border-white/5">
			<button
				type="button"
				class="flex items-center gap-1 text-sm text-neutral-500 hover:text-(--primary) transition-colors"
				onclick={() => (showHidden = !showHidden)}
			>
				<Icon icon="material-symbols:visibility-off-rounded" />
				<span>{i18n(I18nKey.musicLibraryHidden)} · {hiddenTracks.length}</span>
			</button>
			{#if showHidden}
				<div class="mt-2 flex flex-col gap-1">
					{#each hiddenTracks as t (t.id)}
						<div class="flex items-center gap-3 p-2 rounded-lg opacity-70">
							<span class="flex-1 min-w-0 truncate text-sm text-neutral-500 dark:text-neutral-400">{t.name}</span>
							<button
								type="button"
								class="px-2 py-1 rounded-md text-xs text-neutral-500 hover:text-(--primary) hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
								onclick={() => restoreTrack(t.id)}
							>
								{i18n(I18nKey.musicLibraryRestore)}
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
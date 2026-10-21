<script lang="ts">
	let { onretry }: { onretry: () => void } = $props();
</script>

<div role="alert" class="p-6 text-75">
	<p>这个模块暂时无法使用，请重试。你也可以返回喵喵屋选择其他模块。</p>
	<button class="btn-regular px-4 py-2 rounded-lg mt-3" onclick={onretry}>重新加载</button>
</div>

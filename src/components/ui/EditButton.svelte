<script lang="ts">
	export let onClick: () => void;
	export let size: 'sm' | 'base' | 'lg' = 'base';

	const sizeClasses = {
		sm: 'text-2xl px-3 py-2 sm:text-xl sm:p-1',
		base: 'text-3xl px-3 py-2 sm:text-2xl sm:p-1',
		lg: 'text-4xl px-3 py-2 sm:text-3xl sm:p-1'
	};
</script>

<button
	type="button"
	class="text-purple-500 transition-colors hover:text-purple-400 {sizeClasses[size]}"
	on:click={onClick}
	on:keydown={(e) => e.key === 'Enter' && onClick()}
>
	✎
</button>

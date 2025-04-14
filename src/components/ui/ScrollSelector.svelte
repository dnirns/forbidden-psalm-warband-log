<script lang="ts">
	import type { Character } from '$lib/types';
	import scrolls from '$lib/data/scrolls';

	export let currentCharacter: Character;
	export let scrollType: 'clean' | 'unclean';
	export let slotIndex: number;

	$: scrollList = scrollType === 'clean' ? scrolls.cleanScrolls : scrolls.uncleanScrolls;
	$: label = scrollType === 'clean' ? 'Clean Scroll' : 'Unclean Scroll';
	$: selectedScroll = scrollList.find(
		(scroll) => scroll.name === currentCharacter.items[slotIndex]
	);

	const handleScrollChange = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		const scrollName = target.value;

		currentCharacter.items[slotIndex] = scrollName;

		currentCharacter = {
			...currentCharacter,
			items: [...currentCharacter.items]
		};
	};
</script>

<div class="flex flex-col gap-2">
	<!-- svelte-ignore a11y_label_has_associated_control -->
	<label class="jacquard-24-regular text-xl font-bold text-black sm:text-2xl">{label}:</label>
	<select
		class="lora w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-black hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
		value={currentCharacter.items[slotIndex]}
		on:change={handleScrollChange}
	>
		<option value="">Select a scroll...</option>
		{#each scrollList as scroll}
			<option value={scroll.name}>
				{scroll.name}
			</option>
		{/each}
	</select>
	{#if selectedScroll}
		<p class="text-sm text-gray-600">{selectedScroll.description}</p>
	{/if}
</div>

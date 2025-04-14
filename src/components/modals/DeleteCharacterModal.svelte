<script lang="ts">
	import { scale } from 'svelte/transition';
	import { lockBodyScroll, unlockBodyScroll } from '$lib/utils/modalUtils';
	import CloseButton from '../ui/CloseButton.svelte';
	import Button from '../ui/Button.svelte';
	import { onMount } from 'svelte';
	import type { Character } from '$lib/types';
	import items from '$lib/data/items';

	export let onClose: () => void;
	export let onConfirm: () => void;
	export let characterName: string;
	export let character: Character;

	// calculate refundable items
	$: refundableItems = character.items
		.filter(
			(item) =>
				item && item !== '' && (!character.pickedUpItems || !character.pickedUpItems.includes(item))
		)
		.map((itemName) => {
			const itemData = items.find((i) => i.item === itemName);
			return {
				name: itemName,
				cost: itemData?.cost || 0
			};
		})
		.filter((item) => item.cost > 0);

	$: spellcasterCost = character.isSpellcaster ? 5 : 0;

	$: totalRefund = refundableItems.reduce((total, item) => total + item.cost, 0) + spellcasterCost;

	onMount(() => {
		lockBodyScroll();
		return () => {
			unlockBodyScroll();
		};
	});

	const handleModalBackgroundClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onClose();
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[6px]"
	on:click={handleModalBackgroundClick}
	on:keydown={handleKeydown}
	role="presentation"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		open
		transition:scale
		class="relative w-[95vw] max-w-md overflow-y-auto border-2 border-white/30 bg-white p-6 text-black shadow sm:w-full"
		aria-labelledby="modal-title"
		aria-modal="true"
		on:click|stopPropagation={() => {}}
	>
		<CloseButton onClick={onClose} />
		<h2 id="modal-title" class="jacquard-24-regular mb-4 text-xl font-bold text-black sm:text-2xl">
			Delete Character
		</h2>

		<p class="lora mb-4 text-base text-gray-700">
			Are you sure you want to delete <span class="font-semibold">{characterName}</span>?
		</p>

		<div class="mb-6">
			<h3 class="jacquard-24-regular mb-3 text-xl font-bold text-black">Items to be refunded:</h3>

			{#if refundableItems.length > 0 || spellcasterCost > 0}
				<div class="lora space-y-2 rounded border border-gray-200 bg-gray-50 p-4">
					{#if refundableItems.length > 0}
						<ul class="space-y-3">
							{#each refundableItems as item}
								<li class="flex justify-between text-base">
									<span>{item.name}</span>
									<span class="font-semibold">{item.cost} gold</span>
								</li>
							{/each}
						</ul>
					{/if}

					{#if spellcasterCost > 0}
						<div class="flex justify-between py-1 text-base">
							<span>Spellcaster cost</span>
							<span class="font-semibold">{spellcasterCost} gold</span>
						</div>
					{/if}

					<div
						class="mt-3 flex justify-between border-t border-gray-300 pt-3 text-base font-semibold"
					>
						<span>Total refund:</span>
						<span class="text-emerald-600">{totalRefund} gold</span>
					</div>
				</div>
			{:else}
				<p class="text-base italic text-gray-500">No refundable gold value.</p>
			{/if}
		</div>

		<div class="flex justify-end gap-2">
			<Button variant="default" onClick={onClose}>Cancel</Button>
			<Button variant="danger" onClick={onConfirm}>Delete</Button>
		</div>
	</dialog>
</div>

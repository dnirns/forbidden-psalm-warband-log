<script lang="ts">
	import type { Item } from '$lib/types';
	import scrolls from '$lib/data/scrolls';
	import Button from '../ui/Button.svelte';
	import CloseButton from '../ui/CloseButton.svelte';

	export let items: Item[];
	export let onClose: () => void;
	export let onPickUp: (itemName: string) => Promise<void>;

	let showCustomItemInput = false;
	let showScrolls = false;
	let customItemName = '';
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[6px]"
	on:click={onClose}
	on:keydown={(e) => e.key === 'Escape' && onClose()}
	role="presentation"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<dialog
		open
		class="relative max-h-[80vh] w-[32rem] overflow-y-auto border-2 border-white/30 bg-white p-6 text-black"
		aria-modal="true"
		on:click|stopPropagation={() => {}}
	>
		<h2 class="mb-4 text-xl font-bold text-black">Pick up found item</h2>

		<div class="mb-4 flex gap-2">
			<Button
				variant={!showCustomItemInput && !showScrolls ? 'secondary' : 'default'}
				onClick={() => {
					showCustomItemInput = false;
					showScrolls = false;
				}}
				wide
			>
				Inventory
			</Button>
			<Button
				variant={showScrolls ? 'secondary' : 'default'}
				onClick={() => {
					showCustomItemInput = false;
					showScrolls = true;
				}}
				wide
			>
				Scrolls
			</Button>
			<Button
				variant={showCustomItemInput ? 'secondary' : 'default'}
				onClick={() => {
					showCustomItemInput = true;
					showScrolls = false;
				}}
				wide
			>
				Custom
			</Button>
		</div>

		{#if showCustomItemInput}
			<div class="relative space-y-2">
				<input
					type="text"
					bind:value={customItemName}
					placeholder="Enter custom item name"
					class="lora w-full rounded border border-gray-300 p-2 pr-8 text-base text-black"
				/>
				<Button
					variant="default"
					onClick={() => onPickUp(customItemName)}
					wide
					disabled={!customItemName.trim()}
				>
					Add Item
				</Button>
			</div>
		{:else if showScrolls}
			<div class="space-y-4">
				<div class="space-y-2">
					<h3 class="text-lg font-semibold">Clean Scrolls</h3>
					<div class="grid grid-cols-1 gap-2">
						{#each scrolls.cleanScrolls as scroll}
							<button
								class="group flex w-full flex-col items-start rounded border border-gray-300 bg-white p-2 text-left hover:border-purple-500 hover:bg-purple-50"
								on:click={() => onPickUp(scroll.name)}
							>
								<span class="lora text-sm font-medium">{scroll.name}</span>
								{#if scroll.description}
									<span class="lora mt-1 text-xs text-gray-600">{scroll.description}</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<h3 class="text-lg font-semibold">Unclean Scrolls</h3>
					<div class="grid grid-cols-1 gap-2">
						{#each scrolls.uncleanScrolls as scroll}
							<button
								class="group flex w-full flex-col items-start rounded border border-gray-300 bg-white p-2 text-left hover:border-purple-500 hover:bg-purple-50"
								on:click={() => onPickUp(scroll.name)}
							>
								<span class="lora text-sm font-medium">{scroll.name}</span>
								{#if scroll.description}
									<span class="lora mt-1 text-xs text-gray-600">{scroll.description}</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<div class="space-y-2">
				<div class="grid grid-cols-1 gap-2">
					{#each items as item}
						<button
							class="group flex w-full flex-col items-start rounded border border-gray-300 bg-white p-2 text-left hover:border-purple-500 hover:bg-purple-50"
							on:click={() => onPickUp(item.item)}
						>
							<div class="flex w-full items-start justify-between">
								<span class="lora text-sm font-medium">{item.item}</span>
								<span class="lora text-xs text-gray-600">{item.cost} Gold</span>
							</div>
							{#if item.description}
								<span class="lora mt-1 text-xs text-gray-600">{item.description}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<CloseButton onClick={onClose} />
	</dialog>
</div>

<style>
	button.group:hover span {
		color: rgb(147, 51, 234);
	}
</style>

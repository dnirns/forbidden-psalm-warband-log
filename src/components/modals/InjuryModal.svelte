<script lang="ts">
	import { injuries } from '$lib/data/injuries';
	import { lockBodyScroll, unlockBodyScroll } from '$lib/utils/modalUtils';
	import CloseButton from '../ui/CloseButton.svelte';
	import Button from '../ui/Button.svelte';
	import { onMount } from 'svelte';

	export let onClose: () => void;
	export let onAddInjury: (injuryName: string) => void;

	let selectedInjury = '';

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		if (selectedInjury) {
			onAddInjury(selectedInjury);
			onClose();
		}
	};

	const handleSubmitClick = () => {
		if (selectedInjury) {
			onAddInjury(selectedInjury);
			onClose();
		}
	};

	onMount(() => {
		lockBodyScroll();
		return () => {
			unlockBodyScroll();
		};
	});

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onClose();
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

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
		class="relative max-h-[80vh] w-96 overflow-y-auto border-2 border-white/30 bg-white p-6 text-black"
		aria-modal="true"
		on:click|stopPropagation={() => {}}
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-bold text-black">Add Injury</h2>
			<CloseButton onClick={onClose} />
		</div>

		<form on:submit={handleSubmit} class="space-y-6">
			<div>
				<label for="injury" class="mb-2 block text-xl font-bold text-black"> Select Injury: </label>
				<select
					id="injury"
					bind:value={selectedInjury}
					class="lora w-full rounded border border-gray-300 bg-white p-2 pr-8 text-base text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
				>
					<option value="" disabled>Select an injury...</option>
					{#each injuries as injury}
						<option value={injury.name}>
							{injury.name}
						</option>
					{/each}
				</select>
			</div>

			{#if selectedInjury}
				<div class="lora mt-2 text-sm text-gray-600">
					{injuries.find((i) => i.name === selectedInjury)?.description}
				</div>
			{/if}

			<div class="flex justify-end gap-2">
				<Button variant="default" onClick={onClose} type="button">Cancel</Button>
				<Button
					variant="danger"
					onClick={handleSubmitClick}
					type="button"
					wide
					disabled={!selectedInjury}>Add</Button
				>
			</div>
		</form>
	</dialog>
</div>

<style>
	select option {
		padding: 0.5rem;
		margin: 0.25rem;
		border-radius: 0.25rem;
		border: none;
	}

	select option:checked {
		background: linear-gradient(0deg, #a855f7 0%, #a855f7 100%);
		color: white;
		border: none;
	}

	select option:hover {
		background: linear-gradient(0deg, #a855f7 0%, #a855f7 100%);
		color: white;
		border: none;
	}
	select {
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23000000' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		appearance: none;
		-webkit-appearance: none;
	}
</style>

<script lang="ts">
	import Button from '../ui/Button.svelte';
	import EditButton from '../ui/EditButton.svelte';
	import { warbandStore } from '$lib/stores/warbandStore';
	import { tick } from 'svelte';

	export let warbandName: string;

let isEditing = false;
let tempName = '';
let nameInput: HTMLInputElement | null = null;
let errorMessage = '';

	const startEditing = async () => {
		isEditing = true;
		tempName = warbandName;
		await tick();
		nameInput?.focus();
	};

	const saveWarbandName = async () => {
		try {
			await warbandStore.updateWarband({ warbandName: tempName });
			isEditing = false;
			errorMessage = '';
		} catch (error) {
			console.error('Failed to save warband name', error);
			errorMessage = 'Failed to save warband name. Please try again.';
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') saveWarbandName();
		if (e.key === 'Escape') isEditing = false;
	};
</script>

{#if isEditing}
	<div class="flex items-center gap-2">
		<input
			type="text"
			bind:value={tempName}
			bind:this={nameInput}
			class="lora w-48 rounded border border-gray-300 px-2 py-1 text-base text-black"
			on:keydown={handleKeydown}
		/>
		<Button onClick={saveWarbandName}>Save</Button>
		{#if errorMessage}
			<span class="text-sm text-red-500">{errorMessage}</span>
		{/if}
	</div>
{:else}
	<h1 class="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
		<span class="lora text-xl font-extrabold sm:text-2xl">
			{warbandName || 'Unnamed Warband'}
		</span>
		<EditButton onClick={startEditing} size="lg" />
	</h1>
{/if}

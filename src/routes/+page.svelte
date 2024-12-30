<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { browser } from '$app/environment';

	import {
		isMobileUserAgent,
		loadWarbandData,
		debounceSave,
		defaultCharacter,
		calculateCharacterCost
	} from '$lib/utils';
	import { type Character, type WarbandData } from '$lib/types';
	import items from '$lib/items';
	import { stats, statValues, STORAGE_KEY } from '$lib/constants';
	import CharacterCard from '../components/CharacterCard.svelte';

	let currentCharacterGold = 0;
	let originalCharacterGold = 0;

	let warbandData: WarbandData = {
		warbandName: '',
		characters: [],
		gold: 50
	};

	let selectedIndex: number = -1;
	let showModal = false;
	let editingWarbandName = false;
	let tempWarbandName = '';
	let isMobile = false;
	let initialLoadComplete = false;

	if (browser) {
		isMobile = isMobileUserAgent(navigator.userAgent);
	}

	let currentCharacter: Character = defaultCharacter();
	let featText = '';
	let flawText = '';

	onMount(() => {
		if (browser) {
			const loadedData = loadWarbandData();
			if (loadedData && typeof loadedData === 'object') {
				warbandData = loadedData;
			}
			initialLoadComplete = true;
		}
	});

	const updateInventory = (newVal: number) => {
		const currentLength = currentCharacter.items.length;
		if (newVal > currentLength) {
			currentCharacter.items = currentCharacter.items.concat(
				Array(newVal - currentLength).fill('')
			);
		} else if (newVal < currentLength) {
			currentCharacter.items = currentCharacter.items.slice(0, newVal);
		}
		currentCharacter.inventory = newVal;
	};

	const deleteItem = (index: number) => {
		currentCharacter.items.splice(index, 1);
		updateInventory(currentCharacter.items.length);
	};

	$: currentCharacterGold = calculateCharacterCost(currentCharacter, items);
	$: availableGoldBefore = warbandData.gold + originalCharacterGold;
	$: availableGold = Math.max(0, availableGoldBefore - currentCharacterGold);
	$: warbandData, debounceSave(STORAGE_KEY, warbandData, initialLoadComplete, browser);

	const addOrUpdateCharacter = () => {
		const hpValue = parseInt(currentCharacter.hp as unknown as string, 10) || 0;
		const armourValue = parseInt(currentCharacter.armour as unknown as string, 10) || 0;

		currentCharacter.hp = hpValue;
		currentCharacter.armour = armourValue;

		const costDifference = originalCharacterGold - currentCharacterGold;
		warbandData.gold += costDifference;

		if (warbandData.gold < 0) {
			warbandData.gold = 0;
		}

		if (selectedIndex === -1) {
			warbandData.characters = [...warbandData.characters, { ...currentCharacter }];
		} else {
			warbandData.characters[selectedIndex] = { ...currentCharacter };
			warbandData.characters = [...warbandData.characters];
		}

		currentCharacterGold = 0;
		originalCharacterGold = 0;
		selectedIndex = -1;
		currentCharacter = defaultCharacter();
		showModal = false;
	};

	const editCharacter = (index: number) => {
		selectedIndex = index;
		currentCharacter = { ...warbandData.characters[index] };
		originalCharacterGold = calculateCharacterCost(currentCharacter, items);
		showModal = true;
	};

	const deleteCharacter = (index: number) => {
		let characterCost = 0;
		const characterToDelete = warbandData.characters[index];
		for (const selectedItem of characterToDelete.items) {
			if (selectedItem !== '') {
				const found = items.find((i) => i.item === selectedItem);
				if (found) {
					characterCost += found.cost;
				}
			}
		}
		warbandData.gold += characterCost;
		warbandData.characters.splice(index, 1);
		warbandData.characters = [...warbandData.characters];

		if (selectedIndex === index) {
			selectedIndex = -1;
			currentCharacter = defaultCharacter();
		} else if (selectedIndex > index) {
			selectedIndex--;
		}
	};

	const addCharacter = () => {
		selectedIndex = -1;
		currentCharacter = defaultCharacter();
		originalCharacterGold = 0;
		showModal = true;
	};

	const closeModal = () => {
		showModal = false;
		if (selectedIndex !== -1) {
			selectedIndex = -1;
			currentCharacter = defaultCharacter();
		}
	};

	const startEditingWarbandName = () => {
		tempWarbandName = warbandData.warbandName;
		editingWarbandName = true;
	};

	const saveWarbandName = () => {
		warbandData.warbandName = tempWarbandName;
		editingWarbandName = false;
	};

	const handleInventoryInput = (e: Event) => {
		const value = (e.target as HTMLInputElement).value;
		const parsedValue = parseInt(value, 10);
		if (!isNaN(parsedValue)) {
			updateInventory(parsedValue);
		}
	};

	const addFeat = () => {
		if (featText.trim()) {
			currentCharacter.feats = [...currentCharacter.feats, featText.trim()];
			featText = '';
		}
	};

	const addFlaw = () => {
		if (flawText.trim()) {
			currentCharacter.flaws = [...currentCharacter.flaws, flawText.trim()];
			flawText = '';
		}
	};

	const removeFeat = (index: number) => {
		currentCharacter.feats = currentCharacter.feats.filter((_, i) => i !== index);
	};

	const removeFlaw = (index: number) => {
		currentCharacter.flaws = currentCharacter.flaws.filter((_, i) => i !== index);
	};
</script>

<div
	class="medievalsharp-regular text-whi min-h-screen space-y-6 bg-stone-800 p-4 text-base text-white"
>
	<div class="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-4 md:space-y-0">
		{#if editingWarbandName}
			<div
				class="flex flex-col items-start space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0"
			>
				<p>Warband Name:</p>
				<input
					class="inline-input rounded border border-gray-300 bg-white px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
					type="text"
					autocorrect="off"
					autocapitalize="none"
					bind:value={tempWarbandName}
				/>
				<button
					type="button"
					class="rounded bg-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
					on:click={saveWarbandName}>Done</button
				>
			</div>
		{:else}
			<div
				class="flex flex-col items-start space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0"
			>
				<p>Warband Name:</p>
				<span class="text-xl font-bold">{warbandData.warbandName || 'No Warband Name'}</span>
				<button
					type="button"
					class="text-blackw text-blackfocus:ring-2 rounded bg-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-black"
					on:click={startEditingWarbandName}>Edit</button
				>
			</div>
		{/if}
		<p>Gold: {availableGold}</p>
	</div>

	<h2 class="text-xl font-bold underline">Warband Characters</h2>
	{#if warbandData.characters.length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each warbandData.characters as char, i}
				<CharacterCard {editCharacter} {deleteCharacter} {items} {char} {i} />
			{/each}
		</div>
	{:else}
		<p>No characters saved yet.</p>
	{/if}

	<div class="space-x-2">
		<button
			type="button"
			class="rounded bg-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
			on:click={addCharacter}
			aria-label="Add a new character">Add Character</button
		>
	</div>
</div>

{#if showModal}
	<div
		transition:fade
		class="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50"
	>
		<div
			transition:scale
			class="relative max-h-[90vh] w-11/12 max-w-md overflow-auto rounded bg-white p-4 pr-6 text-black shadow"
			style="-webkit-overflow-scrolling: touch;"
		>
			<button
				class="absolute right-2 top-2 z-50 text-black focus:outline-none focus:ring-2 focus:ring-black"
				on:click={closeModal}
				aria-label="Close modal">&times;</button
			>
			<h2 class="t mb-4 text-xl font-bold">
				{selectedIndex === -1 ? 'Add Character' : 'Edit Character'}
			</h2>
			<form on:submit|preventDefault={addOrUpdateCharacter} class="space-y-4">
				<div>
					<p class="block font-bold text-black">Name:</p>
					<input
						type="text"
						autocorrect="off"
						autocapitalize="none"
						bind:value={currentCharacter.name}
						class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-black"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					{#each stats as stat}
						<div>
							<p class="block font-bold text-black">{stat.label}:</p>
							<select
								bind:value={currentCharacter[stat.key as keyof Character]}
								class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-black"
							>
								{#each statValues as value}
									<option {value}>{value}</option>
								{/each}
							</select>
						</div>
					{/each}
				</div>

				<div>
					<p class="block font-bold text-black">Feats:</p>
					<ul class="mb-2 ml-4 list-disc space-y-2">
						{#each currentCharacter.feats as feat, i}
							<li>
								{feat}
								<button
									type="button"
									class="text-lg font-extrabold text-red-600 hover:opacity-60"
									on:click={() => removeFeat(i)}
									aria-label="Remove flaw">X</button
								>
							</li>
						{/each}
					</ul>
					<input
						bind:value={featText}
						placeholder="Enter a flaw..."
						class="w-full rounded border border-gray-300 px-3 py-2"
					/>
					<button
						class="my-2 rounded bg-gray-300 px-4 py-2 text-sm hover:opacity-60 focus:outline-none"
						type="button"
						on:click={addFeat}>Add Feat</button
					>
				</div>

				<div>
					<p class="block font-bold text-black">Flaws:</p>
					<ul class="mb-2 ml-4 list-disc space-y-2">
						{#each currentCharacter.flaws as flaw, i}
							<li>
								{flaw}
								<button
									type="button"
									class="text-lg font-extrabold text-red-600 hover:opacity-60"
									on:click={() => removeFlaw(i)}
									aria-label="Remove flaw">X</button
								>
							</li>
						{/each}
					</ul>

					<input
						bind:value={flawText}
						placeholder="Enter a flaw..."
						class="w-full rounded border border-gray-300 px-3 py-2"
					/>
					<button
						class="my-2 rounded bg-gray-300 px-4 py-2 text-sm hover:opacity-60"
						type="button"
						on:click={addFlaw}>Add Flaw</button
					>
				</div>

				<div>
					<p class="block font-bold text-black">HP:</p>
					<input
						type={isMobile ? 'text' : 'number'}
						inputmode="numeric"
						pattern="[0-9]*"
						min="0"
						bind:value={currentCharacter.hp}
						placeholder="HP"
						class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-black"
					/>
				</div>

				<div>
					<p class="block font-bold text-black">Armour:</p>
					<input
						type={isMobile ? 'text' : 'number'}
						inputmode="numeric"
						pattern="[0-9]*"
						min="0"
						bind:value={currentCharacter.armour}
						placeholder="Armour"
						class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-black"
					/>
				</div>

				<div>
					<p class="block font-bold text-black">Inventory (number of slots):</p>
					<input
						type={isMobile ? 'text' : 'number'}
						inputmode="numeric"
						pattern="[0-9]*"
						min="0"
						on:input={handleInventoryInput}
						bind:value={currentCharacter.inventory}
						class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-black"
					/>
				</div>

				{#if currentCharacter.inventory > 0}
					<h3 class="font-bold text-black">Items:</h3>
					<div class="space-y-2">
						{#each currentCharacter.items as item, i}
							<div class="flex items-center space-y-2 sm:space-x-2 sm:space-y-0">
								<select
									class="w-full flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-black sm:w-auto"
									bind:value={currentCharacter.items[i]}
								>
									<option value="">Select an item</option>
									{#each items as option}
										<option disabled={option.cost > availableGold} value={option.item}>
											{option.item} ({option.cost} Gold)
										</option>
									{/each}
								</select>
								<button
									type="button"
									class="ml-2 rounded bg-red-300 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-black sm:ml-0"
									on:click={() => {
										deleteItem(i);
									}}>Delete</button
								>
							</div>
						{/each}
					</div>
				{/if}

				<button
					type="submit"
					class="rounded bg-gray-300 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-black"
				>
					{selectedIndex === -1 ? 'Add Character' : 'Update Character'}
				</button>
			</form>
		</div>
	</div>
{/if}

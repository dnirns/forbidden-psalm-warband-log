<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { calculateCharacterCost } from '$lib/utils';
	import { type Character, type WarbandData } from '$lib/types';
	import items from '$lib/items';
	import { stats, statValues } from '$lib/stats';

	const STORAGE_KEY = 'warband_data';

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

	// check if the user is on a mobile device for different numerical input types
	if (browser) {
		const ua = navigator.userAgent.toLowerCase();
		isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua);
	}

	const defaultCharacter = (): Character => ({
		agility: 0,
		armour: 0,
		feats: '',
		flaws: '',
		hp: 0,
		inventory: 0,
		items: [],
		name: '',
		presence: 0,
		strength: 0,
		toughness: 0
	});

	let currentCharacter: Character = defaultCharacter();

	onMount(() => {
		const savedData = localStorage.getItem(STORAGE_KEY);
		if (savedData) {
			try {
				const loadedData = JSON.parse(savedData) as WarbandData;
				if (loadedData && typeof loadedData === 'object' && Array.isArray(loadedData.characters)) {
					warbandData = loadedData;
				}
			} catch {
				console.error('Failed to load data from local storage');
			}
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
		recalculateCost();
	};

	const deleteItem = (index: number) => {
		currentCharacter.items.splice(index, 1);
		updateInventory(currentCharacter.items.length);
	};

	const recalculateCost = () => {
		currentCharacterGold = calculateCharacterCost(currentCharacter, items);
	};

	const saveAll = () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(warbandData));
		alert('Warband and characters saved!');
	};

	const addOrUpdateCharacter = () => {
		const hpValue = parseInt(currentCharacter.hp as unknown as string, 10) || 0;
		const armourValue = parseInt(currentCharacter.armour as unknown as string, 10) || 0;

		currentCharacter.hp = hpValue;
		currentCharacter.armour = armourValue;

		recalculateCost();

		const costDifference = originalCharacterGold - currentCharacterGold;

		warbandData.gold += costDifference;

		if (selectedIndex === -1) {
			// add a new character
			warbandData.characters = [...warbandData.characters, { ...currentCharacter }];
		} else {
			// update an existing character
			warbandData.characters[selectedIndex] = { ...currentCharacter };
			warbandData.characters = [...warbandData.characters];
		}
		// reset state
		currentCharacterGold = 0;
		originalCharacterGold = 0;
		selectedIndex = -1;
		currentCharacter = defaultCharacter();
		showModal = false;
	};

	const editCharacter = (index: number) => {
		selectedIndex = index;
		currentCharacter = { ...warbandData.characters[index] };
		recalculateCost();
		originalCharacterGold = currentCharacterGold;
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
		recalculateCost();
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
</script>

<div class="min-h-screen space-y-6 bg-black p-4 text-base text-white">
	<div class="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-4 md:space-y-0">
		{#if editingWarbandName}
			<div
				class="flex flex-col items-start space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0"
			>
				<p>Warband Name:</p>
				<input
					class="inline-input rounded border border-gray-700 bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white"
					type="text"
					autocorrect="off"
					autocapitalize="none"
					bind:value={tempWarbandName}
				/>
				<button
					type="button"
					class="rounded bg-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
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
					class="rounded bg-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
					on:click={startEditingWarbandName}>Edit</button
				>
			</div>
		{/if}
		<p>Gold: {warbandData.gold - currentCharacterGold}</p>
	</div>

	<h2 class="text-xl font-bold underline">Warband Characters</h2>
	{#if warbandData.characters.length > 0}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each warbandData.characters as char, i}
				<div class="space-y-2 rounded bg-gray-900 p-4 text-sm shadow sm:text-base">
					<h3 class="text-lg font-bold underline">{char.name || 'Unnamed Character'}</h3>
					<p><strong>Agility:</strong> {char.agility}</p>
					<p><strong>Presence:</strong> {char.presence}</p>
					<p><strong>Strength:</strong> {char.strength}</p>
					<p><strong>Toughness:</strong> {char.toughness}</p>
					<p><strong>Feats:</strong> {char.feats}</p>
					<p><strong>Flaws:</strong> {char.flaws}</p>
					<p><strong>HP:</strong> {char.hp}</p>
					<p><strong>Armour:</strong> {char.armour}</p>
					<p><strong>Inventory Slots:</strong> {char.inventory}</p>
					{#if char.inventory > 0}
						<p><strong>Items:</strong></p>
						<ol class="list-decimal px-4">
							{#each char.items as item}
								<li class="py-1">
									{#each items as matchedItem (matchedItem.item)}
										{#if matchedItem.item === item}
											{matchedItem.item} ({matchedItem.cost} gold)
										{/if}
									{/each}
									{#if !items.find((i) => i.item === item)}
										Empty
									{/if}
								</li>
							{/each}
						</ol>
					{/if}
					<div class="space-x-2">
						<button
							type="button"
							class="rounded bg-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
							on:click={() => editCharacter(i)}>Edit</button
						>
						<button
							type="button"
							class="rounded bg-red-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
							on:click={() => deleteCharacter(i)}>Delete</button
						>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p>No characters saved yet.</p>
	{/if}

	<div class="space-x-2">
		<button
			type="button"
			class="rounded bg-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
			on:click={addCharacter}>Add Character</button
		>
		<button
			type="button"
			class="rounded bg-gray-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
			on:click={saveAll}>Save All</button
		>
	</div>
</div>

{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div
			class="relative max-h-[90vh] w-11/12 max-w-md overflow-auto rounded bg-gray-900 p-4 pr-6 text-white shadow"
			style="-webkit-overflow-scrolling: touch;"
		>
			<button
				class="absolute right-2 top-2 z-50 text-white focus:outline-none focus:ring-2 focus:ring-white"
				on:click={closeModal}>&times;</button
			>
			<h2 class="mb-4 text-xl font-bold">
				{selectedIndex === -1 ? 'Add Character' : 'Edit Character'}
			</h2>
			<form on:submit|preventDefault={addOrUpdateCharacter} class="space-y-4">
				<div>
					<p class="block font-bold">Name:</p>
					<input
						type="text"
						autocorrect="off"
						autocapitalize="none"
						bind:value={currentCharacter.name}
						class="w-full rounded border border-gray-700 bg-black px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					{#each stats as stat}
						<div>
							<p class="block font-bold">{stat.label}:</p>
							<select
								bind:value={currentCharacter[stat.key as keyof Character]}
								class="w-full rounded border border-gray-700 bg-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white"
							>
								{#each statValues as value}
									<option {value}>{value}</option>
								{/each}
							</select>
						</div>
					{/each}
				</div>

				<div>
					<p class="block font-bold">Feats:</p>
					<textarea
						id="feats"
						bind:value={currentCharacter.feats}
						class="w-full rounded border border-gray-700 bg-black px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white"
					></textarea>
				</div>

				<div>
					<p class="block font-bold">Flaws:</p>
					<textarea
						bind:value={currentCharacter.flaws}
						class="w-full rounded border border-gray-700 bg-black px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white"
					></textarea>
				</div>

				<div>
					<p class="block font-bold">HP:</p>
					<input
						type={isMobile ? 'text' : 'number'}
						inputmode="numeric"
						pattern="[0-9]*"
						min="0"
						bind:value={currentCharacter.hp}
						placeholder="HP"
						class="w-full rounded border border-gray-700 bg-black px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white"
					/>
				</div>

				<div>
					<p class="block font-bold">Armour:</p>
					<input
						type={isMobile ? 'text' : 'number'}
						inputmode="numeric"
						pattern="[0-9]*"
						min="0"
						bind:value={currentCharacter.armour}
						placeholder="Armour"
						class="w-full rounded border border-gray-700 bg-black px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white"
					/>
				</div>

				<div>
					<p class="block font-bold">Inventory (number of slots):</p>
					<input
						type={isMobile ? 'text' : 'number'}
						inputmode="numeric"
						pattern="[0-9]*"
						min="0"
						on:input={(e) => updateInventory(parseInt((e.target as HTMLInputElement).value))}
						bind:value={currentCharacter.inventory}
						class="w-full rounded border border-gray-700 bg-black px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white"
					/>
				</div>

				{#if currentCharacter.inventory > 0}
					<h3 class="font-bold">Items:</h3>
					<div class="space-y-2">
						{#each currentCharacter.items as item, i}
							<div class="flex items-center space-x-2">
								<select
									class="flex-1 rounded border border-gray-700 bg-black px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white"
									bind:value={currentCharacter.items[i]}
									on:input={recalculateCost}
								>
									<option value="">Select an item</option>
									{#each items as option}
										<option
											disabled={option.cost > warbandData.gold - currentCharacterGold}
											value={option.item}
										>
											{option.item} ({option.cost} Gold)
										</option>
									{/each}
								</select>
								<button
									type="button"
									class="rounded bg-red-700 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white"
									on:click={() => {
										deleteItem(i);
										recalculateCost();
									}}>Delete</button
								>
							</div>
						{/each}
					</div>
				{/if}

				<button
					type="submit"
					class="rounded bg-gray-700 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-white"
				>
					{selectedIndex === -1 ? 'Add Character' : 'Update Character'}
				</button>
			</form>
		</div>
	</div>
{/if}

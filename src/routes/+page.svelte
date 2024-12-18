<script lang="ts">
	import { onMount } from 'svelte';
	import { calculateCharacterCost } from '$lib/utils';
	import { type Character, type WarbandData } from '$lib/types';
	import items from '$lib/items';

	const STORAGE_KEY = 'warband_data';

	let currentCharacterGold = 0;
	let originalCharacterGold = 0;

	let warbandData: WarbandData = {
		warband: '',
		characters: [],
		gold: 50
	};

	let selectedIndex: number = -1;
	let showModal = false;
	let editingWarbandName = false;
	let tempWarbandName = '';

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
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const loaded = JSON.parse(saved) as WarbandData;
				if (loaded && typeof loaded === 'object' && Array.isArray(loaded.characters)) {
					warbandData = loaded;
				}
			} catch {
				console.error('Failed to load data from local storage');
			}
		}
	});

	const updateInventory = (newVal: number) => {
		const currentLength = currentCharacter.items.length;
		if (newVal > currentLength) {
			for (let i = currentLength; i < newVal; i++) {
				currentCharacter.items.push('');
			}
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
		// recalculate the cost in case anything changed
		recalculateCost();

		// calc cost difference
		const costDifference = originalCharacterGold - currentCharacterGold;

		// adjust total gold based on difference
		warbandData.gold += costDifference;

		if (selectedIndex === -1) {
			// new character
			warbandData.characters = [...warbandData.characters, { ...currentCharacter }];
		} else {
			// existing character updated
			warbandData.characters[selectedIndex] = { ...currentCharacter };
			warbandData.characters = [...warbandData.characters];
		}

		// reset values
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
		// store the original gold cost before changes
		originalCharacterGold = currentCharacterGold;
		showModal = true;
	};

	const deleteCharacter = (index: number) => {
		// calc how much gold items are worth
		let characterCost = 0;
		// select the character to delete
		const characterToDelete = warbandData.characters[index];

		// loop through the items and add up the gold to remove
		for (const selectedItem of characterToDelete.items) {
			if (selectedItem !== '') {
				const found = items.find((i) => i.item === selectedItem);
				if (found) {
					characterCost += found.cost;
				}
			}
		}

		// add gold back to the warband's total gold
		warbandData.gold += characterCost;

		// remove the character
		warbandData.characters.splice(index, 1);
		warbandData.characters = [...warbandData.characters];

		if (selectedIndex === index) {
			selectedIndex = -1;
			currentCharacter = defaultCharacter();
		} else if (selectedIndex > index) {
			selectedIndex--;
		}
	};

	const openAddModal = () => {
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
		tempWarbandName = warbandData.warband;
		editingWarbandName = true;
	};

	const saveWarbandName = () => {
		warbandData.warband = tempWarbandName;
		editingWarbandName = false;
	};
</script>

<div class="min-h-screen space-y-6 bg-black p-4 text-white">
	<div class="flex items-center space-x-4">
		{#if editingWarbandName}
			<div class="flex items-center space-x-2">
				<p>Warband Name:</p>
				<input
					class="inline-input rounded border border-gray-700 bg-gray-900 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
					type="text"
					bind:value={tempWarbandName}
				/>
				<button
					type="button"
					class="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600"
					on:click={saveWarbandName}>Done</button
				>
			</div>
		{:else}
			<div class="flex items-center space-x-2">
				<p>Warband Name:</p>
				<span class="text-xl font-bold">{warbandData.warband || 'No Warband Name'}</span>
				<button
					type="button"
					class="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600"
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
				<div class="space-y-2 rounded bg-gray-900 p-4 shadow">
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
								<li>
									{#each items as matchedItem (matchedItem.item)}
										{#if matchedItem.item === item}
											{matchedItem.item} ({matchedItem.cost} gold)
										{/if}
									{/each}
									{#if !items.find((i) => i.item === item)}
										{item} (Unknown cost)
									{/if}
								</li>
							{/each}
						</ol>
					{/if}
					<div class="space-x-2">
						<button
							type="button"
							class="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600"
							on:click={() => editCharacter(i)}>Edit</button
						>
						<button
							type="button"
							class="rounded bg-red-700 px-3 py-1 hover:bg-red-600"
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
			class="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600"
			on:click={openAddModal}>Add Character</button
		>
		<button
			type="button"
			class="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600"
			on:click={saveAll}
		>
			Save All
		</button>
	</div>
</div>

{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div
			class="relative max-h-[90vh] w-11/12 max-w-md overflow-auto rounded bg-gray-900 p-4 pr-6 text-white shadow"
		>
			<button
				class="absolute right-2 top-2 z-50 text-white hover:text-gray-300"
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
						bind:value={currentCharacter.name}
						class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
					/>
				</div>

				<ol class="list-decimal">
					<div>
						<p class="block font-bold">Agility:</p>
						<input
							type="number"
							min="-3"
							max="3"
							bind:value={currentCharacter.agility}
							class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
						/>
					</div>

					<div>
						<p class="block font-bold">Presence:</p>
						<input
							type="number"
							bind:value={currentCharacter.presence}
							class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
						/>
					</div>

					<div>
						<p class="block font-bold">Strength:</p>
						<input
							type="number"
							bind:value={currentCharacter.strength}
							class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
						/>
					</div>

					<div>
						<p class="block font-bold">Toughness:</p>
						<input
							type="number"
							bind:value={currentCharacter.toughness}
							class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
						/>
					</div>
				</ol>

				<div>
					<p class="block font-bold">Feats:</p>
					<textarea
						id="feats"
						bind:value={currentCharacter.feats}
						class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
					></textarea>
				</div>

				<div>
					<p class="block font-bold">Flaws:</p>
					<textarea
						bind:value={currentCharacter.flaws}
						class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
					></textarea>
				</div>

				<div>
					<p class="block font-bold">HP:</p>
					<input
						type="number"
						bind:value={currentCharacter.hp}
						class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
					/>
				</div>

				<div>
					<p class="block font-bold">Armour:</p>
					<input
						type="number"
						bind:value={currentCharacter.armour}
						class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
					/>
				</div>

				<div>
					<p class="block font-bold">Inventory (number of slots):</p>
					<input
						type="number"
						min="0"
						on:change={(e) => updateInventory(parseInt((e.target as HTMLInputElement).value))}
						bind:value={currentCharacter.inventory}
						class="w-full rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
					/>
				</div>

				{#if currentCharacter.inventory > 0}
					<h3 class="font-bold">Items:</h3>
					<div class="space-y-2">
						{#each currentCharacter.items as item, i}
							<div class="flex items-center space-x-2">
								<select
									class="flex-1 rounded border border-gray-700 bg-black px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white"
									bind:value={currentCharacter.items[i]}
									on:change={recalculateCost}
								>
									<option value="">Select an item</option>
									{#each items as option}
										<option value={option.item}>{option.item} ({option.cost} Gold)</option>
									{/each}
								</select>
								<button
									type="button"
									class="rounded bg-red-700 px-3 py-1 hover:bg-red-600"
									on:click={() => {
										deleteItem(i);
										recalculateCost();
									}}>Delete</button
								>
							</div>
						{/each}
					</div>
				{/if}

				<button type="submit" class="rounded bg-gray-700 px-3 py-1 hover:bg-gray-600">
					{selectedIndex === -1 ? 'Add Character' : 'Update Character'}
				</button>
			</form>
		</div>
	</div>
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged, type User } from 'firebase/auth';
	import { isMobileUserAgent, defaultCharacter, calculateCharacterCost } from '$lib/utils';
	import items from '$lib/items';
	import { stats, statValues } from '$lib/constants';

	import {
		signInWithGoogleService,
		signOutService,
		saveToFirestore,
		loadUserData,
		setupRealtimeListener
	} from '$lib/firebaseServices';

	import CharacterCard from '../components/CharacterCard.svelte';
	import { type Character, type WarbandData } from '$lib/types';

	let currentUser: User | null = null;
	let loading = true;

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

	if (browser) {
		isMobile = isMobileUserAgent(navigator.userAgent);
	}

	let currentCharacter: Character = defaultCharacter();
	let featText = '';
	let flawText = '';

	let unsubscribeFirestore: (() => void) | undefined;

	onMount(() => {
		if (browser) {
			const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
				currentUser = user;
				loading = true;

				if (user) {
					try {
						// Set up realtime listener for warband data
						unsubscribeFirestore = await setupRealtimeListener(user, (data) => {
							warbandData = data;
							console.log('Realtime update received:', data);
						});
						// Initial data load
						const initialData = await loadUserData(user);
						if (initialData) {
							warbandData = initialData;
						}
					} catch (error) {
						console.error('Error setting up data sync:', error);
					}
				} else {
					// Clean up listener when user signs out
					if (unsubscribeFirestore) {
						unsubscribeFirestore();
						unsubscribeFirestore = undefined;
					}
					// Reset warband data
					warbandData = {
						warbandName: '',
						characters: [],
						gold: 50
					};
				}
				loading = false;
			});

			// Cleanup on component destroy
			return () => {
				unsubscribeAuth();
				if (unsubscribeFirestore) {
					unsubscribeFirestore();
				}
			};
		}
	});

	const handleSignInWithGoogle = async () => {
		try {
			const result = await signInWithGoogleService();
			currentUser = result;
			await loadUserData(currentUser);
		} catch (error) {
			console.error('Error signing in:', error);
		}
	};

	const handleSignOut = async () => {
		try {
			await signOutService();
			currentUser = null;
			warbandData = {
				warbandName: '',
				characters: [],
				gold: 50
			};
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};

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

	const addOrUpdateCharacter = async () => {
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

		try {
			await saveToFirestore(currentUser, warbandData);
			currentCharacterGold = 0;
			originalCharacterGold = 0;
			selectedIndex = -1;
			currentCharacter = defaultCharacter();
			showModal = false;
		} catch (error) {
			alert('Failed to save changes. Please try again.');
			console.error('Error saving character:', error);
		}
	};

	const editCharacter = (index: number) => {
		selectedIndex = index;
		currentCharacter = { ...warbandData.characters[index] };
		originalCharacterGold = calculateCharacterCost(currentCharacter, items);
		showModal = true;
	};

	const deleteCharacter = async (index: number) => {
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

		try {
			await saveToFirestore(currentUser, warbandData);
			if (selectedIndex === index) {
				selectedIndex = -1;
				currentCharacter = defaultCharacter();
			} else if (selectedIndex > index) {
				selectedIndex--;
			}
		} catch (error) {
			alert('Failed to delete character. Please try again.');
			console.error('Error deleting character:', error);
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
	const saveWarbandName = async () => {
		warbandData.warbandName = tempWarbandName;
		editingWarbandName = false;

		try {
			await saveToFirestore(currentUser, warbandData);
		} catch (error) {
			alert('Failed to save warband name. Please try again.');
			editingWarbandName = true; // Revert to editing state if save fails
		}
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

<div class="space-y-6">
	{#if loading}
		<p>Loading...</p>
	{:else if currentUser}
		<!-- Sign out header -->
		<div class="mb-4 flex items-center justify-between">
			<p>Welcome, {currentUser.displayName}</p>
			<button
				class="rounded bg-gray-300 px-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
				on:click={handleSignOut}
			>
				Sign Out
			</button>
		</div>

		<!-- Warband name and gold section -->
		<div class="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-4 md:space-y-0">
			{#if editingWarbandName}
				<div
					class="flex flex-col items-start space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0"
				>
					<p>Warband Name:</p>
					<input
						class="inline-input rounded border border-gray-300 bg-white px-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
						type="text"
						bind:value={tempWarbandName}
					/>
					<button
						type="button"
						class="rounded bg-red-400 px-2 focus:outline-none focus:ring-2 focus:ring-black"
						on:click={saveWarbandName}
						>Done
					</button>
				</div>
			{:else}
				<div
					class="flex flex-col items-start space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0"
				>
					<p>Warband Name:</p>
					<span class="font-bold">{warbandData.warbandName || 'No Warband Name'}</span>
					<button
						type="button"
						class="rounded bg-gray-300 px-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
						on:click={startEditingWarbandName}
						>Edit
					</button>
				</div>
			{/if}
			<p>Gold: {availableGold}</p>
		</div>

		<!-- Characters section -->
		<h2 class="font-bold underline">Warband Characters</h2>
		{#if warbandData.characters.length > 0}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each warbandData.characters as char, i}
					<CharacterCard {editCharacter} {deleteCharacter} {items} {char} {i} />
				{/each}
			</div>
		{:else}
			<p>No characters saved yet.</p>
		{/if}

		<!-- Add character button -->
		<div class="space-x-2">
			<button
				type="button"
				class="rounded bg-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
				on:click={addCharacter}
				aria-label="Add a new character"
				>Add Character
			</button>
		</div>
	{:else}
		<!-- Sign in with Google -->
		<div class="flex flex-col items-center justify-center">
			<h1 class="mb-4 text-2xl">Welcome to Forbidden Psalm Warband Builder</h1>
			<button
				class="rounded bg-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
				on:click={handleSignInWithGoogle}
			>
				Sign in with Google
			</button>
		</div>
	{/if}
</div>

<!-- Edit / Create character modal -->
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
				aria-label="Close modal"
				>&times;
			</button>
			<h2 class="t mb-4 text-xl font-bold">
				{selectedIndex === -1 ? 'Add Character' : 'Edit Character'}
			</h2>
			<form on:submit|preventDefault={addOrUpdateCharacter} class="space-y-4">
				<div>
					<p class="block font-bold text-black">Name:</p>
					<input
						type="text"
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
									aria-label="Remove feat"
									>X
								</button>
							</li>
						{/each}
					</ul>
					<input
						bind:value={featText}
						placeholder="Enter a feat..."
						class="w-full rounded border border-gray-300 px-3 py-2"
					/>
					<button
						class="my-2 rounded bg-gray-300 px-4 py-2 text-sm hover:opacity-60 focus:outline-none"
						type="button"
						on:click={addFeat}
						>Add Feat
					</button>
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
									aria-label="Remove flaw"
									>X
								</button>
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
						on:click={addFlaw}
						>Add Flaw
					</button>
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
									}}
									>Delete
								</button>
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

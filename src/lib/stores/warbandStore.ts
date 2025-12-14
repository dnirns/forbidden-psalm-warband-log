import { writable, get } from 'svelte/store';
import type { WarbandData, Character } from '$lib/types';
import { defaultCharacter, calculateGoldDifference, calculateCharacterCost } from '$domain/rules';
import items from '$lib/data/items';
import { undoStore } from '$lib/stores/undoStore';
import {
	cloneCharacter,
	cloneWarbandData,
	clampHp,
	takeDamage as takeDamageMutation,
	reviveCharacter as reviveCharacterMutation,
	pickUpItem as pickUpItemMutation,
	dropItem as dropItemMutation,
	useAmmo as useAmmoMutation,
	refillAmmo as refillAmmoMutation,
	addInjury as addInjuryMutation,
	removeInjury as removeInjuryMutation
} from '$domain/services/characterService';
import {
	applySpellcasterChange,
	removeItemWithOptionalRefund,
	updateStatAndInventory,
	applyModifier,
	updateItemSelection,
	removeItem,
	removeModifier,
	selectScroll
} from '$domain/services/characterEditorService';
import { createWarbandApplicationService } from '$domain/application';
import { firestoreWarbandRepository } from '$infrastructure/firebase/firestoreWarbandRepository';

type WarbandStore = {
	data: WarbandData;
	isSaving: boolean;
	currentCharacter: Character;
	selectedIndex: number;
	showModal: boolean;
	originalCharacterGold: number;
};

const createWarbandStore = () => {
	const initialState: WarbandStore = {
		data: {
			warbandName: '',
			characters: [],
			gold: 50,
			xp: 0,
			notes: ''
		},
		isSaving: false,
		currentCharacter: defaultCharacter(),
		selectedIndex: -1,
		showModal: false,
		originalCharacterGold: 0
	};

	const { subscribe, set, update } = writable<WarbandStore>(initialState);

	const persistWarband = async (newData: Partial<WarbandData>) => {
		const store = get({ subscribe });
		const updatedData = { ...store.data, ...newData };

		update((state) => ({ ...state, isSaving: true }));

		try {
			await warbandApplication.save(updatedData);
			update((state) => ({ ...state, data: updatedData }));
		} finally {
			update((state) => ({ ...state, isSaving: false }));
		}
	};

	const warbandApplication = createWarbandApplicationService(firestoreWarbandRepository);

	const applyCharacterMutation = async (
		index: number,
		mutator: (character: Character) => Character,
		description?: string
	) => {
		const store = get({ subscribe });
		const character = store.data.characters[index];
		if (!character) return;

		const previousState = cloneCharacter(character);
		const previousWarbandData = cloneWarbandData(store.data);

		const updatedCharacter = mutator(character);
		const updatedCharacters = [...store.data.characters];
		updatedCharacters[index] = updatedCharacter;

		await persistWarband({
			characters: updatedCharacters
		});

		if (description) {
			undoStore.setUndoAction({
				characterIndex: index,
				previousState,
				warbandData: previousWarbandData,
				description
			});
		}
	};

	return {
		subscribe,
		set,
		async load(userId: string) {
			const data = await warbandApplication.load(userId);
			if (data) {
				warbandStore.initialize(data);
			}
		},

		async listenToRemote(userId: string) {
			return warbandApplication.subscribe(userId, (data) => {
				warbandStore.initialize(data);
			});
		},

		clampCharacterHp: async (index: number, maxHp: number) => {
			await applyCharacterMutation(index, (character) => clampHp(character, maxHp));
		},

		takeDamage: async (index: number, amount: number = 1) => {
			const store = get({ subscribe });
			const characterName = store.data.characters[index]?.name || 'character';
			await applyCharacterMutation(
				index,
				(character) => takeDamageMutation(character, amount),
				`Took ${amount} damage (${characterName})`
			);
		},

		reviveCharacter: async (index: number) => {
			await applyCharacterMutation(
				index,
				(character) => reviveCharacterMutation(character),
				`Revived ${get({ subscribe }).data.characters[index]?.name || 'character'}`
			);
		},

		pickUpItem: async (index: number, slotIndex: number, itemName: string) => {
			const store = get({ subscribe });
			const character = store.data.characters[index];
			if (!character) {
				return { success: true as const };
			}

			const result = pickUpItemMutation(character, slotIndex, itemName);
			if (result.error) {
				return { error: result.error };
			}

			await applyCharacterMutation(index, () => result.character, `Picked up ${itemName}`);
			return { success: true as const };
		},

		dropItem: async (index: number, itemName: string, slotIndex?: number) => {
			await applyCharacterMutation(
				index,
				(character) => dropItemMutation(character, itemName, slotIndex),
				`Dropped ${itemName}`
			);
		},

		useAmmo: async (index: number, weaponName: string, slotIndex: number) => {
			await applyCharacterMutation(
				index,
				(character) => useAmmoMutation(character, weaponName, slotIndex),
				`Used ammo for ${weaponName}`
			);
		},

		refillAmmo: async (index: number, weaponName: string, slotIndex: number) => {
			await applyCharacterMutation(
				index,
				(character) => refillAmmoMutation(character, weaponName, slotIndex),
				`Refilled ammo for ${weaponName}`
			);
		},

		addInjury: async (index: number, injuryName: string) => {
			await applyCharacterMutation(
				index,
				(character) => addInjuryMutation(character, injuryName),
				`Added injury: ${injuryName}`
			);
		},

		removeInjury: async (index: number, injuryName: string) => {
			await applyCharacterMutation(
				index,
				(character) => removeInjuryMutation(character, injuryName),
				`Removed injury: ${injuryName}`
			);
		},

		initialize: (data: WarbandData) => {
			set({
				...initialState,
				data,
				currentCharacter: defaultCharacter(),
				originalCharacterGold: 0
			});
		},

		reset: () => set(initialState),

		updateWarband: persistWarband,

		saveCharacter: async (character: Character, index: number = -1) => {
			const store = get({ subscribe });
			const goldDifference = calculateGoldDifference(character, index, store, items);

			const updatedCharacters = [...store.data.characters];

			if (index === -1) {
				updatedCharacters.push(character);
			} else {
				updatedCharacters[index] = character;
			}

			await warbandStore.updateWarband({
				characters: updatedCharacters,
				gold: Math.max(0, store.data.gold - goldDifference)
			});

			update((state) => ({
				...state,
				currentCharacter: defaultCharacter(),
				selectedIndex: -1,
				showModal: false,
				originalCharacterGold: 0
			}));
		},
		handleSpellcasterToggle: (checked: boolean) => {
			const store = get({ subscribe });
			const originalCharacter =
				store.selectedIndex !== -1 ? store.data.characters[store.selectedIndex] : null;
			const result = applySpellcasterChange(store.currentCharacter, originalCharacter, checked, items);
			if (!result.success) return result;

			update((state) => ({
				...state,
				currentCharacter: {
					...state.currentCharacter,
					isSpellcaster: checked,
					items: [...state.currentCharacter.items]
				}
			}));

			if (result.refundAmount > 0) {
				update((state) => ({
					...state,
					data: { ...state.data, gold: state.data.gold + result.refundAmount }
				}));
			}

			return result;
		},

		setItemForCurrentCharacter: (slotIndex: number, itemName: string) =>
			update((state) => ({
				...state,
				currentCharacter: updateItemSelection(state.currentCharacter, slotIndex, itemName, items)
			})),

		removeItemFromCurrent: (slotIndex: number) =>
			update((state) => {
				const itemName = state.currentCharacter.items[slotIndex];
				if (!itemName) return state;

				return {
					...state,
					currentCharacter: removeItem(state.currentCharacter, itemName, slotIndex, items)
				};
			}),

		selectScroll: (scrollType: 'clean' | 'unclean', scrollName: string | undefined) =>
			update((state) => ({
				...state,
				currentCharacter: selectScroll(state.currentCharacter, scrollType, scrollName)
			})),

		removeItemWithRefund: (itemName: string, originalItems: string[], slotIndex?: number) => {
			const store = get({ subscribe });
			const { updatedCharacter, goldRefund } = removeItemWithOptionalRefund(
				store.currentCharacter,
				itemName,
				originalItems,
				slotIndex,
				items
			);

			update((state) => ({
				...state,
				currentCharacter: updatedCharacter,
				data:
					goldRefund > 0
						? { ...state.data, gold: state.data.gold + goldRefund }
						: state.data
			}));
		},

		updateStatAndInventory: (stat: 'strength' | 'toughness' | 'agility' | 'presence', value: number) =>
			update((state) => ({
				...state,
				currentCharacter: updateStatAndInventory(state.currentCharacter, {
					stat,
					value,
					maxInventory: state.currentCharacter.inventory
				})
			})),

		applyModifier: (name: string, type: 'feat' | 'flaw' | 'injury') =>
			update((state) => ({
				...state,
				currentCharacter: applyModifier(state.currentCharacter, { name, type }, items)
			})),

		removeModifier: (name: string, type: 'feat' | 'flaw' | 'injury') =>
			update((state) => ({
				...state,
				currentCharacter: removeModifier(state.currentCharacter, { name, type })
			})),

		deleteCharacter: async (index: number) => {
			const store = get({ subscribe });
			const characterToDelete = store.data.characters[index];
			const characterCost = calculateCharacterCost(characterToDelete, items);

			const previousWarbandData = cloneWarbandData(store.data);

			const updatedCharacters = store.data.characters.filter((_, i) => i !== index);

			await warbandStore.updateWarband({
				characters: updatedCharacters,
				gold: store.data.gold + characterCost
			});

			undoStore.setUndoAction({
				characterIndex: index,
				previousState: cloneCharacter(characterToDelete),
				warbandData: previousWarbandData,
				description: `Deleted ${characterToDelete.name}`
			});
		},

		editCharacter: (index: number) => {
			const store = get({ subscribe });
			const character = store.data.characters[index];
			if (!character) return;

			const characterCopy = cloneCharacter(character);

			const originalGold = calculateCharacterCost(character, items);

			update((state) => ({
				...state,
				currentCharacter: characterCopy,
				selectedIndex: index,
				showModal: true,
				originalCharacterGold: originalGold
			}));
		},

		addCharacter: () => {
			update((state) => ({
				...state,
				currentCharacter: defaultCharacter(),
				selectedIndex: -1,
				showModal: true,
				originalCharacterGold: 0
			}));
		},

		closeModal: () => {
			update((state) => ({
				...state,
				currentCharacter: defaultCharacter(),
				selectedIndex: -1,
				showModal: false,
				originalCharacterGold: 0
			}));
		},

		updateCurrentCharacter: (updates: Partial<Character>) => {
			update((state) => ({
				...state,
				currentCharacter: { ...state.currentCharacter, ...updates }
			}));
		},

		updateGold: (newGold: number) => {
			update((state) => ({
				...state,
				data: { ...state.data, gold: newGold }
			}));
		}
	};
};

export const warbandStore = createWarbandStore();

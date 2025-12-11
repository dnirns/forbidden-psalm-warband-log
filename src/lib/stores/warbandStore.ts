import { writable, get } from 'svelte/store';
import type { WarbandData, Character } from '$lib/types';
import { saveToFirestore } from '$lib/firebase/firebaseServices';
import { auth } from '$lib/firebase/firebase';
import { defaultCharacter, calculateCharacterCost } from '$lib/utils';
import items from '$lib/data/items';
import { undoStore } from '$lib/stores/undoStore';

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

	const calculateGoldDifference = (character: Character, index: number, store: WarbandStore) => {
		const newCost = calculateCharacterCost(character, items);
		const oldCost = index === -1 ? 0 : calculateCharacterCost(store.data.characters[index], items);

		const droppedItemsCost =
			index === -1
				? 0
				: store.data.characters[index].items
						.filter((item) => item && item !== '' && !character.pickedUpItems?.includes(item))
						.reduce((total, item) => {
							const itemObj = items.find((i) => i.item === item);
							return total + (itemObj?.cost || 0);
						}, 0);

		return newCost - (oldCost - droppedItemsCost);
	};

	return {
		subscribe,
		set,

		initialize: (data: WarbandData) => {
			set({
				...initialState,
				data,
				currentCharacter: defaultCharacter(),
				originalCharacterGold: 0
			});
		},

		reset: () => set(initialState),

		updateWarband: async (newData: Partial<WarbandData>) => {
			const store = get({ subscribe });
			const updatedData = { ...store.data, ...newData };

			update((state) => ({ ...state, isSaving: true }));

			try {
				await saveToFirestore(auth.currentUser, updatedData);
				update((state) => ({ ...state, data: updatedData }));
			} finally {
				update((state) => ({ ...state, isSaving: false }));
			}
		},

		saveCharacter: async (character: Character, index: number = -1) => {
			const store = get({ subscribe });
			const goldDifference = calculateGoldDifference(character, index, store);

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

		deleteCharacter: async (index: number) => {
			const store = get({ subscribe });
			const characterToDelete = store.data.characters[index];
			const characterCost = calculateCharacterCost(characterToDelete, items);

			const previousWarbandData = {
				...store.data,
				characters: [...store.data.characters]
			};

			const updatedCharacters = store.data.characters.filter((_, i) => i !== index);

			await warbandStore.updateWarband({
				characters: updatedCharacters,
				gold: store.data.gold + characterCost
			});

			undoStore.setUndoAction({
				characterIndex: index,
				previousState: characterToDelete,
				warbandData: previousWarbandData,
				description: `Deleted ${characterToDelete.name}`
			});
		},

		editCharacter: (index: number) => {
			const store = get({ subscribe });
			const character = store.data.characters[index];
			if (!character) return;

			const characterCopy = {
				...character,
				items: [...character.items],
				feats: [...character.feats],
				flaws: [...character.flaws],
				pickedUpItems: [...(character.pickedUpItems || [])],
				ammoTrackers: character.ammoTrackers.map((tracker) => ({ ...tracker }))
			};

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

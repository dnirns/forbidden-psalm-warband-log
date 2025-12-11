import { writable, get } from 'svelte/store';
import type { Character, WarbandData } from '$lib/types';
import { saveToFirestore } from '$lib/firebase';
import { getAuth } from 'firebase/auth';

const TIMEOUT_DURATION = 5000;

export type UndoAction = {
	characterIndex: number;
	previousState: Character;
	warbandData: WarbandData;
	description: string;
};

const createUndoStore = () => {
	const { subscribe, set } = writable<UndoAction | null>(null);
	let timeoutId: number;

	return {
		subscribe,
		setUndoAction: (action: UndoAction) => {
			if (timeoutId) clearTimeout(timeoutId);

			set(action);
			timeoutId = setTimeout(() => set(null), TIMEOUT_DURATION);
		},
		clear: () => {
			if (timeoutId) clearTimeout(timeoutId);
			set(null);
		},
		async undo() {
			const currentAction = get(undoStore);
			if (currentAction) {
				const { characterIndex, previousState, warbandData } = currentAction;

				if (!warbandData.characters[characterIndex]) {
					warbandData.characters.splice(characterIndex, 0, { ...previousState });
				} else {
					warbandData.characters[characterIndex] = { ...previousState };
				}

				const auth = getAuth();
				if (auth.currentUser) {
					await saveToFirestore(auth.currentUser, warbandData);
				}
				set(null);
			}
		}
	};
};

export const undoStore = createUndoStore();

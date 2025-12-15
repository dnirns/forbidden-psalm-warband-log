import { writable, get } from 'svelte/store';
import type { Character, WarbandData } from '$lib/types';
import { createWarbandApplicationService } from '$domain/application';
import { firestoreWarbandRepository } from '$infrastructure/firebase';

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

	const warbandApplication = createWarbandApplicationService(firestoreWarbandRepository);

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

				await warbandApplication.save(warbandData);
				set(null);
			}
		}
	};
};

export const undoStore = createUndoStore();

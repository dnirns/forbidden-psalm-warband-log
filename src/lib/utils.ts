import { type Character } from '$lib/types';

export const calculateCharacterCost = (
	character: Character,
	items: { item: string; cost: number }[]
): number => {
	return character.items.reduce((total, selectedItem) => {
		const found = items.find((i) => i.item === selectedItem);
		return found ? total + found.cost : total;
	}, 0);
};

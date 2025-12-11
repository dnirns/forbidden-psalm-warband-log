import type { Character, Item, WarbandData } from '$domain/models';
import { calculateCharacterCost } from './characterStats';

export const calculateGoldDifference = (
	character: Character,
	index: number,
	store: { data: WarbandData },
	items: Item[]
) => {
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

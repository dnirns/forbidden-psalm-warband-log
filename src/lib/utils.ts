import { type Character } from '$lib/types';

export const isMobileUserAgent = (userAgent: string): boolean => {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		userAgent.toLowerCase()
	);
};

export const calculateCharacterCost = (
	character: Character,
	items: { item: string; cost: number }[]
): number => {
	return character.items.reduce((total, selectedItem) => {
		const found = items.find((i) => i.item === selectedItem);
		return found ? total + found.cost : total;
	}, 0);
};

export const defaultCharacter = (): Character => {
	return {
		agility: 0,
		armour: 0,
		feats: [],
		flaws: [],
		hp: 0,
		inventory: 0,
		items: [],
		name: '',
		presence: 0,
		strength: 0,
		toughness: 0
	};
};

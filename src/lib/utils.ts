import { type Character, type WarbandData } from '$lib/types';
import { STORAGE_KEY } from './constants';

export const isMobileUserAgent = (userAgent: string): boolean => {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		userAgent.toLowerCase()
	);
};

export const loadWarbandData = (): WarbandData | null => {
	if (typeof window !== 'undefined') {
		const savedData = localStorage.getItem(STORAGE_KEY);
		if (savedData) {
			try {
				return JSON.parse(savedData) as WarbandData;
			} catch (error) {
				console.error('Failed to parse saved data:', error);
			}
		}
	}
	return null;
};

let saveTimeout: ReturnType<typeof setTimeout>;

export const debounceSave = (
	STORAGE_KEY: string,
	warbandData: any,
	initialLoadComplete: boolean,
	browser: boolean
) => {
	clearTimeout(saveTimeout);
	saveTimeout = setTimeout(() => {
		if (browser && initialLoadComplete) {
			const savedData = localStorage.getItem(STORAGE_KEY);
			const currentData = JSON.stringify(warbandData);
			if (savedData !== currentData) {
				localStorage.setItem(STORAGE_KEY, currentData);
				console.log('Warband data saved!');
			}
		}
	}, 500);
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

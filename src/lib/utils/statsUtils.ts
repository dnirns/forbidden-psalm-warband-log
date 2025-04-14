import type { Character, FeatOrFlaw } from '../types';
import { injuries } from '$lib/data/injuries';
type ModifiedStats = {
	agility: number;
	presence: number;
	strength: number;
	toughness: number;
	armour: number;
	hp: number;
	equipmentSlots: number;
	maxRange: number;
	weaponRestrictions: string;
};

export const calculateCharacterCost = (
	character: Character,
	items: { item: string; cost: number }[]
): number => {
	const itemsCost = character.items.reduce((total, selectedItem) => {
		if (
			!selectedItem ||
			(character.pickedUpItems && character.pickedUpItems.includes(selectedItem))
		) {
			return total;
		}
		const found = items.find((i) => i.item === selectedItem);
		return found ? total + found.cost : total;
	}, 0);

	const spellcasterCost = character.isSpellcaster ? 5 : 0;

	return itemsCost + spellcasterCost;
};

export const defaultCharacter = (): Character => {
	const strength = 0;
	const toughness = 0;
	return {
		name: '',
		hp: 8 + toughness,
		armour: 0,
		agility: 0,
		presence: 0,
		strength,
		toughness,
		inventory: 5 + strength,
		items: Array(5 + strength).fill(''),
		pickedUpItems: [],
		feats: [],
		flaws: [],
		injuries: [],
		isSpellcaster: false,
		cleanScroll: '',
		uncleanScroll: '',
		ammoTrackers: []
	};
};

export const calculateTotalArmour = (characterItems: string[], itemsList: any[]): number => {
	return characterItems.reduce((acc, itemName) => {
		const item = itemsList.find((i) => i.item === itemName);
		return acc + (item?.armour || 0);
	}, 0);
};

export const calculateModifiedStats = (
	character: Character,
	feats: FeatOrFlaw[],
	flaws: FeatOrFlaw[],
	itemsList: any[]
): ModifiedStats => {
	const modifiedStats: ModifiedStats = {
		agility: character.agility,
		presence: character.presence,
		strength: character.strength,
		toughness: character.toughness,
		armour: 0,
		hp: 0,
		equipmentSlots: 0,
		maxRange: 0,
		weaponRestrictions: ''
	};

	character.items.forEach((itemName) => {
		if (itemName) {
			const item = itemsList.find((i) => i.item === itemName);
			if (item?.extraInventorySlots) {
				modifiedStats.equipmentSlots += item.extraInventorySlots;
			}
		}
	});

	character.feats.forEach((featName) => {
		const feat = feats.find((f) => f.name === featName);
		if (feat?.statModifiers) {
			Object.entries(feat.statModifiers).forEach(([stat, modifier]) => {
				if (stat === 'extraInventorySlots' && typeof modifier === 'number') {
					modifiedStats.equipmentSlots += modifier;
				} else if (stat !== 'weaponRestrictions' && typeof modifier === 'number') {
					modifiedStats[stat as keyof Omit<ModifiedStats, 'weaponRestrictions'>] += modifier;
				}
			});
		}
	});

	character.flaws.forEach((flawName) => {
		const flaw = flaws.find((f) => f.name === flawName);
		if (flaw?.statModifiers) {
			Object.entries(flaw.statModifiers).forEach(([stat, modifier]) => {
				if (stat === 'extraInventorySlots' && typeof modifier === 'number') {
					modifiedStats.equipmentSlots += modifier;
				} else if (stat !== 'weaponRestrictions' && typeof modifier === 'number') {
					modifiedStats[stat as keyof Omit<ModifiedStats, 'weaponRestrictions'>] += modifier;
				}
			});
		}
	});

	character.injuries?.forEach((injuryName) => {
		const injury = injuries.find((i) => i.name === injuryName);
		if (injury?.statModifiers) {
			Object.entries(injury.statModifiers).forEach(([stat, modifier]) => {
				if (stat === 'extraInventorySlots' && typeof modifier === 'number') {
					modifiedStats.equipmentSlots += modifier;
				} else if (stat === 'weaponRestrictions' && typeof modifier === 'string') {
					modifiedStats.weaponRestrictions = modifier;
				} else if (typeof modifier === 'number') {
					modifiedStats[stat as keyof Omit<ModifiedStats, 'weaponRestrictions'>] += modifier;
				}
			});
		}
	});

	return modifiedStats;
};

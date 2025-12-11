import type { Character, Item, WarbandData } from '$lib/types';
import { handleSpellcasterChange } from '$domain/rules';
import { items as domainItems } from '$domain/data';
import { feats as domainFeats, flaws as domainFlaws, injuries as domainInjuries } from '$domain/data';

type SpellcasterChangeResult = ReturnType<typeof handleSpellcasterChange>;

export type ItemDeletionResult = {
	updatedCharacter: Character;
	goldRefund: number;
};

export type StatChangePayload = {
	stat: 'strength' | 'toughness' | 'agility' | 'presence';
	value: number;
	maxInventory: number;
};

export type ModifierPayload = {
	name: string;
	type: 'feat' | 'flaw' | 'injury';
};

export const applySpellcasterChange = (
	character: Character,
	originalCharacter: Character | null,
	checked: boolean,
	items: Item[] = domainItems
): SpellcasterChangeResult => {
	return handleSpellcasterChange(character, originalCharacter, checked, items);
};

export const removeItemWithOptionalRefund = (
	character: Character,
	itemName: string,
	originalItems: string[],
	items: Item[] = domainItems
): ItemDeletionResult => {
	const next = { ...character };
	let goldRefund = 0;

	const index = next.items.findIndex((item) => item === itemName);
	if (index === -1) {
		return { updatedCharacter: next, goldRefund };
	}

	const itemObj = items.find((i) => i.item === itemName);
	if (itemObj?.extraInventorySlots) {
		next.inventory = Math.max(2, next.inventory - itemObj.extraInventorySlots);
		next.items = next.items.slice(0, next.inventory);
	}

	next.items = next.items.map((item, i) => (i === index ? '' : item));

	if (next.pickedUpItems) {
		next.pickedUpItems = next.pickedUpItems.filter((item) => item !== itemName);
	}

	if (
		itemObj &&
		itemObj.cost > 0 &&
		originalItems.includes(itemName) &&
		!next.pickedUpItems.includes(itemName)
	) {
		goldRefund = itemObj.cost;
	}

	return { updatedCharacter: next, goldRefund };
};

export const updateStatAndInventory = (
	character: Character,
	payload: StatChangePayload
): Character => {
	const next = { ...character };
	next[payload.stat] = payload.value;

	if (payload.stat === 'toughness') {
		const baseHp = 8 + payload.value;
		if (next.hp > baseHp) {
			next.hp = baseHp;
		}
	}

	if (payload.stat === 'strength') {
		const baseInventory = 5 + payload.value;
		if (next.inventory > payload.maxInventory) {
			next.inventory = payload.maxInventory;
		} else if (next.inventory < baseInventory) {
			next.inventory = baseInventory;
		}

		if (next.items.length > next.inventory) {
			next.items = next.items.slice(0, next.inventory);
		} else if (next.items.length < next.inventory) {
			next.items = [...next.items, ...Array(next.inventory - next.items.length).fill('')];
		}
	}

	return next;
};

export const applyModifier = (
	character: Character,
	{ name, type }: ModifierPayload,
	items: Item[] = domainItems
): Character => {
	const next = { ...character };
	const collection = type === 'feat' ? domainFeats : type === 'flaw' ? domainFlaws : domainInjuries;
	const modifier = collection.find((entry) => entry.name === name);
	if (!modifier) return next;

	const listKey = type === 'feat' ? 'feats' : type === 'flaw' ? 'flaws' : 'injuries';
	if (next[listKey].includes(name)) return next;

	next[listKey] = [...next[listKey], name];

	const extraSlots = modifier.statModifiers?.extraInventorySlots;
	if (typeof extraSlots === 'number' && extraSlots !== 0) {
		const newInventory = Math.max(2, next.inventory + extraSlots);
		next.inventory = newInventory;
		if (next.items.length > newInventory) {
			next.items = next.items.slice(0, newInventory);
		} else if (next.items.length < newInventory) {
			next.items = [...next.items, ...Array(newInventory - next.items.length).fill('')];
		}
	}

	const weaponRestriction = modifier.statModifiers?.weaponRestrictions;
	if (weaponRestriction === 'one-handed') {
		next.items = next.items.map((itemName) => {
			const item = items.find((i) => i.item === itemName);
			return item?.twoHanded ? '' : itemName;
		});
	}

	return next;
};

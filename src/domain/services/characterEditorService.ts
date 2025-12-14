import type { Character, Item } from '$domain/models';
import {
	handleSpellcasterChange,
	handleScrollSelect,
	itemUsesAmmo,
	getInitialAmmo,
	MIN_INVENTORY
} from '$domain/rules';
import { items as domainItems } from '$domain/data';
import {
	feats as domainFeats,
	flaws as domainFlaws,
	injuries as domainInjuries
} from '$domain/data';
import { cloneCharacter } from './characterService';

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

const ensureInventorySize = (character: Character) => {
	if (character.items.length > character.inventory) {
		character.items = character.items.slice(0, character.inventory);
	} else if (character.items.length < character.inventory) {
		character.items = [...character.items, ...Array(character.inventory - character.items.length).fill('')];
	}
	character.ammoTrackers = character.ammoTrackers.filter(
		(tracker) => tracker.slotIndex < character.inventory
	);
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
	slotIndex?: number,
	items: Item[] = domainItems
): ItemDeletionResult => {
	const next = cloneCharacter(character);
	let goldRefund = 0;

	const index =
		typeof slotIndex === 'number' ? slotIndex : next.items.findIndex((item) => item === itemName);
	if (index === -1) {
		return { updatedCharacter: next, goldRefund };
	}

	const itemObj = items.find((i) => i.item === itemName);
	if (itemObj?.extraInventorySlots) {
		next.inventory = Math.max(MIN_INVENTORY, next.inventory - itemObj.extraInventorySlots);
	}

	next.items = next.items.map((item, i) => (i === index ? '' : item));

	const wasPickedUp = next.pickedUpItems?.includes(itemName) ?? false;
	next.pickedUpItems = next.pickedUpItems?.filter((item) => item !== itemName) ?? [];

	if (itemUsesAmmo(itemName, items)) {
		next.ammoTrackers = next.ammoTrackers.filter(
			(tracker) => !(tracker.weaponName === itemName && tracker.slotIndex === index)
		);
	}

	ensureInventorySize(next);

	if (itemObj && itemObj.cost > 0 && originalItems.includes(itemName) && !wasPickedUp) {
		goldRefund = itemObj.cost;
	}

	return { updatedCharacter: next, goldRefund };
};

export const removeItem = (
	character: Character,
	itemName: string,
	slotIndex?: number,
	items: Item[] = domainItems
): Character => {
	const { updatedCharacter } = removeItemWithOptionalRefund(character, itemName, [], slotIndex, items);
	return updatedCharacter;
};

export const updateItemSelection = (
	character: Character,
	slotIndex: number,
	newItem: string,
	items: Item[] = domainItems
): Character => {
	const next = cloneCharacter(character);
	const currentItem = next.items[slotIndex];

	if (!next.pickedUpItems) {
		next.pickedUpItems = [];
	}

	if (currentItem && itemUsesAmmo(currentItem, items)) {
		next.ammoTrackers = next.ammoTrackers.filter(
			(tracker) => !(tracker.weaponName === currentItem && tracker.slotIndex === slotIndex)
		);
	}

	const currentItemObj = items.find((i) => i.item === currentItem);
	if (currentItemObj?.extraInventorySlots) {
		next.inventory = Math.max(MIN_INVENTORY, next.inventory - currentItemObj.extraInventorySlots);
	}

	const newItemObj = items.find((i) => i.item === newItem);
	if (newItemObj?.extraInventorySlots) {
		next.inventory = next.inventory + newItemObj.extraInventorySlots;
	}

	const newItems = [...next.items];
	newItems[slotIndex] = newItem;
	next.items = newItems.slice(0, next.inventory);

	if (next.items[slotIndex] === newItem && itemUsesAmmo(newItem, items)) {
		next.ammoTrackers.push({
			weaponName: newItem,
			slotIndex,
			currentAmmo: getInitialAmmo(newItem, items)
		});
	}

	ensureInventorySize(next);

	return next;
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

export const removeModifier = (character: Character, { name, type }: ModifierPayload): Character => {
	const next = cloneCharacter(character);
	const collection = type === 'feat' ? domainFeats : type === 'flaw' ? domainFlaws : domainInjuries;
	const listKey = type === 'feat' ? 'feats' : type === 'flaw' ? 'flaws' : 'injuries';

	if (!next[listKey].includes(name)) return next;

	const modifier = collection.find((entry) => entry.name === name);
	if (modifier?.statModifiers?.extraInventorySlots) {
		const adjustedInventory = next.inventory - modifier.statModifiers.extraInventorySlots;
		next.inventory = Math.max(MIN_INVENTORY, adjustedInventory);
		ensureInventorySize(next);
	}

	next[listKey] = next[listKey].filter((entry) => entry !== name);
	return next;
};

export const selectScroll = (
	character: Character,
	scrollType: 'clean' | 'unclean',
	scrollName: string | undefined
): Character => {
	const next = cloneCharacter(character);
	next.items = [...next.items];
	handleScrollSelect(next, scrollType, scrollName);
	return next;
};

import type { Character } from '$lib/types';
import type { Item } from '$lib/types';
import items from '$lib/data/items';

export const itemUsesAmmo = (itemName: string, items: Item[]): boolean => {
	const item = items.find((i) => i.item === itemName);
	if (!item) return false;
	return item.ammo !== undefined;
};

export const getInitialAmmo = (itemName: string, items: Item[]) => {
	const item = items.find((i) => i.item === itemName);
	return item?.ammo || 0;
};

export const updateInventory = (character: Character, newVal: number) => {
	const currentLength = character.items.length;
	if (newVal > currentLength) {
		character.items = [...character.items, ...Array(newVal - currentLength).fill('')];
	} else if (newVal < currentLength) {
		character.items = character.items.slice(0, newVal);
	}
	character.inventory = newVal;
};

export const isItemRestrictedForSpellcaster = (itemName: string) => {
	const item = items.find((i) => i.item === itemName);
	return itemName === 'Heavy Armour' || itemName === 'Shield' || (item?.twoHanded ?? false);
};

export const handleSpellcasterChange = (
	character: Character,
	originalCharacter: Character | null,
	checked: boolean
) => {
	if (checked) {
		const restrictedItems = character.items.filter(isItemRestrictedForSpellcaster);
		let refundAmount = 0;
		let removedItems: { name: string; cost: number }[] = [];

		if (restrictedItems.length > 0) {
			restrictedItems.forEach((itemName) => {
				const item = items.find((i) => i.item === itemName);
				if (item && originalCharacter && originalCharacter.items.includes(itemName)) {
					refundAmount += item.cost;
					removedItems.push({ name: item.item, cost: item.cost });
				} else if (item) {
					removedItems.push({ name: item.item, cost: 0 });
				}
			});
		}

		if (!character.items) {
			character.items = Array(Math.max(character.inventory, 2)).fill('');
		}

		character.items = character.items.map((item) =>
			isItemRestrictedForSpellcaster(item) ? '' : item
		);

		character.isSpellcaster = true;
		character.cleanScroll = '';
		character.uncleanScroll = '';
		character.items[0] = '';
		character.items[1] = '';

		return { success: true, refundAmount, removedItems };
	} else {
		character.isSpellcaster = false;
		character.cleanScroll = null;
		character.uncleanScroll = null;

		if (character.items && character.items.length >= 2) {
			character.items[0] = '';
			character.items[1] = '';
		}

		return { success: true, refundAmount: 0, removedItems: [] };
	}
};

export const handleScrollSelect = (
	character: Character,
	scrollType: 'clean' | 'unclean',
	scrollName: string | undefined
) => {
	if (scrollType === 'clean') {
		character.cleanScroll = scrollName ?? '';
		character.items[0] = scrollName ?? '[Clean Scroll Slot]';
	} else {
		character.uncleanScroll = scrollName ?? '';
		character.items[1] = scrollName ?? '[Unclean Scroll Slot]';
	}
	character.items = [...character.items];
};

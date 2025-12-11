import type { Character, Item, WarbandData } from '$domain/models';
import { MIN_INVENTORY, itemUsesAmmo, getInitialAmmo } from '$domain/rules';
import { items as domainItems, scrolls as domainScrolls, injuries as domainInjuries } from '$domain/data';

type ScrollData = typeof domainScrolls;
type InjuryData = typeof domainInjuries;

export type CharacterMutationContext = {
	items: Item[];
	scrolls: ScrollData;
	injuries: InjuryData;
};

const defaultContext: CharacterMutationContext = {
	items: domainItems,
	scrolls: domainScrolls,
	injuries: domainInjuries
};

const ensureContext = (context?: Partial<CharacterMutationContext>): CharacterMutationContext => ({
	items: context?.items ?? defaultContext.items,
	scrolls: context?.scrolls ?? defaultContext.scrolls,
	injuries: context?.injuries ?? defaultContext.injuries
});

export const cloneCharacter = (character: Character): Character => ({
	...character,
	items: [...character.items],
	feats: [...character.feats],
	flaws: [...character.flaws],
	injuries: [...character.injuries],
	pickedUpItems: [...(character.pickedUpItems || [])],
	ammoTrackers: character.ammoTrackers.map((tracker) => ({ ...tracker }))
});

export const cloneWarbandData = (data: WarbandData): WarbandData => ({
	...data,
	characters: data.characters.map(cloneCharacter)
});

const resizeInventory = (character: Character, newSize: number) => {
	const nextInventory = Math.max(MIN_INVENTORY, newSize);
	if (character.items.length > nextInventory) {
		character.items = character.items.slice(0, nextInventory);
	} else if (character.items.length < nextInventory) {
		character.items = [...character.items, ...Array(nextInventory - character.items.length).fill('')];
	}
	character.inventory = nextInventory;
};

export const clampHp = (character: Character, maxHp: number): Character => {
	const next = cloneCharacter(character);
	next.hp = Math.min(next.hp, maxHp);
	return next;
};

export const takeDamage = (character: Character, amount: number): Character => {
	const next = cloneCharacter(character);
	next.hp = Math.max(0, next.hp - amount);
	return next;
};

export const reviveCharacter = (character: Character): Character => {
	const next = cloneCharacter(character);
	next.hp = 1;
	return next;
};

export const pickUpItem = (
	character: Character,
	slotIndex: number,
	itemName: string,
	context?: Partial<CharacterMutationContext>
): { character: Character; error?: string } => {
	const { items, scrolls } = ensureContext(context);
	const next = cloneCharacter(character);

	if (!next.items) {
		next.items = Array(next.inventory).fill('');
	} else if (next.items.length < next.inventory) {
		next.items = [...next.items, ...Array(next.inventory - next.items.length).fill('')];
	}

	const isCleanScroll = scrolls.cleanScrolls.some((scroll) => scroll.name === itemName);
	const isUncleanScroll = scrolls.uncleanScrolls.some((scroll) => scroll.name === itemName);

	if (next.isSpellcaster && slotIndex < 2) {
		if (isCleanScroll) {
			next.cleanScroll = itemName;
			next.items[0] = itemName;
		} else if (isUncleanScroll) {
			next.uncleanScroll = itemName;
			next.items[1] = itemName;
		} else {
			return { character: character, error: 'Scroll slots only accept scrolls of the correct type.' };
		}
	} else {
		next.items[slotIndex] = itemName;
	}

	if (!next.pickedUpItems.includes(itemName)) {
		next.pickedUpItems.push(itemName);
	}

	if (itemUsesAmmo(itemName, items)) {
		next.ammoTrackers.push({
			weaponName: itemName,
			slotIndex,
			currentAmmo: getInitialAmmo(itemName, items)
		});
	}

	const itemObj = items.find((i) => i.item === itemName);
	if (itemObj?.extraInventorySlots) {
		resizeInventory(next, next.inventory + itemObj.extraInventorySlots);
	}

	return { character: next };
};

export const dropItem = (
	character: Character,
	itemName: string,
	slotIndex?: number,
	context?: Partial<CharacterMutationContext>
): Character => {
	const { items, scrolls } = ensureContext(context);
	const next = cloneCharacter(character);

	const index =
		typeof slotIndex === 'number' ? slotIndex : next.items.findIndex((item) => item === itemName);
	if (index === -1) {
		return next;
	}

	const isCleanScroll = scrolls.cleanScrolls.some((scroll) => scroll.name === itemName);
	const isUncleanScroll = scrolls.uncleanScrolls.some((scroll) => scroll.name === itemName);

	if (next.isSpellcaster && (isCleanScroll || isUncleanScroll) && index < 2) {
		if (isCleanScroll) {
			next.cleanScroll = '';
			next.items[0] = '[Clean Scroll Slot]';
		} else {
			next.uncleanScroll = '';
			next.items[1] = '[Unclean Scroll Slot]';
		}
	} else {
		const itemObj = items.find((i) => i.item === itemName);
		if (itemObj?.extraInventorySlots) {
			resizeInventory(next, next.inventory - itemObj.extraInventorySlots);
		}
		next.items = next.items.map((item, i) => (i === index ? '' : item));
	}

	next.pickedUpItems = next.pickedUpItems.filter((item) => item !== itemName);

	if (itemUsesAmmo(itemName, items)) {
		next.ammoTrackers = next.ammoTrackers.filter((tracker) => tracker.weaponName !== itemName);
	}

	return next;
};

const isAmmoOnlyItem = (itemName: string, items: Item[]) => {
	const item = items.find((i) => i.item === itemName);
	return item?.item === 'Ammo';
};

export const useAmmo = (
	character: Character,
	weaponName: string,
	slotIndex: number,
	context?: Partial<CharacterMutationContext>
): Character => {
	const { items } = ensureContext(context);
	const next = cloneCharacter(character);
	const tracker = next.ammoTrackers.find(
		(t) => t.weaponName === weaponName && t.slotIndex === slotIndex
	);
	if (!tracker || tracker.currentAmmo <= 0) {
		return next;
	}

	const isLastAmmo = tracker.currentAmmo === 1;
	const isPureAmmo = isAmmoOnlyItem(weaponName, items);

	if (isLastAmmo && isPureAmmo) {
		next.items = next.items.map((item, i) => (i === slotIndex ? '' : item));
		next.pickedUpItems = next.pickedUpItems.filter((item) => item !== weaponName);
		next.ammoTrackers = next.ammoTrackers.filter(
			(t) => !(t.weaponName === weaponName && t.slotIndex === slotIndex)
		);
	} else {
		tracker.currentAmmo--;
	}

	return next;
};

export const refillAmmo = (
	character: Character,
	weaponName: string,
	slotIndex: number,
	context?: Partial<CharacterMutationContext>
): Character => {
	const { items } = ensureContext(context);
	const next = cloneCharacter(character);
	const tracker = next.ammoTrackers.find(
		(t) => t.weaponName === weaponName && t.slotIndex === slotIndex
	);
	if (!tracker || tracker.currentAmmo !== 0) {
		return next;
	}

	tracker.currentAmmo = getInitialAmmo(weaponName, items);
	return next;
};

export const addInjury = (
	character: Character,
	injuryName: string,
	context?: Partial<CharacterMutationContext>
): Character => {
	const { injuries } = ensureContext(context);
	const next = cloneCharacter(character);

	if (!next.injuries.includes(injuryName)) {
		const injuryObj = injuries.find((i) => i.name === injuryName);
		if (injuryObj?.statModifiers?.extraInventorySlots) {
			resizeInventory(next, next.inventory + injuryObj.statModifiers.extraInventorySlots);
		}
		next.injuries = [...next.injuries, injuryName];
	}

	return next;
};

export const removeInjury = (
	character: Character,
	injuryName: string,
	context?: Partial<CharacterMutationContext>
): Character => {
	const { injuries } = ensureContext(context);
	const next = cloneCharacter(character);

	const injuryObj = injuries.find((i) => i.name === injuryName);
	if (injuryObj?.statModifiers?.extraInventorySlots) {
		resizeInventory(next, next.inventory - injuryObj.statModifiers.extraInventorySlots);
	}

	next.injuries = next.injuries.filter((injury) => injury !== injuryName);

	return next;
};

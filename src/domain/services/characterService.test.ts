import { describe, it, expect, vi } from 'vitest';
import {
	addInjury,
	cloneCharacter,
	cloneWarbandData,
	clampHp,
	dropItem,
	pickUpItem,
	reviveCharacter,
	refillAmmo,
	removeInjury,
	takeDamage,
	useAmmo
} from './characterService';
import { defaultCharacter } from '$domain/rules';
import { items, scrolls } from '$domain/data';

describe('characterService', () => {
	it('clamps HP correctly', () => {
		const character = { ...defaultCharacter(), hp: 15 };
		const updated = clampHp(character, 10);
		expect(updated.hp).toBe(10);
	});

	it('reduces HP when taking damage', () => {
		const character = { ...defaultCharacter(), hp: 5 };
		const updated = takeDamage(character, 3);
		expect(updated.hp).toBe(2);
	});

	it('adds picked up item and ammo tracker', () => {
		const character = { ...defaultCharacter(), inventory: 5 };
		const bowItem = items.find((i) => i.item === 'Bow');
		expect(bowItem).toBeDefined();
		const result = pickUpItem(character, 0, 'Bow');
		expect(result.error).toBeUndefined();
		const updated = result.character;
		expect(updated.items[0]).toBe('Bow');
		expect(updated.pickedUpItems).toContain('Bow');
		expect(updated.ammoTrackers[0]?.weaponName).toBe('Bow');
	});

	it('drops item and removes ammo tracker', () => {
		const base = defaultCharacter();
		const result = pickUpItem(base, 0, 'Bow');
		const character = result.character;
		const updated = dropItem(character, 'Bow', 0);
		expect(updated.items[0]).toBe('');
		expect(updated.ammoTrackers.length).toBe(0);
	});

	it('uses and refills ammo', () => {
		const base = defaultCharacter();
		const result = pickUpItem(base, 0, 'Bow');
		const character = result.character;
		const afterUse = useAmmo(character, 'Bow', 0);
		expect(afterUse.ammoTrackers[0]?.currentAmmo).toBeGreaterThanOrEqual(0);
		const exhausted = {
			...afterUse,
			ammoTrackers: afterUse.ammoTrackers.map((tracker) => ({ ...tracker, currentAmmo: 0 }))
		};
		const refilled = refillAmmo(exhausted, 'Bow', 0);
		expect(refilled.ammoTrackers[0]?.currentAmmo).toBeGreaterThan(0);
	});

	it('adds and removes injuries adjusting inventory', () => {
		const character = { ...defaultCharacter(), inventory: 5 };
		const injured = addInjury(character, 'Lost Limb');
		expect(injured.injuries).toContain('Lost Limb');
		expect(injured.inventory).toBeLessThan(character.inventory);

		const healed = removeInjury(injured, 'Lost Limb');
		expect(healed.injuries).not.toContain('Lost Limb');
	});

	it('prevents HP from dropping below zero and can revive a character', () => {
		const defeated = { ...defaultCharacter(), hp: 1 };
		const atZero = takeDamage(defeated, 5);
		expect(atZero.hp).toBe(0);

		const revived = reviveCharacter(atZero);
		expect(revived.hp).toBe(1);
	});

	it('clones characters and warband data without sharing references', () => {
		const warband = {
			warbandName: 'Clone Test',
			characters: [defaultCharacter()],
			gold: 0,
			xp: 0
		};

		const clonedWarband = cloneWarbandData(warband);
		clonedWarband.characters[0].name = 'Changed';

		expect(warband.characters[0].name).toBe('');
	});

	it('rejects non-scrolls in spellcaster scroll slots', () => {
		const spellcaster = { ...defaultCharacter(), isSpellcaster: true };
		const result = pickUpItem(spellcaster, 0, 'Sword');
		expect(result.error).toBeDefined();
		expect(result.character).toBe(spellcaster);
	});

	it('fills missing item slots and expands inventory for items with extra slots', () => {
		const shortList = {
			...defaultCharacter(),
			inventory: 4,
			items: ['', ''],
			pickedUpItems: [],
			ammoTrackers: []
		};
		const { character: filled } = pickUpItem(shortList, 3, 'Sword');

		expect(filled.items).toHaveLength(4);
		expect(filled.items[3]).toBe('Sword');

		const base = defaultCharacter();
		const { character: expanded } = pickUpItem(base, 0, 'Backpack');
		expect(expanded.inventory).toBe(base.inventory + 2);
		expect(expanded.items).toHaveLength(expanded.inventory);
	});

	it('sets scroll slots correctly when dropping scrolls as a spellcaster', () => {
		const cleanName = scrolls.cleanScrolls[0]?.name ?? 'Clean';
		const character = {
			...defaultCharacter(),
			isSpellcaster: true,
			cleanScroll: cleanName,
			items: [cleanName, '[Unclean Scroll Slot]', '', '', ''],
			pickedUpItems: []
		};

		const updated = dropItem(character, cleanName, 0);
		expect(updated.cleanScroll).toBe('');
		expect(updated.items[0]).toBe('[Clean Scroll Slot]');
	});

	it('ignores drop calls when the item is not found', () => {
		const character = defaultCharacter();
		const updated = dropItem(character, 'Nonexistent');
		expect(updated.items).toEqual(character.items);
	});

	it('handles ammo-only items by removing them after the last shot', () => {
		const character = {
			...defaultCharacter(),
			items: ['Ammo', '', '', '', ''],
			pickedUpItems: ['Ammo'],
			ammoTrackers: [{ weaponName: 'Ammo', slotIndex: 0, currentAmmo: 1 }]
		};

		const updated = useAmmo(character, 'Ammo', 0);
		expect(updated.items[0]).toBe('');
		expect(updated.pickedUpItems).not.toContain('Ammo');
		expect(updated.ammoTrackers).toHaveLength(0);
	});

	it('refills ammo only when the tracker exists and is empty', () => {
		const character = {
			...defaultCharacter(),
			ammoTrackers: [{ weaponName: 'Bow', slotIndex: 0, currentAmmo: 1 }]
		};

		const unchanged = refillAmmo(character, 'Bow', 0);
		expect(unchanged.ammoTrackers[0]?.currentAmmo).toBe(1);
	});

	it('adjusts inventory when injuries grant or remove extra slots', () => {
		const context = {
			injuries: [
				{ name: 'Augmented', description: '', statModifiers: { extraInventorySlots: 2 } }
			]
		};
		const character = { ...defaultCharacter(), injuries: [] };

		const withAugment = addInjury(character, 'Augmented', context);
		expect(withAugment.inventory).toBe(character.inventory + 2);

		const healed = removeInjury(withAugment, 'Augmented', context);
		expect(healed.inventory).toBe(withAugment.inventory - 2);
	});

	it('initializes inventory slots when no items array exists', async () => {
		vi.resetModules();
		vi.doMock('./characterService', async () => {
			const actual = await vi.importActual<typeof import('./characterService')>('./characterService');
			return {
				...actual,
				cloneCharacter: (character: unknown) => ({ ...(character as object) })
			};
		});

		const { pickUpItem: mockedPickUpItem } = await import('./characterService');
		const base = defaultCharacter();
		const character = { ...base, items: undefined as unknown as string[] };

		const result = mockedPickUpItem(character as unknown as Parameters<typeof mockedPickUpItem>[0], 0, 'Sword', {
			items
		});

		expect(result.character.items).toHaveLength(base.inventory);
		vi.resetModules();
	});

	it('assigns scrolls to dedicated slots for spellcasters', () => {
		const clean = scrolls.cleanScrolls[0]?.name ?? 'Clean Scroll';
		const unclean = scrolls.uncleanScrolls[0]?.name ?? 'Unclean Scroll';
		const character = { ...defaultCharacter(), isSpellcaster: true };

		const withClean = pickUpItem(character, 0, clean, { scrolls, items });
		expect(withClean.character.cleanScroll).toBe(clean);

		const withUnclean = pickUpItem(withClean.character, 1, unclean, { scrolls, items });
		expect(withUnclean.character.uncleanScroll).toBe(unclean);
	});

	it('shrinks inventory when dropping items that added slots', () => {
		const base = defaultCharacter();
		const { character: withBackpack } = pickUpItem(base, 0, 'Backpack', { items });

		const afterDrop = dropItem(withBackpack, 'Backpack', 0, { items });

		expect(afterDrop.inventory).toBe(base.inventory);
		expect(afterDrop.items).toHaveLength(base.inventory);
	});

	it('resets unclean scroll slots when dropping them', () => {
		const unclean = scrolls.uncleanScrolls[0]?.name ?? 'Unclean Scroll';
		const spellcaster = {
			...defaultCharacter(),
			isSpellcaster: true,
			uncleanScroll: unclean,
			items: ['[Clean Scroll Slot]', unclean, '', '', '']
		};

		const updated = dropItem(spellcaster, unclean, 1, { scrolls });

		expect(updated.uncleanScroll).toBe('');
		expect(updated.items[1]).toBe('[Unclean Scroll Slot]');
	});

	it('returns unchanged when ammo trackers are empty or missing', () => {
		const character = {
			...defaultCharacter(),
			ammoTrackers: [{ weaponName: 'Bow', slotIndex: 0, currentAmmo: 0 }]
		};

		const result = useAmmo(character, 'Bow', 0, { items });
		expect(result.ammoTrackers[0]?.currentAmmo).toBe(0);
	});
});

import { describe, it, expect } from 'vitest';
import { defaultCharacter } from '$domain/rules';
import { items, scrolls } from '$domain/data';
import {
	updateItemSelection,
	removeItemWithOptionalRefund,
	removeModifier,
	selectScroll
} from './characterEditorService';

describe('characterEditorService', () => {
	it('adds and removes ammo trackers when swapping items', () => {
		const base = defaultCharacter();
		const withBow = updateItemSelection(base, 0, 'Bow', items);

		expect(withBow.items[0]).toBe('Bow');
		expect(withBow.ammoTrackers.find((tracker) => tracker.weaponName === 'Bow')).toBeDefined();

		const withSword = updateItemSelection(withBow, 0, 'Sword', items);
		expect(withSword.items[0]).toBe('Sword');
		expect(withSword.ammoTrackers.find((tracker) => tracker.weaponName === 'Bow')).toBeUndefined();
	});

	it('shrinks inventory when removing an item that granted extra slots', () => {
		const base = defaultCharacter();
		const withBackpack = {
			...base,
			inventory: base.inventory + 2,
			items: ['Backpack', ...Array(base.inventory + 1).fill('')],
			ammoTrackers: []
		};

		const updated = updateItemSelection(withBackpack, 0, 'Sword', items);

		expect(updated.inventory).toBeLessThan(withBackpack.inventory);
		expect(updated.items.length).toBe(updated.inventory);
	});

	it('returns gold refund only for purchased items and removes ammo trackers', () => {
		const base = defaultCharacter();
		const withBow = updateItemSelection(base, 0, 'Bow', items);

		const result = removeItemWithOptionalRefund(withBow, 'Bow', ['Bow'], 0, items);
		const bowCost = items.find((item) => item.item === 'Bow')?.cost;

		expect(result.updatedCharacter.items[0]).toBe('');
		expect(result.updatedCharacter.ammoTrackers.length).toBe(0);
		expect(result.goldRefund).toBe(bowCost);
	});

	it('updates scroll slots through the selector helper', () => {
		const spellName = scrolls.cleanScrolls[0]?.name || 'Clean Scroll';
		const character = { ...defaultCharacter(), isSpellcaster: true };

		const updated = selectScroll(character, 'clean', spellName);

		expect(updated.cleanScroll).toBe(spellName);
		expect(updated.items[0]).toBe(spellName);
	});

	it('restores inventory when removing modifiers with equipment slot changes', () => {
		const base = defaultCharacter();
		const featName = 'Lucky goblin foot';
		const character = {
			...base,
			feats: [featName],
			inventory: base.inventory - 1,
			items: Array(base.inventory - 1).fill('')
		};

		const updated = removeModifier(character, { name: featName, type: 'feat' });

		expect(updated.inventory).toBe(base.inventory);
		expect(updated.items.length).toBe(base.inventory);
		expect(updated.feats).not.toContain(featName);
	});
});

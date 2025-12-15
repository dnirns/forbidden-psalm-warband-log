import { describe, it, expect } from 'vitest';
import type { Character } from '$domain/models';
import {
	handleScrollSelect,
	handleSpellcasterChange,
	isItemRestrictedForSpellcaster,
	itemUsesAmmo,
	getInitialAmmo,
	updateInventory
} from './items';
import { MIN_INVENTORY, defaultCharacter } from './characterStats';
import { items, scrolls } from '$domain/data';

describe('item rules', () => {
	it('detects ammo usage and initial ammo counts', () => {
		expect(itemUsesAmmo('Bow', items)).toBe(true);
		expect(getInitialAmmo('Bow', items)).toBeGreaterThan(0);
		expect(itemUsesAmmo('Sword', items)).toBe(false);
		expect(getInitialAmmo('Unknown', items)).toBe(0);
	});

	it('grows and shrinks inventory while respecting the minimum', () => {
		const character = { ...defaultCharacter(), inventory: 2, items: ['Sword', ''] };

		updateInventory(character, 4);
		expect(character.items).toHaveLength(4);
		expect(character.inventory).toBe(4);

		updateInventory(character, 1);
		expect(character.items).toHaveLength(1);
		expect(character.inventory).toBe(MIN_INVENTORY);
	});

	it('identifies restricted equipment for spellcasters', () => {
		expect(isItemRestrictedForSpellcaster('Heavy Armour', items)).toBe(true);
		expect(isItemRestrictedForSpellcaster('Bow', items)).toBe(true);
		expect(isItemRestrictedForSpellcaster('Sword', items)).toBe(false);
	});

	it('handles becoming a spellcaster by stripping restricted gear and resetting scroll slots', () => {
		const base = defaultCharacter();
		const character = {
			...base,
			items: ['Heavy Armour', 'Sword', '', '', ''],
			pickedUpItems: []
		};
		const original = { ...character };
		const heavyArmourCost = items.find((i) => i.item === 'Heavy Armour')?.cost ?? 0;

		const result = handleSpellcasterChange(character, original, true, items);

		expect(result.success).toBe(true);
		expect(character.isSpellcaster).toBe(true);
		expect(result.refundAmount).toBe(heavyArmourCost);
		expect(result.removedItems.some((entry) => entry.name === 'Heavy Armour')).toBe(true);
		expect(character.items[0]).toBe('');
		expect(character.items[1]).toBe('');
	});

	it('handles unchecking the spellcaster toggle', () => {
		const character = {
			...defaultCharacter(),
			isSpellcaster: true,
			cleanScroll: 'Clean Spell',
			uncleanScroll: 'Unclean Spell',
			items: ['Clean Spell', 'Unclean Spell', '', '', '']
		};

		const result = handleSpellcasterChange(character, null, false, items);

		expect(result.success).toBe(true);
		expect(character.isSpellcaster).toBe(false);
		expect(character.cleanScroll).toBeNull();
		expect(character.uncleanScroll).toBeNull();
		expect(character.items[0]).toBe('');
		expect(character.items[1]).toBe('');
	});

	it('records restricted items without refunds and initializes inventory when missing', () => {
		const base = defaultCharacter();
		let backingItems: string[] | undefined = ['Shield', '', '', '', ''];
		let accessCount = 0;
		const character = {
			...base,
			pickedUpItems: []
		} as unknown as Character;

		Object.defineProperty(character, 'items', {
			get() {
				accessCount += 1;
				if (accessCount === 1) return backingItems as string[];
				if (accessCount === 2) return undefined as unknown as string[];
				return backingItems as string[];
			},
			set(value: string[]) {
				backingItems = value;
			},
			configurable: true
		});

		const original = { ...base, items: Array(base.inventory).fill('') };

		const result = handleSpellcasterChange(character, original, true, items);

		expect(result.removedItems).toContainEqual({ name: 'Shield', cost: 0 });
		expect(backingItems?.length).toBeGreaterThanOrEqual(Math.max(base.inventory, 2));
	});

	it('updates scroll slots for both clean and unclean scrolls', () => {
		const character = { ...defaultCharacter(), items: [...defaultCharacter().items] };
		const cleanName = scrolls.cleanScrolls[0]?.name ?? 'Clean';
		const uncleanName = scrolls.uncleanScrolls[0]?.name ?? 'Unclean';

		handleScrollSelect(character, 'clean', undefined);
		expect(character.cleanScroll).toBe('');
		expect(character.items[0]).toBe('[Clean Scroll Slot]');

		handleScrollSelect(character, 'unclean', uncleanName);
		expect(character.uncleanScroll).toBe(uncleanName);
		expect(character.items[1]).toBe(uncleanName);

		handleScrollSelect(character, 'clean', cleanName);
		expect(character.items[0]).toBe(cleanName);
	});
});

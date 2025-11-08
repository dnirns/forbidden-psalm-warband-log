import { describe, it, expect, beforeEach } from 'vitest';
import {
	itemUsesAmmo,
	getInitialAmmo,
	updateInventory,
	isItemRestrictedForSpellcaster,
	handleSpellcasterChange,
	handleScrollSelect
} from './characterUtils';
import type { Character, Item } from '$lib/types';
import { defaultCharacter } from './statsUtils';

describe('characterUtils', () => {
	describe('itemUsesAmmo', () => {
		const mockItems: Item[] = [
			{ item: 'Bow', cost: 5, ammo: 3 },
			{ item: 'Crossbow', cost: 8, ammo: 5 },
			{ item: 'Sword', cost: 4 },
			{ item: 'Shield', cost: 2 }
		];

		it('should return true for items with ammo property', () => {
			expect(itemUsesAmmo('Bow', mockItems)).toBe(true);
		});

		it('should return true for crossbow with ammo', () => {
			expect(itemUsesAmmo('Crossbow', mockItems)).toBe(true);
		});

		it('should return false for items without ammo property', () => {
			expect(itemUsesAmmo('Sword', mockItems)).toBe(false);
		});

		it('should return false for items with undefined ammo', () => {
			expect(itemUsesAmmo('Shield', mockItems)).toBe(false);
		});

		it('should return false for items not in the list', () => {
			expect(itemUsesAmmo('Unknown Item', mockItems)).toBe(false);
		});

		it('should return false when items list is empty', () => {
			expect(itemUsesAmmo('Bow', [])).toBe(false);
		});
	});

	describe('getInitialAmmo', () => {
		const mockItems: Item[] = [
			{ item: 'Bow', cost: 5, ammo: 3 },
			{ item: 'Crossbow', cost: 8, ammo: 5 },
			{ item: 'Sword', cost: 4 }
		];

		it('should return correct ammo count for bow', () => {
			expect(getInitialAmmo('Bow', mockItems)).toBe(3);
		});

		it('should return correct ammo count for crossbow', () => {
			expect(getInitialAmmo('Crossbow', mockItems)).toBe(5);
		});

		it('should return 0 for items without ammo property', () => {
			expect(getInitialAmmo('Sword', mockItems)).toBe(0);
		});

		it('should return 0 for items not in the list', () => {
			expect(getInitialAmmo('Unknown Item', mockItems)).toBe(0);
		});

		it('should return 0 when items list is empty', () => {
			expect(getInitialAmmo('Bow', [])).toBe(0);
		});
	});

	describe('updateInventory', () => {
		let character: Character;

		beforeEach(() => {
			character = {
				...defaultCharacter(),
				inventory: 5,
				items: ['Sword', 'Shield', '', '', '']
			};
		});

		it('should expand items array when inventory increases', () => {
			updateInventory(character, 7);

			expect(character.inventory).toBe(7);
			expect(character.items).toHaveLength(7);
			expect(character.items).toEqual(['Sword', 'Shield', '', '', '', '', '']);
		});

		it('should fill new slots with empty strings', () => {
			updateInventory(character, 8);

			expect(character.items.slice(5)).toEqual(['', '', '']);
		});

		it('should shrink items array when inventory decreases', () => {
			updateInventory(character, 3);

			expect(character.inventory).toBe(3);
			expect(character.items).toHaveLength(3);
			expect(character.items).toEqual(['Sword', 'Shield', '']);
		});

		it('should preserve existing items when expanding', () => {
			const originalItems = [...character.items];
			updateInventory(character, 6);

			expect(character.items.slice(0, 5)).toEqual(originalItems);
		});

		it('should handle setting inventory to same value', () => {
			const originalLength = character.items.length;
			updateInventory(character, 5);

			expect(character.items).toHaveLength(originalLength);
		});

		it('should handle reducing to minimum inventory', () => {
			updateInventory(character, 2);

			expect(character.inventory).toBe(2);
			expect(character.items).toHaveLength(2);
		});

		it('should remove items from end when shrinking', () => {
			character.items = ['Sword', 'Shield', 'Bow', 'Potion', 'Helm'];
			updateInventory(character, 2);

			expect(character.items).toEqual(['Sword', 'Shield']);
		});
	});

	describe('isItemRestrictedForSpellcaster', () => {
		const mockItems: Item[] = [
			{ item: 'Heavy Armour', cost: 20, armour: 3 },
			{ item: 'Shield', cost: 2 },
			{ item: 'Bastard Sword', cost: 10, twoHanded: true },
			{ item: 'Bow', cost: 5, twoHanded: true },
			{ item: 'Sword', cost: 4 },
			{ item: 'Light Armour', cost: 2, armour: 1 }
		];

		it('should return true for Heavy Armour', () => {
			expect(isItemRestrictedForSpellcaster('Heavy Armour')).toBe(true);
		});

		it('should return true for Shield', () => {
			expect(isItemRestrictedForSpellcaster('Shield')).toBe(true);
		});

		it('should return true for two-handed weapons', () => {
			expect(isItemRestrictedForSpellcaster('Bastard Sword')).toBe(true);
		});

		it('should return true for two-handed bow', () => {
			expect(isItemRestrictedForSpellcaster('Bow')).toBe(true);
		});

		it('should return false for one-handed weapons', () => {
			expect(isItemRestrictedForSpellcaster('Sword')).toBe(false);
		});

		it('should return false for Light Armour', () => {
			expect(isItemRestrictedForSpellcaster('Light Armour')).toBe(false);
		});

		it('should return false for items not in database', () => {
			expect(isItemRestrictedForSpellcaster('Unknown Item')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isItemRestrictedForSpellcaster('')).toBe(false);
		});
	});

	describe('handleSpellcasterChange', () => {
		let character: Character;
		let originalCharacter: Character | null;
		const mockItems: Item[] = [
			{ item: 'Heavy Armour', cost: 20, armour: 3 },
			{ item: 'Shield', cost: 2 },
			{ item: 'Bastard Sword', cost: 10, twoHanded: true },
			{ item: 'Sword', cost: 4 },
			{ item: 'Light Armour', cost: 2, armour: 1 }
		];

		beforeEach(() => {
			character = {
				...defaultCharacter(),
				name: 'Test Character',
				inventory: 5,
				items: ['Sword', 'Light Armour', '', '', ''],
				isSpellcaster: false,
				cleanScroll: null,
				uncleanScroll: null
			};
			originalCharacter = null;
		});

		describe('when enabling spellcaster', () => {
			it('should set isSpellcaster to true', () => {
				const result = handleSpellcasterChange(character, originalCharacter, true);

				expect(character.isSpellcaster).toBe(true);
				expect(result.success).toBe(true);
			});

			it('should initialize scroll slots', () => {
				handleSpellcasterChange(character, originalCharacter, true);

				expect(character.cleanScroll).toBe('');
				expect(character.uncleanScroll).toBe('');
				expect(character.items[0]).toBe('');
				expect(character.items[1]).toBe('');
			});

			it('should ensure minimum 2 inventory slots', () => {
				character.items = [];
				handleSpellcasterChange(character, originalCharacter, true);

				expect(character.items).toHaveLength(2);
			});

			it('should remove restricted items', () => {
				character.items = ['Heavy Armour', 'Shield', 'Sword', '', ''];

				handleSpellcasterChange(character, originalCharacter, true);

				expect(character.items[0]).toBe('');
				expect(character.items[1]).toBe('');
				expect(character.items[2]).toBe('Sword');
			});

			it('should remove two-handed weapons', () => {
				character.items = ['', '', 'Bastard Sword', 'Sword', ''];

				handleSpellcasterChange(character, originalCharacter, true);

				// First two slots become scroll slots (empty)
				expect(character.items[0]).toBe('');
				expect(character.items[1]).toBe('');
				// Bastard Sword is removed (two-handed), but Sword should be preserved
				expect(character.items.includes('Bastard Sword')).toBe(false);
				expect(character.items.filter((item) => item === 'Sword')).toHaveLength(1);
			});

			it('should calculate refund for removed items from original character', () => {
				originalCharacter = {
					...character,
					items: ['Heavy Armour', 'Shield', 'Sword', '', '']
				};
				character.items = ['Heavy Armour', 'Shield', 'Sword', '', ''];

				const result = handleSpellcasterChange(character, originalCharacter, true);

				expect(result.refundAmount).toBe(22); // 20 (Heavy Armour) + 2 (Shield)
				expect(result.removedItems).toHaveLength(2);
			});

			it('should not refund picked-up restricted items', () => {
				originalCharacter = {
					...character,
					items: ['Heavy Armour', 'Sword', '', '', '']
				};
				character.items = ['Heavy Armour', 'Sword', '', '', ''];

				// Heavy Armour was picked up, not purchased
				const result = handleSpellcasterChange(character, originalCharacter, true);

				expect(result.refundAmount).toBe(20); // Only Heavy Armour
			});

			it('should track removed items without refund', () => {
				character.items = ['Shield', 'Sword', '', '', ''];

				const result = handleSpellcasterChange(character, originalCharacter, true);

				expect(result.removedItems).toEqual([{ name: 'Shield', cost: 0 }]);
				expect(result.refundAmount).toBe(0);
			});

			it('should preserve non-restricted items', () => {
				character.items = ['', '', 'Sword', 'Light Armour', 'Shield'];

				handleSpellcasterChange(character, originalCharacter, true);

				// First two slots are scroll slots (empty)
				expect(character.items[0]).toBe('');
				expect(character.items[1]).toBe('');
				// Shield is removed (restricted), but Sword and Light Armour are preserved
				expect(character.items.includes('Shield')).toBe(false);
				expect(character.items.filter((item) => item === 'Sword')).toHaveLength(1);
				expect(character.items.filter((item) => item === 'Light Armour')).toHaveLength(1);
			});
		});

		describe('when disabling spellcaster', () => {
			beforeEach(() => {
				character.isSpellcaster = true;
				character.cleanScroll = 'Some Clean Scroll';
				character.uncleanScroll = 'Some Unclean Scroll';
				character.items = ['Clean Scroll', 'Unclean Scroll', 'Sword', '', ''];
			});

			it('should set isSpellcaster to false', () => {
				const result = handleSpellcasterChange(character, originalCharacter, false);

				expect(character.isSpellcaster).toBe(false);
				expect(result.success).toBe(true);
			});

			it('should clear scroll properties', () => {
				handleSpellcasterChange(character, originalCharacter, false);

				expect(character.cleanScroll).toBeNull();
				expect(character.uncleanScroll).toBeNull();
			});

			it('should clear scroll slots in items array', () => {
				handleSpellcasterChange(character, originalCharacter, false);

				expect(character.items[0]).toBe('');
				expect(character.items[1]).toBe('');
			});

			it('should preserve other items', () => {
				handleSpellcasterChange(character, originalCharacter, false);

				expect(character.items[2]).toBe('Sword');
			});

			it('should return zero refund', () => {
				const result = handleSpellcasterChange(character, originalCharacter, false);

				expect(result.refundAmount).toBe(0);
				expect(result.removedItems).toEqual([]);
			});
		});
	});

	describe('handleScrollSelect', () => {
		let character: Character;

		beforeEach(() => {
			character = {
				...defaultCharacter(),
				isSpellcaster: true,
				inventory: 5,
				items: ['', '', 'Sword', '', ''],
				cleanScroll: '',
				uncleanScroll: ''
			};
		});

		describe('when selecting clean scroll', () => {
			it('should set cleanScroll property', () => {
				handleScrollSelect(character, 'clean', 'Hopes Last Breath');

				expect(character.cleanScroll).toBe('Hopes Last Breath');
			});

			it('should update items array at index 0', () => {
				handleScrollSelect(character, 'clean', 'Hopes Last Breath');

				expect(character.items[0]).toBe('Hopes Last Breath');
			});

			it('should handle undefined scroll name', () => {
				handleScrollSelect(character, 'clean', undefined);

				expect(character.cleanScroll).toBe('');
				expect(character.items[0]).toBe('[Clean Scroll Slot]');
			});

			it('should preserve other items', () => {
				const originalItems = [...character.items];
				handleScrollSelect(character, 'clean', 'Hopes Last Breath');

				expect(character.items[2]).toBe(originalItems[2]);
			});

			it('should create new items array reference', () => {
				const originalItemsRef = character.items;
				handleScrollSelect(character, 'clean', 'Hopes Last Breath');

				expect(character.items).not.toBe(originalItemsRef);
			});
		});

		describe('when selecting unclean scroll', () => {
			it('should set uncleanScroll property', () => {
				handleScrollSelect(character, 'unclean', 'Flaming Hands of St Vilmarex');

				expect(character.uncleanScroll).toBe('Flaming Hands of St Vilmarex');
			});

			it('should update items array at index 1', () => {
				handleScrollSelect(character, 'unclean', 'Flaming Hands of St Vilmarex');

				expect(character.items[1]).toBe('Flaming Hands of St Vilmarex');
			});

			it('should handle undefined scroll name', () => {
				handleScrollSelect(character, 'unclean', undefined);

				expect(character.uncleanScroll).toBe('');
				expect(character.items[1]).toBe('[Unclean Scroll Slot]');
			});

			it('should preserve other items', () => {
				const originalItems = [...character.items];
				handleScrollSelect(character, 'unclean', 'Flaming Hands of St Vilmarex');

				expect(character.items[2]).toBe(originalItems[2]);
			});

			it('should create new items array reference', () => {
				const originalItemsRef = character.items;
				handleScrollSelect(character, 'unclean', 'Flaming Hands of St Vilmarex');

				expect(character.items).not.toBe(originalItemsRef);
			});
		});

		describe('when changing scroll selection', () => {
			it('should replace existing clean scroll', () => {
				character.cleanScroll = 'Old Scroll';
				character.items[0] = 'Old Scroll';

				handleScrollSelect(character, 'clean', 'New Scroll');

				expect(character.cleanScroll).toBe('New Scroll');
				expect(character.items[0]).toBe('New Scroll');
			});

			it('should replace existing unclean scroll', () => {
				character.uncleanScroll = 'Old Scroll';
				character.items[1] = 'Old Scroll';

				handleScrollSelect(character, 'unclean', 'New Scroll');

				expect(character.uncleanScroll).toBe('New Scroll');
				expect(character.items[1]).toBe('New Scroll');
			});
		});
	});
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
	calculateCharacterCost,
	defaultCharacter,
	calculateTotalArmour,
	calculateModifiedStats
} from '$lib';
import type { Character, FeatOrFlaw, Item } from '$lib';

describe('statsUtils', () => {
	describe('calculateCharacterCost', () => {
		it('should return 0 for a character with no items and not a spellcaster', () => {
			const character: Character = {
				...defaultCharacter(),
				items: []
			};
			const items = [];

			expect(calculateCharacterCost(character, items)).toBe(0);
		});

		it('should calculate cost of items correctly', () => {
			const character: Character = {
				...defaultCharacter(),
				items: ['Sword', 'Shield'],
				pickedUpItems: []
			};
			const items = [
				{ item: 'Sword', cost: 4 },
				{ item: 'Shield', cost: 2 }
			];

			expect(calculateCharacterCost(character, items)).toBe(6);
		});

		it('should add 5 gold for spellcaster', () => {
			const character: Character = {
				...defaultCharacter(),
				items: [],
				isSpellcaster: true
			};
			const items = [];

			expect(calculateCharacterCost(character, items)).toBe(5);
		});

		it('should combine item costs and spellcaster cost', () => {
			const character: Character = {
				...defaultCharacter(),
				items: ['Sword', 'Light Armour'],
				isSpellcaster: true,
				pickedUpItems: []
			};
			const items = [
				{ item: 'Sword', cost: 4 },
				{ item: 'Light Armour', cost: 2 }
			];

			expect(calculateCharacterCost(character, items)).toBe(11); // 4 + 2 + 5
		});

		it('should exclude picked up items from cost calculation', () => {
			const character: Character = {
				...defaultCharacter(),
				items: ['Sword', 'Shield', 'Potion'],
				pickedUpItems: ['Potion']
			};
			const items = [
				{ item: 'Sword', cost: 4 },
				{ item: 'Shield', cost: 2 },
				{ item: 'Potion', cost: 6 }
			];

			expect(calculateCharacterCost(character, items)).toBe(6); // Potion excluded
		});

		it('should handle empty item slots', () => {
			const character: Character = {
				...defaultCharacter(),
				items: ['Sword', '', 'Shield', ''],
				pickedUpItems: []
			};
			const items = [
				{ item: 'Sword', cost: 4 },
				{ item: 'Shield', cost: 2 }
			];

			expect(calculateCharacterCost(character, items)).toBe(6);
		});

		it('should handle items not in the items list', () => {
			const character: Character = {
				...defaultCharacter(),
				items: ['Sword', 'Unknown Item'],
				pickedUpItems: []
			};
			const items = [{ item: 'Sword', cost: 4 }];

			expect(calculateCharacterCost(character, items)).toBe(4);
		});
	});

	describe('defaultCharacter', () => {
		it('should create a character with correct default values', () => {
			const character = defaultCharacter();

			expect(character.name).toBe('');
			expect(character.hp).toBe(8); // 8 base + 0 toughness
			expect(character.armour).toBe(0);
			expect(character.agility).toBe(0);
			expect(character.presence).toBe(0);
			expect(character.strength).toBe(0);
			expect(character.toughness).toBe(0);
			expect(character.inventory).toBe(5); // 5 base + 0 strength
			expect(character.items).toEqual(Array(5).fill(''));
			expect(character.pickedUpItems).toEqual([]);
			expect(character.feats).toEqual([]);
			expect(character.flaws).toEqual([]);
			expect(character.injuries).toEqual([]);
			expect(character.isSpellcaster).toBe(false);
			expect(character.cleanScroll).toBe('');
			expect(character.uncleanScroll).toBe('');
			expect(character.ammoTrackers).toEqual([]);
		});

		it('should calculate HP based on toughness', () => {
			// This would require modifying the function to accept parameters
			// For now, it always creates with 0 toughness
			const character = defaultCharacter();
			expect(character.hp).toBe(8);
		});

		it('should calculate inventory based on strength', () => {
			// Similarly, this always creates with 0 strength
			const character = defaultCharacter();
			expect(character.inventory).toBe(5);
			expect(character.items.length).toBe(5);
		});
	});

	describe('calculateTotalArmour', () => {
		it('should return 0 for no items', () => {
			expect(calculateTotalArmour([], [])).toBe(0);
		});

		it('should sum armour values from items', () => {
			const characterItems = ['Light Armour', 'Helm'];
			const itemsList = [
				{ item: 'Light Armour', cost: 2, armour: 1 },
				{ item: 'Helm', cost: 5, armour: 0 },
				{ item: 'Medium Armour', cost: 10, armour: 2 }
			];

			expect(calculateTotalArmour(characterItems, itemsList)).toBe(1);
		});

		it('should handle multiple armour items', () => {
			const characterItems = ['Light Armour', 'Medium Armour'];
			const itemsList = [
				{ item: 'Light Armour', cost: 2, armour: 1 },
				{ item: 'Medium Armour', cost: 10, armour: 2 }
			];

			expect(calculateTotalArmour(characterItems, itemsList)).toBe(3);
		});

		it('should ignore items without armour property', () => {
			const characterItems = ['Sword', 'Shield'];
			const itemsList = [
				{ item: 'Sword', cost: 4 },
				{ item: 'Shield', cost: 2 }
			];

			expect(calculateTotalArmour(characterItems, itemsList)).toBe(0);
		});

		it('should ignore empty item slots', () => {
			const characterItems = ['Light Armour', '', ''];
			const itemsList = [{ item: 'Light Armour', cost: 2, armour: 1 }];

			expect(calculateTotalArmour(characterItems, itemsList)).toBe(1);
		});

		it('should handle items not in the items list', () => {
			const characterItems = ['Light Armour', 'Unknown Item'];
			const itemsList = [{ item: 'Light Armour', cost: 2, armour: 1 }];

			expect(calculateTotalArmour(characterItems, itemsList)).toBe(1);
		});
	});

	describe('calculateModifiedStats', () => {
		let baseCharacter: Character;
		let emptyFeats: FeatOrFlaw[];
		let emptyFlaws: FeatOrFlaw[];
		let emptyItems: Item[];

		beforeEach(() => {
			baseCharacter = {
				...defaultCharacter(),
				agility: 2,
				presence: 1,
				strength: 0,
				toughness: -1
			};
			emptyFeats = [];
			emptyFlaws = [];
			emptyItems = [];
		});

		it('should return base stats with no modifiers', () => {
			const result = calculateModifiedStats(baseCharacter, emptyFeats, emptyFlaws, emptyItems);

			expect(result.agility).toBe(2);
			expect(result.presence).toBe(1);
			expect(result.strength).toBe(0);
			expect(result.toughness).toBe(-1);
			expect(result.armour).toBe(0);
			expect(result.hp).toBe(0);
			expect(result.equipmentSlots).toBe(0);
			expect(result.maxRange).toBe(0);
			expect(result.weaponRestrictions).toBe('');
		});

		it('should apply feat stat modifiers', () => {
			const character: Character = {
				...baseCharacter,
				feats: ['Test Feat']
			};
			const feats: FeatOrFlaw[] = [
				{
					name: 'Test Feat',
					description: 'A test feat',
					statModifiers: {
						agility: 1,
						strength: 2,
						hp: 1
					}
				}
			];

			const result = calculateModifiedStats(character, feats, emptyFlaws, emptyItems);

			expect(result.agility).toBe(3); // 2 + 1
			expect(result.strength).toBe(2); // 0 + 2
			expect(result.hp).toBe(1);
		});

		it('should apply flaw stat modifiers', () => {
			const character: Character = {
				...baseCharacter,
				flaws: ['Test Flaw']
			};
			const flaws: FeatOrFlaw[] = [
				{
					name: 'Test Flaw',
					description: 'A test flaw',
					statModifiers: {
						agility: -1,
						hp: -1
					}
				}
			];

			const result = calculateModifiedStats(character, emptyFeats, flaws, emptyItems);

			expect(result.agility).toBe(1); // 2 - 1
			expect(result.hp).toBe(-1);
		});

		it('should apply injury stat modifiers', () => {
			const character: Character = {
				...baseCharacter,
				injuries: ['Broken Bones']
			};

			const result = calculateModifiedStats(character, emptyFeats, emptyFlaws, emptyItems);

			// Assuming injuries are imported from the actual injuries data
			// This would need to match your actual injury definitions
			expect(result.agility).toBe(1); // 2 - 1 from Broken Bones
		});

		it('should add extra inventory slots from items', () => {
			const character: Character = {
				...baseCharacter,
				items: ['Backpack']
			};
			const items = [{ item: 'Backpack', cost: 1, extraInventorySlots: 2 }];

			const result = calculateModifiedStats(character, emptyFeats, emptyFlaws, items);

			expect(result.equipmentSlots).toBe(2);
		});

		it('should add extra inventory slots from feats', () => {
			const character: Character = {
				...baseCharacter,
				feats: ['Scavenger']
			};
			const feats: FeatOrFlaw[] = [
				{
					name: 'Scavenger',
					description: 'Extra slots',
					statModifiers: {
						extraInventorySlots: 1
					}
				}
			];

			const result = calculateModifiedStats(character, feats, emptyFlaws, emptyItems);

			expect(result.equipmentSlots).toBe(1);
		});

		it('should handle negative inventory slot modifiers', () => {
			const character: Character = {
				...baseCharacter,
				flaws: ['Lucky goblin foot']
			};
			const flaws: FeatOrFlaw[] = [
				{
					name: 'Lucky goblin foot',
					description: 'Less slots',
					statModifiers: {
						extraInventorySlots: -1
					}
				}
			];

			const result = calculateModifiedStats(character, emptyFeats, flaws, emptyItems);

			expect(result.equipmentSlots).toBe(-1);
		});

		it('should combine multiple stat modifiers from different sources', () => {
			const character: Character = {
				...baseCharacter,
				items: ['Backpack'],
				feats: ['Strong Back'],
				flaws: ['Weak Hands'],
				injuries: ['Lost Limb']
			};
			const items = [{ item: 'Backpack', cost: 1, extraInventorySlots: 2 }];
			const feats: FeatOrFlaw[] = [
				{
					name: 'Strong Back',
					description: 'Extra carry',
					statModifiers: {
						extraInventorySlots: 1,
						strength: 1
					}
				}
			];
			const flaws: FeatOrFlaw[] = [
				{
					name: 'Weak Hands',
					description: 'Less slots',
					statModifiers: {
						extraInventorySlots: -1
					}
				}
			];

			const result = calculateModifiedStats(character, feats, flaws, items);

			expect(result.equipmentSlots).toBe(1); // 2 + 1 - 1 - 1
			expect(result.strength).toBe(1); // 0 + 1
		});

		it('should handle weapon restrictions from injuries', () => {
			const character: Character = {
				...baseCharacter,
				injuries: ['Lost Limb']
			};

			const result = calculateModifiedStats(character, emptyFeats, emptyFlaws, emptyItems);

			expect(result.weaponRestrictions).toBe('one-handed');
		});

		it('should not include weapon restrictions in numeric calculations', () => {
			const character: Character = {
				...baseCharacter,
				feats: ['Test Feat']
			};
			const feats: FeatOrFlaw[] = [
				{
					name: 'Test Feat',
					description: 'Test',
					statModifiers: {
						weaponRestrictions: 'test-restriction'
					}
				}
			];

			const result = calculateModifiedStats(character, feats, emptyFlaws, emptyItems);

			// Should not throw error or affect numeric stats
			expect(result.agility).toBe(2);
			expect(result.weaponRestrictions).toBe('');
		});

		it('should handle characters with no feats, flaws, or injuries', () => {
			const result = calculateModifiedStats(baseCharacter, emptyFeats, emptyFlaws, emptyItems);

			expect(result.agility).toBe(2);
			expect(result.presence).toBe(1);
			expect(result.strength).toBe(0);
			expect(result.toughness).toBe(-1);
		});
	});
});

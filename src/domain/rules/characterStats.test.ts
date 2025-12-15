import { describe, it, expect } from 'vitest';
import {
	BASE_HP,
	BASE_INVENTORY,
	calculateCharacterCost,
	calculateModifiedStats,
	calculateTotalArmour,
	clampHpToMax,
	defaultCharacter,
	getBaseHP,
	getBaseInventory
} from './characterStats';
import { items, injuries as injuryData } from '$domain/data';

describe('characterStats rules', () => {
	it('creates a default character with base stats populated', () => {
		const character = defaultCharacter();

		expect(character.hp).toBe(BASE_HP);
		expect(character.inventory).toBe(BASE_INVENTORY);
		expect(character.items).toHaveLength(BASE_INVENTORY);
		expect(character.pickedUpItems).toEqual([]);
	});

	it('calculates character cost including spellcaster surcharge and excluding picked up items', () => {
		const swordCost = items.find((i) => i.item === 'Sword')?.cost ?? 0;
		const character = {
			...defaultCharacter(),
			isSpellcaster: true,
			items: ['Sword', 'Unknown Item', 'Bow', '', ''],
			pickedUpItems: ['Bow']
		};

		const cost = calculateCharacterCost(character, items);

		expect(cost).toBe(swordCost + 5);
	});

	it('totals armour bonuses from equipped items', () => {
		const totalArmour = calculateTotalArmour(['Light Armour', 'Medium Armour'], items);
		expect(totalArmour).toBe(3);
	});

	it('aggregates stat modifiers from feats, flaws, items, and injuries', () => {
		const character = {
			...defaultCharacter(),
			agility: 1,
			presence: 2,
			strength: 0,
			toughness: 0,
			items: ['Backpack', '', '', '', ''],
			feats: ['Pack Tactics'],
			flaws: ['Glass Jaw'],
			injuries: ['Lost Limb', 'Maimed']
		};

		const feats = [
			{
				name: 'Pack Tactics',
				description: '',
				statModifiers: { strength: 1, hp: 1, extraInventorySlots: 1 }
			}
		];
		const flaws = [
			{
				name: 'Glass Jaw',
				description: '',
				statModifiers: { toughness: -1, agility: -1, extraInventorySlots: -1 }
			}
		];

		const modified = calculateModifiedStats(character, feats, flaws, items);

		expect(modified.strength).toBe(1);
		expect(modified.toughness).toBe(-1);
		expect(modified.agility).toBe(0);
		expect(modified.hp).toBe(0);
		expect(modified.equipmentSlots).toBe(1);
		expect(modified.weaponRestrictions).toBe(
			injuryData.find((i) => i.name === 'Lost Limb')?.statModifiers.weaponRestrictions
		);
	});

	it('clamps hit points to the maximum derived from base HP and modifiers', () => {
		const character = { ...defaultCharacter(), hp: 15, toughness: 1 };
		const baseHP = getBaseHP(character.toughness);
		const modified = { hp: 1 };

		const { character: clamped, maxHP } = clampHpToMax(character, baseHP, modified);

		expect(maxHP).toBe(BASE_HP + character.toughness + modified.hp);
		expect(clamped.hp).toBe(maxHP);
	});

	it('derives base values from stat helpers', () => {
		expect(getBaseHP(3)).toBe(BASE_HP + 3);
		expect(getBaseInventory(-1)).toBe(BASE_INVENTORY - 1);
	});
});

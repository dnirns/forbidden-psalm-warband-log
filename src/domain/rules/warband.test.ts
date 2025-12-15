import { describe, it, expect } from 'vitest';
import { calculateGoldDifference } from './warband';
import { defaultCharacter } from './characterStats';
import { items } from '$domain/data';

describe('warband rules', () => {
	const store = {
		data: {
			warbandName: 'Gold Diggers',
			characters: [
				{
					...defaultCharacter(),
					items: ['Sword', 'Bow', '', '', ''],
					pickedUpItems: [],
					isSpellcaster: false
				}
			],
			gold: 20,
			xp: 0
		}
	};

	it('calculates gold required for a new character', () => {
		const newCharacter = { ...defaultCharacter(), items: ['Sword', '', '', '', ''] };
		const goldNeeded = calculateGoldDifference(newCharacter, -1, store, items);
		const swordCost = items.find((i) => i.item === 'Sword')?.cost ?? 0;

		expect(goldNeeded).toBe(swordCost);
	});

	it('accounts for dropped purchased items when updating an existing character', () => {
		const updatedCharacter = {
			...store.data.characters[0],
			items: ['Sword', '', '', '', ''],
			pickedUpItems: []
		};

		const difference = calculateGoldDifference(updatedCharacter, 0, store, items);

		expect(difference).toBe(items.find((i) => i.item === 'Sword')?.cost ?? 0);
	});

	it('ignores refunds for items marked as picked up', () => {
		const updatedCharacter = {
			...store.data.characters[0],
			items: ['', '', '', '', ''],
			pickedUpItems: ['Bow']
		};

		const difference = calculateGoldDifference(updatedCharacter, 0, store, items);

		expect(difference).toBe(-5);
	});

	it('handles items that are not present in the catalog gracefully', () => {
		const characterWithUnknown = {
			...defaultCharacter(),
			items: ['Unknown Relic', '', '', '', ''],
			pickedUpItems: []
		};
		const customStore = { data: { ...store.data, characters: [characterWithUnknown] } };

		const difference = calculateGoldDifference(characterWithUnknown, 0, customStore, []);

		expect(difference).toBe(0);
	});
});

import { describe, it, expect } from 'vitest';
import {
	addInjury,
	clampHp,
	dropItem,
	pickUpItem,
	refillAmmo,
	removeInjury,
	takeDamage,
	useAmmo
} from './characterService';
import { defaultCharacter } from '$domain/rules';
import { items } from '$domain/data';

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
});

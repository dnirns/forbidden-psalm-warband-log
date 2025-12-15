import { describe, it, expect, vi } from 'vitest';
import { defaultCharacter } from '$domain/rules';
import { items, scrolls, feats as domainFeats } from '$domain/data';
import {
	applyModifier,
	applySpellcasterChange,
	updateItemSelection,
	removeItemWithOptionalRefund,
	removeItem,
	removeModifier,
	selectScroll,
	updateStatAndInventory
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

	it('withholds refunds for items that were picked up during play', () => {
		const base = defaultCharacter();
		const withBow = {
			...updateItemSelection(base, 0, 'Bow', items),
			pickedUpItems: ['Bow']
		};

		const result = removeItemWithOptionalRefund(withBow, 'Bow', ['Bow'], 0, items);

		expect(result.goldRefund).toBe(0);
	});

	it('removes items even when picked up tracking is missing', () => {
		const character = {
			...defaultCharacter(),
			items: ['Sword', ...defaultCharacter().items.slice(1)],
			pickedUpItems: undefined as unknown as string[]
		};

		const result = removeItemWithOptionalRefund(character as typeof character, 'Sword', ['Sword'], 0, items);

		expect(result.updatedCharacter.items[0]).toBe('');
		expect(result.updatedCharacter.pickedUpItems).toEqual([]);
	});

	it('initializes picked up tracking when the clone omits it', async () => {
		vi.resetModules();
		vi.doMock('./characterService', async () => {
			const actual = await vi.importActual<typeof import('./characterService')>('./characterService');
			return {
				...actual,
				cloneCharacter: (character: unknown) => ({ ...(character as object) })
			};
		});

		const { removeItemWithOptionalRefund: mockedRemove } = await import('./characterEditorService');
		const character = {
			...defaultCharacter(),
			items: ['Sword', ...defaultCharacter().items.slice(1)],
			pickedUpItems: undefined as unknown as string[]
		};

		const result = mockedRemove(character as typeof character, 'Sword', ['Sword'], 0, items);

		expect(result.updatedCharacter.pickedUpItems).toEqual([]);
		vi.resetModules();
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

	it('applies spellcaster changes through the wrapper', () => {
		const base = defaultCharacter();
		const character = {
			...base,
			items: ['Heavy Armour', '', '', '', ''],
			pickedUpItems: []
		};
		const original = { ...character };
		const heavyCost = items.find((i) => i.item === 'Heavy Armour')?.cost ?? 0;

		const result = applySpellcasterChange(character, original, true, items);

		expect(result.refundAmount).toBe(heavyCost);
		expect(character.isSpellcaster).toBe(true);
	});

	it('returns untouched character and zero refund when removing a missing item', () => {
		const character = defaultCharacter();
		const result = removeItemWithOptionalRefund(character, 'Missing', ['Missing']);
		expect(result.goldRefund).toBe(0);
		expect(result.updatedCharacter.items).toEqual(character.items);
	});

	it('removes items through the convenience wrapper', () => {
		const withSword = updateItemSelection(defaultCharacter(), 0, 'Sword', items);
		const updated = removeItem(withSword, 'Sword', 0, items);
		expect(updated.items[0]).toBe('');
	});

	it('pads inventory when adding items that increase slots even when picked up list is absent', () => {
		const base = defaultCharacter();
		const character = {
			...base,
			items: [...base.items],
			pickedUpItems: undefined as unknown as string[]
		};

		const updated = updateItemSelection(character as typeof base, 0, 'Backpack', items);

		expect(updated.inventory).toBe(base.inventory + 2);
		expect(updated.items).toHaveLength(updated.inventory);
		expect(Array.isArray(updated.pickedUpItems)).toBe(true);
	});

	it('initializes picked up items when the clone provides none', async () => {
		vi.resetModules();
		vi.doMock('./characterService', () => ({
			cloneCharacter: (character: unknown) => ({
				...(character as object),
				items: Array.isArray((character as { items?: string[] }).items)
					? (character as { items: string[] }).items
					: [],
				pickedUpItems: undefined,
				ammoTrackers: []
			})
		}));

		const { updateItemSelection: mockedUpdateItemSelection } = await import('./characterEditorService');
		const character = { ...defaultCharacter(), items: ['Sword', ...defaultCharacter().items.slice(1)] };

		const updated = mockedUpdateItemSelection(character, 0, 'Bow', items);

		expect(updated.pickedUpItems).toEqual([]);
		vi.resetModules();
	});

	it('trims ammo trackers and items when removing extra-slot equipment', () => {
		const base = defaultCharacter();
		const character = {
			...base,
			inventory: base.inventory + 2,
			items: ['Backpack', 'Bow', 'Sword', '', '', '', ''],
			pickedUpItems: ['Backpack', 'Bow'],
			ammoTrackers: [{ weaponName: 'Bow', slotIndex: 6, currentAmmo: 3 }]
		};

		const result = removeItemWithOptionalRefund(character, 'Backpack', ['Backpack'], 0, items);

		expect(result.updatedCharacter.inventory).toBe(base.inventory);
		expect(result.updatedCharacter.items).toHaveLength(base.inventory);
		expect(result.updatedCharacter.ammoTrackers).toHaveLength(0);
	});

	it('clamps HP when toughness is reduced', () => {
		const character = { ...defaultCharacter(), hp: 20 };
		const updated = updateStatAndInventory(character, { stat: 'toughness', value: -1, maxInventory: 10 });
		expect(updated.hp).toBe(7);
	});

	it('enforces both maximum and base inventory when strength changes', () => {
		const oversized = {
			...defaultCharacter(),
			inventory: 10,
			items: Array(10).fill('Sword')
		};
		const capped = updateStatAndInventory(oversized, { stat: 'strength', value: 0, maxInventory: 6 });
		expect(capped.inventory).toBe(6);
		expect(capped.items).toHaveLength(6);

		const undersized = { ...defaultCharacter(), inventory: 2, items: ['', ''] };
		const expanded = updateStatAndInventory(undersized, { stat: 'strength', value: 3, maxInventory: 10 });
		expect(expanded.inventory).toBe(8);
		expect(expanded.items).toHaveLength(8);
	});

	it('applies modifiers, respecting duplicates and weapon restrictions', () => {
		const base = defaultCharacter();
		const withInjury = applyModifier(
			{ ...base, items: ['Bow', ...base.items.slice(1)] },
			{ name: 'Lost Limb', type: 'injury' },
			items
		);
		expect(withInjury.injuries).toContain('Lost Limb');
		expect(withInjury.items[0]).toBe('');
		expect(withInjury.inventory).toBe(base.inventory - 1);

		const unchanged = applyModifier(withInjury, { name: 'Lost Limb', type: 'injury' }, items);
		expect(unchanged.injuries).toHaveLength(withInjury.injuries.length);

		const noOp = applyModifier(base, { name: 'Missing', type: 'feat' }, items);
		expect(noOp.feats).toEqual(base.feats);
	});

	it('applies flaws through the correct branch', () => {
		const base = defaultCharacter();
		const flawed = applyModifier(base, { name: 'Gammy foot', type: 'flaw' }, items);
		expect(flawed.flaws).toContain('Gammy foot');
	});

	it('pads inventory when modifiers add extra slots', () => {
		const extraSlotsFeat = {
			name: 'Pack Mule',
			description: '',
			statModifiers: { extraInventorySlots: 2 }
		};
		domainFeats.push(extraSlotsFeat);

		const base = defaultCharacter();
		const updated = applyModifier(base, { name: extraSlotsFeat.name, type: 'feat' }, items);

		expect(updated.inventory).toBe(base.inventory + 2);
		expect(updated.items).toHaveLength(updated.inventory);

		domainFeats.pop();
	});

	it('removes injuries through the modifier removal helper', () => {
		const withInjury = applyModifier(defaultCharacter(), { name: 'Lost Limb', type: 'injury' }, items);
		const healed = removeModifier(withInjury, { name: 'Lost Limb', type: 'injury' });

		expect(healed.injuries).not.toContain('Lost Limb');
		expect(healed.inventory).toBeGreaterThanOrEqual(withInjury.inventory);
	});

	it('ignores removal when modifier is not present', () => {
		const base = defaultCharacter();
		const result = removeModifier(base, { name: 'Missing', type: 'feat' });
		expect(result).not.toBe(base);
		expect(result.feats).toEqual(base.feats);
	});

	it('removes flaws through the removal helper', () => {
		const flawed = { ...defaultCharacter(), flaws: ['Gammy foot'] };
		const cleaned = removeModifier(flawed, { name: 'Gammy foot', type: 'flaw' });
		expect(cleaned.flaws).not.toContain('Gammy foot');
	});

	it('updates unclean scroll slots and placeholders', () => {
		const base = { ...defaultCharacter(), isSpellcaster: true };
		const updated = selectScroll(base, 'unclean', undefined);
		expect(updated.uncleanScroll).toBe('');
		expect(updated.items[1]).toBe('[Unclean Scroll Slot]');
	});
});

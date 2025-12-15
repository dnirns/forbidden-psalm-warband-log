import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { WarbandData, Character } from '$lib/types';

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const mockCloneCharacter = vi.fn((character: Character) => deepClone(character));
const mockCloneWarbandData = vi.fn((data: WarbandData) => ({
	...data,
	characters: data.characters.map((char) => mockCloneCharacter(char))
}));
const mockClampHp = vi.fn((character: Character, maxHp: number) => ({
	...mockCloneCharacter(character),
	hp: Math.min(character.hp, maxHp)
}));
const mockTakeDamage = vi.fn((character: Character, amount: number) => ({
	...mockCloneCharacter(character),
	hp: Math.max(0, character.hp - amount)
}));
const mockReviveCharacter = vi.fn((character: Character) => ({
	...mockCloneCharacter(character),
	hp: 1
}));
const mockPickUpItem = vi.fn(
	(character: Character, slotIndex: number, itemName: string, _context?: unknown) => {
		const next = mockCloneCharacter(character);
		while (next.items.length <= slotIndex) {
			next.items.push('');
		}
		next.items[slotIndex] = itemName;
		next.pickedUpItems = [...next.pickedUpItems, itemName];
		return { character: next };
	}
);
const mockDropItem = vi.fn(
	(character: Character, itemName: string, slotIndex?: number, _context?: unknown) => {
		const next = mockCloneCharacter(character);
		const index =
			typeof slotIndex === 'number' ? slotIndex : next.items.findIndex((item) => item === itemName);
		if (index >= 0) {
			next.items[index] = '';
		}
		next.pickedUpItems = next.pickedUpItems.filter((item) => item !== itemName);
		return next;
	}
);
const mockUseAmmo = vi.fn(
	(character: Character, weaponName: string, slotIndex: number, _context?: unknown) => {
		const next = mockCloneCharacter(character);
		const tracker = next.ammoTrackers.find(
			(t) => t.weaponName === weaponName && t.slotIndex === slotIndex
		);
		if (tracker) {
			tracker.currentAmmo = Math.max(0, tracker.currentAmmo - 1);
		}
		return next;
	}
);
const mockRefillAmmo = vi.fn(
	(character: Character, weaponName: string, slotIndex: number, _context?: unknown) => {
		const next = mockCloneCharacter(character);
		const tracker = next.ammoTrackers.find(
			(t) => t.weaponName === weaponName && t.slotIndex === slotIndex
		);
		if (tracker) {
			tracker.currentAmmo = 3;
		}
		return next;
	}
);
const mockAddInjury = vi.fn((character: Character, injuryName: string, _context?: unknown) => {
		const next = mockCloneCharacter(character);
		if (!next.injuries.includes(injuryName)) {
			next.injuries.push(injuryName);
		}
		return next;
});
const mockRemoveInjury = vi.fn((character: Character, injuryName: string, _context?: unknown) => {
		const next = mockCloneCharacter(character);
		next.injuries = next.injuries.filter((injury) => injury !== injuryName);
		return next;
});

const modifierKey = (type: 'feat' | 'flaw' | 'injury'): 'feats' | 'flaws' | 'injuries' =>
	type === 'feat' ? 'feats' : type === 'flaw' ? 'flaws' : 'injuries';

const mockApplySpellcasterChange = vi.fn(
	(_character: Character, _original: Character | null, checked: boolean, _items?: unknown) => ({
		success: true,
		refundAmount: 0,
		removedItems: []
	})
);
const mockRemoveItemWithOptionalRefund = vi.fn(
	(character: Character, itemName: string, originalItems: string[], _slotIndex?: number, _items?: unknown) => {
		const next = mockCloneCharacter(character);
		const refund = originalItems.includes(itemName) ? 3 : 0;
		next.items = next.items.map((item) => (item === itemName ? '' : item));
		return { updatedCharacter: next, goldRefund: refund };
	}
);
const mockUpdateStatAndInventory = vi.fn(
	(
		character: Character,
		payload: { stat: 'strength' | 'toughness' | 'agility' | 'presence'; value: number; maxInventory: number }
	) => ({
		...character,
		[payload.stat]: payload.value,
		inventory: payload.maxInventory
	})
);
const mockApplyModifier = vi.fn(
	(
		character: Character,
		{ name, type }: { name: string; type: 'feat' | 'flaw' | 'injury' },
		_items?: unknown
	) => {
		const key = modifierKey(type);
		const next = mockCloneCharacter(character);
		if (!next[key].includes(name)) {
			next[key] = [...next[key], name];
		}
		return next;
	}
);
const mockUpdateItemSelection = vi.fn(
	(character: Character, slotIndex: number, itemName: string, _items?: unknown) => {
		const next = mockCloneCharacter(character);
		next.items[slotIndex] = itemName;
		return next;
	}
);
const mockRemoveItem = vi.fn(
	(character: Character, itemName: string, slotIndex?: number, _items?: unknown) => {
		const next = mockCloneCharacter(character);
		const index =
			typeof slotIndex === 'number' ? slotIndex : next.items.findIndex((item) => item === itemName);
		if (index >= 0) {
			next.items[index] = '';
		}
		return next;
	}
);
const mockRemoveModifier = vi.fn(
	(character: Character, { name, type }: { name: string; type: 'feat' | 'flaw' | 'injury' }) => {
		const key = modifierKey(type);
		const next = mockCloneCharacter(character);
		next[key] = next[key].filter((entry) => entry !== name);
		return next;
	}
);
const mockSelectScroll = vi.fn(
	(character: Character, scrollType: 'clean' | 'unclean', scrollName: string | undefined) => {
		const next = mockCloneCharacter(character);
		const index = scrollType === 'clean' ? 0 : 1;
		next.items[index] =
			scrollName ?? `[${scrollType === 'clean' ? 'Clean' : 'Unclean'} Scroll Slot]`;
		if (scrollType === 'clean') {
			next.cleanScroll = scrollName ?? '';
		} else {
			next.uncleanScroll = scrollName ?? '';
		}
		return next;
	}
);

vi.mock('$infrastructure/firebase/firebaseServices');
vi.mock('$infrastructure/firebase/firebase', () => ({ auth: { currentUser: null } }));
vi.mock('$lib/data/items', () => ({ default: [] }));
vi.mock('$lib/stores/undoStore', () => ({ undoStore: { setUndoAction: vi.fn() } }));
vi.mock('$domain/rules', () => ({
	defaultCharacter: () => ({
		name: '',
		hp: 8,
		move: 6,
		agility: 0,
		combat: 0,
		shoot: 0,
		toughness: 0,
		will: 0,
		items: ['', ''],
		feats: [],
		flaws: [],
		injuries: [],
		inventory: 2,
		isSpellcaster: false,
		cleanScroll: '',
		uncleanScroll: '',
		pickedUpItems: [],
		ammoTrackers: []
	}),
	calculateCharacterCost: vi.fn(() => 10),
	calculateGoldDifference: vi.fn(() => 0)
}));
vi.mock('$domain/services/characterService', () => ({
	cloneCharacter: mockCloneCharacter,
	cloneWarbandData: mockCloneWarbandData,
	clampHp: mockClampHp,
	takeDamage: mockTakeDamage,
	reviveCharacter: mockReviveCharacter,
	pickUpItem: mockPickUpItem,
	dropItem: mockDropItem,
	useAmmo: mockUseAmmo,
	refillAmmo: mockRefillAmmo,
	addInjury: mockAddInjury,
	removeInjury: mockRemoveInjury
}));
vi.mock('$domain/services/characterEditorService', () => ({
	applySpellcasterChange: mockApplySpellcasterChange,
	removeItemWithOptionalRefund: mockRemoveItemWithOptionalRefund,
	updateStatAndInventory: mockUpdateStatAndInventory,
	applyModifier: mockApplyModifier,
	updateItemSelection: mockUpdateItemSelection,
	removeItem: mockRemoveItem,
	removeModifier: mockRemoveModifier,
	selectScroll: mockSelectScroll
}));

const { saveToFirestore, loadUserData, setupRealtimeListener } = await import(
	'$infrastructure/firebase/firebaseServices'
);
const { defaultCharacter, calculateCharacterCost, calculateGoldDifference } = await import(
	'$domain/rules'
);
const { undoStore } = await import('$lib/stores/undoStore');

describe('warbandStore', () => {
	let warbandStore: ReturnType<typeof import('$lib/stores/warbandStore').createWarbandStore>;

	const createCharacter = (overrides?: Partial<Character>): Character => ({
		...defaultCharacter(),
		...overrides
	});

	const createData = (overrides?: Partial<WarbandData>): WarbandData => ({
		warbandName: 'Test',
		characters: [],
		gold: 50,
		xp: 0,
		notes: '',
		...overrides
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		const module = await import('$lib/stores/warbandStore');
		warbandStore = module.warbandStore;
		warbandStore.reset();
	});

	describe('initialize', () => {
		it('should set data and reset modal state', () => {
			const testData: WarbandData = createData({ gold: 100 });
			warbandStore.initialize(testData);
			const state = get(warbandStore);

			expect(state.data).toEqual(testData);
			expect(state.selectedIndex).toBe(-1);
			expect(state.showModal).toBe(false);
			expect(state.originalCharacterGold).toBe(0);
		});
	});

	describe('reset', () => {
		it('should return to initial state', () => {
			warbandStore.initialize(createData({ gold: 200 }));
			warbandStore.reset();
			const state = get(warbandStore);

			expect(state.data.gold).toBe(50);
			expect(state.data.characters).toEqual([]);
		});
	});

	describe('updateWarband', () => {
		it('should update data and save to firestore', async () => {
			warbandStore.initialize(createData());
			await warbandStore.updateWarband({ gold: 100 });

			expect(get(warbandStore).data.gold).toBe(100);
			expect(saveToFirestore).toHaveBeenCalled();
		});

		it('should clear isSaving flag after save completes', async () => {
			await warbandStore.updateWarband({ gold: 75 });
			expect(get(warbandStore).isSaving).toBe(false);
		});

		it('should clear isSaving flag after save fails', async () => {
			vi.mocked(saveToFirestore).mockRejectedValueOnce(new Error());
			await expect(warbandStore.updateWarband({ gold: 75 })).rejects.toThrow();
			expect(get(warbandStore).isSaving).toBe(false);
		});
	});

	describe('saveCharacter', () => {
		it('should add new character when index is -1', async () => {
			warbandStore.initialize(createData({ gold: 100 }));
			await warbandStore.saveCharacter(createCharacter({ name: 'Hero' }), -1);

			expect(get(warbandStore).data.characters).toHaveLength(1);
			expect(get(warbandStore).data.characters[0].name).toBe('Hero');
		});

		it('should update existing character', async () => {
			warbandStore.initialize(createData({ characters: [createCharacter({ name: 'Old' })] }));
			await warbandStore.saveCharacter(createCharacter({ name: 'New' }), 0);

			expect(get(warbandStore).data.characters[0].name).toBe('New');
		});

		it('should deduct gold and prevent negative', async () => {
			vi.mocked(calculateGoldDifference).mockReturnValue(30);
			warbandStore.initialize(createData({ gold: 20 }));
			await warbandStore.saveCharacter(createCharacter(), -1);

			expect(get(warbandStore).data.gold).toBe(0);
		});

		it('should reset modal state after save', async () => {
			warbandStore.initialize(createData());
			await warbandStore.saveCharacter(createCharacter(), -1);
			const state = get(warbandStore);

			expect(state.showModal).toBe(false);
			expect(state.selectedIndex).toBe(-1);
		});

		it('should rethrow errors', async () => {
			vi.mocked(saveToFirestore).mockRejectedValueOnce(new Error('Fail'));
			warbandStore.initialize(createData());

			await expect(warbandStore.saveCharacter(createCharacter(), -1)).rejects.toThrow('Fail');
		});
	});

	describe('deleteCharacter', () => {
		it('should remove character and refund cost', async () => {
			vi.mocked(calculateCharacterCost).mockReturnValue(25);
			warbandStore.initialize(
				createData({ characters: [createCharacter(), createCharacter()], gold: 50 })
			);
			await warbandStore.deleteCharacter(0);

			expect(get(warbandStore).data.characters).toHaveLength(1);
			expect(get(warbandStore).data.gold).toBe(75);
		});

		it('should set undo action', async () => {
			const char: Character = createCharacter({ name: 'Hero' });
			warbandStore.initialize(createData({ characters: [char] }));
			await warbandStore.deleteCharacter(0);

			expect(undoStore.setUndoAction).toHaveBeenCalledWith(
				expect.objectContaining({ characterIndex: 0, description: 'Deleted Hero' })
			);
		});
	});

	describe('editCharacter', () => {
		it('should load character into modal with deep copy', () => {
			const char: Character = createCharacter({ name: 'Hero', items: ['Sword'] });
			warbandStore.initialize(createData({ characters: [char] }));
			warbandStore.editCharacter(0);
			const state = get(warbandStore);

			expect(state.currentCharacter.name).toBe('Hero');
			expect(state.showModal).toBe(true);
			expect(state.currentCharacter.items).not.toBe(char.items);
		});

		it('should return early when character not found', () => {
			warbandStore.initialize(createData());
			warbandStore.editCharacter(0);

			expect(get(warbandStore).showModal).toBe(false);
		});
	});

	describe('addCharacter', () => {
		it('should open modal with default character', () => {
			warbandStore.addCharacter();
			const state = get(warbandStore);

			expect(state.showModal).toBe(true);
			expect(state.selectedIndex).toBe(-1);
			expect(state.originalCharacterGold).toBe(0);
		});
	});

	describe('closeModal', () => {
		it('should reset modal state', () => {
			warbandStore.addCharacter();
			warbandStore.closeModal();
			const state = get(warbandStore);

			expect(state.showModal).toBe(false);
			expect(state.selectedIndex).toBe(-1);
		});
	});

	describe('updateCurrentCharacter', () => {
		it('should update with partial data', () => {
			warbandStore.addCharacter();
			warbandStore.updateCurrentCharacter({ name: 'Test', hp: 15 });
			const state = get(warbandStore);

			expect(state.currentCharacter.name).toBe('Test');
			expect(state.currentCharacter.hp).toBe(15);
		});
	});

	describe('updateGold', () => {
		it('should update gold value', () => {
			warbandStore.initialize(createData({ gold: 50 }));
			warbandStore.updateGold(100);

			expect(get(warbandStore).data.gold).toBe(100);
		});
	});

	describe('remote sync', () => {
		it('loads remote data for a user id', async () => {
			const loaded = createData({ warbandName: 'Remote', gold: 90 });
			vi.mocked(loadUserData).mockResolvedValueOnce(loaded);

			await warbandStore.load('user-123');

			expect(loadUserData).toHaveBeenCalledWith({ uid: 'user-123' });
			expect(get(warbandStore).data).toEqual(loaded);
		});

		it('leaves state unchanged when no data returned', async () => {
			vi.mocked(loadUserData).mockResolvedValueOnce(null);

			await warbandStore.load('user-123');

			expect(get(warbandStore).data).toEqual({
				warbandName: '',
				characters: [],
				gold: 50,
				xp: 0,
				notes: ''
			});
		});

		it('subscribes and applies realtime updates', async () => {
			const unsubscribe = vi.fn();
			let capturedCallback: ((data: WarbandData) => void) | undefined;
			vi.mocked(setupRealtimeListener).mockImplementationOnce((_user, callback) => {
				capturedCallback = callback;
				return Promise.resolve(unsubscribe);
			});

			const remoteData = createData({ warbandName: 'Live', gold: 75 });
			const result = await warbandStore.listenToRemote('live-user');

			expect(setupRealtimeListener).toHaveBeenCalledWith(
				{ uid: 'live-user' },
				expect.any(Function)
			);
			expect(result).toBe(unsubscribe);

			capturedCallback?.(remoteData);
			expect(get(warbandStore).data).toEqual(remoteData);
		});
	});

	describe('character mutations', () => {
		const buildCharacter = (overrides?: Partial<Character>) =>
			createCharacter({
				name: 'Hero',
				hp: 10,
				items: ['Sword', ''],
				pickedUpItems: [],
				ammoTrackers: [{ weaponName: 'Bow', slotIndex: 0, currentAmmo: 2 }],
				injuries: [],
				...overrides
			});

		beforeEach(() => {
			warbandStore.initialize(createData({ characters: [buildCharacter()], gold: 40 }));
		});

		it('clamps hp without recording undo', async () => {
			await warbandStore.clampCharacterHp(0, 5);

			expect(mockClampHp).toHaveBeenCalled();
			expect(undoStore.setUndoAction).not.toHaveBeenCalled();
			expect(get(warbandStore).data.characters[0].hp).toBe(5);
		});

		it('applies damage and records undo entry', async () => {
			await warbandStore.takeDamage(0, 2);

			expect(mockTakeDamage).toHaveBeenCalledWith(expect.any(Object), 2);
			expect(get(warbandStore).data.characters[0].hp).toBe(8);
			expect(undoStore.setUndoAction).toHaveBeenCalledWith(
				expect.objectContaining({ characterIndex: 0, description: 'Took 2 damage (Hero)' })
			);
		});

		it('revives a character', async () => {
			warbandStore.initialize(createData({ characters: [buildCharacter({ hp: 0 })] }));

			await warbandStore.reviveCharacter(0);

			expect(mockReviveCharacter).toHaveBeenCalled();
			expect(get(warbandStore).data.characters[0].hp).toBe(1);
			expect(undoStore.setUndoAction).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'Revived Hero' })
			);
		});

		it('picks up an item and persists', async () => {
			const result = await warbandStore.pickUpItem(0, 1, 'Shield');

			expect(result).toEqual({ success: true });
			expect(mockPickUpItem).toHaveBeenCalledWith(expect.any(Object), 1, 'Shield');
			expect(get(warbandStore).data.characters[0].items[1]).toBe('Shield');
			expect(undoStore.setUndoAction).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'Picked up Shield' })
			);
		});

		it('skips pick up when mutation returns an error', async () => {
			mockPickUpItem.mockReturnValueOnce({ character: buildCharacter(), error: 'No space' });
			const result = await warbandStore.pickUpItem(0, 1, 'Shield');

			expect(result).toEqual({ error: 'No space' });
			expect(saveToFirestore).not.toHaveBeenCalled();
		});

		it('drops an item and tracks undo info', async () => {
			await warbandStore.dropItem(0, 'Sword', 0);

			expect(mockDropItem).toHaveBeenCalledWith(expect.any(Object), 'Sword', 0);
			expect(get(warbandStore).data.characters[0].items[0]).toBe('');
			expect(undoStore.setUndoAction).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'Dropped Sword' })
			);
		});

		it('uses and refills ammo', async () => {
			await warbandStore.useAmmo(0, 'Bow', 0);
			expect(mockUseAmmo).toHaveBeenCalledWith(expect.any(Object), 'Bow', 0);
			expect(get(warbandStore).data.characters[0].ammoTrackers[0].currentAmmo).toBe(1);

			await warbandStore.refillAmmo(0, 'Bow', 0);
			expect(mockRefillAmmo).toHaveBeenCalledWith(expect.any(Object), 'Bow', 0);
			expect(get(warbandStore).data.characters[0].ammoTrackers[0].currentAmmo).toBe(3);
		});

		it('adds and removes injuries with undo support', async () => {
			await warbandStore.addInjury(0, 'Broken');
			expect(mockAddInjury).toHaveBeenCalledWith(expect.any(Object), 'Broken');
			expect(get(warbandStore).data.characters[0].injuries).toContain('Broken');
			expect(undoStore.setUndoAction).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'Added injury: Broken' })
			);

			undoStore.setUndoAction.mockClear();
			warbandStore.initialize(createData({ characters: [buildCharacter({ injuries: ['Broken'] })] }));

			await warbandStore.removeInjury(0, 'Broken');
			expect(mockRemoveInjury).toHaveBeenCalledWith(expect.any(Object), 'Broken');
			expect(get(warbandStore).data.characters[0].injuries).not.toContain('Broken');
			expect(undoStore.setUndoAction).toHaveBeenCalledWith(
				expect.objectContaining({ description: 'Removed injury: Broken' })
			);
		});
	});

	describe('current character helpers', () => {
		it('handles spellcaster toggle and gold refund', () => {
			mockApplySpellcasterChange.mockReturnValueOnce({
				success: true,
				refundAmount: 5,
				removedItems: []
			});

			const previousGold = get(warbandStore).data.gold;
			const result = warbandStore.handleSpellcasterToggle(true);

			expect(result).toEqual({ success: true, refundAmount: 5, removedItems: [] });
			expect(get(warbandStore).currentCharacter.isSpellcaster).toBe(true);
			expect(get(warbandStore).data.gold).toBe(previousGold + 5);
		});

		it('aborts spellcaster change when service fails', () => {
			mockApplySpellcasterChange.mockReturnValueOnce({
				success: false,
				refundAmount: 0,
				removedItems: []
			});

			const result = warbandStore.handleSpellcasterToggle(true);

			expect(result).toEqual({ success: false, refundAmount: 0, removedItems: [] });
			expect(get(warbandStore).currentCharacter.isSpellcaster).toBe(false);
		});

		it('updates item selection for current character', () => {
			warbandStore.addCharacter();

			warbandStore.setItemForCurrentCharacter(0, 'Sword');

			expect(mockUpdateItemSelection).toHaveBeenCalledWith(
				expect.any(Object),
				0,
				'Sword',
				expect.any(Array)
			);
			expect(get(warbandStore).currentCharacter.items[0]).toBe('Sword');
		});

		it('removes items from current character', () => {
			warbandStore.addCharacter();
			warbandStore.updateCurrentCharacter({ items: ['Dagger', ''] });

			warbandStore.removeItemFromCurrent(0);

			expect(mockRemoveItem).toHaveBeenCalledWith(expect.any(Object), 'Dagger', 0, expect.any(Array));
			expect(get(warbandStore).currentCharacter.items[0]).toBe('');
		});

		it('skips removal when slot is empty', () => {
			warbandStore.addCharacter();
			mockRemoveItem.mockClear();

			warbandStore.removeItemFromCurrent(0);

			expect(mockRemoveItem).not.toHaveBeenCalled();
		});

		it('selects scrolls', () => {
			warbandStore.addCharacter();

			warbandStore.selectScroll('clean', 'Clean Scroll');

			expect(mockSelectScroll).toHaveBeenCalledWith(expect.any(Object), 'clean', 'Clean Scroll');
			expect(get(warbandStore).currentCharacter.cleanScroll).toBe('Clean Scroll');
		});

		it('removes item with refund and updates gold', () => {
			warbandStore.addCharacter();
			warbandStore.updateCurrentCharacter({ items: ['Staff', ''] });

			warbandStore.removeItemWithRefund('Staff', ['Staff'], 0);

			expect(mockRemoveItemWithOptionalRefund).toHaveBeenCalledWith(
				expect.any(Object),
				'Staff',
				['Staff'],
				0,
				expect.any(Array)
			);
			expect(get(warbandStore).currentCharacter.items[0]).toBe('');
			expect(get(warbandStore).data.gold).toBe(53);
		});

		it('updates stats and modifiers', () => {
			warbandStore.addCharacter();

			warbandStore.updateStatAndInventory('strength', 3);
			expect(mockUpdateStatAndInventory).toHaveBeenCalledWith(
				expect.any(Object),
				{ stat: 'strength', value: 3, maxInventory: expect.any(Number) }
			);
			expect(get(warbandStore).currentCharacter.strength).toBe(3);

			warbandStore.applyModifier('Brave', 'feat');
			expect(mockApplyModifier).toHaveBeenCalledWith(
				expect.any(Object),
				{ name: 'Brave', type: 'feat' },
				expect.any(Array)
			);
			expect(get(warbandStore).currentCharacter.feats).toContain('Brave');

			warbandStore.removeModifier('Brave', 'feat');
			expect(mockRemoveModifier).toHaveBeenCalledWith(expect.any(Object), { name: 'Brave', type: 'feat' });
			expect(get(warbandStore).currentCharacter.feats).not.toContain('Brave');
		});
	});
});

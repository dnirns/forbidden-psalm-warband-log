import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { WarbandData, Character } from '$lib/types';

vi.mock('$lib/firebase/firebaseServices');
vi.mock('$lib/firebase/firebase', () => ({ auth: { currentUser: null } }));
vi.mock('$lib/data/items', () => ({ default: [] }));
vi.mock('$lib/stores/undoStore', () => ({ undoStore: { setUndoAction: vi.fn() } }));
vi.mock('$lib/utils', () => ({
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
	calculateCharacterCost: vi.fn(() => 10)
}));

const { saveToFirestore } = await import('$lib/firebase/firebaseServices');
const { defaultCharacter, calculateCharacterCost } = await import('$lib/utils');
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
			vi.mocked(calculateCharacterCost).mockReturnValue(30);
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
});

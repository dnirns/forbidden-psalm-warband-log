import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { undoStore } from '$lib';
import type { Character, WarbandData } from '$lib/types';
import { saveToFirestore } from '$lib/firebase/firebaseServices';
import { getAuth } from 'firebase/auth';
import type { User } from 'firebase/auth';

vi.mock('firebase/auth');
vi.mock('$lib/firebase/firebaseServices');

type UndoAction = {
	characterIndex: number;
	previousState: Character;
	warbandData: WarbandData;
	description: string;
};

const mockCharacter: Character = {
	name: 'Warrior',
	hp: 10,
	armour: 2,
	agility: 1,
	presence: 0,
	strength: 2,
	toughness: 1,
	inventory: 7,
	items: ['Sword', '', '', '', '', '', ''],
	pickedUpItems: [],
	feats: [],
	flaws: [],
	injuries: [],
	isSpellcaster: false,
	ammoTrackers: [],
	cleanScroll: null,
	uncleanScroll: null
};

const mockWarband: WarbandData = {
	warbandName: 'Test Warband',
	characters: [mockCharacter],
	gold: 50,
	xp: 0,
	notes: ''
};

const mockAction: UndoAction = {
	characterIndex: 0,
	previousState: mockCharacter,
	warbandData: mockWarband,
	description: 'Test action'
};

describe('undoStore', () => {
	const mockUser: User = {
		uid: 'test-user-123',
		email: 'test@example.com',
		displayName: 'Test User'
	} as User;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		undoStore.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('setUndoAction', () => {
		it('should set an undo action in the store', () => {
			undoStore.setUndoAction(mockAction);

			expect(get(undoStore)).toEqual(mockAction);
		});

		it('should clear the undo action after 5 seconds', () => {
			undoStore.setUndoAction(mockAction);

			vi.advanceTimersByTime(5000);

			expect(get(undoStore)).toBeNull();
		});

		it('should reset the timer when a new action is set', () => {
			undoStore.setUndoAction(mockAction);
			vi.advanceTimersByTime(4000);

			undoStore.setUndoAction({ ...mockAction, description: 'Second action' });
			vi.advanceTimersByTime(3000);

			expect(get(undoStore)).not.toBeNull();

			vi.advanceTimersByTime(2000);

			expect(get(undoStore)).toBeNull();
		});
	});

	describe('clear', () => {
		it('should set the store to null', () => {
			undoStore.setUndoAction(mockAction);

			undoStore.clear();

			expect(get(undoStore)).toBeNull();
		});

		it('should clear the timeout', () => {
			undoStore.setUndoAction(mockAction);
			undoStore.clear();

			vi.advanceTimersByTime(5000);

			expect(get(undoStore)).toBeNull();
		});
	});

	describe('undo', () => {
		beforeEach(() => {
			vi.mocked(getAuth).mockReturnValue({ currentUser: mockUser } as any);
			vi.mocked(saveToFirestore).mockResolvedValue(undefined);
		});

		it('should restore previous character state', async () => {
			const previous: Character = { ...mockCharacter, name: 'Original', hp: 10 };
			const action: UndoAction = {
				...mockAction,
				previousState: previous,
				warbandData: {
					...mockWarband,
					characters: [{ ...mockCharacter, name: 'Modified', hp: 5 }]
				}
			};

			undoStore.setUndoAction(action);
			await undoStore.undo();

			expect(saveToFirestore).toHaveBeenCalledWith(
				mockUser,
				expect.objectContaining({
					characters: [expect.objectContaining({ name: 'Original', hp: 10 })]
				})
			);
			expect(get(undoStore)).toBeNull();
		});

		it('should insert character when index is empty', async () => {
			const action: UndoAction = {
				...mockAction,
				warbandData: { ...mockWarband, characters: [] }
			};

			undoStore.setUndoAction(action);
			await undoStore.undo();

			expect(saveToFirestore).toHaveBeenCalledWith(
				mockUser,
				expect.objectContaining({
					characters: [expect.objectContaining({ name: 'Warrior' })]
				})
			);
		});

		it('should do nothing when store is empty', async () => {
			await undoStore.undo();

			expect(saveToFirestore).not.toHaveBeenCalled();
		});

		it('should do nothing when user is not authenticated', async () => {
			vi.mocked(getAuth).mockReturnValue({ currentUser: null } as any);
			undoStore.setUndoAction(mockAction);

			await undoStore.undo();

			expect(saveToFirestore).not.toHaveBeenCalled();
			expect(get(undoStore)).toBeNull();
		});

		it('should throw error when save fails', async () => {
			vi.mocked(saveToFirestore).mockRejectedValue(new Error('Save failed'));
			undoStore.setUndoAction(mockAction);

			await expect(undoStore.undo()).rejects.toThrow('Save failed');
		});

		it('should handle timeout expiry', async () => {
			undoStore.setUndoAction(mockAction);
			vi.advanceTimersByTime(5000);

			await undoStore.undo();

			expect(saveToFirestore).not.toHaveBeenCalled();
		});
	});
});

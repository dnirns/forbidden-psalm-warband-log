import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
	signInWithGoogleService,
	signOutService,
	saveToFirestore,
	loadUserData,
	setupRealtimeListener,
	defaultCharacter
} from '$lib';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { WarbandData, Character } from '$lib';

vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('$lib/firebase', () => ({
	auth: {},
	db: {},
	googleProvider: {}
}));

describe('firebaseServices', () => {
	const mockUser: User = {
		uid: 'test-user-123',
		email: 'test@example.com',
		displayName: 'Test User'
	} as User;

	const mockCharacter: Character = {
		...defaultCharacter(),
		name: 'Test Character'
	};

	const mockWarbandData: WarbandData = {
		warbandName: 'Test Warband',
		characters: [mockCharacter],
		gold: 50,
		xp: 0,
		notes: ''
	};

	const mockDoc = { id: 'test-doc' };

	beforeEach(() => {
		vi.clearAllMocks();
		(doc as Mock).mockReturnValue(mockDoc);
	});

	describe('signInWithGoogleService', () => {
		it('should return user on successful sign in', async () => {
			(signInWithPopup as Mock).mockResolvedValue({ user: mockUser });

			const result = await signInWithGoogleService();

			expect(result).toEqual(mockUser);
		});

		it('should throw error when sign in fails', async () => {
			(signInWithPopup as Mock).mockRejectedValue(new Error('Failed'));

			await expect(signInWithGoogleService()).rejects.toThrow('Failed');
		});
	});

	describe('signOutService', () => {
		it('should sign out successfully', async () => {
			(signOut as Mock).mockResolvedValue(undefined);

			await signOutService();

			expect(signOut).toHaveBeenCalled();
		});
	});

	describe('saveToFirestore', () => {
		it('should return early when user is null', async () => {
			await saveToFirestore(null, mockWarbandData);

			expect(getDoc).not.toHaveBeenCalled();
		});

		it('should update existing document', async () => {
			(getDoc as Mock).mockResolvedValue({ exists: () => true });

			await saveToFirestore(mockUser, mockWarbandData);

			expect(updateDoc).toHaveBeenCalledWith(
				mockDoc,
				expect.objectContaining({
					warbandName: 'Test Warband',
					updatedAt: expect.any(String)
				})
			);
		});

		it('should create new document when none exists', async () => {
			(getDoc as Mock).mockResolvedValue({ exists: () => false });

			await saveToFirestore(mockUser, mockWarbandData);

			expect(setDoc).toHaveBeenCalledWith(
				mockDoc,
				expect.objectContaining({
					warbandName: 'Test Warband',
					createdAt: expect.any(String)
				})
			);
		});

		it('should process character arrays correctly', async () => {
			const characterWithData: Character = {
				...mockCharacter,
				items: ['sword'],
				feats: ['tough'],
				pickedUpItems: ['potion']
			};
			(getDoc as Mock).mockResolvedValue({ exists: () => false });

			await saveToFirestore(mockUser, {
				...mockWarbandData,
				characters: [characterWithData]
			});

			expect(setDoc).toHaveBeenCalledWith(
				mockDoc,
				expect.objectContaining({
					characters: [
						expect.objectContaining({
							items: ['sword'],
							feats: ['tough'],
							pickedUpItems: ['potion']
						})
					]
				})
			);
		});

		it('should handle undefined arrays as empty arrays', async () => {
			const character = {
				...mockCharacter,
				feats: undefined,
				flaws: undefined
			} as unknown as Character;
			(getDoc as Mock).mockResolvedValue({ exists: () => false });

			await saveToFirestore(mockUser, { ...mockWarbandData, characters: [character] });

			expect(setDoc).toHaveBeenCalledWith(
				mockDoc,
				expect.objectContaining({
					characters: [expect.objectContaining({ feats: [], flaws: [] })]
				})
			);
		});

		it('should throw error when Firestore operation fails', async () => {
			(getDoc as Mock).mockRejectedValue(new Error('Firestore error'));

			await expect(saveToFirestore(mockUser, mockWarbandData)).rejects.toThrow('Firestore error');
		});
	});

	describe('loadUserData', () => {
		it('should return null when user is null', async () => {
			const result = await loadUserData(null);

			expect(result).toBeNull();
		});

		it('should return null when document does not exist', async () => {
			(getDoc as Mock).mockResolvedValue({ exists: () => false });

			const result = await loadUserData(mockUser);

			expect(result).toBeNull();
		});

		it('should load warband data', async () => {
			const rawData = {
				warbandName: 'Loaded Warband',
				characters: [{ ...mockCharacter, items: ['sword'] }],
				gold: 100,
				xp: 50,
				notes: 'Notes'
			};
			(getDoc as Mock).mockResolvedValue({
				exists: () => true,
				data: () => rawData
			});

			const result = await loadUserData(mockUser);

			expect(result).toEqual({
				warbandName: 'Loaded Warband',
				characters: [expect.objectContaining({ items: ['sword'] })],
				gold: 100,
				xp: 50,
				notes: 'Notes'
			});
		});

		it('should use default values for missing fields', async () => {
			(getDoc as Mock).mockResolvedValue({
				exists: () => true,
				data: () => ({})
			});

			const result = await loadUserData(mockUser);

			expect(result).toEqual({
				warbandName: '',
				characters: [],
				gold: 50,
				xp: 0,
				notes: ''
			});
		});

		it('should convert legacy inventory to items array', async () => {
			(getDoc as Mock).mockResolvedValue({
				exists: () => true,
				data: () => ({
					characters: [
						{
							name: 'Legacy',
							inventory: 3,
							items: 'not-array'
						}
					]
				})
			});

			const result = await loadUserData(mockUser);

			expect(result?.characters[0].items).toEqual(['', '', '']);
		});

		it('should initialise missing character arrays', async () => {
			(getDoc as Mock).mockResolvedValue({
				exists: () => true,
				data: () => ({
					characters: [{ name: 'Test', items: ['sword'] }]
				})
			});

			const result = await loadUserData(mockUser);

			expect(result?.characters[0]).toMatchObject({
				items: ['sword'],
				feats: [],
				flaws: [],
				pickedUpItems: [],
				ammoTrackers: []
			});
		});
	});

	describe('setupRealtimeListener', () => {
		const mockUnsubscribe = vi.fn();

		it('should call callback with processed data when document exists', async () => {
			const callback = vi.fn();
			const rawData = {
				warbandName: 'Live Warband',
				characters: [{ ...mockCharacter, items: ['sword'] }],
				gold: 150,
				xp: 75,
				notes: 'Notes'
			};

			(onSnapshot as Mock).mockImplementation((_docRef, snapshotCallback) => {
				snapshotCallback({
					exists: () => true,
					data: () => rawData
				});
				return mockUnsubscribe;
			});

			const unsubscribe = await setupRealtimeListener(mockUser, callback);

			expect(callback).toHaveBeenCalledWith({
				warbandName: 'Live Warband',
				characters: [expect.objectContaining({ items: ['sword'] })],
				gold: 150,
				xp: 75,
				notes: 'Notes'
			});
			expect(unsubscribe).toBe(mockUnsubscribe);
		});

		it('should not call callback when document does not exist', async () => {
			const callback = vi.fn();

			(onSnapshot as Mock).mockImplementation((_docRef, snapshotCallback) => {
				snapshotCallback({ exists: () => false });
				return mockUnsubscribe;
			});

			await setupRealtimeListener(mockUser, callback);

			expect(callback).not.toHaveBeenCalled();
		});

		it('should initialise missing arrays in real-time updates', async () => {
			const callback = vi.fn();

			(onSnapshot as Mock).mockImplementation((_docRef, snapshotCallback) => {
				snapshotCallback({
					exists: () => true,
					data: () => ({
						characters: [{ name: 'Test', items: ['item'] }]
					})
				});
				return mockUnsubscribe;
			});

			await setupRealtimeListener(mockUser, callback);

			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					characters: [
						expect.objectContaining({
							feats: [],
							flaws: [],
							pickedUpItems: [],
							ammoTrackers: []
						})
					]
				})
			);
		});

		it('should handle legacy inventory in real-time updates', async () => {
			const callback = vi.fn();

			(onSnapshot as Mock).mockImplementation((_docRef, snapshotCallback) => {
				snapshotCallback({
					exists: () => true,
					data: () => ({
						characters: [
							{
								name: 'Legacy',
								inventory: 3,
								items: 'not-array'
							}
						]
					})
				});
				return mockUnsubscribe;
			});

			await setupRealtimeListener(mockUser, callback);

			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					characters: [expect.objectContaining({ items: ['', '', ''] })]
				})
			);
		});
	});
});

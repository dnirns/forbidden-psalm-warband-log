import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WarbandData } from '$domain/models';

const mockAuth = { currentUser: { uid: 'current-user' } as any };

const saveToFirestore = vi.fn();
const loadUserData = vi.fn();
const setupRealtimeListener = vi.fn();

vi.mock('./firebase', () => ({ auth: mockAuth }));
vi.mock('./firebaseServices', () => ({
	saveToFirestore,
	loadUserData,
	setupRealtimeListener
}));

const getRepository = async () =>
	(await import('./firestoreWarbandRepository')).firestoreWarbandRepository;

describe('firestoreWarbandRepository', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		mockAuth.currentUser = { uid: 'current-user' } as any;
	});

	it('saves warband data for the current user', async () => {
		const repo = await getRepository();
		const data = { warbandName: 'Test', characters: [], gold: 0, xp: 0, notes: '' } as WarbandData;

		await repo.save(data);

		expect(saveToFirestore).toHaveBeenCalledWith(mockAuth.currentUser, data);
	});

	it('loads warband data when user id provided', async () => {
		const repo = await getRepository();
		const warband = { warbandName: 'Loaded', characters: [], gold: 1, xp: 2, notes: '' } as WarbandData;
		loadUserData.mockResolvedValueOnce(warband);

		const result = await repo.load('user-42');

		expect(loadUserData).toHaveBeenCalledWith({ uid: 'user-42' });
		expect(result).toEqual(warband);
	});

	it('returns null when loading with missing id', async () => {
		const repo = await getRepository();

		const result = await repo.load('');

		expect(result).toBeNull();
		expect(loadUserData).not.toHaveBeenCalled();
	});

	it('subscribes to realtime updates', async () => {
		const repo = await getRepository();
		const unsubscribe = vi.fn();
		setupRealtimeListener.mockResolvedValueOnce(unsubscribe);
		const callback = vi.fn();

		const result = await repo.subscribe('user-77', callback);

		expect(setupRealtimeListener).toHaveBeenCalledWith({ uid: 'user-77' }, callback);
		expect(result).toBe(unsubscribe);
	});
});

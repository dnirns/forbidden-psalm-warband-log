import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from 'firebase/auth';

const mockAuth = { currentUser: null as User | null };
const mockGoogleProvider = { provider: 'google' };

const onAuthStateChanged = vi.fn();
const signInWithPopup = vi.fn();
const signOut = vi.fn();

vi.mock('./firebase', () => ({ auth: mockAuth, googleProvider: mockGoogleProvider }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged, signInWithPopup, signOut }));

const loadAdapter = async () => (await import('./firebaseAuthAdapter')).firebaseAuthAdapter;

describe('firebaseAuthAdapter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		mockAuth.currentUser = { uid: 'user-123' } as User;
	});

	it('subscribes to auth changes', async () => {
		const unsubscribe = vi.fn();
		onAuthStateChanged.mockImplementation((_auth, callback) => {
			callback(mockAuth.currentUser);
			return unsubscribe;
		});
		const adapter = await loadAdapter();
		const callback = vi.fn();

		const result = adapter.onAuthStateChanged(callback);

		expect(onAuthStateChanged).toHaveBeenCalledWith(mockAuth, callback);
		expect(callback).toHaveBeenCalledWith(mockAuth.currentUser);
		expect(result).toBe(unsubscribe);
	});

	it('signs in with Google', async () => {
		const user = { uid: 'abc' } as User;
		signInWithPopup.mockResolvedValueOnce({ user });
		const adapter = await loadAdapter();

		const result = await adapter.signInWithGoogle();

		expect(signInWithPopup).toHaveBeenCalledWith(mockAuth, mockGoogleProvider);
		expect(result).toBe(user);
	});

	it('propagates sign-in errors', async () => {
		signInWithPopup.mockRejectedValueOnce(new Error('fail'));
		const adapter = await loadAdapter();

		await expect(adapter.signInWithGoogle()).rejects.toThrow('fail');
	});

	it('signs out current user', async () => {
		signOut.mockResolvedValueOnce(undefined);
		const adapter = await loadAdapter();

		await adapter.signOut();

		expect(signOut).toHaveBeenCalledWith(mockAuth);
	});

	it('returns current user', async () => {
		const currentUser = { uid: 'current' } as User;
		mockAuth.currentUser = currentUser;
		const adapter = await loadAdapter();

		expect(adapter.getCurrentUser()).toBe(currentUser);
	});
});

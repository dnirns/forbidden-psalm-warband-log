import { describe, it, expect, vi, beforeEach } from 'vitest';

const initializeApp = vi.fn();
const getAuth = vi.fn();
const getFirestore = vi.fn();
const GoogleAuthProvider = vi.fn(() => ({ provider: 'google' }));

vi.mock('firebase/app', () => ({ initializeApp }));
vi.mock('firebase/auth', () => ({ getAuth, GoogleAuthProvider }));
vi.mock('firebase/firestore', () => ({ getFirestore }));
vi.mock('$env/static/public', () => ({
	PUBLIC_FIREBASE_API_KEY: 'api-key',
	PUBLIC_FIREBASE_AUTH_DOMAIN: 'auth-domain',
	PUBLIC_FIREBASE_PROJECT_ID: 'project-id',
	PUBLIC_FIREBASE_STORAGE_BUCKET: 'storage-bucket',
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'messaging-sender',
	PUBLIC_FIREBASE_APP_ID: 'app-id'
}));

const importFirebaseModule = () => import('./firebase');

describe('firebase config', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('initialises Firebase with public env config', async () => {
		const appInstance = { app: true };
		const authInstance = { auth: true };
		const dbInstance = { db: true };

		initializeApp.mockReturnValue(appInstance);
		getAuth.mockReturnValue(authInstance);
		getFirestore.mockReturnValue(dbInstance);

		const { app, auth, db, googleProvider } = await importFirebaseModule();

		expect(initializeApp).toHaveBeenCalledWith({
			apiKey: 'api-key',
			authDomain: 'auth-domain',
			projectId: 'project-id',
			storageBucket: 'storage-bucket',
			messagingSenderId: 'messaging-sender',
			appId: 'app-id'
		});
		expect(getAuth).toHaveBeenCalledWith(appInstance);
		expect(getFirestore).toHaveBeenCalledWith(appInstance);
		expect(app).toBe(appInstance);
		expect(auth).toBe(authInstance);
		expect(db).toBe(dbInstance);
		expect(GoogleAuthProvider).toHaveBeenCalledTimes(1);
		expect(googleProvider).toEqual({ provider: 'google' });
	});

	it('returns fresh instances when re-imported', async () => {
		initializeApp.mockReturnValueOnce({ app: 'first' });
		getAuth.mockReturnValueOnce({ auth: 'first' });
		getFirestore.mockReturnValueOnce({ db: 'first' });

		const first = await importFirebaseModule();
		expect(first.auth).toEqual({ auth: 'first' });

		vi.resetModules();

		initializeApp.mockReturnValueOnce({ app: 'second' });
		getAuth.mockReturnValueOnce({ auth: 'second' });
		getFirestore.mockReturnValueOnce({ db: 'second' });

		const second = await importFirebaseModule();
		expect(second.auth).toEqual({ auth: 'second' });
		expect(initializeApp).toHaveBeenCalledTimes(2);
	});
});

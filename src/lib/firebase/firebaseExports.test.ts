import { describe, it, expect } from 'vitest';

describe('lib firebase re-exports', () => {
	it('re-exports firebase instances from infrastructure layer', async () => {
		const infra = await import('$infrastructure/firebase/firebase');
		const lib = await import('./firebase');

		expect(lib.app).toBe(infra.app);
		expect(lib.auth).toBe(infra.auth);
		expect(lib.db).toBe(infra.db);
		expect(lib.googleProvider).toBe(infra.googleProvider);
	});

	it('re-exports auth adapter instance from infrastructure layer', async () => {
		const infra = await import('$infrastructure/firebase/firebaseAuthAdapter');
		const lib = await import('./firebaseAuthAdapter');

		expect(lib.firebaseAuthAdapter).toBe(infra.firebaseAuthAdapter);
	});

	it('re-exports firestore repository from infrastructure layer', async () => {
		const infra = await import('$infrastructure/firebase/firestoreWarbandRepository');
		const lib = await import('./firestoreWarbandRepository');

		expect(lib.firestoreWarbandRepository).toBe(infra.firestoreWarbandRepository);
	});
});

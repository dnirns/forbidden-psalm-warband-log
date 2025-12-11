import type { AuthPort } from '$domain/ports';
import type { User } from 'firebase/auth';
import { auth, googleProvider } from '$lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

class FirebaseAuthAdapter implements AuthPort {
	onAuthStateChanged(callback: (user: User | null) => void): () => void {
		return onAuthStateChanged(auth, callback);
	}

	async signInWithGoogle(): Promise<User | null> {
		const result = await signInWithPopup(auth, googleProvider);
		return result.user;
	}

	async signOut(): Promise<void> {
		await signOut(auth);
	}

	getCurrentUser(): User | null {
		return auth.currentUser;
	}
}

export const firebaseAuthAdapter = new FirebaseAuthAdapter();

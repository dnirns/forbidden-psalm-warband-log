import type { User } from 'firebase/auth';

export interface AuthPort {
	onAuthStateChanged(callback: (user: User | null) => void): () => void;
	signInWithGoogle(): Promise<User | null>;
	signOut(): Promise<void>;
	getCurrentUser(): User | null;
}

export const __authPortRuntime = true;

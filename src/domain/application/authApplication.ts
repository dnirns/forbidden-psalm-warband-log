import type { AuthPort } from '$domain/ports';
import type { User } from 'firebase/auth';

export class AuthApplicationService {
	constructor(private authPort: AuthPort) {}

	onChange(callback: (user: User | null) => void) {
		return this.authPort.onAuthStateChanged(callback);
	}

	signInWithGoogle() {
		return this.authPort.signInWithGoogle();
	}

	signOut() {
		return this.authPort.signOut();
	}

	getCurrentUser() {
		return this.authPort.getCurrentUser();
	}
}

export const createAuthApplicationService = (authPort: AuthPort) =>
	new AuthApplicationService(authPort);

import type { WarbandRepository } from '$domain/ports';
import type { WarbandData } from '$lib/types';
import { saveToFirestore, loadUserData, setupRealtimeListener } from './firebaseServices';
import { auth } from './firebase';

class FirestoreWarbandRepository implements WarbandRepository {
	async save(data: WarbandData): Promise<void> {
		await saveToFirestore(auth.currentUser, data);
	}

	async load(userId: string): Promise<WarbandData | null> {
		if (!userId) return null;
		return loadUserData({ uid: userId } as any);
	}

	async subscribe(userId: string, callback: (data: WarbandData) => void) {
		return setupRealtimeListener({ uid: userId } as any, callback);
	}
}

export const firestoreWarbandRepository = new FirestoreWarbandRepository();

import { auth, db, googleProvider } from '$lib/firebase';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import type { WarbandData } from './types';

export const signInWithGoogleService = async (): Promise<User | null> => {
	const result = await signInWithPopup(auth, googleProvider);
	return result.user;
};

export const signOutService = async (): Promise<void> => {
	await signOut(auth);
};

export const saveToFirestore = async (
	currentUser: User | null,
	warbandData: WarbandData
): Promise<void> => {
	if (!currentUser) return;

	const userDocRef = doc(db, 'warbands', currentUser.uid);
	const docSnap = await getDoc(userDocRef);

	if (docSnap.exists()) {
		await updateDoc(userDocRef, {
			...warbandData,
			updatedAt: new Date().toISOString()
		});
	} else {
		await setDoc(userDocRef, {
			...warbandData,
			createdAt: new Date().toISOString()
		});
	}
};

export const loadUserData = async (currentUser: User | null): Promise<WarbandData | null> => {
	if (!currentUser) return null;

	const userDocRef = doc(db, 'warbands', currentUser.uid);
	const docSnap = await getDoc(userDocRef);

	if (docSnap.exists()) {
		const data = docSnap.data();
		return {
			warbandName: data.warbandName || '',
			characters: Array.isArray(data.characters) ? data.characters : [],
			gold: typeof data.gold === 'number' ? data.gold : 50
		};
	}

	return null;
};

export const setupRealtimeListener = async (
	currentUser: User,
	callback: (data: WarbandData) => void
): Promise<Unsubscribe> => {
	const userDocRef = doc(db, 'warbands', currentUser.uid);
	return onSnapshot(userDocRef, (docSnap) => {
		if (docSnap.exists()) {
			const data = docSnap.data();
			callback({
				warbandName: data.warbandName || '',
				characters: Array.isArray(data.characters) ? data.characters : [],
				gold: typeof data.gold === 'number' ? data.gold : 50
			});
		}
	});
};

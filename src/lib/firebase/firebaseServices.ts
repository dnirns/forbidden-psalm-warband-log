import { auth, db, googleProvider } from '$lib/firebase';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import type { WarbandData } from '$lib/types';

export const signInWithGoogleService = async (): Promise<User | null> => {
	const result = await signInWithPopup(auth, googleProvider);
	return result.user;
};

export const signOutService = async (): Promise<void> => {
	await signOut(auth);
};

export const saveToFirestore = async (
	currentUser: User | null,
	warbandData: {
		warbandName: string;
		characters: {
			name: string;
			ancestry: string;
			background: string;
			move: number;
			fight: number;
			shoot: number;
			armour: number;
			will: number;
			health: number;
			hp: number;
			toughness: number;
			items: string[];
			feats: string[];
			flaws: any[];
			pickedUpItems: string[];
			ammoTrackers: any[];
			notes: string
		}[];
		gold: number;
		xp: number;
		notes: string
	}
): Promise<void> => {
	try {
		if (!currentUser) {
			return;
		}

		const userDocRef = doc(db, 'warbands', currentUser.uid);
		const docSnap = await getDoc(userDocRef);

		const dataToSave = {
			...warbandData,
			characters: warbandData.characters.map((char) => ({
				...char,
				items: [...char.items],
				feats: Array.isArray(char.feats) ? char.feats : [],
				flaws: Array.isArray(char.flaws) ? char.flaws : [],
				pickedUpItems: Array.isArray(char.pickedUpItems) ? char.pickedUpItems : [],
				ammoTrackers: Array.isArray(char.ammoTrackers) ? char.ammoTrackers : []
			}))
		};

		if (docSnap.exists()) {
			await updateDoc(userDocRef, {
				...dataToSave,
				updatedAt: new Date().toISOString()
			});
		} else {
			await setDoc(userDocRef, {
				...dataToSave,
				createdAt: new Date().toISOString()
			});
		}
	} catch (error) {
		throw error;
	}
};

export const loadUserData = async (currentUser: User | null): Promise<WarbandData | null> => {
	if (!currentUser) return null;

	const userDocRef = doc(db, 'warbands', currentUser.uid);
	const docSnap = await getDoc(userDocRef);

	if (docSnap.exists()) {
		const data = docSnap.data();

		const processedCharacters = data.characters?.map((char: any) => ({
			...char,
			items: Array.isArray(char.items) ? char.items : Array(char.inventory).fill(''),
			feats: Array.isArray(char.feats) ? char.feats : [],
			flaws: Array.isArray(char.flaws) ? char.flaws : [],
			pickedUpItems: Array.isArray(char.pickedUpItems) ? char.pickedUpItems : [],
			ammoTrackers: Array.isArray(char.ammoTrackers) ? char.ammoTrackers : []
		}));

		const processedData = {
			warbandName: data.warbandName || '',
			characters: processedCharacters || [],
			gold: typeof data.gold === 'number' ? data.gold : 50,
			xp: typeof data.xp === 'number' ? data.xp : 0,
			notes: data.notes || ''
		};
		return processedData;
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

			const processedCharacters = data.characters?.map((char: any) => ({
				...char,
				items: Array.isArray(char.items) ? char.items : Array(char.inventory).fill(''),
				feats: Array.isArray(char.feats) ? char.feats : [],
				flaws: Array.isArray(char.flaws) ? char.flaws : [],
				pickedUpItems: Array.isArray(char.pickedUpItems) ? char.pickedUpItems : [],
				ammoTrackers: Array.isArray(char.ammoTrackers) ? char.ammoTrackers : []
			}));

			const processedData = {
				warbandName: data.warbandName || '',
				characters: processedCharacters || [],
				gold: typeof data.gold === 'number' ? data.gold : 50,
				xp: typeof data.xp === 'number' ? data.xp : 0,
				notes: data.notes || ''
			};
			callback(processedData);
		}
	});
};

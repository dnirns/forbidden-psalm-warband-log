import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import type { Character, WarbandData } from '$domain/models';
import { defaultCharacter } from '$domain/rules';

export const signInWithGoogleService = async (): Promise<User | null> => {
	const result = await signInWithPopup(auth, googleProvider);
	return result.user;
};

export const signOutService = async (): Promise<void> => {
	await signOut(auth);
};

type StoredCharacter = Partial<Character> & { inventory?: number };
type StoredWarband = Partial<WarbandData> & { characters?: StoredCharacter[] };

const normalizeArray = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? [...value] : []);

const normalizeCharacter = (char: StoredCharacter): Character => {
	const base = defaultCharacter();
	const inventorySize = typeof char.inventory === 'number' ? char.inventory : base.inventory;

	return {
		...base,
		...char,
		inventory: inventorySize,
		items: Array.isArray(char.items) ? [...char.items] : Array(inventorySize).fill(''),
		feats: normalizeArray(char.feats),
		flaws: normalizeArray(char.flaws),
		injuries: normalizeArray(char.injuries),
		pickedUpItems: normalizeArray(char.pickedUpItems),
		ammoTrackers: Array.isArray(char.ammoTrackers)
			? char.ammoTrackers.map((tracker) => ({ ...tracker }))
			: [],
		cleanScroll: char.cleanScroll ?? base.cleanScroll,
		uncleanScroll: char.uncleanScroll ?? base.uncleanScroll
	};
};

const normalizeWarbandData = (data: StoredWarband): WarbandData => ({
	warbandName: typeof data.warbandName === 'string' ? data.warbandName : '',
	characters: Array.isArray(data.characters) ? data.characters.map(normalizeCharacter) : [],
	gold: typeof data.gold === 'number' ? data.gold : 50,
	xp: typeof data.xp === 'number' ? data.xp : 0,
	notes: typeof data.notes === 'string' ? data.notes : ''
});

export const saveToFirestore = async (
	currentUser: User | null,
	warbandData: WarbandData
): Promise<void> => {
	if (!currentUser) {
		return;
	}

	const userDocRef = doc(db, 'warbands', currentUser.uid);
	const docSnap = await getDoc(userDocRef);

	const ensureArray = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? [...value] : []);

	const dataToSave: WarbandData = {
		...warbandData,
		notes: warbandData.notes ?? '',
		characters: warbandData.characters.map((char) => ({
			...char,
			items: ensureArray(char.items),
			feats: ensureArray(char.feats),
			flaws: ensureArray(char.flaws),
			injuries: ensureArray(char.injuries),
			pickedUpItems: ensureArray(char.pickedUpItems),
			ammoTrackers: Array.isArray(char.ammoTrackers)
				? char.ammoTrackers.map((tracker) => ({ ...tracker }))
				: []
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
};

export const loadUserData = async (currentUser: User | { uid: string } | null): Promise<WarbandData | null> => {
	if (!currentUser) return null;
	const uid = typeof (currentUser as any).uid === 'string' ? (currentUser as any).uid : '';
	if (!uid) return null;

	const userDocRef = doc(db, 'warbands', uid);
	const docSnap = await getDoc(userDocRef);

	if (docSnap.exists()) {
		const data = docSnap.data() as StoredWarband;
		return normalizeWarbandData(data);
	}

	return null;
};

export const setupRealtimeListener = async (
	currentUser: User | { uid: string },
	callback: (data: WarbandData) => void
): Promise<Unsubscribe> => {
	const uid = typeof (currentUser as any).uid === 'string' ? (currentUser as any).uid : '';
	const userDocRef = doc(db, 'warbands', uid);
	return onSnapshot(userDocRef, (docSnap) => {
		if (docSnap.exists()) {
			const data = docSnap.data() as StoredWarband;
			callback(normalizeWarbandData(data));
		}
	});
};

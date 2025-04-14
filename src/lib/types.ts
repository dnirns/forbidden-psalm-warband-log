export type AmmoTracker = {
	weaponName: string;
	currentAmmo: number;
	slotIndex: number;
};

export type Character = {
	name: string;
	hp: number;
	armour: number;
	agility: number;
	presence: number;
	strength: number;
	toughness: number;
	inventory: number;
	items: string[];
	pickedUpItems: string[];
	feats: string[];
	flaws: string[];
	injuries: string[];
	isSpellcaster: boolean;
	ammoTrackers: AmmoTracker[];
	cleanScroll: string | null;
	uncleanScroll: string | null;
};

export type WarbandData = {
	warbandName: string;
	characters: Character[];
	gold: number;
	xp: number;
	notes?: string;
};

export type CharacterManagement = {
	currentCharacterGold: number;
	originalCharacterGold: number;
	selectedIndex: number;
	currentCharacter: Character;
	showModal: boolean;
};

export type FeatOrFlaw = {
	name: string;
	description: string;
	statModifiers?: {
		agility?: number;
		presence?: number;
		strength?: number;
		toughness?: number;
		armour?: number;
		hp?: number;
		equipmentSlots?: number;
		maxRange?: number;
		extraInventorySlots?: number;
		weaponRestrictions?: string;
	};
};

export type Item = {
	item: string;
	cost: number;
	ammo?: number;
	armour?: number;
	description?: string;
	twoHanded?: boolean;
	extraInventorySlots?: number;
	type?: 'clean-scroll' | 'unclean-scroll';
};

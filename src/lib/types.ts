export type Character = {
	agility: number;
	armour: number;
	feats: string[];
	flaws: string[];
	hp: number;
	inventory: number;
	items: string[];
	name: string;
	presence: number;
	strength: number;
	toughness: number;
};

export type WarbandData = {
	warbandName: string;
	characters: Character[];
	gold: number;
};

export type CharacterManagement = {
	currentCharacterGold: number;
	originalCharacterGold: number;
	selectedIndex: number;
	currentCharacter: Character;
	showModal: boolean;
};

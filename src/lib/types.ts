export interface Character {
	agility: number;
	armour: number;
	feats: string;
	flaws: string;
	hp: number;
	inventory: number;
	items: string[];
	name: string;
	presence: number;
	strength: number;
	toughness: number;
}

export interface WarbandData {
	warbandName: string;
	characters: Character[];
	gold: number;
}

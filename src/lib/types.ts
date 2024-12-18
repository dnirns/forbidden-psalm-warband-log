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
	warband: string;
	characters: Character[];
	gold: number;
}

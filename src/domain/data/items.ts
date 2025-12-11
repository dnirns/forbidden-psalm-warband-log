import type { Item } from '$domain/models';

const items: Item[] = [
	{
		item: 'Bandages',
		cost: 1,
		description: 'Used to stop bleeding condition'
	},
	{ item: 'Lantern', cost: 3, description: 'Used to see in the dark' },
	{
		item: 'Torch',
		cost: 1,
		description:
			'As a lantern, but only lasts 3 rounds. Can be used as a one handed makeshift weapon'
	},
	{
		item: 'Backpack',
		cost: 1,
		description: 'Counts as 1 inventory slot, but provides 2 additional slots.',
		extraInventorySlots: 2
	},
	{ item: 'Potion', cost: 6, description: 'Heals D6: Toughness test or become dazed.' },
	{ item: 'Ammo', cost: 1, ammo: 5, description: '5 shots' },
	{ item: 'Light Armour', cost: 2, armour: 1, description: '+1 Armour' },
	{ item: 'Medium Armour', cost: 10, armour: 2, description: '+2 Armour' },
	{
		item: 'Heavy Armour',
		cost: 20,
		armour: 3,
		description: '+3 Armour, takes up 2 slots inventory slots'
	},
	{ item: 'Helm', cost: 5, description: 'Cannot be dazed by an attack' },
	{ item: 'Shield', cost: 2, description: 'Can be destroyed to ignore 1 attack after all rolls' },
	{
		item: 'One Handed Makeshift Weapon',
		cost: 0,
		description: 'Damage: D4. Modifier: Strength. Special: Could be a piece of bone, debris or rock'
	},
	{ item: 'Staff', cost: 1, description: 'Damage: D4, Modifier: Agility' },
	{ item: 'Shortsword', cost: 2, description: 'Damage: D6, Modifier: Agility' },
	{ item: 'Dagger', cost: 1, description: 'Damage: D4, Modifier: Agility' },
	{
		item: 'Warhammer',
		cost: 4,
		description: 'Damage: D6, Modifier: Strength, Special: Critical causes dazed.'
	},
	{
		item: 'Sword',
		cost: 4,
		description: 'Damage: D6, Modifier: Strength, Special: Critical causes dazed.'
	},
	{
		item: 'Rapier',
		cost: 4,
		description: 'Damage: D6, Modifier: Agility, Special: Critical disarms enemy.'
	},
	{
		item: 'Fists',
		cost: 0,
		description:
			'Damage: 1, Modifier: Strength, Special: Fumble - You take 1 damage, takes up 0 slots'
	},
	{ item: 'Hand Axe', cost: 3, description: 'Damage: D8, Modifier: Strength, Special: Thrown' },
	{
		item: 'Ulfberht Sword',
		cost: 5,
		description: 'Damage: D8, Modifier: Strength, Special: Critical causes bleeding'
	},
	{
		item: 'Morning Star',
		cost: 7,
		description: 'Damage: D8, Modifier: Strength, Special: Cruel and critical causes bleeding'
	},
	{
		item: "Horseman's Pick",
		cost: 4,
		description: 'Damage: D6, Modifier: Strength, Special: Cruel'
	},
	{
		item: 'Flail',
		cost: 5,
		description: 'Damage: D8, Modifier: Strength, Special: Critical causes bleeding'
	},
	{
		item: 'Two Handed Makeshift Weapon',
		cost: 0,
		description:
			'Damage: D6, Modifier: Strength, Special: Could be a piece of bone, debris or rock',
		twoHanded: true
	},
	{
		item: 'Bow',
		cost: 5,
		ammo: 3,
		description: 'Damage: D6, Modifier: Presence, Special: Comes with 5 arrows, ranged',
		twoHanded: true
	},
	{
		item: 'Crossbow',
		cost: 8,
		ammo: 5,
		description:
			'Damage: D6, Modifier: Presence, Special: Comes with 5 bolts, reload, cruel, ranged',
		twoHanded: true
	},
	{
		item: 'Bastard Sword',
		cost: 10,
		description:
			'Damage: D10, Modifier: Strength, Special: On critical, can choose to break enemies weapon.',
		twoHanded: true
	},
	{
		item: 'Great Axe',
		cost: 10,
		description:
			'Damage: D10, Modifier: Strength, Special: Critical breaks enemy shield and damages',
		twoHanded: true
	},
	{
		item: 'Glaive',
		cost: 8,
		description: 'Damage: D8, Modifier: Strength, Special: Reach',
		twoHanded: true
	},
	{
		item: 'Spear',
		cost: 8,
		description: 'Damage: D6, Modifier: Agility, Special: Reach and thrown',
		twoHanded: true
	}
];

export default items;

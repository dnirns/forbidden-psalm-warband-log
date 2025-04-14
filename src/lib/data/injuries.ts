type Injury = {
	name: string;
	statModifiers: {
		agility?: number;
		presence?: number;
		strength?: number;
		toughness?: number;
		hp?: number;
		equipmentSlots?: number;
		maxRange?: number;
		weaponRestrictions?: string;
		armour?: number;
		extraInventorySlots?: number;
	};
	description: string;
};

export const injuries: Injury[] = [
	{
		name: 'Broken Bones',
		statModifiers: { agility: -1 },
		description: 'Bones are more fragile and prone to breaking. Agility -1.'
	},
	{
		name: 'Saddened',
		statModifiers: { presence: -1 },
		description: "A deep sadness weighs heavily on the character's mind. Presence -1."
	},
	{
		name: 'Weak',
		statModifiers: { strength: -1 },
		description: 'Muscles have weakened and withered. Strength -1.'
	},
	{
		name: 'Disease',
		statModifiers: { toughness: -1 },
		description: "A lingering illness saps the character's health. Toughness -1."
	},
	{
		name: 'Maimed',
		statModifiers: { hp: -1 },
		description: 'A debilitating injury permanently reduces maximum health by 1.'
	},
	{
		name: 'Lost Limb',
		statModifiers: { extraInventorySlots: -1, weaponRestrictions: 'one-handed' },
		description:
			'A missing limb hinders combat prowess and carrying capacity. Cannot use a shield, torch, and weapon at the same time. One-handed weapon only, -1 equipment slots.'
	},
	{
		name: 'Missing Eye',
		statModifiers: { maxRange: 3 },
		description:
			'Reduced depth perception affects combat and visual range. Max range for all attacks and abilities is reduced to 3 inches.'
	},
	{
		name: 'Only a Flesh Wound',
		statModifiers: {},
		description: 'A minor injury that has no lasting effects.'
	}
];

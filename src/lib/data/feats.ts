import type { FeatOrFlaw } from './types';

export const feats: FeatOrFlaw[] = [
	{
		name: 'Intimidating Presence',
		description:
			'A single enemy model you can see within 6 inches must make a Presence test. If failed, you may make a full move with that model as if it was yours or drop one of its weapons'
	},
	{
		name: 'Slippery when wet',
		description: 'Model can always leave combat'
	},
	{
		name: 'Cowardly',
		description: 'Model gets a -1 on all morale tests but gains +1 Agility',
		statModifiers: {
			agility: 1
		}
	},
	{
		name: 'Meathead',
		description: 'Model is stronger than they are smart, +2 Strength, -1 Presence',
		statModifiers: {
			strength: 2,
			presence: -1
		}
	},
	{
		name: 'Mind over matter',
		description: 'Model can make a Presence test to ignore D4 damage each time they are hit'
	},
	{
		name: 'Through gritted teeth',
		description:
			'Model can make a Presence test to avoid being downed ONCE per encounter, they remain standing on 1 HP'
	},
	{
		name: 'Revolting appearance',
		description: 'Enemies suffer -1 to hit this model'
	},
	{
		name: 'What we do in the shadows',
		description:
			'Model can heal by drinking blood of others. Make a melee attack and heal damage dealt. Gain TEETH:D4, AGILITY BASED: CRUEL'
	},
	{
		name: 'Hard to see',
		description:
			'Model cannot be targeted by enemy ranged attacks, and can not make ranged attacks itself. Spells work as usual.'
	},
	{
		name: 'Tough as nails',
		description: '+2 HP, -1 Agility',
		statModifiers: {
			toughness: 2,
			agility: -1
		}
	},
	{
		name: 'Scavenger',
		description:
			'Roll twice on treasure tables when searching and take both, if they have sufficient equipment slots free. Extra items are placed on ground as per treasure rules'
	},
	{
		name: 'Bark skin',
		description: '+1 Armour from tough skin, -1 Agility',
		statModifiers: {
			armour: 1,
			agility: -1
		}
	},
	{
		name: 'Clawed nails',
		description: 'Replace fists with Claws. Claws: D6, Agility based.',
		statModifiers: {
			agility: 1
		}
	},
	{
		name: 'Swindler',
		description:
			'At the end of the scenario, if they survive, gain one free roll on the treasure table.'
	},
	{
		name: 'Medic',
		description:
			'Can make a Presence test to heal one downed model, model is restored to 1HP and returns to the fight.'
	},
	{
		name: 'Improvised fighter',
		description: 'Model can make a makeshift one handed weapon when out in the field.'
	},
	{
		name: 'Shield bash',
		description: 'Model equipped with a shield deals an additional 2 damage in melee.'
	},
	{
		name: 'Lucky goblin foot',
		description: 'Model can reroll 1 dice roll per scenario but has -1 equipment slot.',
		statModifiers: {
			extraInventorySlots: -1
		}
	},
	{
		name: 'Charge',
		description: 'Model can move twice its movement value but must end within an inch of an enemy.'
	},
	{
		name: 'Feint / Disarm',
		description:
			"Instead of making an attack during a close combat attack, make an Agility test to feint the enemy's attack, preventing a successful hit. If the enemy also fails to hit they are considered to have dropped their weapon and are disarmed."
	}
];

import type { FeatOrFlaw } from '$domain/models';

export const flaws: FeatOrFlaw[] = [
	{
		name: 'Cursed',
		description: 'Roll two more times and apply all results'
	},
	{
		name: 'Gammy foot',
		description: 'Suffer -1 to all movement',
		statModifiers: {
			agility: -1
		}
	},
	{
		name: 'Brittle bones',
		description: '+1 to damage when hit'
	},
	{
		name: 'Putrid smell',
		description: 'All models within 3 inches suffer -1 to Presence tests'
	},
	{
		name: 'Weak hands',
		description: 'Can only wield one weapons'
	},
	{
		name: 'Greasy hands',
		description: 'Suffer -1 to Agility tests'
	},
	{
		name: 'One eyed',
		description: 'Suffer -1 on all ranged attacks and all spells'
	},
	{
		name: 'Malnutrition',
		description: '-1 on all Strength based tests'
	},
	{
		name: 'Scared of heights',
		description: 'Cannot jump or climb'
	},
	{
		name: 'Angry',
		description:
			'If non-friendly model is withing line of sight, you must move towards them and make an attack if possible'
	},
	{
		name: 'Vacant mind',
		description:
			'Uncaring for the real world, they never collect treasure or items from the battlefield'
	},
	{
		name: 'Weak bodied',
		description: '-1 HP',
		statModifiers: {
			hp: -1
		}
	},
	{
		name: 'Allergic to metal',
		description: 'Cannot wear armour'
	},
	{
		name: 'Squeamish',
		description: '-1 DMG dealt to others'
	},
	{
		name: 'Slow learner',
		description: '+1 XP required to level up'
	},
	{
		name: 'Loner',
		description: '-1 on all tests when within 2 inches of a friendly model'
	},
	{
		name: 'Scared of monsters',
		description: '-1 to attack monsters and beasts'
	},
	{
		name: 'Realist',
		description: 'Models cannot use Omens'
	},
	{
		name: 'Poor morale',
		description: 'Whenever they take damage they make a morale roll'
	},
	{
		name: 'The best is yet to come',
		description: 'Do not pick a Feat for this model'
	}
];

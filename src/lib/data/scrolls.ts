type ScrollsType = {
	cleanScrolls: {
		name: string;
		description: string;
	}[];
	uncleanScrolls: {
		name: string;
		description: string;
	}[];
};

const scrolls: ScrollsType = {
	cleanScrolls: [
		{
			name: 'Hopes Last Breath',
			description:
				'Heal D6 HP on one model you are within 1 inch of. Does not work on downed models.'
		},
		{
			name: 'Will of the Optimistic',
			description: 'Target model adds an extra D6 to the next test they make.'
		},
		{
			name: 'Not Dead Yet',
			description: 'A dead model is awakened with 1HP and a new Flaw.'
		},
		{
			name: 'Second Wind',
			description:
				'Target creature gains 1 D6 extra HP until the end of the Scenario. Reduce casters HP by 2 each time it is cast. Does not work on downed models or the caster.'
		},
		{
			name: 'Visions of Tomorrow',
			description: 'Target models must flee as per morale rules.'
		},
		{
			name: 'Shield of Faithless',
			description: 'Model cannot be targeted by ranged attacks for 1 round.'
		},
		{
			name: 'False Dawn',
			description: 'Target model produces light as if they had a lantern, lasts 5 rounds.'
		},
		{
			name: 'Mind Blast',
			description: 'Target model must pass a Presence test or is dazed for 1 round.'
		},
		{
			name: 'Golden Flare',
			description: 'Target model must pass a Presence test or is blinded for 1 round.'
		},
		{
			name: 'Obey',
			description:
				'Target creature must obey one command, taking one action or movement. The action must be one the target can complete. One a failure, the caster instead performs the command if it can, but under the control of the other player. Speak the command before rolling the dice.'
		}
	],
	uncleanScrolls: [
		{
			name: 'Flaming Hands of St Vilmarex',
			description: 'Caster hurls a ball of fire at an enemy it can see, dealing D6 damage - cruel.'
		},
		{
			name: 'Mindless Eye',
			description:
				'The target creature becomes deranged and must make a Presence test or attack the nearest model. '
		},
		{
			name: 'Invisible Hands',
			description: 'Can move an object (dropped weapon or treasure) D12 inches.'
		},
		{
			name: 'Ungrounded',
			description:
				'Target creature can hover for 1 round, ignores all terrain features and moves at twice normal speed.'
		},
		{
			name: 'Breath of the Undying',
			description:
				'Target creature begins to suffocate and takes D4 damage when activated. Must make a Presence test as an action to remove the effect.'
		},
		{
			name: 'One Eyed King',
			description:
				'Target creature becomes invisible and cannot be targeted by any attack or spell. Target is ignored by monsters. Lasts until creature makes a test of any kind'
		},
		{
			name: 'Bones, Them Damn Bones',
			description:
				'A Skeleton appears at a target point on the table, it always fights the nearest model but never attacks the caster. On a failure to cast it still appears but always moves towards and attacks the caster. If caster dies, it leaves.'
		},
		{
			name: 'Eternal Sleep',
			description:
				'Target creature makes a Presence test and falls asleep on a failure. Wakes up if they take any damage. Friendly models can wake them up as an action within 1 inch.'
		},
		{
			name: 'Ride the Lightning',
			description:
				'Caster produces lightning and strikes a target within 12 inches. Deals D6 damage. Ignores armour.'
		},
		{
			name: 'Doom',
			description:
				'All models and creatures withing 12 inches, including allies and caster, must make a Presence test, on failure take D10 damage, ignoring armour. Any failure to cast this scroll is considered a fumble.'
		}
	]
};

export default scrolls;

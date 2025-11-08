import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { Character, WarbandData, Item } from '$lib/types';
import { getAuth } from 'firebase/auth';
import { saveToFirestore } from '$lib/firebase';

// @ts-expect-error - Svelte component import
import CharacterCard from './CharacterCard.svelte';

vi.mock('firebase/auth');
vi.mock('$lib/firebase');
vi.mock('$lib/audio', () => ({
	useAudio: () => ({ play: vi.fn() })
}));
vi.mock('$lib/utils/modalUtils', () => ({
	lockBodyScroll: vi.fn(),
	unlockBodyScroll: vi.fn()
}));
vi.mock('$lib/data/feats', () => ({
	feats: []
}));
vi.mock('$lib/data/flaws', () => ({
	flaws: []
}));
vi.mock('$lib/data/injuries', () => ({
	injuries: []
}));
vi.mock('$lib/data/scrolls', () => ({
	default: {
		cleanScrolls: [],
		uncleanScrolls: []
	}
}));
vi.mock('$lib/utils', () => ({
	calculateTotalArmour: vi.fn(() => 0),
	calculateModifiedStats: vi.fn((char) => ({
		agility: char.agility,
		presence: char.presence,
		strength: char.strength,
		toughness: char.toughness,
		hp: 0,
		equipmentSlots: 0,
		armour: 0
	}))
}));

const createChar = (overrides?: Partial<Character>): Character => ({
	name: 'Test Warrior',
	hp: 10,
	armour: 2,
	agility: 1,
	presence: 0,
	strength: 2,
	toughness: 1,
	inventory: 7,
	items: ['Sword', 'Shield', '', '', '', '', ''],
	pickedUpItems: [],
	feats: [],
	flaws: [],
	injuries: [],
	isSpellcaster: false,
	ammoTrackers: [],
	cleanScroll: null,
	uncleanScroll: null,
	...overrides
});

const createWarband = (overrides?: Partial<WarbandData>): WarbandData => ({
	warbandName: 'Test Warband',
	characters: [createChar()],
	gold: 50,
	xp: 0,
	notes: '',
	...overrides
});

const createItem = (overrides?: Partial<Item>): Item => ({
	item: 'Sword',
	cost: 10,
	...overrides
});

const mockItems: Item[] = [
	createItem({ item: 'Sword', cost: 10 }),
	createItem({ item: 'Shield', cost: 5, armour: 1 }),
	createItem({ item: 'Bow', cost: 15, ammo: 6 }),
	createItem({ item: 'Backpack', cost: 5, extraInventorySlots: 2 })
];

describe('CharacterCard', () => {
	const mockAuth = { currentUser: { uid: 'test-user' } };
	const editCharacter = vi.fn();
	const deleteCharacter = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getAuth).mockReturnValue(mockAuth as any);
		vi.mocked(saveToFirestore).mockResolvedValue(undefined);
	});

	describe('character display', () => {
		it('should render character name', () => {
			const char = createChar({ name: 'Hero' });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('Hero')).toBeInTheDocument();
		});

		it('should display spellcaster badge when character is spellcaster', () => {
			const char = createChar({ isSpellcaster: true });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText(/Spellcaster/)).toBeInTheDocument();
		});

		it('should display items in inventory', () => {
			const char = createChar({ items: ['Sword', 'Shield', ''] });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('Sword')).toBeInTheDocument();
			expect(screen.getByText('Shield')).toBeInTheDocument();
		});

		it('should show empty slots for items array', () => {
			const char = createChar({ items: ['Sword', '', ''] });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			const emptySlots = screen.getAllByText('Empty Slot');
			expect(emptySlots.length).toBeGreaterThan(0);
		});
	});

	describe('feats and flaws', () => {
		it('should display feats when present', () => {
			const char = createChar({ feats: ['Quick reflexes'] });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('Quick reflexes')).toBeInTheDocument();
		});

		it('should display flaws when present', () => {
			const char = createChar({ flaws: ['Weak bodied'] });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('Weak bodied')).toBeInTheDocument();
		});
	});

	describe('injuries', () => {
		it('should display injuries section header when injuries present', () => {
			const char = createChar({ injuries: ['Broken Leg'] });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText(/Injuries/)).toBeInTheDocument();
		});
	});

	describe('dead character state', () => {
		it('should show death overlay when HP is 0', () => {
			const char = createChar({ hp: 0, name: 'Dead Hero' });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('DEAD')).toBeInTheDocument();

			const deadHeroElements = screen.getAllByText('Dead Hero');
			expect(deadHeroElements).toHaveLength(2); // One in overlay, one in main content
			expect(deadHeroElements[0]).toBeInTheDocument();
		});

		it('should show revive button when character is dead', () => {
			const char = createChar({ hp: 0 });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('Revive')).toBeInTheDocument();
		});
	});

	describe('action buttons', () => {
		it('should show standard action buttons for living character', () => {
			const char = createChar({ hp: 10 });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('Add Injury')).toBeInTheDocument();
			expect(screen.getByText('Edit')).toBeInTheDocument();
			expect(screen.getByText('Delete')).toBeInTheDocument();
		});
	});

	describe('ammo tracking', () => {
		it('should display ammo count for weapons with ammo', () => {
			const char = createChar({
				items: ['Bow', '', ''],
				ammoTrackers: [{ weaponName: 'Bow', slotIndex: 0, currentAmmo: 6 }]
			});

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText(/Ammo: 6/)).toBeInTheDocument();
		});

		it('should show refill button when ammo is empty', () => {
			const char = createChar({
				items: ['Bow', '', ''],
				ammoTrackers: [{ weaponName: 'Bow', slotIndex: 0, currentAmmo: 0 }]
			});

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('Ammo Empty')).toBeInTheDocument();
			expect(screen.getByText('Refill')).toBeInTheDocument();
		});
	});

	describe('item actions', () => {
		it('should show drop button for each equipped item', () => {
			const char = createChar({ items: ['Sword', 'Shield', ''] });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			const dropButtons = screen.getAllByText('Drop');
			expect(dropButtons).toHaveLength(2);
		});

		it('should show pick up button for empty slots', () => {
			const char = createChar({ items: ['Sword', '', '', ''] });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			const pickUpButtons = screen.getAllByText('Pick Up Item');
			expect(pickUpButtons.length).toBeGreaterThan(0);
		});

		it('should mark picked up items with label', () => {
			const char = createChar({
				items: ['Sword', 'Shield', ''],
				pickedUpItems: ['Shield']
			});

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('(Picked up)')).toBeInTheDocument();
		});
	});

	describe('spellcaster scrolls', () => {
		it('should display scroll slots for spellcasters', () => {
			const char = createChar({
				isSpellcaster: true,
				items: ['[Clean Scroll Slot]', '[Unclean Scroll Slot]', '']
			});

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText(/Scrolls/)).toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('should handle character with no items', () => {
			const char = createChar({ items: [] });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('Test Warrior')).toBeInTheDocument();
		});

		it('should handle character with zero stats', () => {
			const char = createChar({
				agility: 0,
				presence: 0,
				strength: 0,
				toughness: 0
			});

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: createWarband()
			});

			expect(screen.getByText('Test Warrior')).toBeInTheDocument();
		});

		it('should handle empty warband data', () => {
			const char = createChar();
			const warband = createWarband({ characters: [] });

			render(CharacterCard, {
				char,
				i: 0,
				editCharacter,
				deleteCharacter,
				items: mockItems,
				warbandData: warband
			});

			expect(screen.getByText('Test Warrior')).toBeInTheDocument();
		});
	});
});

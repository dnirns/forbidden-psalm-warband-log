import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import CharacterModal from './CharacterModal.svelte';
import type { Character } from '$lib/types';

function createMockStore<T>(initial: T) {
	let value = initial;
	const subscribers = new Set<(val: T) => void>();

	return {
		subscribe(run: (val: T) => void) {
			run(value);
			subscribers.add(run);
			return () => subscribers.delete(run);
		},
		set(newValue: T) {
			value = newValue;
			subscribers.forEach((run) => run(value));
		}
	};
}

const mocks = vi.hoisted(() => {
	const mockCharacter: Character = {
		name: 'New Hero',
		hp: 10,
		armour: 0,
		agility: 0,
		presence: 0,
		strength: 0,
		toughness: 0,
		inventory: 5,
		items: ['', ''],
		pickedUpItems: [],
		feats: [],
		flaws: [],
		injuries: [],
		isSpellcaster: false,
		ammoTrackers: [],
		cleanScroll: null,
		uncleanScroll: null
	};

	const state = {
		showModal: true,
		selectedIndex: -1,
		currentCharacter: mockCharacter,
		data: { warbandName: 'WB', characters: [], gold: 20, xp: 0, notes: '' },
		originalCharacterGold: 0
	};

	return {
		mockCharacter,
		state,
		store: createMockStore(state),
		closeModal: vi.fn(),
		saveCharacter: vi.fn().mockResolvedValue(undefined),
		updateCurrentCharacter: vi.fn(),
		handleSpellcasterToggle: vi.fn(() => ({
			removedItems: [{ name: 'Axe', cost: 3 }],
			refundAmount: 3
		}))
	};
});

vi.mock('$lib/stores/warbandStore', () => ({
	warbandStore: {
		subscribe: mocks.store.subscribe,
		updateCurrentCharacter: (...args: unknown[]) => mocks.updateCurrentCharacter(...args),
		updateStatAndInventory: vi.fn(),
		setItemForCurrentCharacter: vi.fn(),
		removeItemWithRefund: vi.fn(),
		removeItemFromCurrent: vi.fn(),
		applyModifier: vi.fn(),
		removeModifier: vi.fn(),
		handleSpellcasterToggle: (...args: unknown[]) => mocks.handleSpellcasterToggle(...args),
		closeModal: (...args: unknown[]) => mocks.closeModal(...args),
		saveCharacter: (...args: unknown[]) => mocks.saveCharacter(...args),
		selectScroll: vi.fn()
	}
}));

vi.mock('$domain/rules', () => ({
	defaultCharacter: () => mocks.mockCharacter,
	calculateCharacterCost: vi.fn(() => 0),
	calculateTotalArmour: vi.fn(() => 0),
	calculateModifiedStats: vi.fn(() => ({
		agility: 0,
		presence: 0,
		strength: 0,
		toughness: 0,
		hp: 0,
		equipmentSlots: 0,
		armour: 0
	})),
	itemUsesAmmo: vi.fn(() => false),
	getInitialAmmo: vi.fn(() => 0),
	isItemRestrictedForSpellcaster: vi.fn(() => false)
}));

vi.mock('$lib/data/feats', () => ({ feats: [] }));
vi.mock('$lib/data/flaws', () => ({ flaws: [] }));
vi.mock('$lib/data/injuries', () => ({ injuries: [] }));
vi.mock('$lib/data/items', () => ({ default: [{ item: 'Axe', cost: 3 }] }));
vi.mock('$lib/data/scrolls', () => ({
	default: { cleanScrolls: [], uncleanScrolls: [] }
}));

const modalMocks = vi.hoisted(() => ({
	lockBodyScroll: vi.fn(),
	unlockBodyScroll: vi.fn()
}));

vi.mock('$lib/utils/modalUtils', () => ({
	lockBodyScroll: (...args: unknown[]) => modalMocks.lockBodyScroll(...args),
	unlockBodyScroll: (...args: unknown[]) => modalMocks.unlockBodyScroll(...args)
}));

describe('CharacterModal', () => {
	beforeEach(() => {
		mocks.closeModal.mockClear();
		mocks.saveCharacter.mockClear();
		mocks.updateCurrentCharacter.mockClear();
		mocks.handleSpellcasterToggle.mockClear();
		modalMocks.lockBodyScroll.mockClear();
		modalMocks.unlockBodyScroll.mockClear();
		mocks.store.set({
			...mocks.state,
			currentCharacter: { ...mocks.mockCharacter }
		});
	});

	it('renders add character form when modal is open', () => {
		render(CharacterModal);

		expect(screen.getByRole('heading', { name: 'Add Character' })).toBeInTheDocument();
		expect(screen.getByDisplayValue('New Hero')).toBeInTheDocument();
		expect(modalMocks.lockBodyScroll).toHaveBeenCalled();
	});

	it('saves character on submit', async () => {
		render(CharacterModal);

		await fireEvent.click(screen.getByRole('button', { name: 'Add Character' }));

		await waitFor(() => expect(mocks.saveCharacter).toHaveBeenCalled());

		const [savedCharacter, index] = mocks.saveCharacter.mock.calls[0];
		expect(savedCharacter.name).toBe('New Hero');
		expect(index).toBe(mocks.state.selectedIndex);
		expect(modalMocks.unlockBodyScroll).toHaveBeenCalled();
	});

	it('displays spellcaster refund message when toggled', async () => {
		render(CharacterModal);

		const checkbox = screen.getByRole('checkbox');
		await fireEvent.click(checkbox);

		expect(mocks.handleSpellcasterToggle).toHaveBeenCalledWith(true);
		expect(
			screen.getByText(/removed as it is a restricted item for Spellcasters/)
		).toBeInTheDocument();
	});

	it('closes modal via close button', async () => {
		render(CharacterModal);

		await fireEvent.click(screen.getByLabelText('Close modal'));

		expect(mocks.closeModal).toHaveBeenCalled();
		expect(modalMocks.unlockBodyScroll).toHaveBeenCalled();
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DeleteCharacterModal from './DeleteCharacterModal.svelte';
import type { Character } from '$lib/types';

const modalMocks = vi.hoisted(() => ({
	lockBodyScroll: vi.fn(),
	unlockBodyScroll: vi.fn()
}));

vi.mock('$lib/utils/modalUtils', () => ({
	lockBodyScroll: (...args: unknown[]) => modalMocks.lockBodyScroll(...args),
	unlockBodyScroll: (...args: unknown[]) => modalMocks.unlockBodyScroll(...args)
}));

vi.mock('$lib/data/items', () => ({
	default: [
		{ item: 'Sword', cost: 10 },
		{ item: 'Lantern', cost: 0 }
	]
}));

describe('DeleteCharacterModal', () => {
	const character: Character = {
		name: 'Testy',
		hp: 1,
		armour: 0,
		agility: 0,
		presence: 0,
		strength: 0,
		toughness: 0,
		inventory: 2,
		items: ['Sword', 'Lantern'],
		pickedUpItems: ['Lantern'],
		feats: [],
		flaws: [],
		injuries: [],
		isSpellcaster: true,
		ammoTrackers: [],
		cleanScroll: null,
		uncleanScroll: null
	};

	beforeEach(() => {
		modalMocks.lockBodyScroll.mockClear();
		modalMocks.unlockBodyScroll.mockClear();
	});

	it('shows refundable items and total', () => {
		render(DeleteCharacterModal, {
			onClose: vi.fn(),
			onConfirm: vi.fn(),
			characterName: 'Testy',
			character
		});

		expect(modalMocks.lockBodyScroll).toHaveBeenCalled();
		expect(screen.getByText('Sword')).toBeInTheDocument();
		expect(screen.getByText('Spellcaster cost')).toBeInTheDocument();
		expect(screen.getByText('15 gold')).toBeInTheDocument();
	});

	it('invokes confirm and close handlers', async () => {
		const onClose = vi.fn();
		const onConfirm = vi.fn();
		render(DeleteCharacterModal, {
			onClose,
			onConfirm,
			characterName: 'Delete Me',
			character
		});

		await fireEvent.click(screen.getByText('Delete'));
		await fireEvent.click(screen.getByText('Cancel'));

		expect(onConfirm).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});
});

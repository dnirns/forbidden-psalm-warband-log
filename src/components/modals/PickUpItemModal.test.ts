import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PickUpItemModal from './PickUpItemModal.svelte';

vi.mock('$lib/data/scrolls', () => ({
	default: {
		cleanScrolls: [{ name: 'Clean Spell', description: 'Clean scroll description' }],
		uncleanScrolls: [{ name: 'Dark Spell', description: 'Unclean scroll description' }]
	}
}));

describe('PickUpItemModal', () => {
	const items = [
		{ item: 'Sword', cost: 10 },
		{ item: 'Shield', cost: 5 }
	];

	it('lists inventory items and picks one up', async () => {
		const onPickUp = vi.fn().mockResolvedValue(undefined);
		render(PickUpItemModal, { items, onPickUp, onClose: vi.fn() });

		await fireEvent.click(screen.getByText('Sword'));
		expect(onPickUp).toHaveBeenCalledWith('Sword');
	});

	it('allows picking custom item', async () => {
		const onPickUp = vi.fn().mockResolvedValue(undefined);
		render(PickUpItemModal, { items, onPickUp, onClose: vi.fn() });

		await fireEvent.click(screen.getByText('Custom'));
		const input = screen.getByPlaceholderText('Enter custom item name');
		await fireEvent.input(input, { target: { value: 'Lantern' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));

		expect(onPickUp).toHaveBeenCalledWith('Lantern');
	});

	it('shows scroll options when toggled', async () => {
		const onPickUp = vi.fn().mockResolvedValue(undefined);
		render(PickUpItemModal, { items, onPickUp, onClose: vi.fn() });

		await fireEvent.click(screen.getByText('Scrolls'));

		expect(screen.getByText('Clean Scrolls')).toBeInTheDocument();
		expect(screen.getByText('Unclean Scrolls')).toBeInTheDocument();

		await fireEvent.click(screen.getByText('Clean Spell'));
		expect(onPickUp).toHaveBeenCalledWith('Clean Spell');
	});
});

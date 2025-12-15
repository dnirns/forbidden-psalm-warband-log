import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ItemActionModal from './ItemActionModal.svelte';

const modalMocks = vi.hoisted(() => ({
	lockBodyScroll: vi.fn(),
	unlockBodyScroll: vi.fn()
}));

vi.mock('$lib/utils/modalUtils', () => ({
	lockBodyScroll: (...args: unknown[]) => modalMocks.lockBodyScroll(...args),
	unlockBodyScroll: (...args: unknown[]) => modalMocks.unlockBodyScroll(...args)
}));

describe('ItemActionModal', () => {
	beforeEach(() => {
		modalMocks.lockBodyScroll.mockClear();
		modalMocks.unlockBodyScroll.mockClear();
	});

	it('renders item name and calls handlers', async () => {
		const onRefund = vi.fn();
		const onDrop = vi.fn();
		const onClose = vi.fn();

		render(ItemActionModal, {
			itemName: 'Magic Sword',
			refundAmount: 8,
			onRefund,
			onDrop,
			onClose
		});

		expect(screen.getByText(/Magic Sword/)).toBeInTheDocument();
		expect(modalMocks.lockBodyScroll).toHaveBeenCalled();

		await fireEvent.click(screen.getByText(/Refund/));
		await fireEvent.click(screen.getByText('Drop Item'));
		await fireEvent.click(screen.getByText('Cancel'));

		expect(onRefund).toHaveBeenCalled();
		expect(onDrop).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it('closes when clicking backdrop', async () => {
		const onClose = vi.fn();

		render(ItemActionModal, {
			itemName: 'Potion',
			refundAmount: undefined,
			onRefund: vi.fn(),
			onDrop: vi.fn(),
			onClose
		});

		await fireEvent.click(screen.getByRole('presentation'));
		expect(onClose).toHaveBeenCalled();
	});
});

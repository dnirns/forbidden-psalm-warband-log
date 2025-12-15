import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import WarbandNotes from './WarbandNotes.svelte';

const mocks = vi.hoisted(() => ({
	updateWarband: vi.fn().mockResolvedValue(undefined),
	lockBodyScroll: vi.fn(),
	unlockBodyScroll: vi.fn()
}));

vi.mock('$lib/stores/warbandStore', () => ({
	warbandStore: {
		updateWarband: (...args: unknown[]) => mocks.updateWarband(...args)
	}
}));

vi.mock('$lib/utils/modalUtils', () => ({
	lockBodyScroll: (...args: unknown[]) => mocks.lockBodyScroll(...args),
	unlockBodyScroll: (...args: unknown[]) => mocks.unlockBodyScroll(...args)
}));

describe('WarbandNotes', () => {
	beforeEach(() => {
		mocks.updateWarband.mockClear();
		mocks.lockBodyScroll.mockClear();
		mocks.unlockBodyScroll.mockClear();
	});

	it('opens modal, saves notes and closes', async () => {
		render(WarbandNotes, {
			warbandData: { warbandName: 'WB', characters: [], gold: 0, xp: 0, notes: 'Initial' }
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
		expect(screen.getByText('Warband Notes')).toBeInTheDocument();
		expect(mocks.lockBodyScroll).toHaveBeenCalled();

		const textarea = screen.getByPlaceholderText('Add notes here...');
		await fireEvent.input(textarea, { target: { value: 'Updated note' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save Notes' }));

		await waitFor(() => expect(mocks.updateWarband).toHaveBeenCalledWith({ notes: 'Updated note' }));
		await waitFor(() =>
			expect(screen.queryByText('Warband Notes')).not.toBeInTheDocument()
		);
		expect(mocks.unlockBodyScroll).toHaveBeenCalled();
	});

	it('shows error message when save fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mocks.updateWarband.mockRejectedValueOnce(new Error('fail'));

		render(WarbandNotes, {
			warbandData: { warbandName: '', characters: [], gold: 0, xp: 0, notes: '' }
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
		const textarea = screen.getByPlaceholderText('Add notes here...');
		await fireEvent.input(textarea, { target: { value: 'Note' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save Notes' }));

		await waitFor(() =>
			expect(screen.getByText('Failed to save notes. Please try again.')).toBeVisible()
		);
		consoleSpy.mockRestore();
	});
});

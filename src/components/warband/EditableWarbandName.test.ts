import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import EditableWarbandName from './EditableWarbandName.svelte';

const warbandMocks = vi.hoisted(() => ({
	updateWarband: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/stores/warbandStore', () => ({
	warbandStore: {
		updateWarband: (...args: unknown[]) => warbandMocks.updateWarband(...args)
	}
}));

describe('EditableWarbandName', () => {
	beforeEach(() => {
		warbandMocks.updateWarband.mockClear();
	});

	it('renders name and allows editing', async () => {
		render(EditableWarbandName, { warbandName: 'Old Name' });

		expect(screen.getByText('Old Name')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button'));
		const input = screen.getByDisplayValue('Old Name');
		await fireEvent.input(input, { target: { value: 'New Name' } });
		await fireEvent.click(screen.getByText('Save'));

		await waitFor(() =>
			expect(warbandMocks.updateWarband).toHaveBeenCalledWith({ warbandName: 'New Name' })
		);
	});

	it('shows fallback text for unnamed warband', () => {
		render(EditableWarbandName, { warbandName: '' });
		expect(screen.getByText('Unnamed Warband')).toBeInTheDocument();
	});

	it('displays error message when save fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		warbandMocks.updateWarband.mockRejectedValueOnce(new Error('fail'));
		render(EditableWarbandName, { warbandName: 'Error Name' });

		await fireEvent.click(screen.getByRole('button'));
		const input = screen.getByDisplayValue('Error Name');
		await fireEvent.input(input, { target: { value: 'Broken' } });
		await fireEvent.click(screen.getByText('Save'));

		await waitFor(() =>
			expect(screen.getByText('Failed to save warband name. Please try again.')).toBeVisible()
		);
		consoleSpy.mockRestore();
	});
});

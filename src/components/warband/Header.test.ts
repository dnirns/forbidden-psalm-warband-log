import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Header from './Header.svelte';

const warbandMocks = vi.hoisted(() => ({
	updateWarband: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/stores/warbandStore', () => ({
	warbandStore: {
		updateWarband: (...args: unknown[]) => warbandMocks.updateWarband(...args)
	}
}));

vi.mock('$lib/utils/modalUtils', () => ({
	lockBodyScroll: vi.fn(),
	unlockBodyScroll: vi.fn()
}));

describe('Header', () => {
	beforeEach(() => {
		warbandMocks.updateWarband.mockClear();
	});

	it('renders warband info and triggers sign out', async () => {
		const handleSignOut = vi.fn();
		render(Header, {
			handleSignOut,
			warbandData: { warbandName: 'Test Warband', characters: [], gold: 10, xp: 5, notes: '' }
		});

		expect(screen.getByText('Test Warband')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

		expect(handleSignOut).toHaveBeenCalledTimes(1);
	});

	it('updates warband values via NumberControl', async () => {
		render(Header, {
			handleSignOut: vi.fn(),
			warbandData: { warbandName: 'Gold Band', characters: [], gold: 3, xp: 2, notes: '' }
		});

		await fireEvent.click(screen.getByLabelText('Increase Gold'));

		expect(warbandMocks.updateWarband).toHaveBeenCalledWith({ gold: 4 });
	});
});

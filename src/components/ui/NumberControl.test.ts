import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import NumberControl from './NumberControl.svelte';

describe('NumberControl', () => {
	it('increments and decrements within bounds', async () => {
		const onUpdate = vi.fn().mockResolvedValue(undefined);

		render(NumberControl, {
			value: 2,
			label: 'Gold',
			onUpdate,
			minValue: 0,
			maxValue: 5
		});

		await fireEvent.click(screen.getByLabelText('Increase Gold'));
		await fireEvent.click(screen.getByLabelText('Decrease Gold'));

		expect(onUpdate).toHaveBeenCalledWith(3);
		expect(onUpdate).toHaveBeenCalledWith(1);
	});

	it('does not invoke onUpdate when at limits', async () => {
		const onUpdate = vi.fn().mockResolvedValue(undefined);

		render(NumberControl, {
			value: 0,
			label: 'XP',
			onUpdate,
			minValue: 0,
			maxValue: 0
		});

		await fireEvent.click(screen.getByLabelText('Decrease XP'));
		await fireEvent.click(screen.getByLabelText('Increase XP'));

		expect(onUpdate).not.toHaveBeenCalled();
	});

	it('emits error when update fails', async () => {
		const onUpdate = vi.fn().mockRejectedValue(new Error('boom'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(NumberControl, {
			value: 1,
			label: 'HP',
			onUpdate
		});

		await fireEvent.click(screen.getByLabelText('Increase HP'));

		await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
		expect(consoleSpy.mock.calls[0][0]).toContain('Failed to increment HP');
		consoleSpy.mockRestore();
	});

	it('hides controls when disabled', () => {
		render(NumberControl, {
			value: 5,
			label: 'Stat',
			onUpdate: vi.fn(),
			disabled: true
		});

		expect(screen.queryByLabelText('Increase Stat')).not.toBeInTheDocument();
		expect(screen.queryByLabelText('Decrease Stat')).not.toBeInTheDocument();
	});
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ScrollSelector from './ScrollSelector.svelte';

vi.mock('$lib/data/scrolls', () => ({
	default: {
		cleanScrolls: [{ name: 'Clean One', description: 'Clean desc' }],
		uncleanScrolls: [{ name: 'Unclean One', description: 'Unclean desc' }]
	}
}));

describe('ScrollSelector', () => {
	it('renders clean scroll selector and handles selection', async () => {
		const onSelect = vi.fn();

		const { rerender } = render(ScrollSelector, {
			scrollType: 'clean',
			selectedScroll: '',
			onSelect
		});

		expect(screen.getByText('Clean Scroll:')).toBeInTheDocument();

		const select = screen.getByRole('combobox');
		await fireEvent.change(select, { target: { value: 'Clean One' } });

		expect(onSelect).toHaveBeenCalledWith('Clean One');
		await rerender({
			scrollType: 'clean',
			selectedScroll: 'Clean One',
			onSelect
		});
		expect(screen.getByText('Clean desc')).toBeInTheDocument();
	});

	it('shows unclean scrolls with correct label', () => {
		render(ScrollSelector, {
			scrollType: 'unclean',
			selectedScroll: 'Unclean One',
			onSelect: vi.fn()
		});

		expect(screen.getByText('Unclean Scroll:')).toBeInTheDocument();
		expect(screen.getByDisplayValue('Unclean One')).toBeInTheDocument();
	});
});

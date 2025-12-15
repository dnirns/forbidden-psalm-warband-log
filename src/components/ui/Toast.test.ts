import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Toast from './Toast.svelte';

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

const mocks = vi.hoisted(() => ({
	store: createMockStore<any>(null),
	undo: vi.fn()
}));

vi.mock('$lib/stores/undoStore', () => ({
	undoStore: {
		subscribe: mocks.store.subscribe,
		undo: (...args: unknown[]) => mocks.undo(...args)
	}
}));

describe('Toast', () => {
	beforeEach(() => {
		mocks.undo.mockReset();
		mocks.store.set({
			description: 'Undo last change'
		});
	});

	it('renders undo description and triggers undo', async () => {
		mocks.undo.mockResolvedValue(undefined);
		render(Toast);

		expect(screen.getByText('Undo last change')).toBeInTheDocument();
		await fireEvent.click(screen.getByText('Undo'));

		expect(mocks.undo).toHaveBeenCalledTimes(1);
		expect(screen.queryByText(/Failed to undo/)).not.toBeInTheDocument();
	});

	it('shows error when undo fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		mocks.undo.mockRejectedValueOnce(new Error('fail'));
		render(Toast);

		await fireEvent.click(screen.getByText('Undo'));

		await waitFor(() => expect(screen.getByText('Failed to undo. Please try again.')).toBeVisible());
		consoleSpy.mockRestore();
	});

	it('renders nothing when no undo action is present', () => {
		mocks.store.set(null);
		render(Toast);

		expect(screen.queryByText(/Undo/)).toBeNull();
	});
});

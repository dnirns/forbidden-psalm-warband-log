import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CloseButton from './CloseButton.svelte';

describe('CloseButton', () => {
	it('calls onClick when pressed', async () => {
		const onClick = vi.fn();
		render(CloseButton, { onClick });

		const button = screen.getByRole('button', { name: 'Close modal' });
		await fireEvent.click(button);

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

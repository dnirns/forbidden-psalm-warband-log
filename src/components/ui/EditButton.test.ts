import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import EditButton from './EditButton.svelte';

describe('EditButton', () => {
	it('invokes onClick on click and Enter key', async () => {
		const onClick = vi.fn();
		render(EditButton, { onClick, size: 'lg' });

		const button = screen.getByRole('button');
		await fireEvent.click(button);
		await fireEvent.keyDown(button, { key: 'Enter' });

		expect(onClick).toHaveBeenCalledTimes(2);
		expect(button.className).toContain('text-4xl');
	});
});

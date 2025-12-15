import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
	it('renders slot content and triggers click handler', async () => {
		const onClick = vi.fn();

		render(Button, {
			props: { onClick, ariaLabel: 'Click me' }
		});

		const button = screen.getByRole('button', { name: 'Click me' });
		await fireEvent.click(button);

		expect(button).toBeInTheDocument();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('applies variant, size and text size classes', () => {
		render(Button, {
			props: {
				onClick: vi.fn(),
				variant: 'danger',
				size: 'compact',
				textSize: 'small',
				ariaLabel: 'Danger button'
			}
		});

		const button = screen.getByRole('button', { name: 'Danger button' });

		expect(button.className).toContain('bg-red-300');
		expect(button.className).toContain('h-6');
		expect(button.className).toContain('text-sm');
	});

	it('uses wide sizing when requested', () => {
		render(Button, {
			props: { onClick: vi.fn(), wide: true, ariaLabel: 'Wide button' }
		});

		const button = screen.getByRole('button', { name: 'Wide button' });
		expect(button.className).toContain('w-36');
	});
});

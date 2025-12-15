import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import InvertedCrossSVG from './InvertedCrossSVG.svelte';
import GoogleIcon from './GoogleIcon.svelte';
import Skull from './Skull.svelte';

describe('Icons', () => {
	it('renders InvertedCrossSVG with expected attributes', () => {
		const { container } = render(InvertedCrossSVG);
		const svg = container.querySelector('svg');

		expect(svg).toBeInTheDocument();
		expect(svg).toHaveAttribute('width', '12');
		expect(svg).toHaveAttribute('height', '14');
		expect(svg).toHaveAttribute('aria-hidden', 'true');
	});

	it('renders GoogleIcon svg', () => {
		render(GoogleIcon);
		expect(screen.getByTestId('google-icon-svg')).toBeInTheDocument();
	});

	it('applies provided scale to Skull', () => {
		const { container } = render(Skull, { scale: 1.25 });
		const skull = container.querySelector('.skull') as HTMLElement;

		expect(skull).toBeInTheDocument();
		expect(skull.style.transform).toContain('scale(1.25)');
		expect(skull.textContent?.trim()).toContain('$$$$');
	});
});

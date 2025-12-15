import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import GDPR from './GDPR.svelte';

const createMockStorage = () => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
};

describe('GDPR', () => {
	beforeEach(() => {
		const storage = createMockStorage();
		Object.defineProperty(window, 'localStorage', {
			value: storage,
			configurable: true
		});
		Object.defineProperty(Element.prototype, 'animate', {
			value: vi.fn(() => {
				const animation = {
					cancel: vi.fn(),
					commitStyles: vi.fn(),
					finish: vi.fn(),
					onfinish: null as (() => void) | null
				};
				setTimeout(() => {
					animation.onfinish?.();
				}, 0);
				return animation;
			}),
			configurable: true
		});
	});

	it('shows banner when not previously acknowledged and hides after continue', async () => {
		localStorage.removeItem('gdprSeen');

		render(GDPR);

		const bannerText = await screen.findByText(/This site uses Google Sign-In/);
		expect(bannerText).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

		await waitFor(() =>
			expect(screen.queryByText(/This site uses Google Sign-In/)).not.toBeInTheDocument()
		);
		expect(localStorage.getItem('gdprSeen')).toBe('true');
	});

	it('does not render when notice already seen', () => {
		localStorage.setItem('gdprSeen', 'true');

		render(GDPR);
		expect(screen.queryByText(/Google Sign-In/)).toBeNull();
	});
});

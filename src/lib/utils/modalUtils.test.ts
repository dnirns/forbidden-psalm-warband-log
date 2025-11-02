import { describe, it, expect, beforeEach, vi } from 'vitest';

import { lockBodyScroll, unlockBodyScroll } from '$lib';

describe('modalUtils', () => {
	beforeEach(() => {
		document.body.style.overflow = '';
		document.body.style.position = '';
		document.body.style.width = '';
		document.body.style.height = '';

		// define scrollY property on window to allow mocking
		Object.defineProperty(window, 'scrollY', {
			writable: true,
			configurable: true,
			value: 0
		});


		window.scrollTo = vi.fn();


		global.requestAnimationFrame = vi.fn((callback) => {
			callback(0);
			return 0;
		});
	});

	describe('lockBodyScroll', () => {
		it('should lock body scroll and apply fixed positioning styles when called', () => {
			lockBodyScroll();

			expect(document.body.style.overflow).toBe('hidden');
			expect(document.body.style.position).toBe('fixed');
			expect(document.body.style.width).toBe('100%');
			expect(document.body.style.height).toBe('100%');
		});

		it('should store current scroll position when called', () => {
			Object.defineProperty(window, 'scrollY', {
				writable: true,
				configurable: true,
				value: 250
			});

			lockBodyScroll();
			unlockBodyScroll();

			expect(window.scrollTo).toHaveBeenCalledWith(0, 250);
		});
	});

	describe('unlockBodyScroll', () => {
		it('should unlock body scroll and clear all styles when called', () => {
			lockBodyScroll();
			unlockBodyScroll();

			expect(document.body.style.overflow).toBe('auto');
			expect(document.body.style.position).toBe('');
			expect(document.body.style.width).toBe('');
			expect(document.body.style.height).toBe('');
		});

		it('should restore scroll position using requestAnimationFrame when called', () => {
			Object.defineProperty(window, 'scrollY', {
				writable: true,
				configurable: true,
				value: 500
			});

			lockBodyScroll();
			unlockBodyScroll();

			expect(requestAnimationFrame).toHaveBeenCalled();
			expect(window.scrollTo).toHaveBeenCalledWith(0, 500);
		});

		it('should handle multiple lock and unlock cycles with different scroll positions', () => {
			Object.defineProperty(window, 'scrollY', {
				writable: true,
				configurable: true,
				value: 100
			});

			lockBodyScroll();
			unlockBodyScroll();
			expect(window.scrollTo).toHaveBeenCalledWith(0, 100);

			Object.defineProperty(window, 'scrollY', {
				writable: true,
				configurable: true,
				value: 300
			});

			lockBodyScroll();
			unlockBodyScroll();
			expect(window.scrollTo).toHaveBeenLastCalledWith(0, 300);
		});

		it('should preserve large scroll positions correctly', () => {
			Object.defineProperty(window, 'scrollY', {
				writable: true,
				configurable: true,
				value: 9999
			});

			lockBodyScroll();
			unlockBodyScroll();

			expect(window.scrollTo).toHaveBeenCalledWith(0, 9999);
		});
	});
});

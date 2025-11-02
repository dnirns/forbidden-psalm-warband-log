import { describe, it, expect } from 'vitest';

import { isMobileUserAgent } from '$lib';

describe('deviceUtils', () => {
	describe('isMobileUserAgent', () => {
		it('should return true for mobile device user agents', () => {
			expect(isMobileUserAgent('Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36')).toBe(true);
			expect(isMobileUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe(true);
			expect(isMobileUserAgent('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe(true);
		});

		it('should return false for desktop user agents', () => {
			expect(isMobileUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false);
			expect(isMobileUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
		});

		it('should be case insensitive', () => {
			expect(isMobileUserAgent('ANDROID DEVICE')).toBe(true);
		});

		it('should return false for empty string', () => {
			expect(isMobileUserAgent('')).toBe(false);
		});
	});
});

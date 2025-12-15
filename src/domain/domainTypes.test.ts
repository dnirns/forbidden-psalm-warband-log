import { describe, it, expect } from 'vitest';

describe('domain type modules', () => {
	it('are loadable at runtime', async () => {
		const models = await import('$domain/models/types');
		const authPort = await import('$domain/ports/AuthPort');
		const repository = await import('$domain/ports/WarbandRepository');

		expect(models).toBeDefined();
		expect(authPort).toBeDefined();
		expect(repository).toBeDefined();
	});
});

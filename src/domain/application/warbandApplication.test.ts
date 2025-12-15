import { describe, it, expect, vi } from 'vitest';
import { WarbandApplicationService, createWarbandApplicationService } from './warbandApplication';
import type { WarbandRepository } from '$domain/ports';
import { defaultCharacter } from '$domain/rules';

const sampleData = {
	warbandName: 'Testers',
	characters: [defaultCharacter()],
	gold: 10,
	xp: 0
};

describe('WarbandApplicationService', () => {
	const createRepository = (): WarbandRepository => ({
		save: vi.fn().mockResolvedValue(undefined),
		load: vi.fn().mockResolvedValue(sampleData),
		subscribe: vi.fn().mockResolvedValue(() => {})
	});

	it('persists and retrieves data through the repository', async () => {
		const repository = createRepository();
		const service = new WarbandApplicationService(repository);
		const callback = vi.fn();

		await service.save(sampleData);
		const loaded = await service.load('user-1');
		const unsubscribe = await service.subscribe('user-1', callback);

		expect(repository.save).toHaveBeenCalledWith(sampleData);
		expect(loaded).toBe(sampleData);
		expect(repository.load).toHaveBeenCalledWith('user-1');
		expect(repository.subscribe).toHaveBeenCalledWith('user-1', callback);
		expect(unsubscribe).toBeTypeOf('function');
	});

	it('creates a service via the factory helper', async () => {
		const repository = createRepository();
		const service = createWarbandApplicationService(repository);

		await service.save(sampleData);
		expect(repository.save).toHaveBeenCalled();
	});
});

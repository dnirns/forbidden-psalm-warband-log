import type { WarbandRepository } from '$domain/ports';
import type { WarbandData } from '$domain/models';

export class WarbandApplicationService {
	constructor(private repository: WarbandRepository) {}

	async save(data: WarbandData) {
		await this.repository.save(data);
	}

	async load(userId: string) {
		return this.repository.load(userId);
	}

	async subscribe(userId: string, callback: (data: WarbandData) => void) {
		return this.repository.subscribe(userId, callback);
	}
}

export const createWarbandApplicationService = (repository: WarbandRepository) =>
	new WarbandApplicationService(repository);

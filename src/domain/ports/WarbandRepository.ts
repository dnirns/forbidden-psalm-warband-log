import type { WarbandData } from '$domain/models';
import type { Unsubscribe } from 'firebase/firestore';

export interface WarbandRepository {
	save(data: WarbandData): Promise<void>;
	load(userId: string): Promise<WarbandData | null>;
	subscribe(userId: string, callback: (data: WarbandData) => void): Promise<Unsubscribe>;
}

export const __warbandRepositoryRuntime = true;

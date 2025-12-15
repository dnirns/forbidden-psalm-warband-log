import { describe, it, expect, vi } from 'vitest';
import { AuthApplicationService, createAuthApplicationService } from './authApplication';
import type { AuthPort } from '$domain/ports';

describe('AuthApplicationService', () => {
	const user = { uid: 'abc123' } as unknown as NonNullable<ReturnType<AuthPort['getCurrentUser']>>;

	const createMockPort = (): AuthPort => ({
		onAuthStateChanged: vi.fn().mockReturnValue(() => {}),
		signInWithGoogle: vi.fn().mockResolvedValue(user),
		signOut: vi.fn().mockResolvedValue(),
		getCurrentUser: vi.fn().mockReturnValue(user)
	});

	it('delegates all auth operations to the provided port', async () => {
		const authPort = createMockPort();
		const service = new AuthApplicationService(authPort);
		const handler = vi.fn();

		const unsubscribe = service.onChange(handler);
		await service.signInWithGoogle();
		await service.signOut();
		const currentUser = service.getCurrentUser();

		expect(authPort.onAuthStateChanged).toHaveBeenCalledWith(handler);
		expect(unsubscribe).toBeTypeOf('function');
		expect(authPort.signInWithGoogle).toHaveBeenCalled();
		expect(authPort.signOut).toHaveBeenCalled();
		expect(currentUser).toBe(user);
	});

	it('factory helper wraps the port in a new service instance', () => {
		const authPort = createMockPort();
		const service = createAuthApplicationService(authPort);
		service.getCurrentUser();
		expect(authPort.getCurrentUser).toHaveBeenCalled();
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$app/environment', () => ({ browser: true }));

const audioConstructor = vi.fn();
class MockAudio {
	paused = true;
	currentTime = 0;
	volume = 1;
	constructor(public src: string) {
		audioConstructor(src);
	}
	pause = vi.fn(() => {
		this.paused = true;
	});
	play = vi.fn(async () => {
		this.paused = false;
	});
}

vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

describe('audioStore', () => {
	const loadStore = async () => (await import('./audioStore')).audioStore;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('initialises audio elements only once in the browser', async () => {
		const audioStore = await loadStore();

		audioStore.init();
		audioStore.init();

		const map = get(audioStore as any);
		expect(map.size).toBeGreaterThan(0);
		expect(audioConstructor).toHaveBeenCalledTimes(map.size);
	});

	it('respects browser guard when playing sounds', async () => {
		const { audioStore } = await import('./audioStore');
		audioStore.init();

		audioStore.play('coin');

		const audio = get(audioStore as any).get('coin') as MockAudio;
		expect(audio.pause).toHaveBeenCalledTimes(1);
		expect(audio.currentTime).toBe(0);
		expect(audio.play).toHaveBeenCalledTimes(1);
	});

	it('logs errors when playback fails', async () => {
		const audioStore = await loadStore();
		audioStore.init();
		const failingAudio = get(audioStore as any).get('coin') as MockAudio;
		failingAudio.play = vi.fn(() => Promise.reject(new Error('fail')));
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		audioStore.play('coin');

		await vi.waitFor(() =>
			expect(errorSpy).toHaveBeenCalledWith('Failed to play coin sound', expect.any(Error))
		);
		errorSpy.mockRestore();
	});
});

import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

type AudioEffect = {
	name: 'coin' | 'xp' | 'injury' | 'death';
	path: string;
	volume?: number;
};

const audioEffects: AudioEffect[] = [
	{ name: 'coin', path: '/sounds/coin.mp3' },
	{ name: 'xp', path: '/sounds/achievement.mp3', volume: 0.2 },
	{ name: 'injury', path: '/sounds/bone-break.mp3', volume: 0.3 },
	{ name: 'death', path: '/sounds/death-scream.mp3', volume: 0.3 }
];

export const audioStore = (() => {
	const audioElements = writable<Map<string, HTMLAudioElement>>(new Map());
	let initialized = false;

	const init = () => {
		if (!browser || initialized) return;

		const elements = new Map<string, HTMLAudioElement>();
		audioEffects.forEach((effect) => {
			const audio = new Audio(effect.path);
			if (effect.volume !== undefined) {
				audio.volume = effect.volume;
			}
			elements.set(effect.name, audio);
		});

		audioElements.set(elements);
		initialized = true;
	};

	const play = (name: AudioEffect['name']) => {
		if (!browser) return;

		const audio = get(audioElements).get(name);
		if (audio) {
			audio.pause();
			audio.currentTime = 0;
			audio.play().catch((error: Error) => {});
		}
	};

	return {
		subscribe: audioElements.subscribe,
		init,
		play
	};
})();

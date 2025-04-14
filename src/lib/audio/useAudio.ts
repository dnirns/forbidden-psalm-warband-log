import { onMount } from 'svelte';
import { audioStore } from './audioStore';

export function useAudio() {
	onMount(() => {
		audioStore.init();
	});

	return {
		play: audioStore.play
	};
}

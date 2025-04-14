<script>
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Button from '../ui/Button.svelte';

	let isVisible = false;

	onMount(() => {
		const hasSeenGDPRNotice = localStorage.getItem('gdprSeen');
		isVisible = !hasSeenGDPRNotice;
	});

	const hideBanner = () => {
		localStorage.setItem('gdprSeen', 'true');
		isVisible = false;
	};
</script>

{#if isVisible}
	<div
		transition:fade
		class="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-3 shadow-lg md:py-4"
	>
		<div
			class="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center md:flex-row md:justify-between"
		>
			<p class="text-base text-gray-700 md:flex-1 md:text-left">
				This site uses Google Sign-In for authentication. By using this site, you agree to the
				processing of your authentication data by Google. We do not collect additional personal
				data.
			</p>
			<div class="w-full md:w-auto">
				<Button variant="default" onClick={hideBanner} wide>Continue</Button>
			</div>
		</div>
	</div>
{/if}

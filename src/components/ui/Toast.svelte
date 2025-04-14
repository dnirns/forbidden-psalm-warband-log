<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { undoStore } from '$lib/stores/undoStore';
	import Button from './Button.svelte';
</script>

{#if $undoStore}
	<div
		class="fixed left-4 top-4 z-50"
		in:fly={{ x: -50, duration: 300 }}
		out:fade={{ duration: 200 }}
	>
		<div
			class="flex min-w-[300px] items-center justify-between gap-4 rounded-lg bg-purple-600 px-4 py-3 text-white shadow-lg"
		>
			<p
				class="text-lg font-bold tracking-wide text-white [text-shadow:_1px_1px_0_rgb(0_0_0_/_40%)]"
			>
				{$undoStore.description}
			</p>
			<Button
				variant="secondary"
				onClick={async () => {
					try {
						await undoStore.undo();
					} catch (error) {
						alert('Failed to undo. Please try again.');
					}
				}}
			>
				Undo
			</Button>
		</div>
	</div>
{/if}

<style>
	:global(.toast-button) {
		background-color: rgba(255, 255, 255, 0.2) !important;
		color: white !important;
		transition: all 0.2s ease-in-out !important;
	}

	:global(.toast-button:hover) {
		background-color: rgba(255, 255, 255, 0.3) !important;
		transform: scale(1.05);
	}
</style>

<script lang="ts">
	import { scale } from 'svelte/transition';
	import { lockBodyScroll, unlockBodyScroll } from '$lib/utils/modalUtils';
	import CloseButton from '../ui/CloseButton.svelte';
	import Button from '../ui/Button.svelte';
	import { onMount } from 'svelte';

	export let onClose: () => void;
	export let onRefund: () => void;
	export let onDrop: () => void;
	export let itemName: string;
	export let refundAmount: number | undefined = undefined;

	onMount(() => {
		lockBodyScroll();
		return () => {
			unlockBodyScroll();
		};
	});

	const handleModalBackgroundClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onClose();
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[6px]"
	on:click={handleModalBackgroundClick}
	on:keydown={handleKeydown}
	role="presentation"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		open
		transition:scale
		class="relative w-[95vw] max-w-md overflow-y-auto border-2 border-white/30 bg-white p-6 text-black shadow sm:w-full"
		aria-labelledby="modal-title"
		aria-modal="true"
		on:click|stopPropagation={() => {}}
	>
		<CloseButton onClick={onClose} />
		<h2 id="modal-title" class="jacquard-24-regular mb-6 text-2xl font-bold text-black">
			Item Action
		</h2>

		<p class="lora mb-8 text-xl text-gray-700">
			What would you like to do with <span class="font-semibold">{itemName}</span>?
		</p>

		<div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
			{#if refundAmount !== undefined}
				<Button variant="secondary" onClick={onRefund} wide>Refund ({refundAmount} Gold)</Button>
			{/if}
			<Button variant="danger" onClick={onDrop} wide>Drop Item</Button>
			<Button variant="default" onClick={onClose} wide>Cancel</Button>
		</div>
	</dialog>
</div>

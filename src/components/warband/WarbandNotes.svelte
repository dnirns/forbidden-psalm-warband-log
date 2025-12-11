<script lang="ts">
	import type { WarbandData } from '$lib/types';
	import { onMount } from 'svelte';
	import { lockBodyScroll, unlockBodyScroll } from '$lib/utils/modalUtils';
	import CloseButton from '../ui/CloseButton.svelte';
	import { warbandStore } from '$lib/stores/warbandStore';

	export let warbandData: WarbandData;

	let showNotes = false;
	let tempNotes = '';
	let notesTextarea: HTMLTextAreaElement;
	let hasChanges = false;
	let errorMessage = '';

	const closeAndSave = async () => {
		if (hasChanges) {
			await saveNotes();
		}
		showNotes = false;
		unlockBodyScroll();
	};

	const toggleNotes = () => {
		if (!showNotes) {
			showNotes = true;
			tempNotes = warbandData.notes || '';
			hasChanges = false;
			setTimeout(() => {
				notesTextarea?.focus();
			}, 0);
			lockBodyScroll();
		} else {
			closeAndSave();
		}
	};

	const handleNotesChange = () => {
		hasChanges = tempNotes !== warbandData.notes;
	};

	const saveNotes = async () => {
		try {
			await warbandStore.updateWarband({ notes: tempNotes });
			warbandData.notes = tempNotes;
			errorMessage = '';
			showNotes = false;
			unlockBodyScroll();
		} catch (error) {
			console.error('Failed to save notes', error);
			errorMessage = 'Failed to save notes. Please try again.';
		}
	};

	const handleModalBackgroundClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			unlockBodyScroll();
			showNotes = false;
		}
	};

	$: if (showNotes) {
		lockBodyScroll();
	}

	onMount(() => {
		return () => {
			unlockBodyScroll();
		};
	});
</script>

<div class="relative">
	<button
		type="button"
		class="notes-button flex items-center gap-2 rounded p-2 text-purple-500 hover:text-purple-400"
		on:click={toggleNotes}
	>
		<span class="text-lg">Notes</span>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-8 w-8"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path
				d="M17 4H7C5.89543 4 5 4.89543 5 6V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V6C19 4.89543 18.1046 4 17 4Z"
				fill="currentColor"
				fill-opacity="0.1"
				stroke="none"
			/>

			<path
				d="M17 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3Z"
				stroke-width="1.5"
			/>
			<path
				d="M7 3.5C6 3.5 5.5 4 5.5 5L5.5 19C5.5 20 6 20.5 7 20.5H17C18 20.5 18.5 20 18.5 19V5C18.5 4 18 3.5 17 3.5"
				stroke="currentColor"
				stroke-opacity="0.3"
				fill="none"
			/>

			<path d="M8 3C8 2 8.5 1.5 9 2C11 3 13 3 15 2C15.5 1.5 16 2 16 3" stroke-width="1.5" />
			<path
				d="M8.5 3C8.5 2.2 9 1.7 9.5 2.2C11.5 3.2 13.5 3.2 15.5 2.2C16 1.7 15.5 2.2 15.5 3"
				stroke="currentColor"
				stroke-opacity="0.3"
				fill="none"
			/>

			<path
				d="M8 21C8 22 8.5 22.5 9 22C11 21 13 21 15 22C15.5 22.5 16 22 16 21"
				stroke-width="1.5"
			/>
			<path
				d="M8.5 21C8.5 21.8 9 22.3 9.5 21.8C11.5 20.8 13.5 20.8 15.5 21.8C16 22.3 15.5 21.8 15.5 21"
				stroke="currentColor"
				stroke-opacity="0.3"
				fill="none"
			/>

			<path d="M5 7C4 7 3.5 7.5 4 8C4.5 9 4.5 10 4 11C3.5 11.5 4 12 5 12" stroke-width="1.5" />
			<path
				d="M19 7C20 7 20.5 7.5 20 8C19.5 9 19.5 10 20 11C20.5 11.5 20 12 19 12"
				stroke-width="1.5"
			/>

			<line x1="8" y1="9" x2="16" y2="9" stroke-width="1.5" />
			<line x1="8" y1="13" x2="16" y2="13" stroke-width="1.5" />
			<line x1="8" y1="17" x2="12" y2="17" stroke-width="1.5" />

			<line x1="8" y1="8.7" x2="16" y2="8.7" stroke="currentColor" stroke-opacity="0.3" />
			<line x1="8" y1="12.7" x2="16" y2="12.7" stroke="currentColor" stroke-opacity="0.3" />
			<line x1="8" y1="16.7" x2="12" y2="16.7" stroke="currentColor" stroke-opacity="0.3" />

			<circle cx="7.5" cy="9" r="0.5" fill="currentColor" />
			<circle cx="16.5" cy="9" r="0.5" fill="currentColor" />
			<circle cx="7.5" cy="13" r="0.5" fill="currentColor" />
			<circle cx="16.5" cy="13" r="0.5" fill="currentColor" />
			<circle cx="7.5" cy="17" r="0.5" fill="currentColor" />
			<circle cx="12.5" cy="17" r="0.5" fill="currentColor" />

			<circle cx="7.7" cy="9.2" r="0.3" fill="currentColor" fill-opacity="0.3" />
			<circle cx="16.7" cy="9.2" r="0.3" fill="currentColor" fill-opacity="0.3" />
			<circle cx="7.7" cy="13.2" r="0.3" fill="currentColor" fill-opacity="0.3" />
			<circle cx="16.7" cy="13.2" r="0.3" fill="currentColor" fill-opacity="0.3" />
			<circle cx="7.7" cy="17.2" r="0.3" fill="currentColor" fill-opacity="0.3" />
			<circle cx="12.7" cy="17.2" r="0.3" fill="currentColor" fill-opacity="0.3" />
		</svg>
	</button>

	{#if showNotes}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[6px]"
			on:click={handleModalBackgroundClick}
			role="presentation"
		>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<dialog
				open
				class="relative h-[90vh] w-[95vw] overflow-auto border-2 border-white/30 bg-white p-4 pr-6 text-black shadow sm:h-[85vh] sm:w-[85vw] md:w-[75vw] lg:w-[65vw] xl:w-[55vw] 2xl:w-[45vw]"
				aria-labelledby="modal-title"
				aria-modal="true"
				on:click|stopPropagation={() => {}}
			>
				<CloseButton onClick={closeAndSave} />
				<h2 id="modal-title" class="mb-4 text-2xl font-bold">Warband Notes</h2>
				{#if errorMessage}
					<p class="text-sm text-red-700">{errorMessage}</p>
				{/if}
				<div class="flex h-[calc(100%-6rem)] flex-col space-y-4">
					<!-- svelte-ignore element_invalid_self_closing_tag -->
					<textarea
						bind:this={notesTextarea}
						bind:value={tempNotes}
						on:input={handleNotesChange}
						class="lora flex-1 resize-none rounded border border-gray-300 bg-white px-3 py-2 text-lg text-black focus:outline-none focus:ring-2 focus:ring-black"
						rows="4"
						placeholder="Add notes here..."
					/>
					<button
						type="button"
						class="mb-1 rounded px-4 py-2 text-lg hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-black {hasChanges
							? 'bg-purple-500 text-white hover:bg-purple-600'
							: 'bg-gray-300 hover:bg-gray-400'}"
						on:click={saveNotes}
					>
						Save Notes
					</button>
				</div>
			</dialog>
		</div>
	{/if}
</div>

<style>
	.fixed {
		transition: all 0.2s ease-in-out;
	}
</style>

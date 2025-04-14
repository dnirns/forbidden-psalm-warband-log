<script lang="ts">
	import type { WarbandData } from '$lib/types';
	import Button from '../ui/Button.svelte';
	import WarbandNotes from './WarbandNotes.svelte';
	import { warbandStore } from '$lib/stores/warbandStore';
	import NumberControl from '../ui/NumberControl.svelte';
	import EditableWarbandName from './EditableWarbandName.svelte';

	export let handleSignOut: () => void;
	export let warbandData: WarbandData;

	const updateWarbandProperty = async (property: keyof WarbandData, value: number) => {
		await warbandStore.updateWarband({ [property]: value });
	};
</script>

<div class="relative mb-8">
	<div class="absolute right-0 top-0 flex h-12 items-center px-2">
		<Button variant="danger" onClick={handleSignOut} size="medium">Sign Out</Button>
	</div>

	<div class="flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:gap-6">
		<EditableWarbandName warbandName={warbandData.warbandName} />

		<div class="flex flex-wrap items-center gap-4 sm:flex-nowrap">
			<NumberControl
				label="Gold"
				value={warbandData.gold}
				onUpdate={(value) => updateWarbandProperty('gold', value)}
			/>

			<NumberControl
				label="XP"
				value={warbandData.xp}
				onUpdate={(value) => updateWarbandProperty('xp', value)}
			/>

			<WarbandNotes {warbandData} />
		</div>
	</div>
</div>

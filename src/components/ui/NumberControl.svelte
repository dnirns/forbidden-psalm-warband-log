<script lang="ts">
	import Button from './Button.svelte';

	export let value: number;
	export let label: string;
	export let onUpdate: (newValue: number) => Promise<void>;
	export let minValue = 0;
	export let maxValue = Infinity;
	export let step = 1;
	export let disabled = false;

	const handleIncrement = async () => {
		if (value + step <= maxValue) {
			try {
				await onUpdate(value + step);
			} catch (error) {
				alert(`Failed to increment ${label}. Please try again.`);
			}
		}
	};

	const handleDecrement = async () => {
		if (value - step >= minValue) {
			try {
				await onUpdate(value - step);
			} catch (error) {
				alert(`Failed to decrement ${label}. Please try again.`);
			}
		}
	};
</script>

<div class="flex items-center gap-2">
	{#if label}
		<span class="lora min-w-[3rem] text-xl font-extrabold sm:text-2xl">{label}:</span>
	{/if}
	<div class="flex items-center gap-1">
		{#if !disabled}
			<Button
				variant="default"
				size="compact"
				onClick={handleDecrement}
				disabled={value <= minValue}
				ariaLabel="Decrease {label}"
			>
				-
			</Button>
		{/if}
		<span class="lora min-w-[1.5rem] text-center text-xl font-extrabold sm:text-2xl">{value}</span>
		{#if !disabled}
			<Button
				variant="default"
				size="compact"
				onClick={handleIncrement}
				disabled={value >= maxValue}
				ariaLabel="Increase {label}"
			>
				+
			</Button>
		{/if}
	</div>
</div>

<script lang="ts">
	import '../app.css';
	import Toast from '../components/ui/Toast.svelte';
	let { children } = $props();
</script>

<div class="jacquard-24-regular text-large min-h-screen bg-stone-800 p-4 text-3xl text-white">
	<div class="flex items-center justify-center">
		<img
			src="images/forbidden-psalm-logo.avif"
			alt="Forbidden Psalm Logo"
			class="mx-auto h-[100px]"
		/>
	</div>
	{@render children()}
	<Toast />
</div>

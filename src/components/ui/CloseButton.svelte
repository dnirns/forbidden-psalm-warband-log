<script lang="ts">
	export let onClick: () => void;
</script>

<button
	class="absolute right-2 top-2 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-white text-2xl text-black shadow-lg hover:cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black sm:right-2 sm:top-2 sm:h-10 sm:w-10 sm:text-2xl"
	on:click={onClick}
	aria-label="Close modal"
>
	&times;
</button>

<script lang="ts">
	export let onClick: () => void;
	export let variant: 'default' | 'danger' | 'secondary' = 'default';
	export let type: 'button' | 'submit' = 'button';
	export let size: 'default' | 'medium' | 'wide' | 'compact' | 'large' | 'extra-wide' = 'default';
	export let wide = false;
	export let disabled = false;
	export let ariaLabel: string | undefined = undefined;
	export let useLora = false;
	export let textSize: 'default' | 'small' = 'default';
	export let className = '';

	const SIZE_CLASSES = {
		large: 'h-12 w-full text-lg',
		'extra-wide': 'h-8 w-44',
		wide: 'h-8 w-36',
		medium: 'h-8 w-24',
		compact: 'h-6 px-2 text-sm sm:text-xs',
		default: 'h-8 w-16'
	};

	const VARIANT_CLASSES = {
		danger: 'bg-red-300 text-black hover:bg-red-400 focus:ring-red-400',
		secondary: 'bg-purple-500 text-white hover:bg-purple-600 focus:ring-purple-400',
		default: 'bg-gray-700 text-white hover:bg-purple-500 focus:ring-purple-400'
	};

	const BASE_CLASSES =
		'rounded px-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ' +
		'focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
		'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';

	$: fontClass = size === 'compact' || useLora ? 'lora font-bold' : 'jacquard-24-regular';
	$: sizeClass = wide && size === 'default' ? SIZE_CLASSES.wide : SIZE_CLASSES[size];
	$: textSizeClass = textSize === 'small' ? 'text-sm' : 'text-base';
	$: classes = `${fontClass} ${sizeClass} ${textSizeClass} ${VARIANT_CLASSES[variant]} ${BASE_CLASSES} ${className}`;
</script>

<button {type} {disabled} aria-label={ariaLabel} class={classes} on:click={onClick}>
	<slot />
</button>

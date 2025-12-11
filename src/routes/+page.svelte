<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { User } from 'firebase/auth';
	import { defaultCharacter, calculateModifiedStats } from '$domain/rules';
	import { items, feats, flaws } from '$lib';

	import { firebaseAuthAdapter, signInWithGoogleService, signOutService } from '$infrastructure/firebase';
	import { createAuthApplicationService } from '$domain/application';

	import CharacterCard from '../components/character/CharacterCard.svelte';
	import { type Character } from '$lib/types';
	import Button from '../components/ui/Button.svelte';
	import GoogleIcon from '../components/icons/GoogleIcon.svelte';

	import CharacterModal from '../components/modals/CharacterModal.svelte';
	import GDPR from '../components/misc/GDPR.svelte';
	import { warbandStore } from '$lib/stores/warbandStore';
	import Header from '../components/warband/Header.svelte';

	let currentUser: User | null = null;
	let loading = true;

	let selectedIndex: number = -1;

	let currentCharacter: Character = defaultCharacter();

	let unsubscribeFirestore: (() => void) | undefined;
	const authService = createAuthApplicationService(firebaseAuthAdapter);

	$: ({ data: warbandData, selectedIndex, currentCharacter } = $warbandStore);

	$: baseHP = 8 + currentCharacter.toughness;
	$: modifiedStats = calculateModifiedStats(currentCharacter, feats, flaws, items);

	$: {
		const maxHP = baseHP + modifiedStats.hp;
		if (selectedIndex === -1) {
			currentCharacter.hp = maxHP;
		} else {
			if (currentCharacter.hp > maxHP) {
				currentCharacter.hp = maxHP;
			}
		}
	}

	onMount(() => {
		if (browser) {
			const unsubscribeAuth = authService.onChange(async (user) => {
				currentUser = user;
				loading = true;

				if (user) {
					try {
						unsubscribeFirestore = await warbandStore.listenToRemote(user.uid);
						await warbandStore.load(user.uid);
					} catch (error) {
						console.error('Error loading user data:', error);
					}
				} else {
					if (unsubscribeFirestore) {
						unsubscribeFirestore();
						unsubscribeFirestore = undefined;
					}
					warbandStore.reset();
				}
				loading = false;
			});

			return () => {
				unsubscribeAuth();
				if (unsubscribeFirestore) {
					unsubscribeFirestore();
				}
			};
		}
	});

	const handleSignInWithGoogle = async () => {
		try {
			const result = await authService.signInWithGoogle();
			currentUser = result as User | null;
			if (currentUser) {
				await warbandStore.load(currentUser.uid);
			}
		} catch (error) {
			console.error('Error signing in with Google:', error);
		}
	};

	const handleSignOut = async () => {
		try {
			await authService.signOut();
			currentUser = null;
			warbandStore.reset();
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};
</script>

<div class="space-y-6 overflow-x-hidden text-2xl">
	{#if loading}
		<div class="flex h-screen items-center justify-center">
			<p class="text-xl">Loading...</p>
		</div>
	{:else if currentUser}
		<Header {handleSignOut} {warbandData} />

		<!-- Characters section -->
		<h2 class="mb-4 text-3xl font-bold underline">Warband Characters</h2>
		{#if warbandData.characters.length > 0}
			<div
				class="relative mx-auto grid max-w-[1600px] grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
			>
				{#each warbandData.characters as char, i}
					<div
						class="overflow-hidden border-2 border-white/30 bg-gray-900/40 shadow-lg shadow-black/50"
						style="aspect-ratio: 4/5;"
					>
						<CharacterCard
							editCharacter={(i: number) => warbandStore.editCharacter(i)}
							deleteCharacter={(i: number) => warbandStore.deleteCharacter(i)}
							{items}
							{char}
							{i}
						/>
					</div>
				{/each}
			</div>
		{:else}
			<p>No characters saved yet.</p>
		{/if}

		<!-- Add character button -->
		<div class="space-x-2">
			<Button onClick={() => warbandStore.addCharacter()} wide>Add Character</Button>
		</div>
	{:else}
		<!-- Sign in with Google -->
		<div class="flex flex-col items-center justify-center">
			<h1 class="mb-4 text-2xl">Welcome to Forbidden Psalm Warband Builder</h1>
			<Button
				variant="default"
				onClick={handleSignInWithGoogle}
				size="extra-wide"
				className="w-auto min-w-[240px] px-4"
			>
				<div class="flex items-center justify-center gap-3">
					<GoogleIcon />
					<span>Sign in with Google</span>
				</div>
			</Button>
		</div>
	{/if}
</div>
<CharacterModal />
<GDPR />

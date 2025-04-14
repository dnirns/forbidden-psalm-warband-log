<script lang="ts">
	import type { Character, FeatOrFlaw, WarbandData, Item } from '$lib/types';
	import { feats } from '$lib/data/feats';
	import { flaws } from '$lib/data/flaws';
	import { calculateTotalArmour, calculateModifiedStats } from '$lib/utils';
	import Button from '../ui/Button.svelte';
	import InvertedCrossSVG from '../icons/InvertedCrossSVG.svelte';
	import { saveToFirestore } from '$lib/firebase';
	import { getAuth } from 'firebase/auth';
	import { undoStore } from '$lib/stores/undoStore';
	import { onMount } from 'svelte';
	import scrolls from '$lib/data/scrolls';
	import { lockBodyScroll, unlockBodyScroll } from '$lib/utils/modalUtils';
	import Skull from '../icons/Skull.svelte';
	import PickUpItemModal from '../modals/PickUpItemModal.svelte';
	import { injuries } from '$lib/data/injuries';
	import InjuryModal from '../modals/InjuryModal.svelte';
	import { isItemRestrictedForSpellcaster } from '$lib/utils/characterUtils';
	import { useAudio } from '$lib/audio';
	import DeleteCharacterModal from '../modals/DeleteCharacterModal.svelte';

	export let char: Character;
	export let i: number;
	export let editCharacter: (index: number) => void;
	export let deleteCharacter: (index: number) => void;
	export let items: Item[];
	export let warbandData: WarbandData;

	let showPickUpModal = false;
	let showInjuryModal = false;
	let showDeleteModal = false;
	let selectedSlotIndex: number | null = null;

	const { play } = useAudio();

	const openPickUpModal = (slotIndex: number) => {
		selectedSlotIndex = slotIndex;
		showPickUpModal = true;
		lockBodyScroll();
	};

	const closePickUpModal = () => {
		showPickUpModal = false;
		selectedSlotIndex = null;
		unlockBodyScroll();
	};

	const openInjuryModal = () => {
		showInjuryModal = true;
		lockBodyScroll();
	};

	const closeInjuryModal = () => {
		showInjuryModal = false;
		unlockBodyScroll();
	};

	const openScrollPickUpModal = (slotIndex: number) => {
		selectedSlotIndex = slotIndex;
		showPickUpModal = true;
		lockBodyScroll();
	};

	const pickUpItem = async (itemName: string) => {
		if (selectedSlotIndex === null) return;

		const previousState = { ...char };

		if (!char.items) {
			char.items = Array(char.inventory).fill('');
		} else if (char.items.length < char.inventory) {
			char.items = [...char.items, ...Array(char.inventory - char.items.length).fill('')];
		}

		const isCleanScroll = scrolls.cleanScrolls.some((scroll) => scroll.name === itemName);
		const isUncleanScroll = scrolls.uncleanScrolls.some((scroll) => scroll.name === itemName);

		if (char.isSpellcaster && selectedSlotIndex < 2) {
			if (selectedSlotIndex === 0) {
				if (!isCleanScroll) {
					alert(
						isUncleanScroll
							? 'Only clean scrolls can be placed in the clean scroll slot'
							: 'Only scrolls can be placed in scroll slots'
					);
					return;
				}
			} else if (selectedSlotIndex === 1) {
				if (!isUncleanScroll) {
					alert(
						isCleanScroll
							? 'Only unclean scrolls can be placed in the unclean scroll slot'
							: 'Only scrolls can be placed in scroll slots'
					);
					return;
				}
			}

			if (isCleanScroll) {
				char.cleanScroll = itemName;
				char.items[0] = itemName;
			} else {
				char.uncleanScroll = itemName;
				char.items[1] = itemName;
			}
		} else {
			char.items[selectedSlotIndex] = itemName;
		}

		if (!char.pickedUpItems) {
			char.pickedUpItems = [];
		}
		if (!char.pickedUpItems.includes(itemName)) {
			char.pickedUpItems.push(itemName);
		}

		if (itemUsesAmmo(itemName)) {
			char.ammoTrackers.push({
				weaponName: itemName,
				slotIndex: selectedSlotIndex,
				currentAmmo: getInitialAmmo(itemName)
			});
		}

		const itemObj = items.find((i) => i.item === itemName);
		if (itemObj?.extraInventorySlots) {
			char.inventory += itemObj.extraInventorySlots;
			char.items = [...char.items, ...Array(itemObj.extraInventorySlots).fill('')];
		}

		const updatedCharacters = [...warbandData.characters];
		updatedCharacters[i] = char;
		warbandData.characters = updatedCharacters;

		try {
			const auth = getAuth();
			await saveToFirestore(auth.currentUser, warbandData);

			undoStore.setUndoAction({
				characterIndex: i,
				previousState,
				warbandData: { ...warbandData },
				description: `Picked up ${itemName}`
			});

			closePickUpModal();
		} catch (error) {
			alert('Failed to pick up item. Please try again.');
		}
	};

	const takeDamage = async () => {
		if (char.hp > 0) {
			const previousState = { ...char };

			char.hp--;

			if (char.hp <= 0) {
				play('death');
			} else {
				play('injury');
			}

			const updatedCharacters = [...warbandData.characters];
			updatedCharacters[i] = char;
			warbandData.characters = updatedCharacters;

			try {
				const auth = getAuth();
				await saveToFirestore(auth.currentUser, warbandData);

				undoStore.setUndoAction({
					characterIndex: i,
					previousState,
					warbandData: { ...warbandData },
					description: `Took 1 damage (${char.name})`
				});
			} catch (error) {
				alert('Failed to save HP change. Please try again.');
			}
		}
	};

	$: totalArmour = calculateTotalArmour(char.items, items);
	$: modifiedStats = calculateModifiedStats(char, feats, flaws, items);
	$: baseHP = 8 + char.toughness;
	$: movement = 5 + modifiedStats.agility;
	$: baseInventory = 5 + char.strength;
	$: maxHP = baseHP + modifiedStats.hp;

	$: if (char.hp > maxHP) {
		const updatedChar = { ...char };
		updatedChar.hp = maxHP;

		const updatedCharacters = [...warbandData.characters];
		updatedCharacters[i] = updatedChar;
		warbandData.characters = updatedCharacters;

		const auth = getAuth();
		saveToFirestore(auth.currentUser, warbandData).catch((error) => {
			alert('Failed to save HP change. Please try again.');
		});
	}

	type ModifierObject = FeatOrFlaw & { statModifiers: { [key: string]: number } };
	type StatModifierKey =
		| 'agility'
		| 'presence'
		| 'strength'
		| 'toughness'
		| 'hp'
		| 'equipmentSlots'
		| 'maxRange'
		| 'armour';

	const getStatModifiersExplanation = (stat: StatModifierKey) => {
		const affectingFeats = char.feats
			.map((featName) => feats.find((f) => f.name === featName))
			.filter(
				(feat): feat is ModifierObject =>
					feat !== undefined &&
					feat.statModifiers !== undefined &&
					typeof feat.statModifiers[stat] === 'number'
			)
			.map((feat) => {
				const modifier = feat.statModifiers[stat];
				if (modifier === undefined || typeof modifier !== 'number') return '';
				return `<span class="${modifier > 0 ? 'text-green-600' : 'text-red-500'}">${feat.name} (${modifier > 0 ? '+' : ''}${modifier})</span>`;
			});

		const affectingFlaws = char.flaws
			.map((flawName) => flaws.find((f) => f.name === flawName))
			.filter(
				(flaw): flaw is ModifierObject =>
					flaw !== undefined &&
					flaw.statModifiers !== undefined &&
					typeof flaw.statModifiers[stat] === 'number'
			)
			.map((flaw) => {
				const modifier = flaw.statModifiers[stat];
				if (modifier === undefined || typeof modifier !== 'number') return '';
				return `<span class="${modifier > 0 ? 'text-green-600' : 'text-red-500'}">${flaw.name} (${modifier > 0 ? '+' : ''}${modifier})</span>`;
			});

		const affectingInjuries = char.injuries
			.map((injuryName) => injuries.find((i) => i.name === injuryName))
			.filter((injury) => injury?.statModifiers && typeof injury.statModifiers[stat] === 'number')
			.map((injury) => {
				const modifier = injury?.statModifiers[stat];
				if (modifier === undefined || typeof modifier !== 'number') return '';
				return `<span class="${modifier > 0 ? 'text-green-600' : 'text-red-500'}">${injury?.name} (${modifier > 0 ? '+' : ''}${modifier})</span>`;
			});

		const allModifiers = [...affectingFeats, ...affectingFlaws, ...affectingInjuries].filter(
			Boolean
		);
		return allModifiers.length > 0 ? allModifiers.join('\n') : 'No modifiers';
	};

	let tooltipPosition = { x: 0, y: 0, show: false };
	let activeContent = '';

	const showTooltip = (event: MouseEvent | TouchEvent, content: string) => {
		event.preventDefault();
		const target = (event.target as HTMLElement) || (event.currentTarget as HTMLElement);
		const rect = target?.getBoundingClientRect() || { left: 0, top: 0 };
		const x = rect.left;
		const y = rect.top - 10;

		tooltipPosition = { x, y, show: true };
		if (content.includes('(Disabled by')) {
			const [description, disabledReason] = content.split('\n');
			activeContent = description ? description + '\n' : '';
			activeContent += `<span class="disabled-reason">${disabledReason}</span>`;
		} else {
			activeContent = content;
		}
	};

	const hideTooltip = () => {
		tooltipPosition.show = false;
	};

	const handleTooltipTrigger = (
		event: MouseEvent | TouchEvent | KeyboardEvent,
		content: string
	) => {
		if (event.type === 'touchstart') {
			showTooltip(event as TouchEvent, content);
		} else if (event.type === 'keydown') {
			const keyEvent = event as KeyboardEvent;
			if (keyEvent.key === 'Enter') {
				showTooltip(new MouseEvent('click'), content);
			}
		}
	};

	const dropItem = async (itemName: string) => {
		const previousState = { ...char };

		const itemIndex = char.items.findIndex((item) => item === itemName);
		if (itemIndex !== -1) {
			const isCleanScroll = scrolls.cleanScrolls.some((scroll) => scroll.name === itemName);
			const isUncleanScroll = scrolls.uncleanScrolls.some((scroll) => scroll.name === itemName);

			if (char.isSpellcaster && (isCleanScroll || isUncleanScroll) && itemIndex < 2) {
				if (isCleanScroll) {
					char.cleanScroll = '';
					char.items[0] = '[Clean Scroll Slot]';
				} else {
					char.uncleanScroll = '';
					char.items[1] = '[Unclean Scroll Slot]';
				}
			} else {
				const itemObj = items.find((i) => i.item === itemName);
				if (itemObj?.extraInventorySlots) {
					char.inventory = Math.max(char.inventory - itemObj.extraInventorySlots, 2);
					char.items = char.items.slice(0, char.inventory);
				}

				char.items = char.items.map((item, i) => (i === itemIndex ? '' : item));
			}

			if (char.pickedUpItems) {
				char.pickedUpItems = char.pickedUpItems.filter((item) => item !== itemName);
			}

			if (itemUsesAmmo(itemName)) {
				char.ammoTrackers = char.ammoTrackers.filter((t) => t.weaponName !== itemName);
			}

			const updatedCharacters = [...warbandData.characters];
			updatedCharacters[i] = char;
			warbandData.characters = updatedCharacters;

			try {
				const auth = getAuth();
				await saveToFirestore(auth.currentUser, warbandData);

				undoStore.setUndoAction({
					characterIndex: i,
					previousState,
					warbandData: { ...warbandData },
					description: `Dropped ${itemName}`
				});
			} catch (error) {
				alert('Failed to drop item. Please try again.');
			}
		}
	};

	const itemUsesAmmo = (itemName: string) => {
		const item = items.find((i) => i.item === itemName);
		return item && item.ammo !== undefined;
	};

	const getInitialAmmo = (itemName: string) => {
		const item = items.find((i) => i.item === itemName);
		return item?.ammo || 0;
	};

	const isAmmoOnlyItem = (itemName: string) => {
		const item = items.find((i) => i.item === itemName);
		return item && item.item === 'Ammo';
	};

	const useAmmo = async (weaponName: string, slotIndex: number) => {
		const tracker = char.ammoTrackers.find(
			(t) => t.weaponName === weaponName && t.slotIndex === slotIndex
		);
		if (tracker && tracker.currentAmmo > 0) {
			const previousState = {
				...char,
				ammoTrackers: char.ammoTrackers.map((t) => ({ ...t })),
				items: [...char.items],
				feats: [...char.feats],
				flaws: [...char.flaws],
				pickedUpItems: [...(char.pickedUpItems || [])]
			};

			const isLastAmmo = tracker.currentAmmo === 1;
			const isPureAmmo = isAmmoOnlyItem(weaponName);

			if (isLastAmmo && isPureAmmo) {
				char.items = char.items.map((item, i) => (i === slotIndex ? '' : item));
				char.pickedUpItems = (char.pickedUpItems || []).filter((item) => item !== weaponName);
				char.ammoTrackers = char.ammoTrackers.filter(
					(t) => !(t.weaponName === weaponName && t.slotIndex === slotIndex)
				);
			}

			tracker.currentAmmo--;

			const updatedCharacters = [...warbandData.characters];
			updatedCharacters[i] = char;
			warbandData.characters = updatedCharacters;

			try {
				const auth = getAuth();
				await saveToFirestore(auth.currentUser, warbandData);

				undoStore.setUndoAction({
					characterIndex: i,
					previousState,
					warbandData: { ...warbandData },
					description: `Used ammo for ${weaponName}`
				});
			} catch (error) {
				alert('Failed to save ammo change. Please try again.');
			}
		}
	};

	const refillAmmo = async (weaponName: string, slotIndex: number) => {
		const tracker = char.ammoTrackers.find(
			(t) => t.weaponName === weaponName && t.slotIndex === slotIndex
		);
		if (tracker && tracker.currentAmmo === 0) {
			const previousState = {
				...char,
				ammoTrackers: char.ammoTrackers.map((t) => ({ ...t })),
				items: [...char.items],
				feats: [...char.feats],
				flaws: [...char.flaws],
				pickedUpItems: [...(char.pickedUpItems || [])]
			};

			tracker.currentAmmo = getInitialAmmo(weaponName);

			const updatedCharacters = [...warbandData.characters];
			updatedCharacters[i] = char;
			warbandData.characters = updatedCharacters;

			try {
				const auth = getAuth();
				await saveToFirestore(auth.currentUser, warbandData);

				undoStore.setUndoAction({
					characterIndex: i,
					previousState,
					warbandData: { ...warbandData },
					description: `Refilled ammo for ${weaponName}`
				});
			} catch (error) {
				alert('Failed to refill ammo. Please try again.');
			}
		}
	};

	const reviveCharacter = async () => {
		const previousState = { ...char };

		char.hp = 1;

		const updatedCharacters = [...warbandData.characters];
		updatedCharacters[i] = char;
		warbandData.characters = updatedCharacters;

		try {
			const auth = getAuth();
			await saveToFirestore(auth.currentUser, warbandData);

			undoStore.setUndoAction({
				characterIndex: i,
				previousState,
				warbandData: { ...warbandData },
				description: `Revived ${char.name}`
			});
		} catch (error) {
			alert('Failed to revive character. Please try again.');
		}
	};

	const addInjury = async (injuryName: string) => {
		const previousState = { ...char };

		const newChar = { ...char };

		if (!newChar.injuries) {
			newChar.injuries = [];
		}

		if (!newChar.injuries.includes(injuryName)) {
			const injuryObj = injuries.find((i) => i.name === injuryName);
			if (injuryObj?.statModifiers?.extraInventorySlots) {
				newChar.inventory += injuryObj.statModifiers.extraInventorySlots;
				newChar.inventory = Math.max(2, newChar.inventory);

				if (newChar.items.length > newChar.inventory) {
					newChar.items = newChar.items.slice(0, newChar.inventory);
				} else if (newChar.items.length < newChar.inventory) {
					newChar.items = [
						...newChar.items,
						...Array(newChar.inventory - newChar.items.length).fill('')
					];
				}
			}

			newChar.injuries = [...newChar.injuries, injuryName];

			const updatedCharacters = [...warbandData.characters];
			updatedCharacters[i] = newChar;
			warbandData.characters = updatedCharacters;

			try {
				const auth = getAuth();
				await saveToFirestore(auth.currentUser, warbandData);

				undoStore.setUndoAction({
					characterIndex: i,
					previousState,
					warbandData: { ...warbandData },
					description: `Added injury: ${injuryName}`
				});
			} catch (error) {
				alert('Failed to add injury. Please try again.');
			}
		}
	};

	const removeInjury = async (injuryName: string) => {
		const previousState = { ...char };

		const newChar = { ...char };

		const injuryObj = injuries.find((i) => i.name === injuryName);
		if (injuryObj?.statModifiers?.extraInventorySlots) {
			newChar.inventory -= injuryObj.statModifiers.extraInventorySlots;
			newChar.inventory = Math.max(2, newChar.inventory);

			if (newChar.items.length > newChar.inventory) {
				newChar.items = newChar.items.slice(0, newChar.inventory);
			} else if (newChar.items.length < newChar.inventory) {
				newChar.items = [
					...newChar.items,
					...Array(newChar.inventory - newChar.items.length).fill('')
				];
			}
		}

		newChar.injuries = newChar.injuries.filter((injury) => injury !== injuryName);

		const updatedCharacters = [...warbandData.characters];
		updatedCharacters[i] = newChar;
		warbandData.characters = updatedCharacters;

		try {
			const auth = getAuth();
			await saveToFirestore(auth.currentUser, warbandData);

			undoStore.setUndoAction({
				characterIndex: i,
				previousState,
				warbandData: { ...warbandData },
				description: `Removed injury: ${injuryName}`
			});
		} catch (error) {
			alert('Failed to remove injury. Please try again.');
		}
	};

	const isItemDisabled = (itemName: string) => {
		const item = items.find((i) => i.item === itemName);
		if (!item) return false;
		return (
			(item.twoHanded && modifiedStats.weaponRestrictions === 'one-handed') ||
			(char.isSpellcaster && isItemRestrictedForSpellcaster(itemName))
		);
	};

	const getDisablingReason = (itemName: string) => {
		const item = items.find((i) => i.item === itemName);
		if (char.isSpellcaster) {
			if (item?.twoHanded) {
				return '<span class="text-red-500">Two-handed weapons cannot be used by Spellcasters</span>';
			} else if (itemName === 'Shield') {
				return '<span class="text-red-500">Shields cannot be used by Spellcasters</span>';
			} else if (itemName === 'Heavy Armour') {
				return '<span class="text-red-500">Heavy Armour cannot be used by Spellcasters</span>';
			}
		}
		if (modifiedStats.weaponRestrictions === 'one-handed') {
			return `Disabled by ${getDisablingInjuryName()}`;
		}
		return '';
	};

	const getDisablingInjuryName = () => {
		const injury = char.injuries
			.map((injuryName) => injuries.find((i) => i.name === injuryName))
			.find((injury) => injury?.statModifiers.weaponRestrictions === 'one-handed');
		return injury?.name || 'injury';
	};

	function getItemDescription(item: string) {
		const itemDescription = items.find((i) => i.item === item)?.description;
		const scrollDescription =
			scrolls.cleanScrolls.find((s) => s.name === item)?.description ||
			scrolls.uncleanScrolls.find((s) => s.name === item)?.description;
		return itemDescription || scrollDescription || '';
	}

	function getScrollDescription(scroll: string, isCleanScroll: boolean) {
		return (
			scrolls[isCleanScroll ? 'cleanScrolls' : 'uncleanScrolls'].find((s) => s.name === scroll)
				?.description || ''
		);
	}

	onMount(() => {
		const handleClickOutside = (event: Event) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.cursor-help')) {
				hideTooltip();
			}
		};
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('touchstart', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('touchstart', handleClickOutside);
			unlockBodyScroll();
		};
	});
</script>

<div
	class="relative flex w-full flex-col overflow-x-hidden p-2 transition-all duration-200 sm:p-3"
	style="aspect-ratio: 4/5;"
	class:dead={char.hp === 0}
>
	{#if char.hp === 0}
		<div class="death-overlay">
			<div class="death-content">
				<div class="character-name jacquard-24-regular">{char.name}</div>
				<div class="skull-container">
					<Skull />
				</div>
				<div class="death-text jacquard-24-regular">DEAD</div>
			</div>
		</div>
	{/if}

	<div class="flex h-full flex-col">
		<div
			class="lora relative flex-1 space-y-4 overflow-y-auto p-2 pb-24 text-sm sm:text-sm md:text-xs {char.hp ===
			0
				? 'opacity-30 blur-[3px] grayscale'
				: ''}"
		>
			<div class="flex flex-wrap items-center gap-2">
				<h3 class="jacquard-24-regular text-2xl font-bold underline sm:text-2xl md:text-2xl">
					{char.name}
				</h3>
				{#if char.isSpellcaster}
					<span
						class="jacquard-24-regular whitespace-nowrap text-lg font-semibold text-purple-500 sm:text-lg"
						>Spellcaster <span class="lora text-xs text-gray-500">(5 gold)</span></span
					>
				{/if}
			</div>

			<!-- Stats -->
			<div class="space-y-4">
				<ul class="bullet-list grid grid-cols-2 gap-2">
					<li class="flex h-6 items-center">
						<span class="bullet-icon">
							<InvertedCrossSVG />
						</span>
						<div class="flex min-w-0 flex-1 items-center gap-2">
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span
								class="group relative inline-block cursor-help whitespace-nowrap"
								on:mouseenter={(e) => {
									const tooltipContent = [
										'Base HP: 8',
										char.toughness !== 0
											? `${char.toughness > 0 ? '+' : ''}${char.toughness} Toughness`
											: '',
										...char.feats
											.map((featName) => {
												const feat = feats.find((f) => f.name === featName);
												if (feat?.statModifiers?.hp) {
													const modifier = feat.statModifiers.hp;
													return `${modifier > 0 ? '+' : ''}${modifier} (${feat.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...char.flaws
											.map((flawName) => {
												const flaw = flaws.find((f) => f.name === flawName);
												if (flaw?.statModifiers?.hp) {
													const modifier = flaw.statModifiers.hp;
													return `${modifier > 0 ? '+' : ''}${modifier} (${flaw.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...(char.injuries || [])
											.map((injuryName) => {
												const injury = injuries.find((i) => i.name === injuryName);
												if (injury?.statModifiers?.hp) {
													const modifier = injury.statModifiers.hp;
													return `${modifier > 0 ? '+' : ''}${modifier} (${injury.name})`;
												}
												return '';
											})
											.filter(Boolean)
									]
										.filter(Boolean)
										.join('\n');
									showTooltip(e, tooltipContent || 'No modifiers');
								}}
								on:mouseleave={hideTooltip}
								on:touchstart={(e) => {
									const tooltipContent = [
										'Base HP: 8',
										char.toughness !== 0
											? `${char.toughness > 0 ? '+' : ''}${char.toughness} Toughness`
											: '',
										...char.feats
											.map((featName) => {
												const feat = feats.find((f) => f.name === featName);
												if (feat?.statModifiers?.hp) {
													const modifier = feat.statModifiers.hp;
													return `${modifier > 0 ? '+' : ''}${modifier} (${feat.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...char.flaws
											.map((flawName) => {
												const flaw = flaws.find((f) => f.name === flawName);
												if (flaw?.statModifiers?.hp) {
													const modifier = flaw.statModifiers.hp;
													return `${modifier > 0 ? '+' : ''}${modifier} (${flaw.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...(char.injuries || [])
											.map((injuryName) => {
												const injury = injuries.find((i) => i.name === injuryName);
												if (injury?.statModifiers?.hp) {
													const modifier = injury.statModifiers.hp;
													return `${modifier > 0 ? '+' : ''}${modifier} (${injury.name})`;
												}
												return '';
											})
											.filter(Boolean)
									]
										.filter(Boolean)
										.join('\n');
									handleTooltipTrigger(e, tooltipContent || 'No modifiers');
								}}
								on:click={(e) => {
									const tooltipContent = [
										'Base HP: 8',
										char.toughness !== 0
											? `${char.toughness > 0 ? '+' : ''}${char.toughness} Toughness`
											: '',
										...char.feats
											.map((featName) => {
												const feat = feats.find((f) => f.name === featName);
												if (feat?.statModifiers?.hp) {
													const modifier = feat.statModifiers.hp;
													return `${modifier > 0 ? '+' : ''}${modifier} (${feat.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...char.flaws
											.map((flawName) => {
												const flaw = flaws.find((f) => f.name === flawName);
												if (flaw?.statModifiers?.hp) {
													const modifier = flaw.statModifiers.hp;
													return `${modifier > 0 ? '+' : ''}${modifier} (${flaw.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...(char.injuries || [])
											.map((injuryName) => {
												const injury = injuries.find((i) => i.name === injuryName);
												if (injury?.statModifiers?.hp) {
													const modifier = injury.statModifiers.hp;
													return `${modifier > 0 ? '+' : ''}${modifier} (${injury.name})`;
												}
												return '';
											})
											.filter(Boolean)
									]
										.filter(Boolean)
										.join('\n');
									handleTooltipTrigger(e, tooltipContent || 'No modifiers');
								}}
							>
								HP: {char.hp}/{baseHP + modifiedStats.hp}
							</span>
							{#if char.hp > 0}
								<div class="mx-1">
									<Button variant="danger" size="compact" onClick={takeDamage}>Hit</Button>
								</div>
							{/if}
						</div>
					</li>
					<li>
						<span class="bullet-icon">
							<InvertedCrossSVG />
						</span>
						<div class="flex min-w-0 flex-1 items-center gap-1">
							<span class="bullet-icon">
								<InvertedCrossSVG />
							</span>
							<div class="flex min-w-0 flex-1 items-center gap-1">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<span
									class="group relative inline-block cursor-help whitespace-nowrap"
									on:mouseenter={(e) => {
										const armorItems = char.items
											.map((itemName) => {
												const item = items.find((i) => i.item === itemName);
												if (item?.armour) {
													return `+${item.armour} (${item.item})`;
												}
												return '';
											})
											.filter(Boolean);

										const tooltipContent = [
											...armorItems,
											...char.feats
												.map((featName) => {
													const feat = feats.find((f) => f.name === featName);
													if (feat?.statModifiers?.armour) {
														const modifier = feat.statModifiers.armour;
														return `${modifier > 0 ? '+' : ''}${modifier} (${feat.name})`;
													}
													return '';
												})
												.filter(Boolean),
											...char.flaws
												.map((flawName) => {
													const flaw = flaws.find((f) => f.name === flawName);
													if (flaw?.statModifiers?.armour) {
														const modifier = flaw.statModifiers.armour;
														return `${modifier > 0 ? '+' : ''}${modifier} (${flaw.name})`;
													}
													return '';
												})
												.filter(Boolean),
											...(char.injuries || [])
												.map((injuryName) => {
													const injury = injuries.find((i) => i.name === injuryName);
													if (injury?.statModifiers?.armour) {
														const modifier = injury.statModifiers.armour;
														return `${modifier > 0 ? '+' : ''}${modifier} (${injury.name})`;
													}
													return '';
												})
												.filter(Boolean)
										]
											.filter(Boolean)
											.join('\n');

										showTooltip(e, tooltipContent || 'No armor bonuses');
									}}
									on:mouseleave={hideTooltip}
									on:touchstart={(e) => {
										const armorItems = char.items
											.map((itemName) => {
												const item = items.find((i) => i.item === itemName);
												if (item?.armour) {
													return `+${item.armour} (${item.item})`;
												}
												return '';
											})
											.filter(Boolean);

										const tooltipContent = [
											...armorItems,
											...char.feats
												.map((featName) => {
													const feat = feats.find((f) => f.name === featName);
													if (feat?.statModifiers?.armour) {
														const modifier = feat.statModifiers.armour;
														return `${modifier > 0 ? '+' : ''}${modifier} (${feat.name})`;
													}
													return '';
												})
												.filter(Boolean),
											...char.flaws
												.map((flawName) => {
													const flaw = flaws.find((f) => f.name === flawName);
													if (flaw?.statModifiers?.armour) {
														const modifier = flaw.statModifiers.armour;
														return `${modifier > 0 ? '+' : ''}${modifier} (${flaw.name})`;
													}
													return '';
												})
												.filter(Boolean),
											...(char.injuries || [])
												.map((injuryName) => {
													const injury = injuries.find((i) => i.name === injuryName);
													if (injury?.statModifiers?.armour) {
														const modifier = injury.statModifiers.armour;
														return `${modifier > 0 ? '+' : ''}${modifier} (${injury.name})`;
													}
													return '';
												})
												.filter(Boolean)
										]
											.filter(Boolean)
											.join('\n');

										handleTooltipTrigger(e, tooltipContent || 'No armor bonuses');
									}}
									on:click={(e) => {
										const armorItems = char.items
											.map((itemName) => {
												const item = items.find((i) => i.item === itemName);
												if (item?.armour) {
													return `+${item.armour} (${item.item})`;
												}
												return '';
											})
											.filter(Boolean);

										const tooltipContent = [
											...armorItems,
											...char.feats
												.map((featName) => {
													const feat = feats.find((f) => f.name === featName);
													if (feat?.statModifiers?.armour) {
														const modifier = feat.statModifiers.armour;
														return `${modifier > 0 ? '+' : ''}${modifier} (${feat.name})`;
													}
													return '';
												})
												.filter(Boolean),
											...char.flaws
												.map((flawName) => {
													const flaw = flaws.find((f) => f.name === flawName);
													if (flaw?.statModifiers?.armour) {
														const modifier = flaw.statModifiers.armour;
														return `${modifier > 0 ? '+' : ''}${modifier} (${flaw.name})`;
													}
													return '';
												})
												.filter(Boolean),
											...(char.injuries || [])
												.map((injuryName) => {
													const injury = injuries.find((i) => i.name === injuryName);
													if (injury?.statModifiers?.armour) {
														const modifier = injury.statModifiers.armour;
														return `${modifier > 0 ? '+' : ''}${modifier} (${injury.name})`;
													}
													return '';
												})
												.filter(Boolean)
										]
											.filter(Boolean)
											.join('\n');

										handleTooltipTrigger(e, tooltipContent || 'No armor bonuses');
									}}>Armour: {totalArmour}</span
								>
								{#if modifiedStats.armour !== 0}
									<button
										type="button"
										class="group relative inline-block cursor-help whitespace-nowrap {modifiedStats.armour >
										0
											? 'text-green-600'
											: 'text-red-600'} font-bold"
										on:mouseenter={(e) => showTooltip(e, getStatModifiersExplanation('armour'))}
										on:mouseleave={hideTooltip}
										on:touchstart={(e) =>
											handleTooltipTrigger(e, getStatModifiersExplanation('armour'))}
										on:click={(e) => handleTooltipTrigger(e, getStatModifiersExplanation('armour'))}
										on:keydown={(e) =>
											e.key === 'Enter' &&
											handleTooltipTrigger(e, getStatModifiersExplanation('armour'))}
									>
										→ {totalArmour + modifiedStats.armour}
									</button>
								{/if}
							</div>
						</div>
					</li>
					<li>
						<span class="bullet-icon">
							<InvertedCrossSVG />
						</span>
						<div class="flex min-w-0 flex-1 items-center gap-1">
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span
								class="group relative inline-block cursor-help whitespace-nowrap"
								on:mouseenter={(e) => {
									const tooltipContent = [
										'Base Movement: 5',
										`+${modifiedStats.agility} Agility`
									].join('\n');
									showTooltip(e, tooltipContent);
								}}
								on:mouseleave={hideTooltip}
								on:touchstart={(e) => {
									const tooltipContent = [
										'Base Movement: 5',
										`+${modifiedStats.agility} Agility`
									].join('\n');
									handleTooltipTrigger(e, tooltipContent);
								}}
								on:click={(e) => {
									const tooltipContent = [
										'Base Movement: 5',
										`+${modifiedStats.agility} Agility`
									].join('\n');
									handleTooltipTrigger(e, tooltipContent);
								}}
							>
								Movement: {movement}
							</span>
						</div>
					</li>
					<li>
						<span class="bullet-icon">
							<InvertedCrossSVG />
						</span>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="flex min-w-0 flex-1 items-center gap-1">
							<span
								class="group relative inline-block cursor-help whitespace-nowrap"
								on:mouseenter={(e) => {
									const tooltipContent = [
										'Base Inventory: 5',
										char.strength !== 0
											? `${char.strength > 0 ? '+' : ''}${char.strength} Strength`
											: '',
										...char.items
											.filter((item: string) => {
												const foundItem = items.find((i) => i.item === item);
												return foundItem?.extraInventorySlots !== undefined;
											})
											.map((item: string) => {
												const itemObj = items.find((i) => i.item === item);
												return `${(itemObj?.extraInventorySlots ?? 0) > 0 ? '+' : ''}${itemObj?.extraInventorySlots ?? 0} (${item})`;
											}),
										...char.feats
											.map((featName) => {
												const feat = feats.find((f) => f.name === featName);
												if (feat?.statModifiers?.extraInventorySlots) {
													const modifier = feat.statModifiers.extraInventorySlots;
													return `${modifier > 0 ? '+' : ''}${modifier} (${feat.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...char.flaws
											.map((flawName) => {
												const flaw = flaws.find((f) => f.name === flawName);
												if (flaw?.statModifiers?.extraInventorySlots) {
													const modifier = flaw.statModifiers.extraInventorySlots;
													return `${modifier > 0 ? '+' : ''}${modifier} (${flaw.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...(char.injuries || [])
											.map((injuryName) => {
												const injury = injuries.find((i) => i.name === injuryName);
												if (injury?.statModifiers?.extraInventorySlots) {
													const modifier = injury.statModifiers.extraInventorySlots;
													return `${modifier > 0 ? '+' : ''}${modifier} (${injury.name})`;
												}
												return '';
											})
											.filter(Boolean)
									]
										.filter(Boolean)
										.join('\n');
									showTooltip(e, tooltipContent);
								}}
								on:mouseleave={hideTooltip}
								on:touchstart={(e) => {
									const tooltipContent = [
										'Base Inventory: 5',
										char.strength !== 0
											? `${char.strength > 0 ? '+' : ''}${char.strength} Strength`
											: '',
										...char.items
											.filter((item: string) => {
												const foundItem = items.find((i) => i.item === item);
												return foundItem?.extraInventorySlots !== undefined;
											})
											.map((item: string) => {
												const itemObj = items.find((i) => i.item === item);
												return `${(itemObj?.extraInventorySlots ?? 0) > 0 ? '+' : ''}${itemObj?.extraInventorySlots ?? 0} (${item})`;
											}),
										...char.feats
											.map((featName) => {
												const feat = feats.find((f) => f.name === featName);
												if (feat?.statModifiers?.extraInventorySlots) {
													const modifier = feat.statModifiers.extraInventorySlots;
													return `${modifier > 0 ? '+' : ''}${modifier} (${feat.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...char.flaws
											.map((flawName) => {
												const flaw = flaws.find((f) => f.name === flawName);
												if (flaw?.statModifiers?.extraInventorySlots) {
													const modifier = flaw.statModifiers.extraInventorySlots;
													return `${modifier > 0 ? '+' : ''}${modifier} (${flaw.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...(char.injuries || [])
											.map((injuryName) => {
												const injury = injuries.find((i) => i.name === injuryName);
												if (injury?.statModifiers?.extraInventorySlots) {
													const modifier = injury.statModifiers.extraInventorySlots;
													return `${modifier > 0 ? '+' : ''}${modifier} (${injury.name})`;
												}
												return '';
											})
											.filter(Boolean)
									]
										.filter(Boolean)
										.join('\n');
									handleTooltipTrigger(e, tooltipContent);
								}}
								on:click={(e) => {
									const tooltipContent = [
										'Base Inventory: 5',
										char.strength !== 0
											? `${char.strength > 0 ? '+' : ''}${char.strength} Strength`
											: '',
										...char.items
											.filter((item: string) => {
												const foundItem = items.find((i) => i.item === item);
												return foundItem?.extraInventorySlots !== undefined;
											})
											.map((item: string) => {
												const itemObj = items.find((i) => i.item === item);
												return `${(itemObj?.extraInventorySlots ?? 0) > 0 ? '+' : ''}${itemObj?.extraInventorySlots ?? 0} (${item})`;
											}),
										...char.feats
											.map((featName) => {
												const feat = feats.find((f) => f.name === featName);
												if (feat?.statModifiers?.extraInventorySlots) {
													const modifier = feat.statModifiers.extraInventorySlots;
													return `${modifier > 0 ? '+' : ''}${modifier} (${feat.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...char.flaws
											.map((flawName) => {
												const flaw = flaws.find((f) => f.name === flawName);
												if (flaw?.statModifiers?.extraInventorySlots) {
													const modifier = flaw.statModifiers.extraInventorySlots;
													return `${modifier > 0 ? '+' : ''}${modifier} (${flaw.name})`;
												}
												return '';
											})
											.filter(Boolean),
										...(char.injuries || [])
											.map((injuryName) => {
												const injury = injuries.find((i) => i.name === injuryName);
												if (injury?.statModifiers?.extraInventorySlots) {
													const modifier = injury.statModifiers.extraInventorySlots;
													return `${modifier > 0 ? '+' : ''}${modifier} (${injury.name})`;
												}
												return '';
											})
											.filter(Boolean)
									]
										.filter(Boolean)
										.join('\n');
									handleTooltipTrigger(e, tooltipContent);
								}}
							>
								Inventory: {baseInventory + modifiedStats.equipmentSlots}
							</span>
						</div>
					</li>
				</ul>
				<!-- Stats section -->
				<div class="space-y-2">
					<p class="jacquard-24-regular text-xl font-bold underline sm:text-lg">Stats</p>
					<ul class="bullet-list grid grid-cols-2 gap-2">
						<li>
							<span class="bullet-icon">
								<InvertedCrossSVG />
							</span>
							<div class="flex min-w-0 flex-1 items-center gap-1">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<span
									class="group relative inline-block cursor-help whitespace-nowrap"
									on:mouseenter={(e) => showTooltip(e, getStatModifiersExplanation('agility'))}
									on:mouseleave={hideTooltip}
									on:touchstart={(e) =>
										handleTooltipTrigger(e, getStatModifiersExplanation('agility'))}
									on:click={(e) => handleTooltipTrigger(e, getStatModifiersExplanation('agility'))}
								>
									Agility: {char.agility}
								</span>
								{#if modifiedStats.agility !== char.agility}
									<button
										type="button"
										class="group relative inline-block cursor-help whitespace-nowrap {modifiedStats.agility >
										char.agility
											? 'text-green-600'
											: 'text-red-600'} font-bold"
										on:mouseenter={(e) => showTooltip(e, getStatModifiersExplanation('agility'))}
										on:mouseleave={hideTooltip}
										on:touchstart={(e) =>
											handleTooltipTrigger(e, getStatModifiersExplanation('agility'))}
										on:click={(e) =>
											handleTooltipTrigger(e, getStatModifiersExplanation('agility'))}
									>
										→ {modifiedStats.agility}
									</button>
								{/if}
							</div>
						</li>
						<li>
							<span class="bullet-icon">
								<InvertedCrossSVG />
							</span>
							<div class="flex min-w-0 flex-1 items-center gap-1">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<span
									class="group relative inline-block cursor-help whitespace-nowrap"
									on:mouseenter={(e) => showTooltip(e, getStatModifiersExplanation('presence'))}
									on:mouseleave={hideTooltip}
									on:touchstart={(e) =>
										handleTooltipTrigger(e, getStatModifiersExplanation('presence'))}
									on:click={(e) => handleTooltipTrigger(e, getStatModifiersExplanation('presence'))}
								>
									Presence: {char.presence}
								</span>
								{#if modifiedStats.presence !== char.presence}
									<button
										type="button"
										class="group relative inline-block cursor-help whitespace-nowrap {modifiedStats.presence >
										char.presence
											? 'text-green-600'
											: 'text-red-600'} font-bold"
										on:mouseenter={(e) => showTooltip(e, getStatModifiersExplanation('presence'))}
										on:mouseleave={hideTooltip}
										on:touchstart={(e) =>
											handleTooltipTrigger(e, getStatModifiersExplanation('presence'))}
										on:click={(e) =>
											handleTooltipTrigger(e, getStatModifiersExplanation('presence'))}
									>
										→ {modifiedStats.presence}
									</button>
								{/if}
							</div>
						</li>
						<li>
							<span class="bullet-icon">
								<InvertedCrossSVG />
							</span>
							<div class="flex min-w-0 flex-1 items-center gap-1">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<span
									class="group relative inline-block cursor-help whitespace-nowrap"
									on:mouseenter={(e) => showTooltip(e, getStatModifiersExplanation('strength'))}
									on:mouseleave={hideTooltip}
									on:touchstart={(e) =>
										handleTooltipTrigger(e, getStatModifiersExplanation('strength'))}
									on:click={(e) => handleTooltipTrigger(e, getStatModifiersExplanation('strength'))}
								>
									Strength: {char.strength}
								</span>
								{#if modifiedStats.strength !== char.strength}
									<button
										type="button"
										class="group relative inline-block cursor-help whitespace-nowrap {modifiedStats.strength >
										char.strength
											? 'text-green-600'
											: 'text-red-600'} font-bold"
										on:mouseenter={(e) => showTooltip(e, getStatModifiersExplanation('strength'))}
										on:mouseleave={hideTooltip}
										on:touchstart={(e) =>
											handleTooltipTrigger(e, getStatModifiersExplanation('strength'))}
										on:click={(e) =>
											handleTooltipTrigger(e, getStatModifiersExplanation('strength'))}
									>
										→ {modifiedStats.strength}
									</button>
								{/if}
							</div>
						</li>
						<li>
							<span class="bullet-icon">
								<InvertedCrossSVG />
							</span>
							<div class="flex min-w-0 flex-1 items-center gap-1">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<span
									class="group relative inline-block cursor-help whitespace-nowrap"
									on:mouseenter={(e) => showTooltip(e, getStatModifiersExplanation('toughness'))}
									on:mouseleave={hideTooltip}
									on:touchstart={(e) =>
										handleTooltipTrigger(e, getStatModifiersExplanation('toughness'))}
									on:click={(e) =>
										handleTooltipTrigger(e, getStatModifiersExplanation('toughness'))}
								>
									Toughness: {char.toughness}
								</span>
								{#if modifiedStats.toughness !== char.toughness}
									<button
										type="button"
										class="group relative inline-block cursor-help whitespace-nowrap {modifiedStats.toughness >
										char.toughness
											? 'text-green-600'
											: 'text-red-600'} font-bold"
										on:mouseenter={(e) => showTooltip(e, getStatModifiersExplanation('toughness'))}
										on:mouseleave={hideTooltip}
										on:touchstart={(e) =>
											handleTooltipTrigger(e, getStatModifiersExplanation('toughness'))}
										on:click={(e) =>
											handleTooltipTrigger(e, getStatModifiersExplanation('toughness'))}
									>
										→ {modifiedStats.toughness}
									</button>
								{/if}
							</div>
						</li>
					</ul>
				</div>
				{#if char.isSpellcaster}
					<div class="space-y-2">
						<p class="jacquard-24-regular text-xl font-bold underline sm:text-lg">Scrolls</p>
						<ul class="bullet-list space-y-2">
							{#each char.items.slice(0, 2) as scroll, index}
								<li>
									<span class="bullet-icon">
										<InvertedCrossSVG />
									</span>
									<div class="flex min-w-0 flex-1 items-center justify-between gap-2">
										<div class="flex flex-1 items-center gap-2">
											<span class="text-sm text-gray-500 sm:text-xs"
												>{index === 0 ? 'Clean: ' : 'Unclean: '}</span
											>
											{#if scroll && scroll !== '[Clean Scroll Slot]' && scroll !== '[Unclean Scroll Slot]'}
												<span
													class="group relative inline-block cursor-help whitespace-nowrap text-sm sm:text-xs"
													aria-describedby="tooltip"
													on:mouseenter={(e) =>
														showTooltip(e, getScrollDescription(scroll, index === 0))}
													on:mouseleave={hideTooltip}
													on:touchstart={(e) =>
														handleTooltipTrigger(e, getScrollDescription(scroll, index === 0))}
													on:click={(e) =>
														handleTooltipTrigger(e, getScrollDescription(scroll, index === 0))}
													on:keydown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															handleTooltipTrigger(e, getScrollDescription(scroll, index === 0));
														}
													}}
													tabindex="0"
													role="button"
												>
													{scroll}
												</span>
											{:else}
												<span class="text-sm text-gray-500 sm:text-xs">Empty</span>
											{/if}
										</div>
										<div class="flex items-center gap-2">
											{#if scroll && scroll !== '[Clean Scroll Slot]' && scroll !== '[Unclean Scroll Slot]'}
												<Button variant="danger" size="compact" onClick={() => dropItem(scroll)}
													>Drop</Button
												>
											{:else}
												<Button
													variant="default"
													size="compact"
													onClick={() => openScrollPickUpModal(index)}
												>
													Pick Up Scroll
												</Button>
											{/if}
										</div>
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Inventory -->
				<div class="space-y-4">
					<p class="jacquard-24-regular text-xl font-bold underline sm:text-lg">Inventory</p>
					<ul class="bullet-list space-y-2">
						{#each char.items as item, index}
							{#if !char.isSpellcaster || index >= 2}
								{#if item}
									<li>
										<span class="bullet-icon">
											<InvertedCrossSVG />
										</span>
										<div class="flex min-w-0 flex-1 items-center justify-between gap-2">
											<div class="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">
												{#if item}
													<span
														class="group relative inline-block whitespace-nowrap text-sm sm:text-xs {isItemDisabled(
															item
														)
															? 'text-red-500 line-through'
															: ''} {getItemDescription(item) ? 'cursor-help' : ''}"
														on:mouseenter={(e) =>
															showTooltip(
																e,
																isItemDisabled(item)
																	? `${getItemDescription(item)}\n(${getDisablingReason(item)})`
																	: getItemDescription(item)
															)}
														on:mouseleave={hideTooltip}
														on:touchstart={(e) =>
															handleTooltipTrigger(
																e,
																isItemDisabled(item)
																	? `${getItemDescription(item)}\n(${getDisablingReason(item)})`
																	: getItemDescription(item)
															)}
														on:click={(e) =>
															handleTooltipTrigger(
																e,
																isItemDisabled(item)
																	? `${getItemDescription(item)}\n(${getDisablingReason(item)})`
																	: getItemDescription(item)
															)}
														on:keydown={(e) => {
															if (e.key === 'Enter' || e.key === ' ') {
																handleTooltipTrigger(
																	e,
																	isItemDisabled(item)
																		? `${getItemDescription(item)}\n(${getDisablingReason(item)})`
																		: getItemDescription(item)
																);
															}
														}}
														tabindex="0"
														role="button"
													>
														{item}
													</span>
													{#if scrolls.cleanScrolls.some((s) => s.name === item) || scrolls.uncleanScrolls.some((s) => s.name === item)}
														<span class="jacquard-24-regular text-base text-purple-500 sm:text-sm"
															>Scroll</span
														>
													{/if}
												{/if}
												{#if char.pickedUpItems?.includes(item)}
													<span class="text-sm text-gray-500 sm:text-xs">(Picked up)</span>
												{/if}
												{#if itemUsesAmmo(item)}
													{@const ammoCount =
														char.ammoTrackers.find(
															(t) => t.weaponName === item && t.slotIndex === index
														)?.currentAmmo ?? getInitialAmmo(item)}
													<div class="flex items-center gap-2">
														{#if ammoCount === 0}
															<span class="text-sm text-red-400 sm:text-xs">Ammo Empty</span>
															<Button
																variant="default"
																size="compact"
																onClick={() => refillAmmo(item, index)}
															>
																Refill
															</Button>
														{:else}
															<span class="text-sm sm:text-xs">Ammo: {ammoCount}</span>
															<Button
																variant="default"
																size="compact"
																onClick={() => useAmmo(item, index)}
															>
																Use
															</Button>
														{/if}
													</div>
												{/if}
											</div>
											<Button variant="danger" size="compact" onClick={() => dropItem(item)}
												>Drop</Button
											>
										</div>
									</li>
								{:else}
									<li>
										<span class="bullet-icon">
											<InvertedCrossSVG />
										</span>
										<div class="flex min-w-0 flex-1 items-center justify-between gap-2">
											<div class="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">
												<span class="text-sm text-gray-500 sm:text-xs">Empty Slot</span>
											</div>
											<Button
												variant="default"
												size="compact"
												onClick={() => openPickUpModal(index)}
											>
												Pick Up Item
											</Button>
										</div>
									</li>
								{/if}
							{/if}
						{/each}
					</ul>
				</div>
			</div>

			<!-- Feats  -->
			{#if char.feats.length > 0}
				<div class="space-y-2">
					<p class="jacquard-24-regular text-xl font-bold underline sm:text-lg">Feats</p>
					<ul class="bullet-list space-y-2">
						{#each char.feats as feat}
							<li>
								<span class="bullet-icon">
									<InvertedCrossSVG />
								</span>
								<span
									class="group relative inline-block cursor-help text-sm sm:text-xs"
									on:mouseenter={(e) =>
										showTooltip(e, feats.find((f) => f.name === feat)?.description || '')}
									on:mouseleave={hideTooltip}
									on:touchstart={(e) =>
										handleTooltipTrigger(e, feats.find((f) => f.name === feat)?.description || '')}
									on:click={(e) =>
										handleTooltipTrigger(e, feats.find((f) => f.name === feat)?.description || '')}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											handleTooltipTrigger(
												e,
												feats.find((f) => f.name === feat)?.description || ''
											);
										}
									}}
									tabindex="0"
									role="button"
								>
									{feats.find((f) => f.name === feat)?.name || feat}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Flaws -->
			{#if char.flaws.length > 0}
				<div class="space-y-2">
					<p class="jacquard-24-regular text-xl font-bold underline sm:text-lg">Flaws</p>
					<ul class="bullet-list space-y-2">
						{#each char.flaws as flaw}
							<li>
								<span class="bullet-icon">
									<InvertedCrossSVG />
								</span>
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<span
									class="group relative inline-block cursor-help text-sm sm:text-xs"
									on:mouseenter={(e) =>
										showTooltip(e, flaws.find((f) => f.name === flaw)?.description || '')}
									on:mouseleave={hideTooltip}
									on:touchstart={(e) =>
										handleTooltipTrigger(e, flaws.find((f) => f.name === flaw)?.description || '')}
								>
									{flaws.find((f) => f.name === flaw)?.name || flaw}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Injuries -->
			{#if char.injuries?.length > 0}
				<div class="space-y-2">
					<p class="jacquard-24-regular text-xl font-bold underline sm:text-lg">Injuries</p>
					<ul class="bullet-list space-y-2">
						{#each char.injuries as injury}
							<li class="flex items-center justify-between">
								<div class="flex items-center">
									<span class="bullet-icon">
										<InvertedCrossSVG />
									</span>
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<span
										class="group relative inline-block cursor-help text-sm text-red-600 sm:text-xs"
										on:mouseenter={(e) =>
											showTooltip(e, injuries.find((i) => i.name === injury)?.description || '')}
										on:mouseleave={hideTooltip}
										on:touchstart={(e) =>
											handleTooltipTrigger(
												e,
												injuries.find((i) => i.name === injury)?.description || ''
											)}
									>
										{injuries.find((i) => i.name === injury)?.name || injury}
									</span>
								</div>
								<button
									type="button"
									class="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-400 text-sm font-bold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
									on:click={() => removeInjury(injury)}
									aria-label="Remove injury"
								>
									×
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<div class="mt-2 flex justify-end space-x-2 p-2 sm:space-x-4">
			{#if char.hp === 0}
				<Button variant="default" onClick={reviveCharacter} wide>Revive</Button>
			{:else}
				<Button variant="default" onClick={openInjuryModal} wide>Add Injury</Button>
				<Button variant="default" onClick={() => editCharacter(i)} wide>Edit</Button>
			{/if}
			<Button variant="danger" onClick={() => (showDeleteModal = true)} wide>Delete</Button>
		</div>
	</div>
</div>

{#if tooltipPosition.show}
	<div class="tooltip-container" style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px;">
		{@html activeContent}
	</div>
{/if}

{#if showPickUpModal}
	<PickUpItemModal
		{items}
		onClose={closePickUpModal}
		onPickUp={(itemName) => pickUpItem(itemName)}
	/>
{/if}

{#if showInjuryModal}
	<InjuryModal onClose={closeInjuryModal} onAddInjury={addInjury} />
{/if}

{#if showDeleteModal}
	<DeleteCharacterModal
		characterName={char.name}
		character={char}
		onClose={() => (showDeleteModal = false)}
		onConfirm={() => {
			deleteCharacter(i);
			showDeleteModal = false;
		}}
	/>
{/if}

<style>
	:global(.bullet-list) {
		list-style: none !important;
		padding-left: 0;
	}

	:global(.bullet-list li) {
		position: relative;
		padding-left: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	:global(.bullet-icon) {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		min-width: 1rem;
	}

	:global(.tooltip-container) {
		position: fixed;
		z-index: 1000;
		transform: translateY(-100%);
		touch-action: none;
		background-color: #1f2937;
		color: white;
		padding: 0.5rem;
		border-radius: 0.25rem;
		max-width: min(300px, 90vw);
		font-size: 0.875rem;
		line-height: 1.25rem;
		pointer-events: none;
		white-space: pre-line;
		margin-top: -0.5rem;
		font-family: 'Lora', serif;
	}

	:global(.tooltip-container .text-red-500) {
		color: rgb(239, 68, 68);
	}

	:global(.tooltip-container .disabled-reason) {
		color: rgb(239, 68, 68);
	}

	.dead {
		position: relative;
		pointer-events: none;
		transform: scale(0.99);
		box-shadow: none;
		background-color: rgb(0 0 0 / 0.05);
	}

	.dead :global(button) {
		pointer-events: all;
		opacity: 1 !important;
		filter: none !important;
	}

	.death-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		z-index: 10;
		pointer-events: none;
		background-color: rgb(0 0 0 / 0.2);
		height: 100%;
		overflow: hidden;
		padding: 2rem 1.5rem 6rem;
		gap: 1.5rem;
	}

	.death-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: 1.5rem;
		height: 100%;
		width: 100%;
	}

	.character-name {
		font-size: 1.75rem;
		color: rgba(255, 255, 255, 0.95);
		text-shadow: 0 0 20px rgba(0, 0, 0, 0.7);
		line-height: 1.1;
		text-align: center;
		max-width: 90%;
		word-break: break-word;
		margin-top: 1rem;
	}

	@media (min-width: 640px) {
		.character-name {
			font-size: 2.25rem;
		}
	}

	@media (min-width: 1024px) {
		.character-name {
			font-size: 2.5rem;
		}
	}

	:global(.skull-container) {
		transform: scale(0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		min-height: 0;
		filter: drop-shadow(0 0 20px rgba(0, 0, 0, 0.7));
	}

	@media (min-width: 640px) {
		:global(.skull-container) {
			transform: scale(0.7);
		}
	}

	@media (min-width: 1024px) {
		:global(.skull-container) {
			transform: scale(0.8);
		}
	}

	.death-text {
		font-size: 2rem;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.95);
		text-shadow: 0 0 20px rgba(0, 0, 0, 0.7);
		letter-spacing: 0.25rem;
		line-height: 1;
		margin-bottom: 1rem;
	}

	@media (min-width: 640px) {
		.death-text {
			font-size: 2.75rem;
		}
	}

	@media (min-width: 1024px) {
		.death-text {
			font-size: 3rem;
		}
	}
</style>

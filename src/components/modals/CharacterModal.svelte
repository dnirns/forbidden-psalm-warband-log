<script lang="ts">
	import { scale } from 'svelte/transition';
	import type { Character } from '$lib/types';
	import { stats, statValues } from '$lib/constants';
	import { feats } from '$lib/data/feats';
	import { flaws } from '$lib/data/flaws';
	import { injuries } from '$lib/data/injuries';
	import items from '$lib/data/items';
	import InvertedCrossSVG from '../icons/InvertedCrossSVG.svelte';
	import { calculateCharacterCost, calculateTotalArmour, calculateModifiedStats } from '$lib/utils';
	import {
		itemUsesAmmo,
		getInitialAmmo,
		updateInventory,
		handleSpellcasterChange as handleSpellcasterChangeUtil,
		isItemRestrictedForSpellcaster
	} from '$lib/utils/characterUtils';
	import ScrollSelector from '../ui/ScrollSelector.svelte';
	import { warbandStore } from '$lib/stores/warbandStore';
	import { defaultCharacter } from '$lib/utils';
	import { onMount } from 'svelte';
	import { lockBodyScroll, unlockBodyScroll } from '$lib/utils/modalUtils';
	import CloseButton from '../ui/CloseButton.svelte';
	import Button from '../ui/Button.svelte';
	import NumberControl from '../ui/NumberControl.svelte';
	import ItemActionModal from './ItemActionModal.svelte';

	$: ({
		showModal,
		selectedIndex,
		currentCharacter,
		data: warbandData,
		originalCharacterGold
	} = $warbandStore);

	$: if (!currentCharacter) {
		warbandStore.updateCurrentCharacter({
			...defaultCharacter(),
			pickedUpItems: []
		});
	}

	$: hasSpellcaster =
		selectedIndex === -1
			? warbandData.characters.some((char: Character) => char.isSpellcaster)
			: warbandData.characters.some(
					(char: Character, index: number) => char.isSpellcaster && index !== selectedIndex
				);

	let featText = '';
	let flawText = '';
	let injuryText = '';

	let originalItems: string[] = [];

	$: if (selectedIndex !== -1 && currentCharacter) {
		originalItems = [...warbandData.characters[selectedIndex].items];
		originalCharacterGold = calculateCharacterCost(warbandData.characters[selectedIndex], items);
		if (!currentCharacter.pickedUpItems) {
			const newChar = { ...currentCharacter, pickedUpItems: [] };
			warbandStore.updateCurrentCharacter(newChar);
		}
	}

	$: if (selectedIndex === -1) {
		originalItems = [];
		originalCharacterGold = 0;
	}

	$: currentCharacterGold = calculateCharacterCost(currentCharacter, items);
	$: availableGoldBefore = warbandData.gold + originalCharacterGold;
	$: availableGold = Math.max(0, availableGoldBefore - currentCharacterGold);

	$: canSave = availableGold >= 0;

	$: totalArmour = calculateTotalArmour(currentCharacter.items, items);
	$: baseHP = 8 + currentCharacter.toughness;
	$: modifiedStats = calculateModifiedStats(currentCharacter, feats, flaws, items);
	$: baseInventory = 5 + currentCharacter.strength;
	$: maxInventory = baseInventory + modifiedStats.equipmentSlots;
	$: maxHP = baseHP + modifiedStats.hp;

	$: {
		const newMaxHP = baseHP + modifiedStats.hp;
		if (selectedIndex === -1) {
			if (currentCharacter.hp !== newMaxHP) {
				const newChar = { ...currentCharacter };
				newChar.hp = newMaxHP;
				warbandStore.updateCurrentCharacter(newChar);
			}
		} else if (currentCharacter.hp > newMaxHP) {
			const newChar = { ...currentCharacter };
			newChar.hp = newMaxHP;
			warbandStore.updateCurrentCharacter(newChar);
		}
	}

	$: {
		if (currentCharacter) {
			const newInventory = maxInventory;
			if (currentCharacter.inventory !== newInventory) {
				const newChar = { ...currentCharacter };
				newChar.inventory = Math.max(2, newInventory);

				if (newChar.items.length > newChar.inventory) {
					newChar.items = newChar.items.slice(0, newChar.inventory);
				} else if (newChar.items.length < newChar.inventory) {
					newChar.items = [
						...newChar.items,
						...Array(newChar.inventory - newChar.items.length).fill('')
					];
				}

				warbandStore.updateCurrentCharacter(newChar);
			}
		}
	}

	type StatKey = 'agility' | 'presence' | 'strength' | 'toughness';

	const handleStrengthChange = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		const newStrength = parseInt(target.value, 10);

		const newChar = { ...currentCharacter };
		newChar.strength = newStrength;

		const newBaseInventory = 5 + newStrength;
		const newMaxInventory = newBaseInventory + modifiedStats.equipmentSlots;

		newChar.inventory = newMaxInventory;

		newChar.inventory = Math.max(2, newChar.inventory);

		if (newChar.items.length > newChar.inventory) {
			newChar.items = newChar.items.slice(0, newChar.inventory);
		} else if (newChar.items.length < newChar.inventory) {
			newChar.items = [
				...newChar.items,
				...Array(newChar.inventory - newChar.items.length).fill('')
			];
		}

		warbandStore.updateCurrentCharacter(newChar);
	};

	const handleStatChange = (event: Event, statKey: StatKey) => {
		const target = event.target as HTMLSelectElement;
		const newValue = parseInt(target.value, 10);
		const newChar = { ...currentCharacter };
		newChar[statKey] = newValue;

		if (statKey === 'toughness') {
			const newBaseHP = 8 + newValue;
			const newMaxHP = newBaseHP + modifiedStats.hp;

			if (selectedIndex === -1) {
				newChar.hp = newMaxHP;
			} else if (newChar.hp > newMaxHP) {
				newChar.hp = newMaxHP;
			}
		} else if (statKey === 'strength') {
			const newBaseInventory = 5 + newValue;
			const newMaxInventory = newBaseInventory + modifiedStats.equipmentSlots;
			if (selectedIndex === -1) {
				updateInventory(newChar, newMaxInventory);
			} else if (newChar.inventory > newMaxInventory) {
				updateInventory(newChar, newMaxInventory);
			}
		}

		warbandStore.updateCurrentCharacter(newChar);
	};

	const updateHP = async (newValue: number) => {
		const newChar = { ...currentCharacter };
		newChar.hp = Math.min(newValue, maxHP);
		warbandStore.updateCurrentCharacter(newChar);
	};

	const handleItemSelect = (event: Event, index: number) => {
		const target = event.target as HTMLSelectElement;
		const newItem = target.value;
		const oldItem = currentCharacter.items[index];

		const newChar = { ...currentCharacter };

		let newAmmoTrackers = [...newChar.ammoTrackers];
		if (oldItem && itemUsesAmmo(oldItem, items)) {
			newAmmoTrackers = newAmmoTrackers.filter((t) => t.weaponName !== oldItem);
		}
		if (newItem && itemUsesAmmo(newItem, items)) {
			newAmmoTrackers.push({
				weaponName: newItem,
				slotIndex: index,
				currentAmmo: getInitialAmmo(newItem, items)
			});
		}
		newChar.ammoTrackers = newAmmoTrackers;

		const oldItemObj = items.find((i) => i.item === oldItem);
		const newItemObj = items.find((i) => i.item === newItem);

		if (oldItemObj?.extraInventorySlots) {
			newChar.inventory = Math.max(newChar.inventory - oldItemObj.extraInventorySlots, 2);
		}

		if (newItemObj?.extraInventorySlots) {
			newChar.inventory = newChar.inventory + newItemObj.extraInventorySlots;
		}

		const newItems = [...newChar.items];
		newItems[index] = newItem;
		newChar.items = newItems.slice(0, newChar.inventory);

		if (!newChar.pickedUpItems) {
			newChar.pickedUpItems = [];
		}

		warbandStore.updateCurrentCharacter(newChar);
	};

	const deleteItem = (index: number, shouldRefund: boolean = false) => {
		const itemToDelete = currentCharacter.items[index];

		if (itemToDelete === '[Clean Scroll Slot]' || itemToDelete === '[Unclean Scroll Slot]') {
			return;
		}

		const newChar = { ...currentCharacter };

		const itemObj = items.find((i) => i.item === itemToDelete);
		if (itemObj?.extraInventorySlots) {
			newChar.inventory = Math.max(newChar.inventory - itemObj.extraInventorySlots, 2);
		}

		newChar.items = newChar.items.map((item, i) => (i === index ? '' : item));

		if (newChar.pickedUpItems) {
			newChar.pickedUpItems = newChar.pickedUpItems.filter((item) => item !== itemToDelete);
		}

		if (itemUsesAmmo(itemToDelete, items)) {
			newChar.ammoTrackers = newChar.ammoTrackers.filter((t) => t.weaponName !== itemToDelete);
		}

		warbandStore.updateCurrentCharacter(newChar);

		if (
			shouldRefund &&
			itemObj &&
			typeof itemObj.cost === 'number' &&
			itemObj.cost > 0 &&
			originalItems.includes(itemToDelete)
		) {
			warbandStore.updateGold(warbandData.gold + itemObj.cost);
		}
	};

	const dropItem = (index: number) => {
		const itemToDrop = currentCharacter.items[index];

		if (itemToDrop === '[Clean Scroll Slot]' || itemToDrop === '[Unclean Scroll Slot]') {
			return;
		}

		const newChar = { ...currentCharacter };

		const itemObj = items.find((i) => i.item === itemToDrop);
		if (itemObj?.extraInventorySlots) {
			newChar.inventory = Math.max(newChar.inventory - itemObj.extraInventorySlots, 2);
		}

		newChar.items = newChar.items.map((item, i) => (i === index ? '' : item));

		if (newChar.pickedUpItems) {
			newChar.pickedUpItems = newChar.pickedUpItems.filter((item) => item !== itemToDrop);
		}

		if (itemUsesAmmo(itemToDrop, items)) {
			newChar.ammoTrackers = newChar.ammoTrackers.filter((t) => t.weaponName !== itemToDrop);
		}

		warbandStore.updateCurrentCharacter(newChar);
	};

	const handleFeatChange = (e: Event) => {
		const select = e.target as HTMLSelectElement;
		const selectedFeat = select.value;
		if (selectedFeat) {
			const feat = feats.find((f) => f.name === selectedFeat);
			if (feat) {
				if (feat.statModifiers?.extraInventorySlots) {
					const newInventory = currentCharacter.inventory + feat.statModifiers.extraInventorySlots;
					currentCharacter.inventory = Math.max(2, newInventory);
					if (currentCharacter.items.length > newInventory) {
						currentCharacter.items = currentCharacter.items.slice(0, newInventory);
					} else if (currentCharacter.items.length < newInventory) {
						currentCharacter.items = [
							...currentCharacter.items,
							...Array(newInventory - currentCharacter.items.length).fill('')
						];
					}
				}
				currentCharacter.feats = [...currentCharacter.feats, selectedFeat];
				featText = '';
			}
		}
	};

	const handleFlawChange = (e: Event) => {
		const select = e.target as HTMLSelectElement;
		const selectedFlaw = select.value;
		if (selectedFlaw) {
			const flaw = flaws.find((f) => f.name === selectedFlaw);
			if (flaw) {
				if (flaw.statModifiers?.extraInventorySlots) {
					const newInventory = currentCharacter.inventory + flaw.statModifiers.extraInventorySlots;
					currentCharacter.inventory = Math.max(2, newInventory);
					if (currentCharacter.items.length > newInventory) {
						currentCharacter.items = currentCharacter.items.slice(0, newInventory);
					} else if (currentCharacter.items.length < newInventory) {
						currentCharacter.items = [
							...currentCharacter.items,
							...Array(newInventory - currentCharacter.items.length).fill('')
						];
					}
				}
				currentCharacter.flaws = [...currentCharacter.flaws, selectedFlaw];
				flawText = '';
			}
		}
	};

	const handleInjuryChange = (e: Event) => {
		const select = e.target as HTMLSelectElement;
		const selectedInjury = select.value;
		if (selectedInjury) {
			const injury = injuries.find((i) => i.name === selectedInjury);
			if (injury) {
				if (injury.statModifiers?.extraInventorySlots) {
					const newInventory =
						currentCharacter.inventory + injury.statModifiers.extraInventorySlots;
					currentCharacter.inventory = Math.max(2, newInventory);
					if (currentCharacter.items.length > newInventory) {
						currentCharacter.items = currentCharacter.items.slice(0, newInventory);
					} else if (currentCharacter.items.length < newInventory) {
						currentCharacter.items = [
							...currentCharacter.items,
							...Array(newInventory - currentCharacter.items.length).fill('')
						];
					}
				}
				currentCharacter.injuries = [...currentCharacter.injuries, selectedInjury];
				injuryText = '';
			}
		}
	};

	const handleSpellcasterChange = (checked: boolean) => {
		const originalCharacter = selectedIndex !== -1 ? warbandData.characters[selectedIndex] : null;
		const result = handleSpellcasterChangeUtil(currentCharacter, originalCharacter, checked);
		if (result.success) {
			warbandStore.updateCurrentCharacter({
				isSpellcaster: checked,
				items: [...currentCharacter.items]
			});

			if (result.removedItems.length > 0) {
				if (result.refundAmount > 0) {
					warbandStore.updateGold(warbandData.gold + result.refundAmount);
				}
				const itemMessages = result.removedItems.map((item) => {
					const message = `${item.name} was removed as it is a restricted item for Spellcasters`;
					return item.cost > 0 ? `${message} (${item.cost} gold refunded)` : message;
				});
				const refundMessage =
					result.refundAmount > 0 ? `\n\nTotal gold refunded: ${result.refundAmount}` : '';
				alert(itemMessages.join('\n') + refundMessage);
			}
		}
	};

	const handleModalClose = () => {
		unlockBodyScroll();
		warbandStore.closeModal();
	};

	const handleModalBackgroundClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			unlockBodyScroll();
			warbandStore.closeModal();
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && showModal) {
			unlockBodyScroll();
			warbandStore.closeModal();
		}
	};

	$: if (showModal) {
		lockBodyScroll();
	}

	onMount(() => {
		return () => {
			unlockBodyScroll();
		};
	});

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		try {
			await warbandStore.saveCharacter(currentCharacter, selectedIndex);
			unlockBodyScroll();
		} catch (error) {
			console.error('Error saving character', error);
			alert('Error saving character. Please try again.');
		}
	};

	let showItemActionModal = false;
	let selectedItemIndex: number | null = null;
	let selectedItemName = '';
	let selectedItemRefundAmount: number | undefined = undefined;
</script>

{#if showModal}
	<div
		class="fixed inset-0 z-10 flex items-start justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-[6px] sm:items-center"
		on:click={handleModalBackgroundClick}
		on:keydown={handleKeydown}
		tabindex="-1"
		role="presentation"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<dialog
			open
			transition:scale
			class="relative h-[80vh] w-full max-w-2xl overflow-y-auto border-2 border-white/30 bg-white p-3 pr-4 text-black shadow sm:w-11/12 sm:p-4 sm:pr-6"
			aria-labelledby="modal-title"
			aria-modal="true"
			on:click|stopPropagation={() => {}}
		>
			<CloseButton onClick={handleModalClose} />
			<h2 id="modal-title" class="jacquard-24-regular mb-4 text-xl font-bold sm:text-2xl">
				{selectedIndex === -1 ? 'Add Character' : 'Edit Character'}
			</h2>
			<form on:submit|preventDefault={handleSubmit} class="lora space-y-3 sm:space-y-4">
				<div>
					<p class="jacquard-24-regular text-xl font-bold text-black sm:text-2xl">Name:</p>
					<input
						type="text"
						bind:value={currentCharacter.name}
						class="lora w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-black sm:text-lg"
					/>
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
					<div>
						<p class="jacquard-24-regular text-xl font-bold text-black sm:text-2xl">
							Spellcaster {#if !(hasSpellcaster && !currentCharacter.isSpellcaster)}<span
									class="text-sm text-gray-500">(5 gold)</span
								>{/if}
						</p>
						<div class="flex h-[42px] items-center">
							<label
								class="flex items-center gap-2 {hasSpellcaster && !currentCharacter.isSpellcaster
									? 'text-gray-400 hover:cursor-not-allowed'
									: 'text-black hover:cursor-pointer'}"
							>
								<input
									type="checkbox"
									class="hidden"
									checked={currentCharacter.isSpellcaster}
									on:change={(e) => handleSpellcasterChange(e.currentTarget.checked)}
									disabled={(hasSpellcaster && !currentCharacter.isSpellcaster) ||
										availableGoldBefore < 5 ||
										currentCharacter.inventory < 2}
								/>
								<span
									class="inline-flex h-[42px] w-[42px] items-center justify-center rounded border-2 border-current {currentCharacter.isSpellcaster
										? 'text-purple-500'
										: 'text-gray-400'}"
								>
									{#if currentCharacter.isSpellcaster}
										<InvertedCrossSVG />
									{/if}
								</span>
							</label>
						</div>
						{#if hasSpellcaster && !currentCharacter.isSpellcaster}
							<span class="mt-1 text-sm text-gray-400"
								>Only one spellcaster allowed per warband</span
							>
						{:else if availableGoldBefore < 5}
							<span class="mt-1 text-sm text-gray-400">Requires 5 gold</span>
						{:else if currentCharacter.inventory < 2}
							<span class="mt-1 text-sm text-gray-400">Requires at least 2 inventory slots</span>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
					{#each stats as stat}
						<div>
							<p class="jacquard-24-regular text-xl font-bold text-black sm:text-2xl">
								{stat.label}:
							</p>
							<select
								value={currentCharacter[stat.key as keyof Character]}
								class="lora w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-black"
								on:change={(e) =>
									stat.key === 'strength'
										? handleStrengthChange(e)
										: handleStatChange(e, stat.key as StatKey)}
							>
								{#each statValues as value}
									<option {value}>{value}</option>
								{/each}
							</select>
						</div>
					{/each}
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
					<div>
						<p class="jacquard-24-regular mb-2 text-xl font-bold text-black sm:text-2xl">HP</p>
						<div class="flex flex-col gap-1">
							<NumberControl
								label=""
								value={currentCharacter.hp}
								onUpdate={updateHP}
								minValue={0}
								maxValue={maxHP}
								disabled={selectedIndex === -1}
							/>
							<p class="text-sm text-gray-500">(Max: {maxHP})</p>
							{#if currentCharacter.toughness !== 0 || currentCharacter.feats.some((feat) => feats.find((f) => f.name === feat)?.statModifiers?.hp) || currentCharacter.flaws.some((flaw) => flaws.find((f) => f.name === flaw)?.statModifiers?.hp) || currentCharacter.injuries?.some((injury) => injuries.find((i) => i.name === injury)?.statModifiers?.hp)}
								<div class="mt-1 space-y-0.5">
									<ul class="text-sm">
										{#if currentCharacter.toughness !== 0}
											<li
												class={currentCharacter.toughness > 0 ? 'text-green-600' : 'text-red-500'}
											>
												{currentCharacter.toughness > 0 ? '+' : ''}{currentCharacter.toughness} (Toughness)
											</li>
										{/if}
										{#each currentCharacter.feats.filter((feat) => feats.find((f) => f.name === feat)?.statModifiers?.hp) as feat}
											{@const featObj = feats.find((f) => f.name === feat)}
											{#if featObj?.statModifiers?.hp}
												<li
													class={featObj.statModifiers.hp > 0 ? 'text-green-600' : 'text-red-500'}
												>
													{featObj.statModifiers.hp > 0 ? '+' : ''}{featObj.statModifiers.hp} ({feat})
												</li>
											{/if}
										{/each}
										{#each currentCharacter.flaws.filter((flaw) => flaws.find((f) => f.name === flaw)?.statModifiers?.hp) as flaw}
											{@const flawObj = flaws.find((f) => f.name === flaw)}
											{#if flawObj?.statModifiers?.hp}
												<li
													class={flawObj.statModifiers.hp > 0 ? 'text-green-600' : 'text-red-500'}
												>
													{flawObj.statModifiers.hp > 0 ? '+' : ''}{flawObj.statModifiers.hp} ({flaw})
												</li>
											{/if}
										{/each}
										{#each currentCharacter.injuries?.filter((injury) => injuries.find((i) => i.name === injury)?.statModifiers?.hp) || [] as injury}
											{@const injuryObj = injuries.find((i) => i.name === injury)}
											{#if injuryObj?.statModifiers?.hp}
												<li
													class={injuryObj.statModifiers.hp > 0 ? 'text-green-600' : 'text-red-500'}
												>
													{injuryObj.statModifiers.hp > 0 ? '+' : ''}{injuryObj.statModifiers.hp} ({injury})
												</li>
											{/if}
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					</div>

					<div>
						<p class="jacquard-24-regular mb-2 text-xl font-bold text-black sm:text-2xl">Armour</p>
						<div class="flex h-[42px] items-center">
							<span class="lora text-xl font-extrabold sm:text-2xl">{totalArmour}</span>
						</div>
						{#if currentCharacter.items.some((item) => items.find((i) => i.item === item)?.armour) || currentCharacter.feats.some((feat) => feats.find((f) => f.name === feat)?.statModifiers?.armour) || currentCharacter.flaws.some((flaw) => flaws.find((f) => f.name === flaw)?.statModifiers?.armour) || currentCharacter.injuries?.some((injury) => injuries.find((i) => i.name === injury)?.statModifiers?.armour)}
							<div class="mt-1 space-y-0.5">
								<ul class="text-sm">
									{#each currentCharacter.items.filter((item) => items.find((i) => i.item === item)?.armour) as item}
										{@const itemObj = items.find((i) => i.item === item)}
										{#if itemObj?.armour}
											<li class="text-green-600">
												+{itemObj.armour} ({item})
											</li>
										{/if}
									{/each}
									{#each currentCharacter.feats.filter((feat) => feats.find((f) => f.name === feat)?.statModifiers?.armour) as feat}
										{@const featObj = feats.find((f) => f.name === feat)}
										{#if featObj?.statModifiers?.armour}
											<li
												class={featObj.statModifiers.armour > 0 ? 'text-green-600' : 'text-red-500'}
											>
												{featObj.statModifiers.armour > 0 ? '+' : ''}{featObj.statModifiers.armour} ({feat})
											</li>
										{/if}
									{/each}
									{#each currentCharacter.flaws.filter((flaw) => flaws.find((f) => f.name === flaw)?.statModifiers?.armour) as flaw}
										{@const flawObj = flaws.find((f) => f.name === flaw)}
										{#if flawObj?.statModifiers?.armour}
											<li
												class={flawObj.statModifiers.armour > 0 ? 'text-green-600' : 'text-red-500'}
											>
												{flawObj.statModifiers.armour > 0 ? '+' : ''}{flawObj.statModifiers.armour} ({flaw})
											</li>
										{/if}
									{/each}
									{#each currentCharacter.injuries?.filter((injury) => injuries.find((i) => i.name === injury)?.statModifiers?.armour) || [] as injury}
										{@const injuryObj = injuries.find((i) => i.name === injury)}
										{#if injuryObj?.statModifiers?.armour}
											<li
												class={injuryObj.statModifiers.armour > 0
													? 'text-green-600'
													: 'text-red-500'}
											>
												{injuryObj.statModifiers.armour > 0 ? '+' : ''}{injuryObj.statModifiers
													.armour} ({injury})
											</li>
										{/if}
									{/each}
								</ul>
							</div>
						{/if}
					</div>

					<div>
						<p class="jacquard-24-regular mb-2 text-xl font-bold text-black sm:text-2xl">
							Inventory Slots
							{#if currentCharacter.isSpellcaster}
								<span class="lora block text-xs text-gray-500"
									>(2 slots needed for spellcaster)</span
								>
							{/if}
						</p>
						<div class="flex h-[42px] items-center">
							<span class="lora text-2xl font-extrabold">{currentCharacter.inventory}</span>
						</div>
						{#if currentCharacter.strength !== 0 || currentCharacter.items.some((item) => items.find((i) => i.item === item)?.extraInventorySlots) || currentCharacter.feats.some((feat) => feats.find((f) => f.name === feat)?.statModifiers?.extraInventorySlots) || currentCharacter.flaws.some((flaw) => flaws.find((f) => f.name === flaw)?.statModifiers?.extraInventorySlots) || currentCharacter.injuries?.some((injury) => injuries.find((i) => i.name === injury)?.statModifiers?.extraInventorySlots)}
							<div class="mt-1 space-y-0.5">
								<ul class="text-sm">
									{#if currentCharacter.strength !== 0}
										<li class={currentCharacter.strength > 0 ? 'text-green-600' : 'text-red-500'}>
											{currentCharacter.strength > 0 ? '+' : ''}{currentCharacter.strength} (Strength)
										</li>
									{/if}
									{#each currentCharacter.items.filter((item) => items.find((i) => i.item === item)?.extraInventorySlots) as item}
										{@const itemObj = items.find((i) => i.item === item)}
										<li class="text-green-600">
											+{itemObj?.extraInventorySlots} ({item})
										</li>
									{/each}
									{#each currentCharacter.feats.filter((feat) => feats.find((f) => f.name === feat)?.statModifiers?.extraInventorySlots) as feat}
										{@const featObj = feats.find((f) => f.name === feat)}
										{#if featObj?.statModifiers?.extraInventorySlots}
											<li
												class={featObj.statModifiers.extraInventorySlots > 0
													? 'text-green-600'
													: 'text-red-500'}
											>
												{featObj.statModifiers.extraInventorySlots > 0 ? '+' : ''}{featObj
													.statModifiers.extraInventorySlots} ({feat})
											</li>
										{/if}
									{/each}
									{#each currentCharacter.flaws.filter((flaw) => flaws.find((f) => f.name === flaw)?.statModifiers?.extraInventorySlots) as flaw}
										{@const flawObj = flaws.find((f) => f.name === flaw)}
										{#if flawObj?.statModifiers?.extraInventorySlots}
											<li
												class={flawObj.statModifiers.extraInventorySlots > 0
													? 'text-green-600'
													: 'text-red-500'}
											>
												{flawObj.statModifiers.extraInventorySlots > 0 ? '+' : ''}{flawObj
													.statModifiers.extraInventorySlots} ({flaw})
											</li>
										{/if}
									{/each}
									{#each currentCharacter.injuries?.filter((injury) => injuries.find((i) => i.name === injury)?.statModifiers?.extraInventorySlots) || [] as injury}
										{@const injuryObj = injuries.find((i) => i.name === injury)}
										{#if injuryObj?.statModifiers?.extraInventorySlots}
											<li
												class={injuryObj.statModifiers.extraInventorySlots > 0
													? 'text-green-600'
													: 'text-red-500'}
											>
												{injuryObj.statModifiers.extraInventorySlots > 0 ? '+' : ''}{injuryObj
													.statModifiers.extraInventorySlots} ({injury})
											</li>
										{/if}
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				</div>

				{#if currentCharacter.isSpellcaster}
					<div class="space-y-4">
						<ScrollSelector {currentCharacter} scrollType="clean" slotIndex={0} />
						<ScrollSelector {currentCharacter} scrollType="unclean" slotIndex={1} />
					</div>
				{/if}

				{#if currentCharacter.inventory > 0}
					<h3 class="jacquard-24-regular text-xl font-bold text-black sm:text-2xl">Items:</h3>
					<div class="space-y-4">
						{#each Array.from({ length: currentCharacter.inventory }, (_, index) => index) as i}
							{#if !currentCharacter.isSpellcaster || (i !== 0 && i !== 1)}
								<div class="flex items-center gap-2">
									<div class="flex-1">
										{#if currentCharacter.items[i] && currentCharacter.items[i] !== ''}
											<div class="flex items-center gap-2">
												<div
													class="lora flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-base text-black"
												>
													{currentCharacter.items[i]}
													{#if itemUsesAmmo(currentCharacter.items[i], items)}
														- {getInitialAmmo(currentCharacter.items[i], items)} Ammo
													{/if}
												</div>
												<button
													type="button"
													class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-400 text-xl font-bold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
													on:click={() => {
														const itemObj = items.find(
															(item) => item.item === currentCharacter.items[i]
														);
														selectedItemIndex = i;
														selectedItemName = currentCharacter.items[i];
														selectedItemRefundAmount =
															itemObj &&
															typeof itemObj.cost === 'number' &&
															itemObj.cost > 0 &&
															!currentCharacter.pickedUpItems?.includes(
																currentCharacter.items[i]
															) &&
															selectedIndex !== -1 &&
															originalItems.includes(currentCharacter.items[i])
																? itemObj.cost
																: undefined;
														showItemActionModal = true;
													}}
													aria-label="Remove item"
												>
													×
												</button>
											</div>
										{:else}
											<select
												class="lora w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-black hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
												value={currentCharacter.items[i] || ''}
												on:change={(e) => handleItemSelect(e, i)}
											>
												<option value="">Select an item</option>
												{#each items as option}
													<option
														value={option.item}
														disabled={option.cost > availableGold ||
															(currentCharacter.isSpellcaster &&
																isItemRestrictedForSpellcaster(option.item))}
													>
														{option.item} ({option.cost} Gold)
														{#if option.ammo !== undefined}
															- {option.ammo} Ammo
														{/if}
														{#if currentCharacter.isSpellcaster && isItemRestrictedForSpellcaster(option.item)}
															(Restricted for Spellcasters)
														{/if}
													</option>
												{/each}
											</select>
										{/if}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{/if}

				<div>
					<p class="jacquard-24-regular text-xl font-bold text-black sm:text-2xl">Feats:</p>
					{#if currentCharacter.feats.length > 0}
						<ul class="mb-2 space-y-2 text-lg">
							{#each currentCharacter.feats as feat}
								<div class="flex items-center gap-2">
									<div
										class="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-base text-black"
									>
										{feats.find((f) => f.name === feat)?.name || feat}
									</div>
									<div class="w-10">
										<button
											type="button"
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-400 text-xl font-bold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
											on:click={() => {
												const newChar = { ...currentCharacter };
												const featName = feat;
												const featObj = feats.find((f) => f.name === featName);
												if (featObj?.statModifiers?.extraInventorySlots) {
													newChar.inventory -= featObj.statModifiers.extraInventorySlots;
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
												newChar.feats = newChar.feats.filter((f) => f !== featName);
												warbandStore.updateCurrentCharacter(newChar);
											}}
											aria-label="Remove feat"
										>
											×
										</button>
									</div>
								</div>
							{/each}
						</ul>
					{/if}
					<div class="flex items-center gap-2">
						<select
							bind:value={featText}
							class="lora flex-1 rounded border border-gray-300 px-3 py-2 text-base hover:cursor-pointer"
							on:change={handleFeatChange}
						>
							<option value="">Select a feat...</option>
							{#each feats as feat}
								<option value={feat.name} disabled={currentCharacter.feats.includes(feat.name)}>
									{feat.name}
								</option>
							{/each}
						</select>
						<div class="w-10"></div>
					</div>
				</div>

				<div>
					<p class="jacquard-24-regular text-xl font-bold text-black sm:text-2xl">Flaws:</p>
					{#if currentCharacter.flaws.length > 0}
						<ul class="mb-2 space-y-2 text-lg">
							{#each currentCharacter.flaws as flaw}
								<div class="flex items-center gap-2">
									<div
										class="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-base text-black"
									>
										{flaws.find((f) => f.name === flaw)?.name || flaw}
									</div>
									<div class="w-10">
										<button
											type="button"
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-400 text-xl font-bold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
											on:click={() => {
												const newChar = { ...currentCharacter };
												const flawName = flaw;
												const flawObj = flaws.find((f) => f.name === flawName);
												if (flawObj?.statModifiers?.extraInventorySlots) {
													const newInventory =
														newChar.inventory - flawObj.statModifiers.extraInventorySlots;
													newChar.inventory = Math.max(2, newInventory);
													if (newChar.items.length > newInventory) {
														newChar.items = newChar.items.slice(0, newInventory);
													}
												}
												newChar.flaws = newChar.flaws.filter((f) => f !== flawName);
												warbandStore.updateCurrentCharacter(newChar);
											}}
											aria-label="Remove flaw"
										>
											×
										</button>
									</div>
								</div>
							{/each}
						</ul>
					{/if}

					<div class="flex items-center gap-2">
						<select
							bind:value={flawText}
							class="lora flex-1 rounded border border-gray-300 px-3 py-2 text-base hover:cursor-pointer"
							on:change={handleFlawChange}
						>
							<option value="">Select a flaw...</option>
							{#each flaws as flaw}
								<option value={flaw.name} disabled={currentCharacter.flaws.includes(flaw.name)}>
									{flaw.name}
								</option>
							{/each}
						</select>
						<div class="w-10"></div>
					</div>
				</div>

				<div>
					<p class="jacquard-24-regular text-xl font-bold text-black sm:text-2xl">Injuries:</p>
					{#if currentCharacter.injuries?.length > 0}
						<ul class="mb-2 space-y-2 text-lg">
							{#each currentCharacter.injuries as injury}
								<div class="flex items-center gap-2">
									<div
										class="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-base text-black"
									>
										{injuries.find((inj) => inj.name === injury)?.name || injury}
									</div>
									<div class="w-10">
										<button
											type="button"
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-400 text-xl font-bold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
											on:click={() => {
												const newChar = { ...currentCharacter };
												const injuryName = injury;
												const injuryObj = injuries.find((i) => i.name === injuryName);
												if (injuryObj?.statModifiers?.extraInventorySlots) {
													const newInventory =
														newChar.inventory - injuryObj.statModifiers.extraInventorySlots;
													newChar.inventory = Math.max(2, newInventory);
													if (newChar.items.length > newInventory) {
														newChar.items = newChar.items.slice(0, newInventory);
													}
												}
												newChar.injuries = newChar.injuries.filter((i) => i !== injuryName);
												warbandStore.updateCurrentCharacter(newChar);
											}}
											aria-label="Remove injury"
										>
											×
										</button>
									</div>
								</div>
							{/each}
						</ul>
					{/if}

					<div class="flex items-center gap-2">
						<select
							bind:value={injuryText}
							class="lora flex-1 rounded border border-gray-300 px-3 py-2 text-base hover:cursor-pointer"
							on:change={handleInjuryChange}
						>
							<option value="">Select an injury...</option>
							{#each injuries as injury}
								<option
									value={injury.name}
									disabled={currentCharacter.injuries?.includes(injury.name)}
								>
									{injury.name}
								</option>
							{/each}
						</select>
						<div class="w-10"></div>
					</div>
				</div>

				<Button
					type="submit"
					onClick={() => {}}
					variant="secondary"
					size="large"
					disabled={!canSave}
				>
					{selectedIndex === -1 ? 'Add Character' : 'Update Character'}
				</Button>
			</form>
		</dialog>
	</div>
{/if}

{#if showItemActionModal}
	<ItemActionModal
		itemName={selectedItemName}
		refundAmount={selectedItemRefundAmount}
		onClose={() => {
			showItemActionModal = false;
			selectedItemIndex = null;
			selectedItemName = '';
			selectedItemRefundAmount = undefined;
		}}
		onRefund={() => {
			if (selectedItemIndex !== null) {
				deleteItem(selectedItemIndex, true);
				showItemActionModal = false;
				selectedItemIndex = null;
				selectedItemName = '';
				selectedItemRefundAmount = undefined;
			}
		}}
		onDrop={() => {
			if (selectedItemIndex !== null) {
				dropItem(selectedItemIndex);
				showItemActionModal = false;
				selectedItemIndex = null;
				selectedItemName = '';
				selectedItemRefundAmount = undefined;
			}
		}}
	/>
{/if}

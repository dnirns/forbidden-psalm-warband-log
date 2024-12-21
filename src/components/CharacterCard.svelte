<script lang="ts">
	export let editCharacter;
	export let deleteCharacter;
	export let items;
	export let char;
	export let i;
</script>

<div class="space-y-2 rounded bg-gray-100 p-4 text-sm shadow sm:text-base">
	<h3 class="text-lg font-bold underline">{char.name || 'Unnamed Character'}</h3>
	<p><strong>Agility:</strong> {char.agility}</p>
	<p><strong>Presence:</strong> {char.presence}</p>
	<p><strong>Strength:</strong> {char.strength}</p>
	<p><strong>Toughness:</strong> {char.toughness}</p>
	<p><strong>Feats:</strong> {char.feats.join(', ')}</p>
	<p><strong>Flaws:</strong> {char.flaws.join(', ')}</p>
	<p><strong>HP:</strong> {char.hp}</p>
	<p><strong>Armour:</strong> {char.armour}</p>
	<p><strong>Inventory Slots:</strong> {char.inventory}</p>
	{#if char.inventory > 0}
		<p><strong>Items:</strong></p>
		<ol class="list-decimal px-4">
			{#each char.items as item}
				<li class="py-1">
					{#each items as matchedItem (matchedItem.item)}
						{#if matchedItem.item === item}
							{matchedItem.item} ({matchedItem.cost} gold)
						{/if}
					{/each}
					{#if !items.find((i: { item: any }) => i.item === item)}
						Empty
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
	<div class="space-x-2">
		<button
			type="button"
			class="rounded bg-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
			on:click={() => editCharacter(i)}>Edit</button
		>
		<button
			type="button"
			class="rounded bg-red-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
			on:click={() => deleteCharacter(i)}>Delete</button
		>
	</div>
</div>

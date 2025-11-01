# Forbidden Psalm Warband Tracker

**This is an unofficial, fan-made tool and is not affiliated with the creators of Forbidden Psalm.**

For the game rules, books, and information, please visit the official Forbidden Psalm website: https://www.forbiddenpsalm.com

---

A web application built with SvelteKit and Firebase to create, track, and manage your warbands for the Forbidden Psalm tabletop miniatures game. This tool allows you to manage your warband's characters, inventory, gold, and HP, with data saved in real-time to a Firestore database using Google authentication.

## Features

### Authentication & Data Persistence
- **Google Authentication**: Securely sign in with your Google account to save and access your warbands.
- **Real-time Database**: All changes are saved instantly to Firestore, allowing you to sync your data across devices.

### Warband Management
- **Custom Warband Name**: Set and edit your warband's name with inline editing.
- **Gold Tracking**: Track your warband's total gold with +/- controls.
- **XP Tracking**: Monitor your warband's experience points.
- **Warband Notes**: Keep persistent notes in a full-screen modal editor with auto-save.

### Character Management
- **Add/Edit/Delete**: Full character lifecycle management with confirmation modals.
- **Core Stats**: Track Agility, Presence, Strength, and Toughness (range: -10 to +10).
- **HP Tracking**: Monitor character health with:
  - Interactive "Hit" button to deal 1 damage during games.
  - Automatic calculation: Base HP (8) + Toughness + modifiers from feats/flaws/injuries.
  - Visual HP cap enforcement based on modified stats.
- **Death State**: Characters at 0 HP are visually marked as "DEAD" with a “revive" button to restore character to 1 HP.

### Dynamic Stat Calculations

The app automatically recalculates character stats based on multiple factors:

#### Armour
- Base armour from equipped items (Light/Medium/Heavy Armour).
- Additional armour from feats/flaws etc.
- Visual breakdown showing all contributing sources.

#### Movement
- Base movement: 5 inches.
- Modified by Agility stat and any Agility modifiers.
- Automatically updated when stats change.

#### Inventory Slots
- Base inventory: 5 slots.
- Automatically modified by Strength stat.
- Extra slots from items (e.g. Backpack provides +2 slots).
- Modified by feats/flaws/injuries.
- Minimum of 2 slots maintained at all times.
- Dynamically adjusts when items with slot bonuses are added/removed.

#### Stat Modifiers
All character stats can be modified by:
- **Feats**: Positive or mixed effects (e.g. "Meathead": +2 Strength, -1 Presence).
- **Flaws**: Negative or mixed effects (e.g. "Tough as nails": +2 HP, -1 Agility).
- **Injuries**: Permanent negative effects (e.g. "Broken Bones": -1 Agility)
- Hover tooltips show all modifiers contributing to each stat.
- Modified stats displayed as: `Base → Modified` (colour-coded green/red).

### Spellcaster System
- **Designation**: Mark one character per warband as a Spellcaster (costs 5 gold).
- **Restrictions**: 
  - Only one Spellcaster allowed per warband.
  - Requires at least 2 inventory slots.
  - Cannot use: Heavy Armour, Shields, or Two-handed weapons.
  - Restricted items are automatically removed when toggling Spellcaster on.
  - Gold is refunded for removed items (if originally purchased).
- **Scroll Slots**: 
  - First 2 inventory slots reserved for Clean and Unclean scrolls.
  - Dedicated scroll selection interface.
  - Can pick up scrolls during games with type-specific restrictions.

### Inventory Management

#### Item System
- **Pre-defined Item List**: Select from weapons, armour, equipment, and consumables.
- **Cost Tracking**: Each item has a gold cost.
- **Purchase vs Pick-Up**: 
  - Items added during character creation/editing cost gold.
  - Items picked up during games are marked and don't cost gold.
- **Slot Management**: 
  - Items occupy inventory slots.
  - Some items provide extra slots (e.g. Backpack: uses 1 slot, provides +2).
  - Two-handed weapons cannot be used if restricted by injuries.
- **Visual Indicators**:
  - Picked-up items marked with "(Picked up)" label.
  - Restricted items shown with red strikethrough and reason.
  - Item descriptions available on hover/tap.

#### Dropping Items
When dropping an item:
- **Purchased Items**: Modal offers "Refund" (returns gold) or "Drop" (no refund).
- **Picked-Up Items**: Only "Drop" option available (no gold involved).
- Items with extra slots automatically adjust character's inventory capacity.

#### Ammo Tracking
- **Automatic Detection**: Weapons with ammo (Bow, Crossbow) are automatically tracked.
- **Ammo Counters**: Each ammo-using weapon displays current ammo count.
- **"Use" Button**: Decrements ammo by 1.
- **"Refill" Button**: Appears when ammo reaches 0, resets to initial amount.
- **Pure Ammo Items**: "Ammo" items are removed from inventory when last shot is used.
- **Independent Tracking**: Each weapon in each slot has its own ammo counter.

### Feats, Flaws & Injuries

#### Feats (Positive Abilities)
- Select from pre-defined list of feats.
- Can add multiple feats per character.
- May modify stats (e.g. "Clawed nails": +1 Agility, replaces fists).
- Hover for full feat descriptions.

#### Flaws (Negative Traits)
- Select from pre-defined list of flaws.
- Can add multiple flaws per character.
- May modify stats negatively (e.g. "Weak bodied": -1 HP).
- Hover for full flaw descriptions.

#### Injuries
- Add injuries during or after games.
- All injuries are negative or neutral.
- Can be removed with the × button.
- May impose item restrictions (e.g. "Lost Limb": one-handed weapons only, -1 slot).
- "Add Injury" modal with full descriptions.

### Gold Economy

The app automatically manages gold based on character costs:

#### Character Costs
- **Items**: Sum of all equipped item costs (excluding picked-up items).
- **Spellcaster**: +5 gold if character is a Spellcaster.
- **Total**: Displayed during character creation/editing.
- **Available Gold**: Shows remaining gold after current character's cost.

#### Automatic Transactions
- **Adding Character**: Deducts total cost from warband gold.
- **Editing Character**: Adjusts gold based on difference between old and new costs.
- **Deleting Character**: Refunds all gold spent on items and Spellcaster status.
- **Refund Modal**: Shows itemised refund breakdown before deletion.
- **Validation**: Cannot save character if insufficient gold available.

### Undo System
- **5-Second Toast**: Appears after destructive actions.
- **Undo Button**: Restores previous state.
- **Actions Supported**:
  - Character deletion.
  - Taking damage.
  - Picking up items.
  - Dropping items.
  - Adding/removing injuries.
  - Using ammo.
- **Toast Auto-Dismiss**: Undo option disappears after 5 seconds.

### User Interface

#### Character Cards
- **Stat Display**: Bullet-point lists with custom cross icons.
- **Interactive Elements**: 
  - Hover/tap tooltips for all stats, items, feats, flaws, injuries.
  - Colour-coded stat modifiers (green for positive, red for negative).
  - Compact buttons for in-game actions.

#### Modals
- **Character Modal**: Full-screen editor with form validation.
- **Pick Up Item Modal**: Tabbed interface (Inventory/Scrolls/Custom).
- **Injury Modal**: Dropdown with injury descriptions.
- **Delete Confirmation**: Shows gold refund breakdown.
- **Item Action Modal**: Choose between refund or drop.
- **Warband Notes**: Full-screen text-area with save indication.

---

**Made with ❤️ for the Forbidden Psalm community**

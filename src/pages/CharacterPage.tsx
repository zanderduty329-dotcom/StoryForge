import { useEffect, useMemo, useState } from "react";

import type { GameEffect } from "../lib/gameEffects";
import {
  readCampaignItemTemplates,
  saveCampaignItemTemplate,
} from "../lib/campaignItems";
import type {
  CampaignItemTemplate,
} from "../lib/campaignItems";
import {
  buildLegacyDefaultAction,
  cloneGameAction,
} from "../lib/gameActions";
import type {
  GameAction,
} from "../lib/gameActions";

import {
  getActiveCampaignStats,
  mergeCampaignStatDefaults,
  readCampaignRulesProfile,
} from "../lib/campaignRules";

import type {
  CampaignRulesProfile,
} from "../lib/campaignRules";
/*
 * Character inventory effects use the universal
 * StoryForge mechanical effect language.
 */
type ItemEffect = GameEffect;

type InventoryItem = {
  id: string;

  /*
   * Origin only — NOT a live synchronization link.
   */
  libraryTemplateId?: string;
  name: string;
  quantity: number;
  description?: string;
  equipped?: boolean;
  category?: string;
  damage?: string;
  armorBonus?: number;
  durability?: number;
  maxDurability?: number;
  uses?: number;

  /*
   * uses = current remaining uses
   * maxUses = fresh/default capacity
   */
  maxUses?: number;
  effects?: ItemEffect[];

  /*
   * A creation may expose multiple independently
   * resolvable actions.
   */
  actions?: GameAction[];
};

type CharacterStats = {
  health: number;
  armor: number;
  movementSpeed: number;
  damage: number;

  /*
   * Campaign-defined mechanical stats also live here
   * using their stable Campaign Stat ID.
   */
  [statId: string]: number;
};


type Character = {
 id: string;
  name: string;
  ancestry: string;
   role: string; 
kind: "player" | "npc";
level: number;
notes?: string;
description?: string;
personality?: string;

inventory?: InventoryItem[];

stats?: CharacterStats;
};

function buildCharacterStats(
  profile: CampaignRulesProfile,
  current: Record<string, unknown> = {}
): CharacterStats {
  const merged =
    mergeCampaignStatDefaults(
      profile,
      {
        health: 10,
        armor: 10,
        movementSpeed: 30,
        damage: 1,
        ...current,
      }
    );

  const result: CharacterStats = {
    health: 10,
    armor: 10,
    movementSpeed: 30,
    damage: 1,
  };

  for (
    const [key, value]
    of Object.entries(merged)
  ) {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      result[key] = value;
    }
  }

  return result;
}


const ancestries = [
  "Human",
  "Elf",
  "Dwarf",
  "Halfling",
  "Orc",
  "Goblin",
  "Gnome",
  "Dragonborn",
  "Tiefling",
  "Custom",
];
const roles = [
  "Fighter",
  "Rogue",
  "Ranger",
  "Wizard",
  "Sorcerer",
  "Cleric",
  "Paladin",
  "Bard",
  "Druid",
  "Monk",
  "Warlock",
  "Barbarian",
  "Custom",
];


type ItemTemplate = {
  name: string;
  category: string;
  description: string;
  armorRating?: number;
  damage?: string;

  /* Universal StoryForge mechanics carried by reusable templates. */
  /*
   * Present for campaign-owned templates.
   */
  libraryTemplateId?: string;

  /*
   * Starting uses for a fresh independent copy.
   */
  defaultUses?: number;

  effects?: GameEffect[];

  actions?: GameAction[];
};

function campaignTemplateToItemTemplate(
  template: CampaignItemTemplate
): ItemTemplate {
  return {
    libraryTemplateId: template.id,
    name: template.name,
    category: template.category,
    description: template.description,
    damage: template.damage,
    armorRating: template.armorRating,
    defaultUses: template.defaultUses,

    effects: template.effects.map((effect) => ({
      ...effect,

      ...(effect.tags
        ? {
            tags: [...effect.tags],
          }
        : {}),
    })),
  actions:
    template.actions?.map(
      (action) =>
        cloneGameAction(action)
    ) ?? [],

  };
}

/*
 * UI identity is separate from the displayed name.
 * Campaigns may contain creations with duplicate names.
 */
function itemTemplateKey(
  template: ItemTemplate
) {
  return template.libraryTemplateId
    ? `campaign:${template.libraryTemplateId}`
    : `builtin:${template.name}`;
}


const itemTemplates: ItemTemplate[] = [
  {
    name: "Leather Armor",
    category: "Armor",
    armorRating: 1,
    description: "Light leather protection.",
  },
  {
    name: "Studded Leather Armor",
    category: "Armor",
    armorRating: 1.5,
    description: "Leather armor reinforced with protective studs.",
  },
  {
    name: "Wooden Shield",
    category: "Shield",
    armorRating: 1,
    description: "A basic wooden shield.",
  },
  {
    name: "Dagger",
    category: "Weapon",
    damage: "1d4",
    description: "A small, quick melee weapon.",
  },
  {
    name: "Shortsword",
    category: "Weapon",
    damage: "1d6",
    description: "A light one-handed sword.",
  },
    {
      name: "Long Sword",
      category: "Weapon",
      damage: "1d6",
      description: "A versatile one-handed steel sword.",
    },
];

function randomItem(items: string[]) {
  return items[Math.floor(Math.random() * items.length)];
}
export function CharacterPage({ worldId }: { worldId: string }) {
  const [characters, setCharacters] = useState<Character[]>([]);
const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

const [effectEditor, setEffectEditor] = useState<{
  itemId: string;
  effect: ItemEffect;
  isNew: boolean;
} | null>(null);

  const [actionEditor, setActionEditor] = useState<{
    itemId: string;
    action: GameAction;
    isNew: boolean;
  } | null>(null);
  const storageKey = `storyforge-characters-${worldId}`;

    const rulesProfile =
      useMemo(
        () =>
          readCampaignRulesProfile(
            worldId
          ),
        [worldId]
      );

    const campaignStats =
      useMemo(
        () =>
          getActiveCampaignStats(
            rulesProfile
          ),
        [rulesProfile]
      );
const updateInventoryItem = (
    itemId: string,
    changes: Partial<InventoryItem>
  ) => {
    if (!selectedCharacter) return;

    const updatedCharacter = {
      ...selectedCharacter,
      inventory: (selectedCharacter.inventory ?? []).map((inventoryItem) =>
        inventoryItem.id === itemId
          ? { ...inventoryItem, ...changes }
          : inventoryItem
      ),
    };

    setSelectedCharacter(updatedCharacter);

    setCharacters((old) => {
      const updated = old.map((character) =>
        character.id === updatedCharacter.id
          ? updatedCharacter
          : character
      );

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const [name, setName] = useState("");

const [itemName, setItemName] = useState("");
const [itemQuantity, setItemQuantity] = useState(1);
const [itemDescription, setItemDescription] = useState("");
const [itemDamage, setItemDamage] = useState("");
const [itemTemplateName, setItemTemplateName] = useState("Create New Item");
const [itemTemplateSearch, setItemTemplateSearch] = useState("");
const [customItemTemplates, setCustomItemTemplates] = useState<ItemTemplate[]>([]);
const [showStats, setShowStats] = useState(false);
const [showInventory, setShowInventory] = useState(false);
const [inventorySearch, setInventorySearch] = useState("");
const [showDescription, setShowDescription] = useState(false);
const [showPersonality, setShowPersonality] = useState(false);
const [showNotes, setShowNotes] = useState(false);
const [itemCategory, setItemCategory] = useState("Weapon");

  const allItemTemplates = [
    ...itemTemplates,
    ...customItemTemplates,
  ];

  useEffect(() => {
    /*
     * campaignItems.ts also handles one-time migration
     * from the old StoryForge Compendium storage.
     */
    const campaignTemplates =
      readCampaignItemTemplates(worldId);

    setCustomItemTemplates(
      campaignTemplates.map(
        campaignTemplateToItemTemplate
      )
    );
  }, [worldId]);

  useEffect(() => {
  try {
    const saved =
      localStorage.getItem(
        storageKey
      );

    const parsed: unknown =
      saved
        ? JSON.parse(saved)
        : [];

    const rows: Character[] =
      Array.isArray(parsed)
        ? parsed
        : [];

    const upgraded =
      rows.map(
        (character) => ({
          ...character,

          level:
            character.level ?? 1,

          inventory:
            character.inventory ?? [],

          stats:
            buildCharacterStats(
              rulesProfile,
              character.stats ?? {}
            ),
        })
      );

    setCharacters(upgraded);

    localStorage.setItem(
      storageKey,
      JSON.stringify(upgraded)
    );
  } catch {
    setCharacters([]);
  }
}, [storageKey, rulesProfile]);
   const [ancestry, setAncestry] = useState("Human");
  const [role, setRole] = useState("Fighter");
const [kind, setKind] = useState<"player" | "npc">("player");
  const createCharacter = () => {
    const character: Character = {
      id: crypto.randomUUID(),
      name: name.trim() || "Unnamed Character",
      ancestry,
      role,
      kind,
level: 1,
inventory: [],
stats:
    buildCharacterStats(
      rulesProfile
    ),
    };

setCharacters((old) => {
  const updated = [...old, character];
  localStorage.setItem(storageKey, JSON.stringify(updated));
  return updated;
});    setName("");
  };

  const surpriseMe = () => {
    setName(`Traveler ${Math.floor(Math.random() * 900) + 100}`);
    setAncestry(randomItem(ancestries.filter((item) => item !== "Custom")));
    setRole(randomItem(roles.filter((item) => item !== "Custom")));
  };
const updateStat = (
  stat: string,
  value: number
) => {
  if (!selectedCharacter?.stats) return;

  const updatedCharacter = {
    ...selectedCharacter,
    stats: {
      ...selectedCharacter.stats,
      [stat]: value,
    },
  };

  setSelectedCharacter(updatedCharacter);

  setCharacters((old) => {
    const updated = old.map((character) =>
      character.id === updatedCharacter.id
        ? updatedCharacter
        : character
    );

    localStorage.setItem(storageKey, JSON.stringify(updated));
    return updated;
  });
};
const effectiveArmor =
  (selectedCharacter?.stats?.armor ?? 0) +
  (selectedCharacter?.inventory ?? [])
    .filter((item) => item.equipped)
    .reduce((total, item) => total + (item.armorBonus ?? 0), 0);

  return (
    <div>
      <h2>🎭 Character Archive</h2>
      <p>World: {worldId}</p>

<select
  value={kind}
  onChange={(event) =>
    setKind(event.target.value as "player" | "npc")
  }
  style={{
    padding: "10px",
    marginRight: "10px",
    borderRadius: "8px",
  }}
>
  <option value="player">Player Character</option>
  <option value="npc">NPC</option>
</select>
      <h3>Create Character</h3>

      <input
        value={name}
        placeholder="Character name"
        onChange={(event) => setName(event.target.value)}
      />

<div style={{ marginTop: "12px" }}>
  <input
    list="creator-ancestry-options"
    value={ancestry}
    onChange={(event) => setAncestry(event.target.value)}
    placeholder="Ancestry"
  />

  <datalist id="creator-ancestry-options">
    {ancestries.map((item) => (
      <option key={item} value={item} />
    ))}
  </datalist>
</div>
<div style={{ marginTop: "12px" }}>
  <input
    list="creator-role-options"
    value={role}
    onChange={(event) => setRole(event.target.value)}
    placeholder="Role / Class"
  />

  <datalist id="creator-role-options">
    {roles.map((item) => (
      <option key={item} value={item} />
    ))}
  </datalist>
</div>
      <div style={{ marginTop: "16px" }}>
        <button className="btn" onClick={createCharacter}>
          + Create Character
        </button>

        <button
          className="btn"
          onClick={surpriseMe}
          style={{ marginLeft: "10px" }}
        >
          🎲 Surprise Me
        </button>
      </div>
      <h3 style={{ marginTop: "30px" }}>Player Characters</h3>

      {characters
        .filter((character) => !character.kind || character.kind === "player")
        .map((character) => (
<div
  key={character.id}
  onClick={() => {
    setShowStats(false);
    setShowInventory(false);
    setShowDescription(false);
    setShowPersonality(false);
    setShowNotes(false);
    setInventorySearch("");
    setSelectedCharacter(character);
  }}
  style={{ cursor: "pointer", marginBottom: "8px" }}
>
            🎭 {character.name} — {character.ancestry} {character.role}
          </div>
        ))}
      <h3 style={{ marginTop: "30px" }}>NPCs</h3>

      {characters
        .filter((character) => character.kind === "npc")
        .map((character) => (
<div
  key={character.id}
  onClick={() => {
    setShowStats(false);
    setShowInventory(false);
    setShowDescription(false);
    setShowPersonality(false);
    setShowNotes(false);
    setInventorySearch("");
    setSelectedCharacter(character);
  }}
  style={{ cursor: "pointer", marginBottom: "8px" }}
>
            👤 {character.name} — {character.ancestry} {character.role}
          </div>
        ))}
      {selectedCharacter && (
        <div
          style={{
            marginTop: "30px",
            padding: "18px",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          }}
        >
          <h3>
            {selectedCharacter.kind === "npc" ? "👤 NPC Sheet" : "🎭 Character Sheet"}
          </h3>

<label>
  <strong>Name:</strong>
  <input
    value={selectedCharacter.name}
    onChange={(event) => {
      const updatedCharacter = {
        ...selectedCharacter,
        name: event.target.value,
      };

      setSelectedCharacter(updatedCharacter);

      setCharacters((old) => {
        const updated = old.map((character) =>
          character.id === updatedCharacter.id
            ? updatedCharacter
            : character
        );

        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    }}
    style={{ marginLeft: "8px" }}
  />
</label>

<label>
  <strong>Ancestry:</strong>
  <input
    list="ancestry-options"
    value={selectedCharacter.ancestry}
    onChange={(event) => {
      const updatedCharacter = {
        ...selectedCharacter,
        ancestry: event.target.value,
      };

      setSelectedCharacter(updatedCharacter);

      setCharacters((old) => {
        const updated = old.map((character) =>
          character.id === updatedCharacter.id
            ? updatedCharacter
            : character
        );

        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    }}
    style={{ marginLeft: "8px" }}
  />

  <datalist id="ancestry-options">
    {ancestries.map((item) => (
      <option key={item} value={item} />
    ))}
  </datalist>
</label>

<label>
  <strong>Role/Class:</strong>
  <input
    list="role-options"
    value={selectedCharacter.role}
    onChange={(event) => {
      const updatedCharacter = {
        ...selectedCharacter,
        role: event.target.value,
      };

      setSelectedCharacter(updatedCharacter);

      setCharacters((old) => {
        const updated = old.map((character) =>
          character.id === updatedCharacter.id
            ? updatedCharacter
            : character
        );

        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    }}
    style={{ marginLeft: "8px" }}
  />

  <datalist id="role-options">
    {roles.map((item) => (
      <option key={item} value={item} />
    ))}
  </datalist>
</label>

<label>
  <strong>Level:</strong>
  <input
    type="number"
    min="1"
    value={selectedCharacter.level}
    onChange={(event) => {
      const updatedCharacter = {
        ...selectedCharacter,
        level: Number(event.target.value),
      };

      setSelectedCharacter(updatedCharacter);

      setCharacters((old) => {
        const updated = old.map((character) =>
          character.id === updatedCharacter.id
            ? updatedCharacter
            : character
        );

        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    }}
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label>
{selectedCharacter.stats && (
  <div style={{ marginTop: "20px" }}>
<button
  className="btn"
  onClick={() => setShowStats((old) => !old)}
>
  {showStats ? "▼" : "▶"} Stats
</button>
{showStats && (
  <div style={{ marginTop: "12px" }}>

<label>
  ❤️ Health:
  <input
    type="number"
    value={selectedCharacter.stats.health}
    onChange={(event) => {
      const updatedCharacter = {
        ...selectedCharacter,
        stats: {
          ...selectedCharacter.stats!,
          health: Number(event.target.value),
        },
      };

      setSelectedCharacter(updatedCharacter);

      setCharacters((old) => {
        const updated = old.map((character) =>
          character.id === updatedCharacter.id
            ? updatedCharacter
            : character
        );

        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    }}
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label>
 
  <label>
  🛡️ Armor:
  <input
    type="number"
    value={selectedCharacter.stats.armor}
    onChange={(event) =>
      updateStat("armor", Number(event.target.value))
    }
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label>

  <br />

  <label>
    👣 Movement Speed:
    <input
      type="number"
      min={0}
      value={selectedCharacter.stats.movementSpeed}
      onChange={(event) =>
        updateStat("movementSpeed", Number(event.target.value))
      }
      style={{ marginLeft: "8px", width: "80px" }}
    />
    <span style={{ marginLeft: "4px" }}>ft / turn</span>
  </label>

  <br />

<label>
  ⚔️ Damage:
  <input
    type="number"
    value={selectedCharacter.stats.damage}
    onChange={(event) =>
      updateStat("damage", Number(event.target.value))
    }
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label>
<div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(190px, 1fr))",
      gap: "10px",
      marginTop: "12px",
    }}
  >
    {campaignStats.map((stat) => (
      <label
        key={stat.id}
        title={stat.description}
      >
        {stat.label}
        {stat.shortLabel
          ? ` (${stat.shortLabel})`
          : ""}
        :

        <input
          type="number"
          value={
            selectedCharacter.stats?.[
              stat.id
            ] ??
            stat.defaultScore
          }
          onWheel={(event) =>
            event.currentTarget.blur()
          }
          onKeyDown={(event) => {
            if (
              event.key === "ArrowUp" ||
              event.key === "ArrowDown"
            ) {
              event.preventDefault();
            }
          }}
          onChange={(event) =>
            updateStat(
              stat.id,
              Number(
                event.target.value
              )
            )
          }
          style={{
            marginLeft: "8px",
            width: "80px",
          }}
        />
      </label>
    ))}
  </div>

  </div>
)}
</div>
)}

<div style={{ marginTop: "20px" }}>
<button
  className="btn"
  onClick={() => setShowInventory((old) => !old)}
>
  {showInventory ? "▼" : "▶"} Inventory & Equipment
</button>
{showInventory && (
  <div style={{ marginTop: "12px" }}>


    <label style={{ display: "block", marginBottom: "8px" }}>
      <span style={{ display: "block", marginBottom: "4px" }}>
          Search Compendium Items
      </span>

        <input
          value={itemTemplateSearch}
          onChange={(event) => setItemTemplateSearch(event.target.value)}
          placeholder="Search items..."
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "8px",
            borderRadius: "8px",
          }}
        />

        {itemTemplateSearch.trim() && (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "8px",
              overflow: "hidden",
              marginBottom: "8px",
            }}
          >
            {allItemTemplates
              .filter((template) =>
                `${template.name} ${template.category}`
                  .toLowerCase()
                  .includes(itemTemplateSearch.toLowerCase())
              )
              .map((template) => (
                <button
                  key={itemTemplateKey(template)}
                  type="button"
                  onClick={() => {
                    setItemTemplateName(itemTemplateKey(template));
                    setItemTemplateSearch(template.name);
                    setItemName(template.name);
                    setItemCategory(template.category);
                    setItemDescription(template.description);
                    setItemDamage(template.damage ?? "");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px",
                    textAlign: "left",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                >
                  <strong>{template.name}</strong>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.85em",
                      opacity: 0.75,
                      marginTop: "2px",
                    }}
                  >
                    {template.category}
                    {template.armorRating !== undefined
                      ? ` • Rating ${template.armorRating} • Durability ${Math.round(
                          template.armorRating * 10
                        )}`
                      : ""}
                    {template.damage
                      ? ` • Damage ${template.damage}`
                      : ""}
                  </span>
                </button>
              ))}

            {allItemTemplates.filter((template) =>
              `${template.name} ${template.category}`
                .toLowerCase()
                .includes(itemTemplateSearch.toLowerCase())
            ).length === 0 && (
              <button
                type="button"
                onClick={() => {
                  const newName = itemTemplateSearch.trim();

                  setItemTemplateName("Create New Item");
                  setItemName(newName);
                  setItemCategory("Weapon");
                  setItemDescription("");
                  setItemDamage("");
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px",
                  textAlign: "left",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                + Create "{itemTemplateSearch.trim()}"
              </button>
            )}
          </div>
        )}
    </label>

  <input
    value={itemName}
    onChange={(event) => setItemName(event.target.value)}
    placeholder="Item name"
  />
<input
  list="item-category-options"
  value={itemCategory}
  onChange={(event) => setItemCategory(event.target.value)}
  placeholder="Item Type"
  style={{
    padding: "8px",
    marginTop: "8px",
    marginRight: "8px",
    borderRadius: "8px",
  }}
/>
<datalist id="item-category-options">
  <option value="Weapon" />
  <option value="Armor" />
  <option value="Shield" />
  <option value="Consumable" />
  <option value="Tool" />
  <option value="Other" />
</datalist>

  {itemTemplateName === "Create New Item" && (
    <label style={{ display: "block", marginTop: "8px" }}>
      <span style={{ display: "block", marginBottom: "4px" }}>
        Base Formula / Damage (optional)
      </span>
      <input
        value={itemDamage}
        onChange={(event) => setItemDamage(event.target.value)}
        placeholder="Examples: 1d6, 2d8+3, 10"
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "8px",
        }}
      />
    </label>
  )}


  <input
    type="number"
    min="1"
    value={itemQuantity}
    onChange={(event) => setItemQuantity(Number(event.target.value))}
    style={{ marginLeft: "8px", width: "70px" }}
  />

  <input
    value={itemDescription}
    onChange={(event) => setItemDescription(event.target.value)}
    placeholder="Short description"
    style={{ marginLeft: "8px" }}
  />
<button
  className="btn"
  onClick={() => {
        const typedItemName = itemName.trim();

        const selectedItemTemplate =
          allItemTemplates.find(
            (template) =>
              itemTemplateKey(template) ===
              itemTemplateName
          );

        const newItemName =
          typedItemName || selectedItemTemplate?.name || "";

        if (!newItemName) return;

      const newItemCategory =
        selectedItemTemplate?.category ||
        itemCategory.trim() ||
        "Other";

      const newItemDescription =
        selectedItemTemplate?.description ||
        itemDescription.trim();

      const startingArmorRating =
        selectedItemTemplate?.armorRating ?? 0;

      const startingMaxDurability =
        Math.round(startingArmorRating * 10);

        const startingBaseFormula =
          itemDamage.trim() || selectedItemTemplate?.damage || "";

      const newItem: InventoryItem = {
          id: crypto.randomUUID(),

          ...(selectedItemTemplate?.libraryTemplateId
            ? {
                libraryTemplateId:
                  selectedItemTemplate.libraryTemplateId,
              }
            : {}),

          ...(selectedItemTemplate?.defaultUses !== undefined
            ? {
                uses:
                  selectedItemTemplate.defaultUses,

                maxUses:
                  selectedItemTemplate.defaultUses,
              }
            : {}),
        effects:
          (selectedItemTemplate?.effects ?? []).map(
            (effect) => ({
              ...effect,
              id: crypto.randomUUID(),
              ...(effect.tags
                ? {
                    tags: [...effect.tags],
                  }
                : {}),
            })
          ),
        actions:
            (selectedItemTemplate?.actions ?? []).map(
              (action) =>
                cloneGameAction(
                  action,
                  {
                    newId: true,
                    newEffectIds: true,
                  }
                )
            ),

          name: newItemName,
        category: newItemCategory,
        quantity: Math.max(1, itemQuantity),
        description: newItemDescription,

        ...(newItemCategory === "Armor" || newItemCategory === "Shield"
          ? {
              armorBonus: startingArmorRating,
              maxDurability: startingMaxDurability,
              durability: startingMaxDurability,
            }
          : {}),

        ...(startingBaseFormula
            ? {
                damage: startingBaseFormula,
              }
            : {}),
      };

    const updatedCharacter = {
      ...selectedCharacter,
      inventory: [...(selectedCharacter.inventory ?? []), newItem],
    };

    setSelectedCharacter(updatedCharacter);

    setCharacters((old) => {
      const updated = old.map((character) =>
        character.id === updatedCharacter.id
          ? updatedCharacter
          : character
      );

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

        setItemName("");
    setItemQuantity(1);
    setItemDescription("");
      setItemDamage("");
    setItemCategory("Weapon");
      setItemTemplateName("Create New Item");
      setItemTemplateSearch("");
  }}
  style={{ marginLeft: "8px" }}
>
  Add Item
</button>

  <label style={{ display: "block", marginTop: "16px" }}>
  Search this character's inventory
  <input
    type="search"
    value={inventorySearch}
    onChange={(event) => setInventorySearch(event.target.value)}
    placeholder="Search carried items..."
    style={{
      display: "block", width: "100%", padding: "8px",
      marginTop: "6px", borderRadius: "8px"
    }}
  />
</label>

{!(selectedCharacter.inventory ?? []).some((item) =>
  item.name.toLowerCase().includes(inventorySearch.trim().toLowerCase())
) && <p>No carried items match.</p>}

{(selectedCharacter.inventory ?? [])
  .filter((item) =>
    item.name.toLowerCase().includes(inventorySearch.trim().toLowerCase())
  )
  .map((item) => (
  <details
    key={item.id}
    style={{
      marginTop: "12px",
      padding: "10px",
      border: "1px solid var(--border)",
      borderRadius: "8px",
    }}
  >
    <summary style={{ cursor: "pointer", padding: "4px" }}>
      <strong>{item.name || "Unnamed Item"}</strong>
      {" · "}{item.category || "Other"}
      {item.equipped ? " · Equipped" : ""}
    </summary>

      <label style={{ display: "block" }}>
        <span style={{ display: "block", marginBottom: "4px" }}>
          Item Name
        </span>
    <input
      value={item.name}
      onChange={(event) => {
        const updatedInventory = (selectedCharacter.inventory ?? []).map(
          (inventoryItem) =>
            inventoryItem.id === item.id
              ? { ...inventoryItem, name: event.target.value }
              : inventoryItem
        );

        const updatedCharacter = {
          ...selectedCharacter,
          inventory: updatedInventory,
        };

        setSelectedCharacter(updatedCharacter);

        setCharacters((old) => {
          const updated = old.map((character) =>
            character.id === updatedCharacter.id
              ? updatedCharacter
              : character
          );

          localStorage.setItem(storageKey, JSON.stringify(updated));
          return updated;
        });
      }}
    />
      </label>

      <label style={{ display: "block", marginTop: "8px" }}>
        <span style={{ display: "block", marginBottom: "4px" }}>
          Item Type
        </span>
      <input
        list="item-category-options"
        value={item.category ?? "Other"}
        onChange={(event) => {
          const updatedInventory = (selectedCharacter.inventory ?? []).map(
            (inventoryItem) =>
              inventoryItem.id === item.id
                ? { ...inventoryItem, category: event.target.value }
                : inventoryItem
          );

          const updatedCharacter = {
            ...selectedCharacter,
            inventory: updatedInventory,
          };

          setSelectedCharacter(updatedCharacter);

          setCharacters((old) => {
            const updated = old.map((character) =>
              character.id === updatedCharacter.id
                ? updatedCharacter
                : character
            );

            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
          });
        }}
        placeholder="Item Type"
        style={{
          display: "block",
          width: "100%",
          marginTop: "8px",
          padding: "8px",
          borderRadius: "8px",
        }}
      />
      </label>

      <label style={{ display: "block", marginTop: "8px" }}>
        <span style={{ display: "block", marginBottom: "4px" }}>
          Quantity
        </span>
<input
  type="number"
  min="1"
  value={item.quantity}
  onChange={(event) => {
    const updatedInventory = (selectedCharacter.inventory ?? []).map(
      (inventoryItem) =>
        inventoryItem.id === item.id
          ? {
              ...inventoryItem,
              quantity: Math.max(1, Number(event.target.value)),
            }
          : inventoryItem
    );

    const updatedCharacter = {
      ...selectedCharacter,
      inventory: updatedInventory,
    };

    setSelectedCharacter(updatedCharacter);

    setCharacters((old) => {
      const updated = old.map((character) =>
        character.id === updatedCharacter.id
          ? updatedCharacter
          : character
      );

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }}
  style={{ marginLeft: "8px", width: "70px" }}
/>
      </label>
  {(
    <label style={{ display: "block", marginTop: "8px" }}>
      <span style={{ display: "block", marginBottom: "4px" }}>
        Base Formula / Damage
      </span>

      <input
        value={item.damage ?? ""}
        onChange={(event) => {
          const updatedInventory = (selectedCharacter.inventory ?? []).map(
            (inventoryItem) =>
              inventoryItem.id === item.id
                ? { ...inventoryItem, damage: event.target.value }
                : inventoryItem
          );

          const updatedCharacter = {
            ...selectedCharacter,
            inventory: updatedInventory,
          };

          setSelectedCharacter(updatedCharacter);

          setCharacters((old) => {
            const updated = old.map((character) =>
              character.id === updatedCharacter.id
                ? updatedCharacter
                : character
            );

            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
          });
        }}
        placeholder="Example: 1d4"
        style={{
          display: "block",
          width: "100%",
          padding: "8px",
          borderRadius: "8px",
        }}
      />
    </label>
  )}

  {(
    <div
      style={{
        marginTop: "12px",
        padding: "12px",
        border: "1px solid var(--border)",
        borderRadius: "8px",
      }}
    >
      <strong>Effects</strong>

      {(item.effects ?? []).length === 0 &&
        effectEditor?.itemId !== item.id && (
          <p style={{ marginBottom: "8px", opacity: 0.75 }}>
            No effects added.
          </p>
        )}

      {(item.effects ?? []).map((effect) => {
        const saveLabel = effect.saveStat
          ? `${effect.saveStat.slice(0, 3).toUpperCase()}${
              effect.saveDC !== undefined ? ` DC ${effect.saveDC}` : ""
            }`
          : "";

        const durationLabel =
          effect.durationMode === "until-save"
            ? "Until successful save"
            : effect.durationMode === "manual"
              ? "Until manually ended"
              : effect.durationMode === "fixed"
                ? `${effect.duration ?? "?"} ${
                    effect.durationUnit === "affected-turns"
                      ? "affected turns"
                      : effect.durationUnit === "source-turns"
                        ? "source turns"
                        : "rounds"
                  }`
                : "";

        const summary = [
          saveLabel,
          effect.damage,
          durationLabel,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <button
            key={effect.id}
            type="button"
            onClick={() =>
              setEffectEditor({
                itemId: item.id,
                effect: { ...effect },
                isNew: false,
              })
            }
            style={{
              display: "block",
              width: "100%",
              marginTop: "8px",
              padding: "10px",
              textAlign: "left",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <strong>{effect.name || "Unnamed Effect"}</strong>

            {summary && (
              <span
                style={{
                  display: "block",
                  marginTop: "3px",
                  opacity: 0.75,
                }}
              >
                {summary}
              </span>
            )}
          </button>
        );
      })}

      {effectEditor?.itemId !== item.id && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ marginTop: "10px" }}
          onClick={() =>
            setEffectEditor({
              itemId: item.id,
              isNew: true,
              effect: {
                id: crypto.randomUUID(),
                name: "",
                trigger: "on-hit",
                saveStat: "",
                damage: "",
                damageType: "",
                frequency: "immediate",
                durationMode: "manual",
                duration: 1,
                durationUnit: "rounds",
                notes: "",
              },
            })
          }
        >
          + Add Effect
        </button>
      )}

      {effectEditor?.itemId === item.id && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
        >
          <strong>
            {effectEditor.isNew
              ? "Add Weapon Effect"
              : "Edit Weapon Effect"}
          </strong>

          <label style={{ display: "block", marginTop: "10px" }}>
            <span style={{ display: "block", marginBottom: "4px" }}>
              Effect Name
            </span>

            <input
              value={effectEditor.effect.name}
              onChange={(event) =>
                setEffectEditor({
                  ...effectEditor,
                  effect: {
                    ...effectEditor.effect,
                    name: event.target.value,
                  },
                })
              }
              placeholder="Example: Bleeding"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
              }}
            />
          </label>

          <label style={{ display: "block", marginTop: "10px" }}>
            <span style={{ display: "block", marginBottom: "4px" }}>
              Trigger
            </span>

            <select
              value={effectEditor.effect.trigger ?? "on-hit"}
              onChange={(event) =>
                setEffectEditor({
                  ...effectEditor,
                  effect: {
                    ...effectEditor.effect,
                    trigger: event.target.value,
                  },
                })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <option value="on-hit">On hit</option>
              <option value="on-damage">After weapon damage</option>
              <option value="manual">Manual / DM triggered</option>
            </select>
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <label>
              <span style={{ display: "block", marginBottom: "4px" }}>
                Saving Throw
              </span>

              <select
                value={effectEditor.effect.saveStat ?? ""}
                onChange={(event) => {
                  const saveStat = event.target.value;

                  setEffectEditor({
                    ...effectEditor,
                    effect: {
                      ...effectEditor.effect,
                      saveStat,
                      ...(saveStat === ""
                        ? { saveDC: undefined }
                        : {}),
                    },
                  });
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              >
                <option value="">None</option>

                {!!effectEditor.effect.saveStat &&
                  !campaignStats.some(
                    (stat) =>
                      stat.id ===
                      effectEditor.effect.saveStat
                  ) && (
                  <option
                    value={
                      effectEditor.effect.saveStat
                    }
                  >
                    {
                      rulesProfile.stats.find(
                        (stat) =>
                          stat.id ===
                          effectEditor.effect.saveStat
                      )?.label ??
                      effectEditor.effect.saveStat
                    } (archived / custom)
                  </option>
                )}

                {campaignStats.map(
                  (stat) => (
                    <option
                      key={stat.id}
                      value={stat.id}
                    >
                      {stat.label}
                    </option>
                  )
                )}
              </select>
            </label>

            {!!effectEditor.effect.saveStat && (
              <label>
                <span style={{ display: "block", marginBottom: "4px" }}>
                  Save DC
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={effectEditor.effect.saveDC ?? ""}
                  onWheel={(event) => event.currentTarget.blur()}
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowUp" ||
                      event.key === "ArrowDown"
                    ) {
                      event.preventDefault();
                    }
                  }}
                  onChange={(event) =>
                    setEffectEditor({
                      ...effectEditor,
                      effect: {
                        ...effectEditor.effect,
                        saveDC:
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                      },
                    })
                  }
                  placeholder="12"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "8px",
                  }}
                />
              </label>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <label>
              <span style={{ display: "block", marginBottom: "4px" }}>
                Effect Damage
              </span>

              <input
                value={effectEditor.effect.damage ?? ""}
                onChange={(event) =>
                  setEffectEditor({
                    ...effectEditor,
                    effect: {
                      ...effectEditor.effect,
                      damage: event.target.value,
                    },
                  })
                }
                placeholder="Example: 1d6"
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: "4px" }}>
                Damage Type
              </span>

              <input
                value={effectEditor.effect.damageType ?? ""}
                onChange={(event) =>
                  setEffectEditor({
                    ...effectEditor,
                    effect: {
                      ...effectEditor.effect,
                      damageType: event.target.value,
                    },
                  })
                }
                placeholder="Example: Bleeding"
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>
          </div>

          <label style={{ display: "block", marginTop: "10px" }}>
            <span style={{ display: "block", marginBottom: "4px" }}>
              Frequency
            </span>

            <select
              value={effectEditor.effect.frequency ?? "immediate"}
              onChange={(event) =>
                setEffectEditor({
                  ...effectEditor,
                  effect: {
                    ...effectEditor.effect,
                    frequency: event.target.value,
                  },
                })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <option value="immediate">Immediately</option>

              <option value="start-affected-turn">
                Start of affected creature's turn
              </option>

              <option value="end-affected-turn">
                End of affected creature's turn
              </option>

              <option value="after-every-combatant-turn">
                After every combatant's turn
              </option>

              <option value="start-round">
                Start of every round
              </option>

              <option value="end-round">
                End of every round
              </option>

              <option value="manual">
                Manual / DM triggered
              </option>
            </select>
          </label>

          <label style={{ display: "block", marginTop: "10px" }}>
            <span style={{ display: "block", marginBottom: "4px" }}>
              Duration Mode
            </span>

            <select
              value={effectEditor.effect.durationMode ?? "manual"}
              onChange={(event) =>
                setEffectEditor({
                  ...effectEditor,
                  effect: {
                    ...effectEditor.effect,
                    durationMode: event.target.value as
                      | "fixed"
                      | "until-save"
                      | "manual",
                  },
                })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <option value="fixed">Fixed duration</option>

              <option value="until-save">
                Until successful save
              </option>

              <option value="manual">
                Until manually ended
              </option>
            </select>
          </label>

          {effectEditor.effect.durationMode === "fixed" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginTop: "10px",
              }}
            >
              <label>
                <span style={{ display: "block", marginBottom: "4px" }}>
                  Duration
                </span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={effectEditor.effect.duration ?? ""}
                  onWheel={(event) => event.currentTarget.blur()}
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowUp" ||
                      event.key === "ArrowDown"
                    ) {
                      event.preventDefault();
                    }
                  }}
                  onChange={(event) =>
                    setEffectEditor({
                      ...effectEditor,
                      effect: {
                        ...effectEditor.effect,
                        duration:
                          event.target.value === ""
                            ? undefined
                            : Math.max(
                                1,
                                Number(event.target.value)
                              ),
                      },
                    })
                  }
                  placeholder="3"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "8px",
                  }}
                />
              </label>

              <label>
                <span style={{ display: "block", marginBottom: "4px" }}>
                  Duration Unit
                </span>

                <select
                  value={
                    effectEditor.effect.durationUnit ?? "rounds"
                  }
                  onChange={(event) =>
                    setEffectEditor({
                      ...effectEditor,
                      effect: {
                        ...effectEditor.effect,
                        durationUnit: event.target.value as
                          | "rounds"
                          | "affected-turns"
                          | "source-turns",
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "8px",
                  }}
                >
                  <option value="rounds">Rounds</option>

                  <option value="affected-turns">
                    Affected creature turns
                  </option>

                  <option value="source-turns">
                    Source creature turns
                  </option>
                </select>
              </label>
            </div>
          )}

          {effectEditor.effect.durationMode === "until-save" &&
            !effectEditor.effect.saveStat && (
              <p role="alert" style={{ marginBottom: 0 }}>
                Select a saving throw so StoryForge knows which
                successful save ends this effect.
              </p>
            )}

          <label style={{ display: "block", marginTop: "10px" }}>
            <span style={{ display: "block", marginBottom: "4px" }}>
              Effect Notes
            </span>

            <textarea
              value={effectEditor.effect.notes ?? ""}
              onChange={(event) =>
                setEffectEditor({
                  ...effectEditor,
                  effect: {
                    ...effectEditor.effect,
                    notes: event.target.value,
                  },
                })
              }
              placeholder="Optional DM or rules notes."
              style={{
                width: "100%",
                minHeight: "70px",
                padding: "8px",
                borderRadius: "8px",
              }}
            />
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              {!effectEditor.isNew && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    updateInventoryItem(item.id, {
                      effects: (item.effects ?? []).filter(
                        (savedEffect) =>
                          savedEffect.id !== effectEditor.effect.id
                      ),
                    });

                    setEffectEditor(null);
                  }}
                >
                  Remove Effect
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEffectEditor(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const cleanEffect: ItemEffect = {
                    ...effectEditor.effect,
                    name:
                      effectEditor.effect.name.trim() ||
                      "Unnamed Effect",
                    damage:
                      effectEditor.effect.damage?.trim() || "",
                    damageType:
                      effectEditor.effect.damageType?.trim() || "",
                    notes:
                      effectEditor.effect.notes?.trim() || "",
                  };

                  const currentEffects = item.effects ?? [];

                  const updatedEffects = effectEditor.isNew
                    ? [...currentEffects, cleanEffect]
                    : currentEffects.map((savedEffect) =>
                        savedEffect.id === cleanEffect.id
                          ? cleanEffect
                          : savedEffect
                      );

                  updateInventoryItem(item.id, {
                    effects: updatedEffects,
                  });

                  setEffectEditor(null);
                }}
              >
                Save Effect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

  {/* STORYFORGE ACTION EDITOR V1 */}
    <div
      style={{
        marginTop: "14px",
        padding: "12px",
        border: "1px solid var(--border)",
        borderRadius: "8px",
      }}
    >
      <strong>Actions</strong>

      <p
        style={{
          marginTop: "5px",
          marginBottom: "10px",
          opacity: 0.72,
          fontSize: "0.9em",
        }}
      >
        Actions define how this creation can be used.
        Each action may contain its own effects.
      </p>

      {(item.actions ?? []).length === 0 && (
        <p
          style={{
            marginTop: "6px",
            opacity: 0.72,
          }}
        >
          No explicit actions added.
          StoryForge can still use the legacy base
          formula and effects until actions are created.
        </p>
      )}

      {(item.actions ?? []).map((action) => {
        const actionSummary = [
          action.resolution,
          action.range,
          action.effects.length > 0
            ? `${action.effects.length} effect${
                action.effects.length === 1
                  ? ""
                  : "s"
              }`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <button
            key={action.id}
            type="button"
            onClick={() =>
              setActionEditor({
                itemId: item.id,
                action:
                  cloneGameAction(action),
                isNew: false,
              })
            }
            style={{
              display: "block",
              width: "100%",
              marginTop: "8px",
              padding: "10px",
              textAlign: "left",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <strong>
              {action.name || "Unnamed Action"}
            </strong>

            {actionSummary && (
              <span
                style={{
                  display: "block",
                  marginTop: "3px",
                  opacity: 0.7,
                }}
              >
                {actionSummary}
              </span>
            )}
          </button>
        );
      })}

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginTop: "10px",
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={() =>
            setActionEditor({
              itemId: item.id,
              isNew: true,
              action: {
                id: crypto.randomUUID(),
                name: "",
                effects: [],
              },
            })
          }
        >
          + Add Action
        </button>

        {(item.actions ?? []).length === 0 &&
          (
            item.damage?.trim() ||
            (item.effects ?? []).length > 0
          ) && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              const legacyAction =
                buildLegacyDefaultAction({
                  creationName:
                    item.name,
                  damage:
                    item.damage,
                  effects:
                    item.effects,
                });

              /*
               * This opens a NEW editable action.
               * Nothing is stored until Save Action.
               */
              setActionEditor({
                itemId: item.id,
                action: legacyAction,
                isNew: true,
              });
            }}
          >
            Create Action from Current Mechanics
          </button>
        )}
      </div>

      {actionEditor?.itemId === item.id && (
        <div
          style={{
            marginTop: "14px",
            padding: "12px",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
        >
          <strong>
            {actionEditor.isNew
              ? "New Action"
              : "Edit Action"}
          </strong>

          <label
            style={{
              display: "block",
              marginTop: "10px",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              Action Name
            </span>

            <input
              value={actionEditor.action.name}
              onChange={(event) =>
                setActionEditor((current) =>
                  current
                    ? {
                        ...current,
                        action: {
                          ...current.action,
                          name:
                            event.target.value,
                        },
                      }
                    : current
                )
              }
              placeholder="Strike, Cast, Burst Fire, Activate..."
              style={{
                width: "100%",
                padding: "8px",
              }}
            />
          </label>

          <label
            style={{
              display: "block",
              marginTop: "8px",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              Description
            </span>

            <textarea
              value={
                actionEditor.action.description ??
                ""
              }
              onChange={(event) =>
                setActionEditor((current) =>
                  current
                    ? {
                        ...current,
                        action: {
                          ...current.action,
                          description:
                            event.target.value,
                        },
                      }
                    : current
                )
              }
              placeholder="What does this action represent?"
              rows={2}
              style={{
                width: "100%",
                padding: "8px",
              }}
            />
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "8px",
              marginTop: "8px",
            }}
          >
            <label>
              <span
                style={{
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Activation
              </span>

              <input
                value={
                  actionEditor.action.activation ??
                  ""
                }
                onChange={(event) =>
                  setActionEditor((current) =>
                    current
                      ? {
                          ...current,
                          action: {
                            ...current.action,
                            activation:
                              event.target.value,
                          },
                        }
                      : current
                  )
                }
                placeholder="Action, reaction, custom..."
              />
            </label>

            <label>
              <span
                style={{
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Resolution
              </span>

              <select
                value={
                  actionEditor.action.resolution ??
                  ""
                }
                onChange={(event) =>
                  setActionEditor((current) =>
                    current
                      ? {
                          ...current,
                          action: {
                            ...current.action,
                            resolution:
                              (
                                event.target.value ||
                                undefined
                              ) as GameAction["resolution"],
                          },
                        }
                      : current
                  )
                }
              >
                <option value="">
                  Not specified
                </option>
                <option value="automatic">
                  Automatic
                </option>
                <option value="attack">
                  Attack Roll
                </option>
                <option value="save">
                  Saving Throw
                </option>
                <option value="choice">
                  Choice
                </option>
                <option value="custom">
                  Custom
                </option>
              </select>
            </label>

            <label>
              <span
                style={{
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Target
              </span>

              <input
                value={
                  actionEditor.action.target ??
                  ""
                }
                onChange={(event) =>
                  setActionEditor((current) =>
                    current
                      ? {
                          ...current,
                          action: {
                            ...current.action,
                            target:
                              event.target.value,
                          },
                        }
                      : current
                  )
                }
                placeholder="Self, one creature..."
              />
            </label>

            <label>
              <span
                style={{
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Range
              </span>

              <input
                value={
                  actionEditor.action.range ??
                  ""
                }
                onChange={(event) =>
                  setActionEditor((current) =>
                    current
                      ? {
                          ...current,
                          action: {
                            ...current.action,
                            range:
                              event.target.value,
                          },
                        }
                      : current
                  )
                }
                placeholder="5 ft, 30 m, line of sight..."
              />
            </label>

            <label>
              <span
                style={{
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Area
              </span>

              <input
                value={
                  actionEditor.action.area ??
                  ""
                }
                onChange={(event) =>
                  setActionEditor((current) =>
                    current
                      ? {
                          ...current,
                          action: {
                            ...current.action,
                            area:
                              event.target.value,
                          },
                        }
                      : current
                  )
                }
                placeholder="15 ft cone, 3x3 squares..."
              />
            </label>
          </div>

          {actionEditor.action.resolution ===
            "attack" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "8px",
                marginTop: "10px",
              }}
            >
              <label>
                <span
                  style={{
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Attack Stat
                </span>

                <select
                  value={
                    actionEditor.action.attackStat ??
                    ""
                  }
                  onChange={(event) =>
                    setActionEditor((current) =>
                      current
                        ? {
                            ...current,
                            action: {
                              ...current.action,
                              attackStat:
                                event.target.value ||
                                undefined,
                            },
                          }
                        : current
                    )
                  }
                >
                  <option value="">
                    None / no stat
                  </option>

                  {!!actionEditor.action.attackStat &&
                    !campaignStats.some(
                      (stat) =>
                        stat.id ===
                        actionEditor.action.attackStat
                    ) && (
                    <option
                      value={
                        actionEditor.action.attackStat
                      }
                    >
                      {
                        rulesProfile.stats.find(
                          (stat) =>
                            stat.id ===
                            actionEditor.action.attackStat
                        )?.label ??
                        actionEditor.action.attackStat
                      } (archived / custom)
                    </option>
                  )}

                  {campaignStats.map(
                    (stat) => (
                      <option
                        key={stat.id}
                        value={stat.id}
                      >
                        {stat.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span
                  style={{
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Attack Modifier
                </span>

                <input
                  type="number"
                  value={
                    actionEditor.action
                      .attackModifier ?? ""
                  }
                  onWheel={(event) =>
                    event.currentTarget.blur()
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowUp" ||
                      event.key === "ArrowDown"
                    ) {
                      event.preventDefault();
                    }
                  }}
                  onChange={(event) =>
                    setActionEditor((current) =>
                      current
                        ? {
                            ...current,
                            action: {
                              ...current.action,
                              attackModifier:
                                event.target.value === ""
                                  ? undefined
                                  : Number(
                                      event.target.value
                                    ),
                            },
                          }
                        : current
                    )
                  }
                />
              </label>
            </div>
          )}

          {actionEditor.action.resolution ===
            "save" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "8px",
                marginTop: "10px",
              }}
            >
              <label>
                <span
                  style={{
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Save Stat
                </span>

                <select
                  value={
                    actionEditor.action.saveStat ??
                    ""
                  }
                  onChange={(event) =>
                    setActionEditor((current) =>
                      current
                        ? {
                            ...current,
                            action: {
                              ...current.action,
                              saveStat:
                                event.target.value ||
                                undefined,
                            },
                          }
                        : current
                    )
                  }
                >
                  <option value="">
                    None / no stat
                  </option>

                  {!!actionEditor.action.saveStat &&
                    !campaignStats.some(
                      (stat) =>
                        stat.id ===
                        actionEditor.action.saveStat
                    ) && (
                    <option
                      value={
                        actionEditor.action.saveStat
                      }
                    >
                      {
                        rulesProfile.stats.find(
                          (stat) =>
                            stat.id ===
                            actionEditor.action.saveStat
                        )?.label ??
                        actionEditor.action.saveStat
                      } (archived / custom)
                    </option>
                  )}

                  {campaignStats.map(
                    (stat) => (
                      <option
                        key={stat.id}
                        value={stat.id}
                      >
                        {stat.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span
                  style={{
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Save DC
                </span>

                <input
                  type="number"
                  value={
                    actionEditor.action.saveDC ??
                    ""
                  }
                  onWheel={(event) =>
                    event.currentTarget.blur()
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowUp" ||
                      event.key === "ArrowDown"
                    ) {
                      event.preventDefault();
                    }
                  }}
                  onChange={(event) =>
                    setActionEditor((current) =>
                      current
                        ? {
                            ...current,
                            action: {
                              ...current.action,
                              saveDC:
                                event.target.value === ""
                                  ? undefined
                                  : Number(
                                      event.target.value
                                    ),
                            },
                          }
                        : current
                    )
                  }
                />
              </label>
            </div>
          )}

          {/* ACTION COSTS */}
          <div
            style={{
              marginTop: "14px",
              paddingTop: "10px",
              borderTop:
                "1px solid var(--border)",
            }}
          >
            <strong>Costs</strong>

            {(actionEditor.action.costs ?? []).map(
              (cost, costIndex) => (
                <div
                  key={costIndex}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "2fr 1fr 1fr auto",
                    gap: "6px",
                    marginTop: "8px",
                  }}
                >
                  <input
                    value={cost.resource}
                    onChange={(event) =>
                      setActionEditor((current) => {
                        if (!current) {
                          return current;
                        }

                        const costs = [
                          ...(current.action.costs ??
                            []),
                        ];

                        costs[costIndex] = {
                          ...costs[costIndex],
                          resource:
                            event.target.value,
                        };

                        return {
                          ...current,
                          action: {
                            ...current.action,
                            costs,
                          },
                        };
                      })
                    }
                    placeholder="Ammo, mana, battery..."
                  />

                  <input
                    type="number"
                    value={cost.amount ?? ""}
                    onChange={(event) =>
                      setActionEditor((current) => {
                        if (!current) {
                          return current;
                        }

                        const costs = [
                          ...(current.action.costs ??
                            []),
                        ];

                        costs[costIndex] = {
                          ...costs[costIndex],
                          amount:
                            event.target.value === ""
                              ? undefined
                              : Number(
                                  event.target.value
                                ),
                        };

                        return {
                          ...current,
                          action: {
                            ...current.action,
                            costs,
                          },
                        };
                      })
                    }
                    placeholder="Amount"
                  />

                  <input
                    value={cost.formula ?? ""}
                    onChange={(event) =>
                      setActionEditor((current) => {
                        if (!current) {
                          return current;
                        }

                        const costs = [
                          ...(current.action.costs ??
                            []),
                        ];

                        costs[costIndex] = {
                          ...costs[costIndex],
                          formula:
                            event.target.value,
                        };

                        return {
                          ...current,
                          action: {
                            ...current.action,
                            costs,
                          },
                        };
                      })
                    }
                    placeholder="Formula"
                  />

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      setActionEditor((current) => {
                        if (!current) {
                          return current;
                        }

                        return {
                          ...current,
                          action: {
                            ...current.action,
                            costs:
                              (
                                current.action.costs ??
                                []
                              ).filter(
                                (_, index) =>
                                  index !== costIndex
                              ),
                          },
                        };
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              )
            )}

            <button
              type="button"
              className="btn"
              style={{
                marginTop: "8px",
              }}
              onClick={() =>
                setActionEditor((current) =>
                  current
                    ? {
                        ...current,
                        action: {
                          ...current.action,
                          costs: [
                            ...(current.action.costs ??
                              []),
                            {
                              resource: "",
                            },
                          ],
                        },
                      }
                    : current
                )
              }
            >
              + Add Cost
            </button>
          </div>

          {/* ACTION EFFECTS */}
          <div
            style={{
              marginTop: "14px",
              paddingTop: "10px",
              borderTop:
                "1px solid var(--border)",
            }}
          >
            <strong>Action Effects</strong>

            {actionEditor.action.effects.map(
              (effect, effectIndex) => (
                <div
                  key={effect.id}
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    border:
                      "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "2fr 1fr",
                      gap: "8px",
                    }}
                  >
                    <input
                      value={effect.name}
                      onChange={(event) =>
                        setActionEditor(
                          (current) => {
                            if (!current) {
                              return current;
                            }

                            const effects = [
                              ...current.action
                                .effects,
                            ];

                            effects[effectIndex] = {
                              ...effects[
                                effectIndex
                              ],
                              name:
                                event.target.value,
                            };

                            return {
                              ...current,
                              action: {
                                ...current.action,
                                effects,
                              },
                            };
                          }
                        )
                      }
                      placeholder="Effect name"
                    />

                    <select
                      value={effect.kind ?? ""}
                      onChange={(event) =>
                        setActionEditor(
                          (current) => {
                            if (!current) {
                              return current;
                            }

                            const effects = [
                              ...current.action
                                .effects,
                            ];

                            effects[effectIndex] = {
                              ...effects[
                                effectIndex
                              ],
                              kind:
                                (
                                  event.target.value ||
                                  undefined
                                ) as GameEffect["kind"],
                            };

                            return {
                              ...current,
                              action: {
                                ...current.action,
                                effects,
                              },
                            };
                          }
                        )
                      }
                    >
                      <option value="">
                        Effect Type
                      </option>
                      <option value="damage">
                        Damage
                      </option>
                      <option value="healing">
                        Healing
                      </option>
                      <option value="condition">
                        Condition
                      </option>
                      <option value="movement">
                        Movement
                      </option>
                      <option value="resource">
                        Resource
                      </option>
                      <option value="defense">
                        Defense
                      </option>
                      <option value="utility">
                        Utility
                      </option>
                      <option value="custom">
                        Custom
                      </option>
                    </select>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(135px, 1fr))",
                      gap: "8px",
                      marginTop: "8px",
                    }}
                  >
                    <input
                      value={
                        effect.formula ??
                        effect.damage ??
                        ""
                      }
                      onChange={(event) =>
                        setActionEditor(
                          (current) => {
                            if (!current) {
                              return current;
                            }

                            const effects = [
                              ...current.action
                                .effects,
                            ];

                            effects[effectIndex] = {
                              ...effects[
                                effectIndex
                              ],
                              formula:
                                event.target.value,

                              /*
                               * Keep legacy damage
                               * populated for current
                               * combat compatibility.
                               */
                              ...(effects[
                                effectIndex
                              ].kind === "damage"
                                ? {
                                    damage:
                                      event.target
                                        .value,
                                  }
                                : {}),
                            };

                            return {
                              ...current,
                              action: {
                                ...current.action,
                                effects,
                              },
                            };
                          }
                        )
                      }
                      placeholder="Formula: 2d8+3"
                    />

                    <input
                      value={
                        effect.damageType ??
                        ""
                      }
                      onChange={(event) =>
                        setActionEditor(
                          (current) => {
                            if (!current) {
                              return current;
                            }

                            const effects = [
                              ...current.action
                                .effects,
                            ];

                            effects[effectIndex] = {
                              ...effects[
                                effectIndex
                              ],
                              damageType:
                                event.target.value,
                            };

                            return {
                              ...current,
                              action: {
                                ...current.action,
                                effects,
                              },
                            };
                          }
                        )
                      }
                      placeholder="Damage/type"
                    />

                    <input
                      value={
                        effect.condition ?? ""
                      }
                      onChange={(event) =>
                        setActionEditor(
                          (current) => {
                            if (!current) {
                              return current;
                            }

                            const effects = [
                              ...current.action
                                .effects,
                            ];

                            effects[effectIndex] = {
                              ...effects[
                                effectIndex
                              ],
                              condition:
                                event.target.value,
                            };

                            return {
                              ...current,
                              action: {
                                ...current.action,
                                effects,
                              },
                            };
                          }
                        )
                      }
                      placeholder="Condition"
                    />

                    <input
                      value={
                        effect.trigger ?? ""
                      }
                      onChange={(event) =>
                        setActionEditor(
                          (current) => {
                            if (!current) {
                              return current;
                            }

                            const effects = [
                              ...current.action
                                .effects,
                            ];

                            effects[effectIndex] = {
                              ...effects[
                                effectIndex
                              ],
                              trigger:
                                event.target.value,
                            };

                            return {
                              ...current,
                              action: {
                                ...current.action,
                                effects,
                              },
                            };
                          }
                        )
                      }
                      placeholder="Trigger"
                    />

                    <input
                      value={
                        effect.saveStat ?? ""
                      }
                      onChange={(event) =>
                        setActionEditor(
                          (current) => {
                            if (!current) {
                              return current;
                            }

                            const effects = [
                              ...current.action
                                .effects,
                            ];

                            effects[effectIndex] = {
                              ...effects[
                                effectIndex
                              ],
                              saveStat:
                                event.target.value,
                            };

                            return {
                              ...current,
                              action: {
                                ...current.action,
                                effects,
                              },
                            };
                          }
                        )
                      }
                      placeholder="Save stat"
                    />

                    <input
                      type="number"
                      value={
                        effect.saveDC ?? ""
                      }
                      onChange={(event) =>
                        setActionEditor(
                          (current) => {
                            if (!current) {
                              return current;
                            }

                            const effects = [
                              ...current.action
                                .effects,
                            ];

                            effects[effectIndex] = {
                              ...effects[
                                effectIndex
                              ],
                              saveDC:
                                event.target.value ===
                                ""
                                  ? undefined
                                  : Number(
                                      event.target
                                        .value
                                    ),
                            };

                            return {
                              ...current,
                              action: {
                                ...current.action,
                                effects,
                              },
                            };
                          }
                        )
                      }
                      placeholder="DC"
                    />
                  </div>

                  <textarea
                    value={effect.notes ?? ""}
                    onChange={(event) =>
                      setActionEditor(
                        (current) => {
                          if (!current) {
                            return current;
                          }

                          const effects = [
                            ...current.action
                              .effects,
                          ];

                          effects[effectIndex] = {
                            ...effects[
                              effectIndex
                            ],
                            notes:
                              event.target.value,
                          };

                          return {
                            ...current,
                            action: {
                              ...current.action,
                              effects,
                            },
                          };
                        }
                      )
                    }
                    placeholder="Effect notes / custom rules"
                    rows={2}
                    style={{
                      width: "100%",
                      marginTop: "8px",
                    }}
                  />

                  <button
                    type="button"
                    className="btn"
                    style={{
                      marginTop: "8px",
                    }}
                    onClick={() =>
                      setActionEditor(
                        (current) =>
                          current
                            ? {
                                ...current,
                                action: {
                                  ...current.action,
                                  effects:
                                    current.action.effects.filter(
                                      (_, index) =>
                                        index !==
                                        effectIndex
                                    ),
                                },
                              }
                            : current
                      )
                    }
                  >
                    Remove Effect
                  </button>
                </div>
              )
            )}

            <button
              type="button"
              className="btn"
              style={{
                marginTop: "8px",
              }}
              onClick={() =>
                setActionEditor((current) =>
                  current
                    ? {
                        ...current,
                        action: {
                          ...current.action,
                          effects: [
                            ...current.action.effects,
                            {
                              id:
                                crypto.randomUUID(),
                              name: "",
                            },
                          ],
                        },
                      }
                    : current
                )
              }
            >
              + Add Effect
            </button>
          </div>

          <label
            style={{
              display: "block",
              marginTop: "12px",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              Action Notes
            </span>

            <textarea
              value={
                actionEditor.action.notes ??
                ""
              }
              onChange={(event) =>
                setActionEditor((current) =>
                  current
                    ? {
                        ...current,
                        action: {
                          ...current.action,
                          notes:
                            event.target.value,
                        },
                      }
                    : current
                )
              }
              rows={2}
              style={{
                width: "100%",
              }}
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const cleanAction:
                  GameAction = {
                  ...actionEditor.action,

                  name:
                    actionEditor.action.name.trim() ||
                    "Unnamed Action",

                  description:
                    actionEditor.action
                      .description?.trim() ||
                    "",

                  activation:
                    actionEditor.action
                      .activation?.trim() ||
                    "",

                  target:
                    actionEditor.action
                      .target?.trim() ||
                    "",

                  range:
                    actionEditor.action
                      .range?.trim() ||
                    "",

                  area:
                    actionEditor.action
                      .area?.trim() ||
                    "",

                  notes:
                    actionEditor.action
                      .notes?.trim() ||
                    "",

                  costs:
                    (
                      actionEditor.action.costs ??
                      []
                    )
                      .map((cost) => ({
                        ...cost,
                        resource:
                          cost.resource.trim(),
                        formula:
                          cost.formula?.trim() ||
                          "",
                        notes:
                          cost.notes?.trim() ||
                          "",
                      }))
                      .filter(
                        (cost) =>
                          cost.resource ||
                          cost.amount !== undefined ||
                          cost.formula
                      ),

                  effects:
                    actionEditor.action.effects.map(
                      (effect) => ({
                        ...effect,

                        name:
                          effect.name.trim() ||
                          "Unnamed Effect",

                        formula:
                          effect.formula?.trim() ||
                          "",

                        damage:
                          effect.damage?.trim() ||
                          "",

                        damageType:
                          effect.damageType?.trim() ||
                          "",

                        condition:
                          effect.condition?.trim() ||
                          "",

                        trigger:
                          effect.trigger?.trim() ||
                          "",

                        saveStat:
                          effect.saveStat?.trim() ||
                          "",

                        notes:
                          effect.notes?.trim() ||
                          "",
                      })
                    ),
                };

                const currentActions =
                  item.actions ?? [];

                const updatedActions =
                  actionEditor.isNew
                    ? [
                        ...currentActions,
                        cleanAction,
                      ]
                    : currentActions.map(
                        (savedAction) =>
                          savedAction.id ===
                          cleanAction.id
                            ? cleanAction
                            : savedAction
                      );

                updateInventoryItem(
                  item.id,
                  {
                    actions:
                      updatedActions,
                  }
                );

                setActionEditor(null);
              }}
            >
              Save Action
            </button>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setActionEditor(null)
              }
            >
              Cancel
            </button>

            {!actionEditor.isNew && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  updateInventoryItem(
                    item.id,
                    {
                      actions:
                        (item.actions ?? []).filter(
                          (action) =>
                            action.id !==
                            actionEditor.action.id
                        ),
                    }
                  );

                  setActionEditor(null);
                }}
              >
                Delete Action
              </button>
            )}
          </div>
        </div>
      )}
    </div>

    {/* STORYFORGE CAMPAIGN LIBRARY SAVE V1 */}
    <div
      style={{
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: "1px solid var(--border)",
      }}
    >
      <button
        type="button"
        className="btn"
        onClick={() => {
          const result =
            saveCampaignItemTemplate(
              worldId,
              {
                /*
                 * Existing provenance means this is an
                 * explicit update. No provenance means
                 * create a new campaign template.
                 */
                templateId:
                  item.libraryTemplateId,

                name:
                  item.name.trim() ||
                  "Unnamed Item",

                category:
                  item.category?.trim() ||
                  "Other",

                description:
                  item.description?.trim() ||
                  "",

                ...(item.damage?.trim()
                  ? {
                      damage:
                        item.damage.trim(),
                    }
                  : {}),

                ...(item.armorBonus !== undefined
                  ? {
                      armorRating:
                        item.armorBonus,
                    }
                  : {}),

                ...(
                  item.maxUses !== undefined ||
                  item.uses !== undefined
                    ? {
                        defaultUses:
                          Math.max(
                            0,
                            item.maxUses ??
                              item.uses ??
                              0
                          ),
                      }
                    : {}
                ),

                effects:
                  item.effects ?? [],

                actions:
                  item.actions ?? [],
              }
            );

          /*
           * Refresh the campaign-owned template view.
           */
          setCustomItemTemplates(
            result.templates.map(
              campaignTemplateToItemTemplate
            )
          );

          /*
           * Provenance only.
           * The inventory copy remains independent.
           */
          updateInventoryItem(
            item.id,
            {
              libraryTemplateId:
                result.template.id,
            }
          );
        }}
      >
        {item.libraryTemplateId
          ? "Update Campaign Template"
          : "Save to Campaign Library"}
      </button>

      {item.libraryTemplateId && (
        <span
          style={{
            marginLeft: "8px",
            opacity: 0.7,
            fontSize: "0.9em",
          }}
        >
          Campaign origin recorded
        </span>
      )}
    </div>

    {(item.category === "Armor" || item.category === "Shield") && (
  <div
    style={{
      marginTop: "8px",
      padding: "10px",
      border: "1px solid var(--border)",
      borderRadius: "8px",
    }}
  >
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: "4px" }}>
        Armor Rating
      </span>

      <input
        type="number"
        min="0"
        step="0.5"
        value={item.armorBonus ?? ""}
        onWheel={(event) => event.currentTarget.blur()}
onKeyDown={(event) => {
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
  }
}}
onChange={(event) => {
          const newRating = Math.max(0, Number(event.target.value));
          const newMaxDurability = Math.round(newRating * 10);

          const updatedInventory = (selectedCharacter.inventory ?? []).map(
            (inventoryItem) => {
              if (inventoryItem.id !== item.id) {
                return inventoryItem;
              }

              const oldRating = inventoryItem.armorBonus ?? 0;

              const oldMaxDurability =
                inventoryItem.maxDurability ??
                Math.round(oldRating * 10);

              const oldCurrentDurability =
                inventoryItem.durability ??
                oldMaxDurability;

              const newCurrentDurability =
                oldCurrentDurability >= oldMaxDurability
                  ? newMaxDurability
                  : Math.min(oldCurrentDurability, newMaxDurability);

              return {
                ...inventoryItem,
                armorBonus: newRating,
                maxDurability: newMaxDurability,
                durability: newCurrentDurability,
              };
            }
          );

          const updatedCharacter = {
            ...selectedCharacter,
            inventory: updatedInventory,
          };

          setSelectedCharacter(updatedCharacter);

          setCharacters((old) => {
            const updated = old.map((character) =>
              character.id === updatedCharacter.id
                ? updatedCharacter
                : character
            );

            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
          });
        }}
        placeholder="Example: 2"
        style={{
          display: "block",
          width: "100%",
          padding: "8px",
          borderRadius: "8px",
        }}
      />
    </label>

    <label style={{ display: "block", marginTop: "8px" }}>
      <span style={{ display: "block", marginBottom: "4px" }}>
        Max Durability
      </span>

      <input
        type="number"
        value={Math.round((item.armorBonus ?? 0) * 10)}
        readOnly
        style={{
          display: "block",
          width: "100%",
          padding: "8px",
          borderRadius: "8px",
          opacity: 0.8,
        }}
      />

      <small style={{ display: "block", marginTop: "4px" }}>
        Automatically calculated from Armor Rating
      </small>
    </label>
  </div>
)}

{item.category === "Consumable" && (
  <input
    type="number"
    min="0"
    value={item.uses ?? 1}
    onChange={(event) => {
      const updatedInventory = (selectedCharacter.inventory ?? []).map(
        (inventoryItem) =>
          inventoryItem.id === item.id
            ? {
                ...inventoryItem,
                uses: Math.max(0, Number(event.target.value)),
              }
            : inventoryItem
      );

      const updatedCharacter = {
        ...selectedCharacter,
        inventory: updatedInventory,
      };

      setSelectedCharacter(updatedCharacter);

      setCharacters((old) => {
        const updated = old.map((character) =>
          character.id === updatedCharacter.id
            ? updatedCharacter
            : character
        );

        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    }}
    placeholder="Uses / Charges"
    style={{
      display: "block",
      width: "100%",
      marginTop: "8px",
      padding: "8px",
      borderRadius: "8px",
    }}
  />
)}

  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginTop: "12px",
    }}
  >
    <span style={{ display: "block", marginBottom: "4px" }}>
      Description
    </span>
<textarea
  value={item.description || ""}
  onChange={(event) => {
    const updatedInventory = (selectedCharacter.inventory ?? []).map(
      (inventoryItem) =>
        inventoryItem.id === item.id
          ? {
              ...inventoryItem,
              description: event.target.value,
            }
          : inventoryItem
    );

    const updatedCharacter = {
      ...selectedCharacter,
      inventory: updatedInventory,
    };

    setSelectedCharacter(updatedCharacter);

    setCharacters((old) => {
      const updated = old.map((character) =>
        character.id === updatedCharacter.id
          ? updatedCharacter
          : character
      );

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }}
  placeholder="Item description"
  rows={3}
  style={{
    display: "block",
    width: "100%",
    marginTop: "8px",
    padding: "8px",
    borderRadius: "8px",
    resize: "vertical",
  }}
/>
  </label>

<label style={{ display: "block", marginTop: "8px" }}>
  <input
    type="checkbox"
    checked={item.equipped ?? false}
    onChange={(event) => {
      const updatedInventory = (selectedCharacter.inventory ?? []).map(
        (inventoryItem) =>
          inventoryItem.id === item.id
            ? {
                ...inventoryItem,
                equipped: event.target.checked,
              }
            : inventoryItem
      );

      const updatedCharacter = {
        ...selectedCharacter,
        inventory: updatedInventory,
      };

      setSelectedCharacter(updatedCharacter);

      setCharacters((old) => {
        const updated = old.map((character) =>
          character.id === updatedCharacter.id
            ? updatedCharacter
            : character
        );

        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    }}
  />
  <span>Equipped</span>
</label>
<button
  className="btn"
  onClick={() => {
    const updatedCharacter = {
      ...selectedCharacter,
      inventory: (selectedCharacter.inventory ?? []).filter(
        (inventoryItem) => inventoryItem.id !== item.id
      ),
    };

    setSelectedCharacter(updatedCharacter);

    setCharacters((old) => {
      const updated = old.map((character) =>
        character.id === updatedCharacter.id
          ? updatedCharacter
          : character
      );

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }}
  style={{
    display: "block",
    marginTop: "14px",
  }}
>
  Remove Item
</button>

    </details>
  ))}

  </div>
)}

</div>
<div style={{ marginTop: "20px" }}>
  <button
    className="btn"
    onClick={() => setShowDescription((old) => !old)}
  >
    {showDescription ? "▼" : "▶"} Description
  </button>

{showDescription && (
  <div style={{ marginTop: "12px" }}>
<textarea
    value={selectedCharacter.description || ""}
  placeholder="Description"
  onChange={(event) => {
    const updatedCharacter = {
      ...selectedCharacter,
      description: event.target.value,
    };

    setSelectedCharacter(updatedCharacter);

    setCharacters((old) => {
      const updated = old.map((character) =>
        character.id === updatedCharacter.id
          ? updatedCharacter
          : character
      );

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }}
  style={{
    width: "100%",
    minHeight: "100px",
    marginTop: "12px",
    padding: "10px",
borderRadius: "8px",
  }}
/>
  </div>
)}
</div>
<div style={{ marginTop: "20px" }}>
  <button
    className="btn"
    onClick={() => setShowPersonality((old) => !old)}
  >
    {showPersonality ? "▼" : "▶"} Personality
  </button>

{showPersonality && (
    <div style={{ marginTop: "12px" }}>
<textarea
  value={selectedCharacter.personality || ""}
  placeholder="Personality"
  onChange={(event) => {
    const updatedCharacter = {
      ...selectedCharacter,
      personality: event.target.value,
    };

    setSelectedCharacter(updatedCharacter);

    setCharacters((old) => {
      const updated = old.map((character) =>
        character.id === updatedCharacter.id
          ? updatedCharacter
          : character
      );

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }}
  style={{
    width: "100%",
    minHeight: "100px",
    marginTop: "12px",
    padding: "10px",
    borderRadius: "8px",
  }}
/>
    </div>
  )}
</div>
<div style={{ marginTop: "20px" }}>
  <button
    className="btn"
    onClick={() => setShowNotes((old) => !old)}
  >
    {showNotes ? "▼" : "▶"} Notes
  </button>

  {showNotes && (
    <div style={{ marginTop: "12px" }}>
 <textarea
  value={selectedCharacter.notes || ""}
  placeholder="Notes"
  onChange={(event) => {
    const updatedCharacter = {
      ...selectedCharacter,
      notes: event.target.value,
    };

    setSelectedCharacter(updatedCharacter);

    setCharacters((old) => {
      const updated = old.map((character) =>
        character.id === updatedCharacter.id
          ? updatedCharacter
          : character
      );

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }}
  style={{
    width: "100%",
    minHeight: "120px",
    marginTop: "12px",
    padding: "10px",
    borderRadius: "8px",
  }}
/>
    </div>
  )}
</div>

<button
  className="btn"
  onClick={() => setSelectedCharacter(null)}
  style={{ marginTop: "12px" }}
>
  Close Sheet
</button>
<button
  className="btn"
  onClick={() => {
    if (!selectedCharacter) return;

    const confirmed = window.confirm(
      `Delete ${selectedCharacter.name}? This cannot be undone.`
    );

    if (!confirmed) return;

    setCharacters((old) => {
      const updated = old.filter(
        (character) => character.id !== selectedCharacter.id
      );

      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    setSelectedCharacter(null);
  }}
  style={{ marginTop: "12px", marginLeft: "8px" }}
>
  Delete Character
</button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";

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

inventory?: {
  id: string;
  name: string;
  quantity: number;
  description?: string;
}[];

stats?: {
  health: number;
  armor: number;
  damage: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};
};

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

function randomItem(items: string[]) {
  return items[Math.floor(Math.random() * items.length)];
}
export function CharacterPage({ worldId }: { worldId: string }) {
  const [characters, setCharacters] = useState<Character[]>([]);
const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const storageKey = `storyforge-characters-${worldId}`;
  const [name, setName] = useState("");

const [itemName, setItemName] = useState("");
const [itemQuantity, setItemQuantity] = useState(1);
const [itemDescription, setItemDescription] = useState("");
const [showStats, setShowStats] = useState(true);
const [showInventory, setShowInventory] = useState(true);
const [showDescription, setShowDescription] = useState(true);
const [showPersonality, setShowPersonality] = useState(true);
const [showNotes, setShowNotes] = useState(true);
  useEffect(() => {
  try {
const saved = localStorage.getItem(storageKey);
const parsed: Character[] = saved ? JSON.parse(saved) : [];

const upgraded = parsed.map((character) => ({
  ...character,
level: character.level ?? 1,
inventory: character.inventory ?? [],
  stats: character.stats ?? {
    health: 10,
    armor: 10,
    damage: 1,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
}));

setCharacters(upgraded);
localStorage.setItem(storageKey, JSON.stringify(upgraded));
  } catch {
    setCharacters([]);
  }
}, [storageKey]);
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
stats: {
  health: 10,
  armor: 10,
  damage: 1,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
},
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
  stat: keyof NonNullable<Character["stats"]>,
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
  onClick={() => setSelectedCharacter(character)}
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
  onClick={() => setSelectedCharacter(character)}
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
<label>
  💪 Strength:
  <input
    type="number"
    value={selectedCharacter.stats.strength}
    onChange={(event) =>
      updateStat("strength", Number(event.target.value))
    }
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label>

<br />

<label>
  🏃 Dexterity:
  <input
    type="number"
    value={selectedCharacter.stats.dexterity}
    onChange={(event) =>
      updateStat("dexterity", Number(event.target.value))
    }
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label>

<br />

<label>
  🫀 Constitution:
  <input
    type="number"
    value={selectedCharacter.stats.constitution}
    onChange={(event) =>
      updateStat("constitution", Number(event.target.value))
    }
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label> 
<br />

<label>
  🧠 Intelligence:
  <input
    type="number"
    value={selectedCharacter.stats.intelligence}
    onChange={(event) =>
      updateStat("intelligence", Number(event.target.value))
    }
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label>
<br />

<label>
  🦉 Wisdom:
  <input
    type="number"
    value={selectedCharacter.stats.wisdom}
    onChange={(event) =>
      updateStat("wisdom", Number(event.target.value))
    }
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label>
<br />

<label>
  ✨ Charisma:
  <input
    type="number"
    value={selectedCharacter.stats.charisma}
    onChange={(event) =>
      updateStat("charisma", Number(event.target.value))
    }
    style={{ marginLeft: "8px", width: "80px" }}
  />
</label>

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

  <input
    value={itemName}
    onChange={(event) => setItemName(event.target.value)}
    placeholder="Item name"
  />

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
    if (!itemName.trim()) return;

    const newItem = {
      id: crypto.randomUUID(),
      name: itemName.trim(),
      quantity: Math.max(1, itemQuantity),
      description: itemDescription.trim(),
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
  }}
  style={{ marginLeft: "8px" }}
>
  Add Item
</button>

{(selectedCharacter.inventory ?? []).map((item) => (
  <div
    key={item.id}
    style={{
      marginTop: "12px",
      padding: "10px",
      border: "1px solid var(--border)",
      borderRadius: "8px",
    }}
  >
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
  style={{ marginLeft: "8px" }}
>
  Remove Item
</button>

    </div>
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

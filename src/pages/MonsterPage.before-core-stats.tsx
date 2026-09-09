import { useEffect, useState } from "react";

type Monster = {
  id: string;
  name: string;
  type: string;
};

export function MonsterPage({ worldId }: { worldId: string }) {
  const storageKey = `storyforge-monsters-${worldId}`;

  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [monsterType, setMonsterType] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];

      setMonsters(Array.isArray(parsed) ? parsed : []);
    } catch {
      setMonsters([]);
    }
  }, [storageKey]);

  const filteredMonsters = monsters.filter((monster) =>
    `${monster.name} ${monster.type}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const exactMatch = monsters.some(
    (monster) =>
      monster.name.toLowerCase() === search.trim().toLowerCase()
  );

  const beginCreate = (monsterName: string) => {
    setEditingId(null);
    setName(monsterName);
    setMonsterType("");
  };

  const beginEdit = (monster: Monster) => {
    setEditingId(monster.id);
    setName(monster.name);
    setMonsterType(monster.type);
  };

  const clearEditor = () => {
    setEditingId(null);
    setName("");
    setMonsterType("");
  };

  const saveMonster = () => {
    const cleanName = name.trim();

    if (!cleanName) return;

    const monster: Monster = {
      id: editingId ?? crypto.randomUUID(),
      name: cleanName,
      type: monsterType.trim() || "Creature",
    };

    const updated = editingId
      ? monsters.map((existing) =>
          existing.id === editingId ? monster : existing
        )
      : [...monsters, monster];

    setMonsters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    setSearch(monster.name);
    clearEditor();
  };

  return (
    <div>
      <h2>🐉 Monster & Creature Compendium</h2>

      <p>World: {worldId}</p>

      <label style={{ display: "block", marginTop: "16px" }}>
        <span style={{ display: "block", marginBottom: "4px" }}>
          Search Monsters
        </span>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search monsters..."
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "8px",
          }}
        />
      </label>

      {search.trim() && (
        <div
          style={{
            marginTop: "8px",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {filteredMonsters.map((monster) => (
            <button
              key={monster.id}
              type="button"
              onClick={() => beginEdit(monster)}
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
              <strong>{monster.name}</strong>

              <span
                style={{
                  display: "block",
                  fontSize: "0.85em",
                  opacity: 0.75,
                }}
              >
                {monster.type}
              </span>
            </button>
          ))}

          {!exactMatch && (
            <button
              type="button"
              onClick={() => beginCreate(search.trim())}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                textAlign: "left",
                border: "none",
                cursor: "pointer",
              }}
            >
              + Create "{search.trim()}"
            </button>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          padding: "12px",
          border: "1px solid var(--border)",
          borderRadius: "8px",
        }}
      >
        <h3>{editingId ? "Edit Monster" : "Create Monster"}</h3>

        <label style={{ display: "block", marginTop: "8px" }}>
          Monster Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Goblin"
            style={{
              display: "block",
              width: "100%",
              marginTop: "4px",
              padding: "8px",
              borderRadius: "8px",
            }}
          />
        </label>

        <label style={{ display: "block", marginTop: "8px" }}>
          Monster Type
          <input
            value={monsterType}
            onChange={(event) => setMonsterType(event.target.value)}
            placeholder="Example: Humanoid, Beast, Undead"
            style={{
              display: "block",
              width: "100%",
              marginTop: "4px",
              padding: "8px",
              borderRadius: "8px",
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "14px",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={saveMonster}
          >
            {editingId ? "Save Changes" : "Save Monster"}
          </button>

          <button
            type="button"
            className="btn"
            onClick={clearEditor}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

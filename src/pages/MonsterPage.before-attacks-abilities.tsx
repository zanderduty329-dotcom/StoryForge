import { useEffect, useState } from "react";

type MonsterStats = {
  health: number;
  armor: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

type MonsterModifiers = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

type Monster = {
  id: string;
  name: string;
  type: string;
  stats: MonsterStats;
  modifiers: MonsterModifiers;
  healthMode: "fixed" | "rolled";
  healthFormula: string;
  movementSpeed: number;
};

const blankMonsterStats: MonsterStats = {
  health: 10,
  armor: 10,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};


const blankMonsterModifiers: MonsterModifiers = {
  strength: 0,
  dexterity: 0,
  constitution: 0,
  intelligence: 0,
  wisdom: 0,
  charisma: 0,
};

export function MonsterPage({ worldId }: { worldId: string }) {
  const storageKey = `storyforge-monsters-${worldId}`;

  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [monsterType, setMonsterType] = useState("");
  const [stats, setStats] = useState<MonsterStats>({ ...blankMonsterStats });
  const [modifiers, setModifiers] = useState<MonsterModifiers>({
    ...blankMonsterModifiers,
  });
  const [healthMode, setHealthMode] = useState<"fixed" | "rolled">("fixed");
  const [healthFormula, setHealthFormula] = useState("");
  const [movementSpeed, setMovementSpeed] = useState(30);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];

      const upgraded: Monster[] = Array.isArray(parsed)
        ? parsed.map((monster) => ({
            ...monster,
            stats: {
              ...blankMonsterStats,
              ...(monster.stats ?? {}),
            },
            modifiers: {
              ...blankMonsterModifiers,
              ...(monster.modifiers ?? {}),
            },
            healthMode: monster.healthMode ?? "fixed",
            healthFormula: monster.healthFormula ?? "",
            movementSpeed: monster.movementSpeed ?? 30,
          }))
        : [];

      setMonsters(upgraded);
      localStorage.setItem(storageKey, JSON.stringify(upgraded));
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
    setStats({ ...blankMonsterStats });
    setModifiers({ ...blankMonsterModifiers });
    setHealthMode("fixed");
    setHealthFormula("");
    setMovementSpeed(30);
  };

  const beginEdit = (monster: Monster) => {
    setEditingId(monster.id);
    setName(monster.name);
    setMonsterType(monster.type);
    setStats({ ...blankMonsterStats, ...monster.stats });
    setModifiers({
      ...blankMonsterModifiers,
      ...monster.modifiers,
    });
    setHealthMode(monster.healthMode ?? "fixed");
    setHealthFormula(monster.healthFormula ?? "");
    setMovementSpeed(monster.movementSpeed ?? 30);
  };

  const clearEditor = () => {
    setEditingId(null);
    setName("");
    setMonsterType("");
    setStats({ ...blankMonsterStats });
    setModifiers({ ...blankMonsterModifiers });
    setHealthMode("fixed");
    setHealthFormula("");
    setMovementSpeed(30);
  };

  const saveMonster = () => {
    const cleanName = name.trim();

    if (!cleanName) return;

    const monster: Monster = {
      id: editingId ?? crypto.randomUUID(),
      name: cleanName,
      type: monsterType.trim() || "Creature",
      stats: { ...stats },
      modifiers: { ...modifiers },
      healthMode,
      healthFormula: healthFormula.trim(),
      movementSpeed,
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

  const updateStat = (
    stat: keyof MonsterStats,
    value: number
  ) => {
    setStats((old) => ({
      ...old,
      [stat]: value,
    }));
  };

  const updateModifier = (
    stat: keyof MonsterModifiers,
    value: number
  ) => {
    setModifiers((old) => ({
      ...old,
      [stat]: value,
    }));
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

          <h3 style={{ marginTop: "20px" }}>Health</h3>

          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "8px",
              flexWrap: "wrap",
            }}
          >
            <label>
              <input
                type="radio"
                name="monster-health-mode"
                checked={healthMode === "fixed"}
                onChange={() => setHealthMode("fixed")}
              />{" "}
              Fixed
            </label>

            <label>
              <input
                type="radio"
                name="monster-health-mode"
                checked={healthMode === "rolled"}
                onChange={() => setHealthMode("rolled")}
              />{" "}
              Rolled
            </label>
          </div>

          {healthMode === "fixed" ? (
            <label style={{ display: "block", marginTop: "8px" }}>
              Base Health
              <input
                type="number"
              onWheel={(event) => event.currentTarget.blur()}
              onKeyDown={(event) => {
                if (
                  event.key === "ArrowUp" ||
                  event.key === "ArrowDown"
                ) {
                  event.preventDefault();
                }
              }}
                min={0}
                value={stats.health}
                onChange={(event) =>
                  updateStat("health", Number(event.target.value))
                }
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>
          ) : (
            <label style={{ display: "block", marginTop: "8px" }}>
              Health Formula
              <input
                value={healthFormula}
                onChange={(event) =>
                  setHealthFormula(event.target.value)
                }
                placeholder="Example: 2d6"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>
          )}

          <h3 style={{ marginTop: "20px" }}>Movement</h3>

          <label style={{ display: "block", marginTop: "8px" }}>
            Movement Speed (ft per turn)
            <input
              type="number"
              onWheel={(event) => event.currentTarget.blur()}
              onKeyDown={(event) => {
                if (
                  event.key === "ArrowUp" ||
                  event.key === "ArrowDown"
                ) {
                  event.preventDefault();
                }
              }}
              min={0}
              value={movementSpeed}
              onChange={(event) =>
                setMovementSpeed(Number(event.target.value))
              }
              style={{
                display: "block",
                width: "100%",
                marginTop: "4px",
                padding: "8px",
                borderRadius: "8px",
              }}
            />
          </label>

          <h3 style={{ marginTop: "20px" }}>Core Stats</h3>

          <label style={{ display: "block", marginTop: "8px" }}>
            Armor
            <input
              type="number"
              onWheel={(event) => event.currentTarget.blur()}
              onKeyDown={(event) => {
                if (
                  event.key === "ArrowUp" ||
                  event.key === "ArrowDown"
                ) {
                  event.preventDefault();
                }
              }}
              min={0}
              value={stats.armor}
              onChange={(event) =>
                updateStat("armor", Number(event.target.value))
              }
              style={{
                display: "block",
                width: "100%",
                marginTop: "4px",
                padding: "8px",
                borderRadius: "8px",
              }}
            />
          </label>

          {(
            [
              ["strength", "Strength"],
              ["dexterity", "Dexterity"],
              ["constitution", "Constitution"],
              ["intelligence", "Intelligence"],
              ["wisdom", "Wisdom"],
              ["charisma", "Charisma"],
            ] as const
          ).map(([stat, label]) => (
            <div
              key={stat}
              style={{
                marginTop: "10px",
                display: "grid",
                gridTemplateColumns: "1fr 120px",
                gap: "8px",
                alignItems: "end",
              }}
            >
              <label>
                {label}
                <input
                  type="number"
              onWheel={(event) => event.currentTarget.blur()}
              onKeyDown={(event) => {
                if (
                  event.key === "ArrowUp" ||
                  event.key === "ArrowDown"
                ) {
                  event.preventDefault();
                }
              }}
                  value={stats[stat]}
                  onChange={(event) =>
                    updateStat(stat, Number(event.target.value))
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "4px",
                    padding: "8px",
                    borderRadius: "8px",
                  }}
                />
              </label>

              <label>
                Modifier
                <input
                  type="number"
              onWheel={(event) => event.currentTarget.blur()}
              onKeyDown={(event) => {
                if (
                  event.key === "ArrowUp" ||
                  event.key === "ArrowDown"
                ) {
                  event.preventDefault();
                }
              }}
                  value={modifiers[stat]}
                  onChange={(event) =>
                    updateModifier(
                      stat,
                      Number(event.target.value)
                    )
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "4px",
                    padding: "8px",
                    borderRadius: "8px",
                  }}
                />
              </label>
            </div>
          ))}

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

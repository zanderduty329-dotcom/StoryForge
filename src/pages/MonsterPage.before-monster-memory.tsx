import { useState } from "react";

export function MonsterPage({ worldId }: { worldId: string }) {
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [monsterType, setMonsterType] = useState("");

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

      <div
        style={{
          marginTop: "20px",
          padding: "12px",
          border: "1px solid var(--border)",
          borderRadius: "8px",
        }}
      >
        <h3>Create Monster</h3>

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
      </div>
    </div>
  );
}

import type { World, Page } from "../App";

export function WorldPage({
  world,
  onNavigate,
}: {
  world: World;
  onNavigate: (page: Page) => void;
}) {
  return (
    <div>
      <h2>{world.name}</h2>

      <p>{world.premise}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginTop: "24px",
        }}
      >
        <button className="btn" onClick={() => onNavigate("characters")}>
          🎭 Players & Characters
        </button>

        <button className="btn" onClick={() => onNavigate("storyBible")}>
  🌍 Story Bible
</button>

        <button className="btn" onClick={() => onNavigate("monsters")}>
          🐉 Monsters
        </button>

        <button className="btn" onClick={() => onNavigate("locations")}>
          🗺️ Locations
        </button>

        <button className="btn" onClick={() => onNavigate("lore")}>
          📜 Lore
        </button>

        <button className="btn" onClick={() => onNavigate("maps")}>
          🧭 Maps
        </button>

        <button className="btn" onClick={() => onNavigate("session")}>
          ⚔️ Live Session
        </button>
      </div>
    </div>
  );
}

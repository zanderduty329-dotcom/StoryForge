import type { World } from "../App";

export function StoryBiblePage({ world }: { world: World }) {
  return (
    <div>
      <h2>🌍 Story Bible</h2>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "18px",
          marginTop: "20px",
        }}
      >
        <h3>{world.name}</h3>

        <p>
          <strong>Premise:</strong> {world.premise}
        </p>

        <p>
          <strong>Genre:</strong> {world.genre}
        </p>

        <p>
          <strong>Tone:</strong> {world.tone}
        </p>

        <p>
          <strong>Visibility:</strong> {world.visibility}
        </p>
      </div>

      <div style={{ marginTop: "24px" }}>
        <h3>World Notes</h3>
        <p>
          This is where we will add factions, history, kingdoms, religions,
          timelines, major events, and other world information.
        </p>
      </div>
    </div>
  );
}

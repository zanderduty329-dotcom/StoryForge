import { useState } from "react";
import type { World } from "../App";

export function HomePage({
  worlds,
  loading,
  onOpenWorld,
  onWorldCreated,
}: {

  worlds: World[];
  loading: boolean;
  onOpenWorld: (world: World) => void;
  onWorldCreated: () => void;
}) {
  const [name, setName] = useState("");

  const createWorld = () => {
    const worldName = name.trim() || "My New World";

    const newWorld: World = {
      id: crypto.randomUUID(),
      name: worldName,
      premise: "A new world waiting to be explored.",
      genre: "Fantasy",
      tone: "Adventure",
      visibility: "private",
    };
const saved = localStorage.getItem("storyforge-worlds");
const existing: World[] = saved ? JSON.parse(saved) : [];
localStorage.setItem("storyforge-worlds", JSON.stringify([...existing, newWorld]));
    onOpenWorld(newWorld);onWorldCreated();
  };

  if (loading) {
    return <p>Loading worlds...</p>;
  }

  return (
    <div>
      <h2>Your Worlds</h2>

      {worlds.length > 0 &&
        worlds.map((world) => (
          <button
            key={world.id}
            onClick={() => onOpenWorld(world)}
            style={{ display: "block", marginBottom: "10px" }}
          >
            🌍 {world.name}
          </button>
        ))}

      <div style={{ marginTop: "30px" }}>
        <h3>Create a New World</h3>

        <input
          type="text"
          placeholder="World name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          style={{
            padding: "10px",
            marginRight: "10px",
            borderRadius: "8px",
          }}
        />

        <button className="btn" onClick={createWorld}>
          ✨ Create World
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import type { World } from "../App";

export function HomePage({
  worlds,
  loading,
  onOpenWorld,
  onWorldCreated,
  onDeleteWorld,
}: {
  worlds: World[];
  loading: boolean;
  onOpenWorld: (
    world: World
  ) => void;
  onWorldCreated: () => void;
  onDeleteWorld: (
    worldId: string
  ) => void;
}) {
  const [
    name,
    setName,
  ] = useState("");

  const createWorld = () => {
    const worldName =
      name.trim() ||
      "My New Campaign";

    const newWorld: World = {
      id: crypto.randomUUID(),
      name: worldName,
      premise:
        "A new campaign waiting to be forged.",
      genre: "Fantasy",
      tone: "Adventure",
      visibility: "private",
    };

    let existing: World[] =
      [];

    try {
      const saved =
        localStorage.getItem(
          "storyforge-worlds"
        );

      const parsed =
        saved
          ? JSON.parse(saved)
          : [];

      existing =
        Array.isArray(parsed)
          ? parsed
          : [];
    } catch {
      existing = [];
    }

    localStorage.setItem(
      "storyforge-worlds",
      JSON.stringify([
        ...existing,
        newWorld,
      ])
    );

    setName("");

    onOpenWorld(newWorld);
    onWorldCreated();
  };

  const deleteWorld = (
    world: World
  ) => {
    /*
     * STORYFORGE HOME CAMPAIGN DELETE V1
     *
     * Permanent deletion requires typing the
     * campaign name exactly. This prevents an
     * accidental click from destroying campaign
     * data.
     */
    const confirmation =
      window.prompt(
        [
          `Permanently delete "${world.name}"?`,
          "",
          "This will remove the campaign and its locally saved characters, monsters, maps, items, dice history, and campaign data.",
          "",
          `Type "${world.name}" exactly to confirm.`,
        ].join("\n")
      );

    if (
      confirmation !==
      world.name
    ) {
      return;
    }

    onDeleteWorld(
      world.id
    );
  };

  if (loading) {
    return (
      <p>
        Loading campaigns...
      </p>
    );
  }

  return (
    <div>
      {/*
       * STORYFORGE HOME CAMPAIGNS V1
       */}
      <section>
        <h2>
          Your Campaigns
        </h2>

        <p
          style={{
            color:
              "var(--text-secondary)",
            marginTop: "6px",
          }}
        >
          Continue an existing
          campaign or begin forging
          a new one.
        </p>

        {worlds.length === 0 && (
          <div
            className="card"
            style={{
              marginTop: "20px",
            }}
          >
            <h3>
              No campaigns yet
            </h3>

            <p
              style={{
                color:
                  "var(--text-secondary)",
                marginBottom: 0,
              }}
            >
              Create your first
              StoryForge campaign
              below.
            </p>
          </div>
        )}

        {worlds.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            {worlds.map(
              (world) => (
                <div
                  key={
                    world.id
                  }
                  className="card"
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize:
                          "12px",
                        color:
                          "var(--text-muted)",
                        marginBottom:
                          "5px",
                      }}
                    >
                      DUNGEON MASTER
                    </div>

                    <h3
                      style={{
                        margin: 0,
                      }}
                    >
                      {world.name}
                    </h3>

                    <div
                      style={{
                        marginTop:
                          "6px",
                        fontSize:
                          "13px",
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      {world.genre}
                      {" • "}
                      {world.tone}
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    {world.premise}
                  </p>

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "8px",
                      flexWrap:
                        "wrap",
                      marginTop:
                        "auto",
                    }}
                  >
                    <button
                      className="btn"
                      onClick={() =>
                        onOpenWorld(
                          world
                        )
                      }
                    >
                      Open Campaign
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        deleteWorld(
                          world
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section
        className="card"
        style={{
          marginTop: "30px",
        }}
      >
        <h3>
          Create Campaign
        </h3>

        <p
          style={{
            color:
              "var(--text-secondary)",
          }}
        >
          Start with a campaign
          name. Story details,
          players, maps, lore, and
          rules can be built from
          the DM Screen.
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="Campaign name"
            value={name}
            onChange={(
              event
            ) =>
              setName(
                event.target
                  .value
              )
            }
            onKeyDown={(
              event
            ) => {
              if (
                event.key ===
                "Enter"
              ) {
                createWorld();
              }
            }}
            style={{
              padding: "10px",
              borderRadius:
                "8px",
              flex:
                "1 1 240px",
              maxWidth:
                "420px",
            }}
          />

          <button
            className="btn"
            onClick={
              createWorld
            }
          >
            Create Campaign
          </button>
        </div>
      </section>
    </div>
  );
}

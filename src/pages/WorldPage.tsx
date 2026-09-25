import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Page,
  World,
} from "../App";

import {
  useCampaign,
} from "../context/CampaignContext";


type CharacterOption = {
  id: string;
  name: string;
  kind?: "player" | "npc";
  ancestry?: string;
  role?: string;
};


export function WorldPage({
  world,
  onNavigate,
}: {
  world: World;
  onNavigate: (page: Page) => void;
}) {
  const {
    core,
    ready,
    isDM,
    addPlayer,
    removePlayer,
    linkPlayerCharacter,
  } = useCampaign();

  const [playerName, setPlayerName] =
    useState("");

  const [characters, setCharacters] =
    useState<CharacterOption[]>([]);

  const [sessionPrep, setSessionPrep] =
    useState("");


  const characterStorageKey =
    `storyforge-characters-${world.id}`;

  const sessionPrepStorageKey =
    `storyforge-session-prep-${world.id}`;


  /*
   * STORYFORGE DM SCREEN V1
   *
   * CharacterPage still owns campaign character
   * data. The DM Screen only reads enough here
   * to connect campaign members to characters.
   */
  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(
          characterStorageKey
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      if (!Array.isArray(parsed)) {
        setCharacters([]);
        return;
      }

      setCharacters(
        parsed.filter(
          (character) =>
            character &&
            typeof character.id === "string" &&
            typeof character.name === "string"
        )
      );
    } catch {
      setCharacters([]);
    }
  }, [characterStorageKey]);


  /*
   * Session Prep is private DM planning.
   *
   * It is intentionally NOT Lore and does not
   * become established campaign truth merely
   * because the DM writes it here.
   */
  useEffect(() => {
    try {
      setSessionPrep(
        localStorage.getItem(
          sessionPrepStorageKey
        ) ?? ""
      );
    } catch {
      setSessionPrep("");
    }
  }, [sessionPrepStorageKey]);


  const players =
    useMemo(
      () =>
        core?.members.filter(
          (member) =>
            member.role === "player"
        ) ?? [],
      [core]
    );


  const dm =
    useMemo(
      () =>
        core?.members.find(
          (member) =>
            member.role === "dm"
        ) ?? null,
      [core]
    );


  const playerCharacters =
    useMemo(
      () =>
        characters.filter(
          (character) =>
            character.kind !== "npc"
        ),
      [characters]
    );


  const addCampaignPlayer = () => {
    const cleanName =
      playerName.trim();

    if (!cleanName) {
      return;
    }

    addPlayer(cleanName);
    setPlayerName("");
  };


  const updateSessionPrep = (
    value: string
  ) => {
    setSessionPrep(value);

    try {
      localStorage.setItem(
        sessionPrepStorageKey,
        value
      );
    } catch {
      // Storage failure should not break
      // the rest of the DM Screen.
    }
  };


  if (!ready) {
    return <p>Loading campaign...</p>;
  }


  if (!isDM) {
    return (
      <div className="card">
        <h2>DM Screen</h2>

        <p>
          This area is available only to the
          Dungeon Master.
        </p>
      </div>
    );
  }


  return (
    <div>
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "4px",
              }}
            >
              CAMPAIGN
            </div>

            <h2
              style={{
                marginTop: 0,
                marginBottom: "6px",
              }}
            >
              {world.name}
            </h2>

            <p
              style={{
                color:
                  "var(--text-secondary)",
                marginTop: 0,
              }}
            >
              {world.premise}
            </p>
          </div>

          <button
            className="btn"
            onClick={() =>
              onNavigate("storyBible")
            }
          >
            View / Edit Campaign
          </button>
        </div>


        <div
          className="card"
          style={{
            marginTop: "18px",
          }}
        >
          <h3>Campaign Overview</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <small>GENRE</small>
              <div>
                <strong>
                  {world.genre}
                </strong>
              </div>
            </div>

            <div>
              <small>TONE</small>
              <div>
                <strong>
                  {world.tone}
                </strong>
              </div>
            </div>

            <div>
              <small>PLAYERS</small>
              <div>
                <strong>
                  {players.length}
                </strong>
              </div>
            </div>

            <div>
              <small>
                CAMPAIGN CHARACTERS
              </small>
              <div>
                <strong>
                  {
                    playerCharacters.length
                  }
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section
        className="card"
        style={{
          marginTop: "24px",
        }}
      >
        <h3>Players</h3>

        <p
          style={{
            color:
              "var(--text-secondary)",
          }}
        >
          Manage campaign members and connect
          them to campaign characters.
        </p>

        {dm && (
          <div
            style={{
              paddingBottom: "12px",
              marginBottom: "12px",
              borderBottom:
                "1px solid var(--border)",
            }}
          >
            <strong>
              {dm.displayName}
            </strong>

            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              Dungeon Master
            </div>
          </div>
        )}


        {players.length === 0 && (
          <p
            style={{
              color: "var(--text-muted)",
            }}
          >
            No players have been added yet.
          </p>
        )}


        {players.map((player) => (
          <div
            key={player.id}
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(130px, 1fr) minmax(190px, 1fr) auto",
              gap: "10px",
              alignItems: "center",
              borderTop:
                "1px solid var(--border)",
              padding: "12px 0",
            }}
          >
            <div>
              <strong>
                {player.displayName}
              </strong>

              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                }}
              >
                Player
              </div>
            </div>

            <select
              value={
                player.characterId ?? ""
              }
              onChange={(event) =>
                linkPlayerCharacter(
                  player.id,
                  event.target.value ||
                    undefined
                )
              }
              style={{
                width: "100%",
                padding: "9px",
                borderRadius: "8px",
              }}
            >
              <option value="">
                No Character Assigned
              </option>

              {playerCharacters.map(
                (character) => (
                  <option
                    key={character.id}
                    value={character.id}
                  >
                    {character.name}
                    {character.ancestry
                      ? ` — ${character.ancestry}`
                      : ""}
                  </option>
                )
              )}
            </select>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const confirmed =
                  window.confirm(
                    `Remove ${player.displayName} from this campaign? Their character will not be deleted.`
                  );

                if (confirmed) {
                  removePlayer(
                    player.id
                  );
                }
              }}
            >
              Remove
            </button>
          </div>
        ))}


        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "14px",
          }}
        >
          <input
            value={playerName}
            placeholder="Player name"
            onChange={(event) =>
              setPlayerName(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                addCampaignPlayer();
              }
            }}
            style={{
              padding: "10px",
              borderRadius: "8px",
              flex: "1 1 200px",
              maxWidth: "320px",
            }}
          />

          <button
            className="btn"
            onClick={
              addCampaignPlayer
            }
          >
            + Add Player
          </button>

          <button
            className="btn btn-secondary"
            onClick={() =>
              onNavigate("characters")
            }
          >
            Manage Characters
          </button>
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginBottom: 0,
          }}
        >
          Later, online players will join this
          roster using a campaign invitation and
          can bring an approved personal
          character into the campaign.
        </p>
      </section>


      <section
        style={{
          marginTop: "26px",
        }}
      >
        <h3>World & Story</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <button
            className="btn"
            onClick={() =>
              onNavigate("storyBible")
            }
          >
            Campaign
          </button>

          <button
            className="btn"
            onClick={() =>
              onNavigate("characters")
            }
          >
            Characters
          </button>

          <button
            className="btn"
            onClick={() =>
              onNavigate("monsters")
            }
          >
            Monster Guide
          </button>

          <button
            className="btn"
            onClick={() =>
              onNavigate("locations")
            }
          >
            Location Archives
          </button>

          <button
            className="btn"
            onClick={() =>
              onNavigate("lore")
            }
          >
            Lore Archives
          </button>

          <button
            className="btn"
            onClick={() =>
              onNavigate("maps")
            }
          >
            World Map
          </button>
        </div>
      </section>


      <section
        className="card"
        style={{
          marginTop: "26px",
        }}
      >
        <h3>Session Prep</h3>

        <p
          style={{
            color:
              "var(--text-secondary)",
          }}
        >
          Private future-facing ideas for the DM.
          These notes are not established campaign
          lore until something actually makes them
          part of the story.
        </p>

        <textarea
          value={sessionPrep}
          onChange={(event) =>
            updateSessionPrep(
              event.target.value
            )
          }
          placeholder="Possible encounters, future scenes, secrets, twists, reminders..."
          rows={7}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            borderRadius: "8px",
            resize: "vertical",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "12px",
            alignItems: "center",
          }}
        >
          <button
            className="btn"
            onClick={() =>
              onNavigate("session")
            }
          >
            Live Session
          </button>

          <span
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            Session Prep saves automatically.
          </span>
        </div>
      </section>


      <section
        className="card"
        style={{
          marginTop: "26px",
        }}
      >
        <h3>StoryForge AI</h3>

        <p
          style={{
            color:
              "var(--text-secondary)",
            marginBottom: 0,
          }}
        >
          Campaign-aware AI commands, proposed
          actions, review controls, and activity
          history will connect here as their
          underlying systems are completed.
        </p>
      </section>
    </div>
  );
}

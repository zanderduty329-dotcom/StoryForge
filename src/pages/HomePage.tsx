import {
  useState,
} from "react";

import type {
  World,
} from "../App";

import {
  addPersonalCharacter,
  deletePersonalCharacter,
  readPersonalCharacters,
  updatePersonalCharacter,
} from "../lib/personalCharacters";

import type {
  PersonalCharacter,
} from "../lib/personalCharacters";

import {
  submitPersonalCharacterToCampaign,
} from "../lib/campaignCharacters";


type CharacterEditorDraft = {
  name: string;
  ancestry: string;
  role: string;
  appearance: string;
  personality: string;
  background: string;
};


const emptyCharacterDraft =
  (): CharacterEditorDraft => ({
    name: "",
    ancestry: "",
    role: "",
    appearance: "",
    personality: "",
    background: "",
  });


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
  ] =
    useState("");

  const [
    personalCharacters,
    setPersonalCharacters,
  ] =
    useState(
      () =>
        readPersonalCharacters()
    );

  const [
    showCharacterCreator,
    setShowCharacterCreator,
  ] =
    useState(false);

  const [
    characterDraft,
    setCharacterDraft,
  ] =
    useState<CharacterEditorDraft>(
      emptyCharacterDraft
    );

  /*
   * STORYFORGE PERSONAL CHARACTER SUBMISSION V1
   */
  const [
    submittingCharacterId,
    setSubmittingCharacterId,
  ] =
    useState<string | null>(
      null
    );

  const [
    submissionCampaignId,
    setSubmissionCampaignId,
  ] =
    useState("");

  const [
    submissionMessage,
    setSubmissionMessage,
  ] =
    useState("");


  const [
    editingCharacterId,
    setEditingCharacterId,
  ] =
    useState<
      string | null
    >(null);

  const [
    editDraft,
    setEditDraft,
  ] =
    useState<CharacterEditorDraft>(
      emptyCharacterDraft
    );


  const createWorld = () => {
    const worldName =
      name.trim() ||
      "My New Campaign";

    const newWorld: World = {
      id:
        crypto.randomUUID(),

      name:
        worldName,

      premise:
        "A new campaign waiting to be forged.",

      genre:
        "Fantasy",

      tone:
        "Adventure",

      visibility:
        "private",
    };

    let existing:
      World[] = [];

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

    onOpenWorld(
      newWorld
    );

    onWorldCreated();
  };


  const deleteWorld = (
    world: World
  ) => {
    const confirmation =
      window.prompt(
        [
          `Permanently delete "${world.name}"?`,
          "",
          "This removes this campaign's locally saved campaign data.",
          "",
          "Personal StoryForge characters are not deleted.",
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


  /*
   * STORYFORGE MY CHARACTERS V1
   *
   * These are player-owned character templates.
   * They are intentionally independent from all
   * campaign character records.
   */
  const createMyCharacter =
    () => {
      const result =
        addPersonalCharacter({
          ...characterDraft,
        });

      setPersonalCharacters(
        result.characters
      );

      setCharacterDraft(
        emptyCharacterDraft()
      );

      setShowCharacterCreator(
        false
      );
    };


  const beginEditCharacter =
    (
      character:
        PersonalCharacter
    ) => {
      setEditingCharacterId(
        character.id
      );

      setEditDraft({
        name:
          character.name,

        ancestry:
          character.ancestry,

        role:
          character.role,

        appearance:
          character.appearance,

        personality:
          character.personality,

        background:
          character.background,
      });
    };


  const saveCharacterEdit =
    () => {
      if (
        !editingCharacterId
      ) {
        return;
      }

      const updated =
        updatePersonalCharacter(
          editingCharacterId,
          editDraft
        );

      setPersonalCharacters(
        updated
      );

      setEditingCharacterId(
        null
      );

      setEditDraft(
        emptyCharacterDraft()
      );
    };


  const removeMyCharacter =
    (
      character:
        PersonalCharacter
    ) => {
      const confirmed =
        window.confirm(
          `Delete "${character.name}" from My Characters?\n\nThis does not delete any future campaign copies of the character.`
        );

      if (!confirmed) {
        return;
      }

      const updated =
        deletePersonalCharacter(
          character.id
        );

      setPersonalCharacters(
        updated
      );

      if (
        editingCharacterId ===
        character.id
      ) {
        setEditingCharacterId(
          null
        );
      }
    };


  const beginCharacterSubmission =
    (
      character:
        PersonalCharacter
    ) => {
      setSubmittingCharacterId(
        character.id
      );

      setSubmissionCampaignId(
        worlds[0]?.id ?? ""
      );

      setSubmissionMessage("");
    };


  const submitCharacter =
    (
      character:
        PersonalCharacter
    ) => {
      if (
        !submissionCampaignId
      ) {
        setSubmissionMessage(
          "Choose a campaign first."
        );
        return;
      }

      const campaign =
        worlds.find(
          (world) =>
            world.id ===
            submissionCampaignId
        );

      if (!campaign) {
        setSubmissionMessage(
          "Campaign is no longer available."
        );
        return;
      }

      const result =
        submitPersonalCharacterToCampaign(
          campaign.id,
          character
        );

      if (
        result.created
      ) {
        setSubmissionMessage(
          `"${character.name}" was submitted to ${campaign.name} for DM approval.`
        );
      } else if (
        result.submission.status ===
        "approved"
      ) {
        setSubmissionMessage(
          `"${character.name}" has already been approved for ${campaign.name}.`
        );
      } else {
        setSubmissionMessage(
          `"${character.name}" is already waiting for DM approval in ${campaign.name}.`
        );
      }
    };


  if (loading) {
    return (
      <p>
        Loading StoryForge...
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
            marginTop:
              "6px",
          }}
        >
          Create and manage worlds
          where you are the Dungeon
          Master.
        </p>


        {worlds.length ===
          0 && (
          <div
            className="card"
            style={{
              marginTop:
                "20px",
            }}
          >
            <h3>
              No campaigns yet
            </h3>

            <p
              style={{
                color:
                  "var(--text-secondary)",
                marginBottom:
                  0,
              }}
            >
              Create a campaign when
              you are ready to run
              your own world.
            </p>
          </div>
        )}


        {worlds.length >
          0 && (
          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",

              gap:
                "16px",

              marginTop:
                "20px",
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

                    gap:
                      "12px",
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
                      {
                        world.name
                      }
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
                      {
                        world.genre
                      }
                      {" • "}
                      {
                        world.tone
                      }
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,

                      color:
                        "var(--text-secondary)",
                    }}
                  >
                    {
                      world.premise
                    }
                  </p>

                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "8px",

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


        <div
          className="card"
          style={{
            marginTop:
              "24px",
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
            name. The rest can be
            forged from the DM
            Screen.
          </p>

          <div
            style={{
              display:
                "flex",

              gap:
                "10px",

              flexWrap:
                "wrap",
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
                padding:
                  "10px",

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
        </div>
      </section>


      {/*
       * STORYFORGE PERSONAL CHARACTER HOME V1
       */}
      <section
        style={{
          marginTop:
            "38px",
        }}
      >
        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            gap:
              "12px",

            flexWrap:
              "wrap",
          }}
        >
          <div>
            <h2
              style={{
                marginBottom:
                  "4px",
              }}
            >
              My Characters
            </h2>

            <p
              style={{
                color:
                  "var(--text-secondary)",

                marginTop:
                  0,
              }}
            >
              Create characters
              independently before
              joining a campaign.
            </p>
          </div>

          <button
            className="btn"
            onClick={() =>
              setShowCharacterCreator(
                (current) =>
                  !current
              )
            }
          >
            {showCharacterCreator
              ? "Cancel"
              : "+ Create Character"}
          </button>
        </div>


        {showCharacterCreator && (
          <div
            className="card"
            style={{
              marginTop:
                "18px",
            }}
          >
            <h3>
              Create My Character
            </h3>

            <p
              style={{
                color:
                  "var(--text-secondary)",
              }}
            >
              This is your
              character's personal
              identity. Campaign
              equipment, discoveries,
              health, and progression
              will be created
              separately when the
              character joins a
              campaign.
            </p>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",

                gap:
                  "12px",
              }}
            >
              <input
                value={
                  characterDraft.name
                }
                placeholder="Character name"
                onChange={(
                  event
                ) =>
                  setCharacterDraft(
                    (
                      current
                    ) => ({
                      ...current,
                      name:
                        event
                          .target
                          .value,
                    })
                  )
                }
              />

              <input
                value={
                  characterDraft.ancestry
                }
                placeholder="Ancestry / Species"
                onChange={(
                  event
                ) =>
                  setCharacterDraft(
                    (
                      current
                    ) => ({
                      ...current,
                      ancestry:
                        event
                          .target
                          .value,
                    })
                  )
                }
              />

              <input
                value={
                  characterDraft.role
                }
                placeholder="Role / Class"
                onChange={(
                  event
                ) =>
                  setCharacterDraft(
                    (
                      current
                    ) => ({
                      ...current,
                      role:
                        event
                          .target
                          .value,
                    })
                  )
                }
              />
            </div>


            <textarea
              value={
                characterDraft.appearance
              }
              placeholder="Appearance"
              rows={3}
              onChange={(
                event
              ) =>
                setCharacterDraft(
                  (
                    current
                  ) => ({
                    ...current,
                    appearance:
                      event
                        .target
                        .value,
                  })
                )
              }
              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                marginTop:
                  "12px",

                padding:
                  "10px",
              }}
            />

            <textarea
              value={
                characterDraft.personality
              }
              placeholder="Personality"
              rows={3}
              onChange={(
                event
              ) =>
                setCharacterDraft(
                  (
                    current
                  ) => ({
                    ...current,
                    personality:
                      event
                        .target
                        .value,
                  })
                )
              }
              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                marginTop:
                  "12px",

                padding:
                  "10px",
              }}
            />

            <textarea
              value={
                characterDraft.background
              }
              placeholder="Background / Backstory"
              rows={5}
              onChange={(
                event
              ) =>
                setCharacterDraft(
                  (
                    current
                  ) => ({
                    ...current,
                    background:
                      event
                        .target
                        .value,
                  })
                )
              }
              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                marginTop:
                  "12px",

                padding:
                  "10px",
              }}
            />

            <button
              className="btn"
              onClick={
                createMyCharacter
              }
              style={{
                marginTop:
                  "12px",
              }}
            >
              Save Character
            </button>
          </div>
        )}


        {personalCharacters.length ===
          0 &&
          !showCharacterCreator && (
          <div
            className="card"
            style={{
              marginTop:
                "18px",
            }}
          >
            <h3>
              No personal characters
            </h3>

            <p
              style={{
                color:
                  "var(--text-secondary)",

                marginBottom:
                  0,
              }}
            >
              You do not need to be
              inside a campaign to
              create your character.
            </p>
          </div>
        )}


        {personalCharacters.length >
          0 && (
          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",

              gap:
                "16px",

              marginTop:
                "18px",
            }}
          >
            {personalCharacters.map(
              (
                character
              ) => {
                const editing =
                  editingCharacterId ===
                  character.id;

                return (
                  <div
                    key={
                      character.id
                    }
                    className="card"
                  >
                    {!editing ? (
                      <>
                        <div
                          style={{
                            fontSize:
                              "12px",

                            color:
                              "var(--text-muted)",
                          }}
                        >
                          PERSONAL CHARACTER
                        </div>

                        <h3>
                          {
                            character.name
                          }
                        </h3>

                        {(character.ancestry ||
                          character.role) && (
                          <p
                            style={{
                              color:
                                "var(--text-secondary)",
                            }}
                          >
                            {
                              character.ancestry ||
                              "Unspecified ancestry"
                            }

                            {character.role
                              ? ` • ${character.role}`
                              : ""}
                          </p>
                        )}

                        {character.background && (
                          <p>
                            {
                              character.background
                            }
                          </p>
                        )}

                        <div
                          style={{
                            display:
                              "flex",

                            gap:
                              "8px",

                            flexWrap:
                              "wrap",
                          }}
                        >
                          <button
                            className="btn"
                            onClick={() =>
                              beginEditCharacter(
                                character
                              )
                            }
                          >
                            Edit Character
                          </button>

                          <button
                            className="btn btn-secondary"
                            onClick={() =>
                              removeMyCharacter(
                                character
                              )
                            }
                          >
                            Delete
                          </button>

                          <button
                            className="btn btn-secondary"
                            onClick={() =>
                              beginCharacterSubmission(
                                character
                              )
                            }
                          >
                            Bring to Campaign
                          </button>
                        </div>

                        {submittingCharacterId ===
                          character.id && (
                          <div
                            style={{
                              marginTop:
                                "14px",
                              paddingTop:
                                "14px",
                              borderTop:
                                "1px solid var(--border)",
                            }}
                          >
                            <strong>
                              Submit to Campaign
                            </strong>

                            {worlds.length === 0 ? (
                              <p
                                style={{
                                  color:
                                    "var(--text-secondary)",
                                }}
                              >
                                No local campaigns are available yet.
                                Later, joined online campaigns will
                                appear here too.
                              </p>
                            ) : (
                              <>
                                <select
                                  value={
                                    submissionCampaignId
                                  }
                                  onChange={(event) => {
                                    setSubmissionCampaignId(
                                      event.target.value
                                    );

                                    setSubmissionMessage(
                                      ""
                                    );
                                  }}
                                  style={{
                                    width:
                                      "100%",
                                    marginTop:
                                      "10px",
                                    padding:
                                      "9px",
                                    borderRadius:
                                      "8px",
                                  }}
                                >
                                  {worlds.map(
                                    (world) => (
                                      <option
                                        key={
                                          world.id
                                        }
                                        value={
                                          world.id
                                        }
                                      >
                                        {
                                          world.name
                                        }
                                      </option>
                                    )
                                  )}
                                </select>

                                <div
                                  style={{
                                    display:
                                      "flex",
                                    gap:
                                      "8px",
                                    flexWrap:
                                      "wrap",
                                    marginTop:
                                      "10px",
                                  }}
                                >
                                  <button
                                    className="btn"
                                    onClick={() =>
                                      submitCharacter(
                                        character
                                      )
                                    }
                                  >
                                    Submit for Approval
                                  </button>

                                  <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                      setSubmittingCharacterId(
                                        null
                                      );

                                      setSubmissionMessage(
                                        ""
                                      );
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </>
                            )}

                            {submissionMessage && (
                              <p
                                style={{
                                  fontSize:
                                    "13px",
                                  color:
                                    "var(--text-secondary)",
                                  marginBottom:
                                    0,
                                }}
                              >
                                {
                                  submissionMessage
                                }
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <h3>
                          Edit Character
                        </h3>

                        <input
                          value={
                            editDraft.name
                          }
                          placeholder="Character name"
                          onChange={(
                            event
                          ) =>
                            setEditDraft(
                              (
                                current
                              ) => ({
                                ...current,
                                name:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                        />

                        <input
                          value={
                            editDraft.ancestry
                          }
                          placeholder="Ancestry / Species"
                          onChange={(
                            event
                          ) =>
                            setEditDraft(
                              (
                                current
                              ) => ({
                                ...current,
                                ancestry:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          style={{
                            marginTop:
                              "8px",
                          }}
                        />

                        <input
                          value={
                            editDraft.role
                          }
                          placeholder="Role / Class"
                          onChange={(
                            event
                          ) =>
                            setEditDraft(
                              (
                                current
                              ) => ({
                                ...current,
                                role:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          style={{
                            marginTop:
                              "8px",
                          }}
                        />

                        <textarea
                          value={
                            editDraft.appearance
                          }
                          placeholder="Appearance"
                          rows={3}
                          onChange={(
                            event
                          ) =>
                            setEditDraft(
                              (
                                current
                              ) => ({
                                ...current,
                                appearance:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          style={{
                            width:
                              "100%",

                            boxSizing:
                              "border-box",

                            marginTop:
                              "8px",
                          }}
                        />

                        <textarea
                          value={
                            editDraft.personality
                          }
                          placeholder="Personality"
                          rows={3}
                          onChange={(
                            event
                          ) =>
                            setEditDraft(
                              (
                                current
                              ) => ({
                                ...current,
                                personality:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          style={{
                            width:
                              "100%",

                            boxSizing:
                              "border-box",

                            marginTop:
                              "8px",
                          }}
                        />

                        <textarea
                          value={
                            editDraft.background
                          }
                          placeholder="Background / Backstory"
                          rows={5}
                          onChange={(
                            event
                          ) =>
                            setEditDraft(
                              (
                                current
                              ) => ({
                                ...current,
                                background:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          style={{
                            width:
                              "100%",

                            boxSizing:
                              "border-box",

                            marginTop:
                              "8px",
                          }}
                        />

                        <div
                          style={{
                            display:
                              "flex",

                            gap:
                              "8px",

                            flexWrap:
                              "wrap",

                            marginTop:
                              "10px",
                          }}
                        >
                          <button
                            className="btn"
                            onClick={
                              saveCharacterEdit
                            }
                          >
                            Save
                          </button>

                          <button
                            className="btn btn-secondary"
                            onClick={() =>
                              setEditingCharacterId(
                                null
                              )
                            }
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}


        <div
          className="card"
          style={{
            marginTop:
              "18px",
          }}
        >
          <strong>
            Campaign Characters
          </strong>

          <p
            style={{
              color:
                "var(--text-secondary)",

              marginBottom:
                0,
            }}
          >
            Later, when a player
            joins a campaign, they
            will choose one of their
            personal characters or
            create a new one. The DM
            can review it before
            StoryForge creates the
            campaign-specific version.
          </p>
        </div>
      </section>
    </div>
  );
}

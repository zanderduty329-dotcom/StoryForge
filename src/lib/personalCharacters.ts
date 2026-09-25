/*
 * STORYFORGE PERSONAL CHARACTERS V1
 *
 * These characters belong to the player/creator,
 * not to a specific campaign.
 *
 * Later, an online StoryForge account will own
 * these records. For local V1 they live in
 * browser storage.
 *
 * Campaign-specific state such as inventory,
 * current health, discoveries, knowledge,
 * reputation, and session history must NOT be
 * stored here.
 */

export const PERSONAL_CHARACTER_VERSION = 1;

export const PERSONAL_CHARACTER_STORAGE_KEY =
  "storyforge-my-characters";


export interface PersonalCharacter {
  version: 1;

  id: string;
  name: string;

  /*
   * Free text by design.
   *
   * StoryForge should not force every campaign
   * into a predefined fantasy ancestry/class list.
   */
  ancestry: string;
  role: string;

  appearance: string;
  personality: string;
  background: string;

  createdAt: string;
  updatedAt: string;
}


export type PersonalCharacterDraft = {
  name: string;
  ancestry?: string;
  role?: string;
  appearance?: string;
  personality?: string;
  background?: string;
};


function isPersonalCharacter(
  value: unknown
): value is PersonalCharacter {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as Partial<PersonalCharacter>;

  return (
    candidate.version ===
      PERSONAL_CHARACTER_VERSION &&
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.ancestry === "string" &&
    typeof candidate.role === "string"
  );
}


export function readPersonalCharacters():
  PersonalCharacter[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        PERSONAL_CHARACTER_STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      isPersonalCharacter
    );
  } catch {
    return [];
  }
}


export function writePersonalCharacters(
  characters: PersonalCharacter[]
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    PERSONAL_CHARACTER_STORAGE_KEY,
    JSON.stringify(characters)
  );
}


export function createPersonalCharacter(
  draft: PersonalCharacterDraft
): PersonalCharacter {
  const now =
    new Date().toISOString();

  return {
    version:
      PERSONAL_CHARACTER_VERSION,

    id:
      crypto.randomUUID(),

    name:
      draft.name.trim() ||
      "Unnamed Character",

    ancestry:
      draft.ancestry?.trim() ??
      "",

    role:
      draft.role?.trim() ??
      "",

    appearance:
      draft.appearance?.trim() ??
      "",

    personality:
      draft.personality?.trim() ??
      "",

    background:
      draft.background?.trim() ??
      "",

    createdAt: now,
    updatedAt: now,
  };
}


export function addPersonalCharacter(
  draft: PersonalCharacterDraft
) {
  const character =
    createPersonalCharacter(
      draft
    );

  const current =
    readPersonalCharacters();

  const updated = [
    ...current,
    character,
  ];

  writePersonalCharacters(
    updated
  );

  return {
    character,
    characters: updated,
  };
}


export function updatePersonalCharacter(
  characterId: string,
  changes:
    Partial<
      Pick<
        PersonalCharacter,
        | "name"
        | "ancestry"
        | "role"
        | "appearance"
        | "personality"
        | "background"
      >
    >
) {
  const current =
    readPersonalCharacters();

  const updated =
    current.map(
      (character) => {
        if (
          character.id !==
          characterId
        ) {
          return character;
        }

        return {
          ...character,
          ...changes,

          name:
            changes.name !==
            undefined
              ? changes.name.trim() ||
                character.name
              : character.name,

          updatedAt:
            new Date()
              .toISOString(),
        };
      }
    );

  writePersonalCharacters(
    updated
  );

  return updated;
}


export function deletePersonalCharacter(
  characterId: string
) {
  const updated =
    readPersonalCharacters()
      .filter(
        (character) =>
          character.id !==
          characterId
      );

  writePersonalCharacters(
    updated
  );

  return updated;
}

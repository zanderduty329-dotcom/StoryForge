import type {
  PersonalCharacter,
} from "./personalCharacters";

/*
 * STORYFORGE CHARACTER ADMISSION V1
 *
 * Personal characters and campaign characters
 * are deliberately separate records.
 *
 * A personal character may be submitted to a
 * campaign. DM approval creates a COPY in that
 * campaign's character archive.
 *
 * Later, online accounts and campaign invitations
 * will use this same submission structure.
 */

export type CharacterSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected";


export interface CharacterSubmissionSnapshot {
  name: string;
  ancestry: string;
  role: string;
  appearance: string;
  personality: string;
  background: string;
}


export interface CampaignCharacterSubmission {
  version: 1;

  id: string;
  campaignId: string;

  personalCharacterId: string;

  /*
   * Future online membership can populate this.
   */
  submittedByMemberId?: string;

  snapshot:
    CharacterSubmissionSnapshot;

  status:
    CharacterSubmissionStatus;

  submittedAt: string;
  decidedAt?: string;

  campaignCharacterId?: string;
}


export function characterSubmissionStorageKey(
  campaignId: string
) {
  return `storyforge-character-submissions-${campaignId}`;
}


function isSubmission(
  value: unknown,
  campaignId: string
): value is CampaignCharacterSubmission {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as Partial<CampaignCharacterSubmission>;

  return (
    candidate.version === 1 &&
    candidate.campaignId === campaignId &&
    typeof candidate.id === "string" &&
    typeof candidate.personalCharacterId === "string" &&
    !!candidate.snapshot &&
    (
      candidate.status === "pending" ||
      candidate.status === "approved" ||
      candidate.status === "rejected"
    )
  );
}


export function readCharacterSubmissions(
  campaignId: string
): CampaignCharacterSubmission[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        characterSubmissionStorageKey(
          campaignId
        )
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
      (value) =>
        isSubmission(
          value,
          campaignId
        )
    );
  } catch {
    return [];
  }
}


export function writeCharacterSubmissions(
  campaignId: string,
  submissions:
    CampaignCharacterSubmission[]
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    characterSubmissionStorageKey(
      campaignId
    ),
    JSON.stringify(
      submissions
    )
  );
}


export function submitPersonalCharacterToCampaign(
  campaignId: string,
  character: PersonalCharacter
) {
  const current =
    readCharacterSubmissions(
      campaignId
    );

  /*
   * Do not create duplicate pending/approved
   * requests for the same personal character.
   *
   * A rejected character may be submitted again
   * later after the player edits it.
   */
  const existing =
    current.find(
      (submission) =>
        submission.personalCharacterId ===
          character.id &&
        submission.status !==
          "rejected"
    );

  if (existing) {
    return {
      created: false,
      submission: existing,
      submissions: current,
    };
  }

  const submission:
    CampaignCharacterSubmission = {
      version: 1,

      id:
        crypto.randomUUID(),

      campaignId,

      personalCharacterId:
        character.id,

      snapshot: {
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
      },

      status:
        "pending",

      submittedAt:
        new Date()
          .toISOString(),
    };

  const updated = [
    ...current,
    submission,
  ];

  writeCharacterSubmissions(
    campaignId,
    updated
  );

  return {
    created: true,
    submission,
    submissions: updated,
  };
}


type CampaignCharacterRecord = {
  id: string;
  name: string;
  ancestry: string;
  role: string;
  kind: "player";
  level: number;

  description?: string;
  personality?: string;
  notes?: string;

  inventory: unknown[];

  stats: {
    health: number;
    armor: number;
    movementSpeed: number;
    damage: number;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };

  /*
   * These links preserve where the campaign
   * character originally came from without
   * making it a live synchronized object.
   */
  sourcePersonalCharacterId:
    string;

  sourceSubmissionId:
    string;
};


function campaignCharacterStorageKey(
  campaignId: string
) {
  return `storyforge-characters-${campaignId}`;
}


function readCampaignCharacters(
  campaignId: string
): Record<string, unknown>[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        campaignCharacterStorageKey(
          campaignId
        )
      );

    const parsed =
      raw
        ? JSON.parse(raw)
        : [];

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}


export function approveCharacterSubmission(
  campaignId: string,
  submissionId: string
) {
  const submissions =
    readCharacterSubmissions(
      campaignId
    );

  const submission =
    submissions.find(
      (candidate) =>
        candidate.id ===
        submissionId
    );

  if (
    !submission ||
    submission.status !==
      "pending"
  ) {
    return null;
  }

  const existingCharacters =
    readCampaignCharacters(
      campaignId
    );

  /*
   * Defensive duplicate protection in case an
   * approval button is triggered twice.
   */
  const existingCharacter =
    existingCharacters.find(
      (character) =>
        character.sourceSubmissionId ===
        submission.id
    );

  let campaignCharacter:
    CampaignCharacterRecord;

  if (
    existingCharacter &&
    typeof existingCharacter.id ===
      "string"
  ) {
    campaignCharacter =
      existingCharacter as
        CampaignCharacterRecord;
  } else {
    campaignCharacter = {
      id:
        crypto.randomUUID(),

      name:
        submission.snapshot.name,

      ancestry:
        submission.snapshot.ancestry,

      role:
        submission.snapshot.role,

      kind:
        "player",

      level:
        1,

      /*
       * CharacterPage currently stores these
       * concepts using description/personality/
       * notes. We preserve the personal identity
       * without changing CharacterPage yet.
       */
      description:
        submission.snapshot.appearance,

      personality:
        submission.snapshot.personality,

      notes:
        submission.snapshot.background,

      inventory:
        [],

      stats: {
        health: 10,
        armor: 10,
        movementSpeed: 30,
        damage: 1,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },

      sourcePersonalCharacterId:
        submission.personalCharacterId,

      sourceSubmissionId:
        submission.id,
    };

    /*
     * STORYFORGE CHARACTER APPROVAL VERIFICATION V1
     *
     * Approval is transactional from the user's
     * point of view: StoryForge does not mark the
     * request approved until the campaign character
     * has actually been written and read back.
     */
    const nextCharacters = [
      ...existingCharacters,
      campaignCharacter,
    ];

    window.localStorage.setItem(
      campaignCharacterStorageKey(
        campaignId
      ),
      JSON.stringify(
        nextCharacters
      )
    );

    const verifiedCharacters =
      readCampaignCharacters(
        campaignId
      );

    const verified =
      verifiedCharacters.some(
        (character) =>
          character.id ===
            campaignCharacter.id &&
          character.sourceSubmissionId ===
            submission.id
      );

    if (!verified) {
      return {
        ok: false as const,
        error:
          "StoryForge could not verify the campaign character after saving it.",
        submissions,
      };
    }
  }

  /*
   * Existing imported characters are also
   * verified before their request is finalized.
   */
  const finalCharacters =
    readCampaignCharacters(
      campaignId
    );

  const finalCharacter =
    finalCharacters.find(
      (character) =>
        character.id ===
          campaignCharacter.id
    );

  if (!finalCharacter) {
    return {
      ok: false as const,
      error:
        "The campaign character was not found in campaign storage after approval.",
      submissions,
    };
  }

  const now =
    new Date()
      .toISOString();

  const updatedSubmissions =
    submissions.map(
      (candidate) =>
        candidate.id ===
        submission.id
          ? {
              ...candidate,

              status:
                "approved" as const,

              decidedAt:
                now,

              campaignCharacterId:
                campaignCharacter.id,
            }
          : candidate
    );

  writeCharacterSubmissions(
    campaignId,
    updatedSubmissions
  );

  return {
    ok: true as const,

    character:
      campaignCharacter,

    submissions:
      updatedSubmissions,
  };
}


export function rejectCharacterSubmission(
  campaignId: string,
  submissionId: string
) {
  const submissions =
    readCharacterSubmissions(
      campaignId
    );

  const now =
    new Date()
      .toISOString();

  const updated =
    submissions.map(
      (submission) =>
        submission.id ===
          submissionId &&
        submission.status ===
          "pending"
          ? {
              ...submission,

              status:
                "rejected" as const,

              decidedAt:
                now,
            }
          : submission
    );

  writeCharacterSubmissions(
    campaignId,
    updated
  );

  return updated;
}

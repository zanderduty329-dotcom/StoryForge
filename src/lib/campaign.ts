/*
 * STORYFORGE CAMPAIGN CORE V1
 *
 * Existing worldId values remain the permanent
 * campaign IDs.
 *
 * This module provides the shared authority layer
 * that Characters, Monsters, Locations, Lore,
 * Maps, Dice, AI, and Live Session can all use.
 */

export const CAMPAIGN_CORE_VERSION = 1;

export type CampaignRole =
  | "dm"
  | "player";

export type CampaignKnowledgeState =
  | "seen"
  | "heard"
  | "believed"
  | "confirmed"
  | "disproved";

export type CampaignKnowledgeSubject =
  | "character"
  | "monster"
  | "location"
  | "lore"
  | "map"
  | "event";

export interface CampaignKnowledgeRecord {
  id: string;

  /*
   * The world entity this knowledge concerns.
   *
   * The real world truth remains in the actual
   * entity/lore data. This record only represents
   * what a particular character knows or believes.
   */
  subjectType: CampaignKnowledgeSubject;
  subjectId: string;

  /*
   * Player knowledge belongs to a CHARACTER,
   * not merely a user account.
   *
   * That allows two characters controlled by the
   * same person to know different things.
   */
  characterId: string;

  state: CampaignKnowledgeState;

  /*
   * What the character currently understands.
   * This may intentionally differ from DM truth.
   */
  perceivedText?: string;

  sourceEventId?: string;
  discoveredAt: string;
}

export interface CampaignPermissions {
  canManageCampaign: boolean;
  canManageMembers: boolean;

  canEditWorld: boolean;

  canViewKnownWorld: boolean;
  canViewHiddenKnowledge: boolean;

  canViewFullMap: boolean;
  canEditMap: boolean;

  canViewAllCharacters: boolean;
  canEditOwnCharacter: boolean;
  canEditAllCharacters: boolean;

  canViewAllCreatures: boolean;
  canEditCreatures: boolean;

  canJoinSessions: boolean;
  canRunSessions: boolean;

  canUseDice: boolean;

  /*
   * Player-facing contextual help can eventually
   * use AI without revealing DM-only information.
   */
  canUseAIHelp: boolean;

  /*
   * DM-only ability to inspect/control the deeper
   * campaign AI and its proposed actions.
   */
  canInspectAI: boolean;
}

export interface CampaignMember {
  id: string;
  displayName: string;
  role: CampaignRole;

  /*
   * Players will eventually be tethered to their
   * active campaign character.
   *
   * DMs normally leave this undefined.
   */
  characterId?: string;

  /*
   * Optional per-member overrides.
   *
   * Role defaults remain the normal behavior.
   */
  permissions?: Partial<CampaignPermissions>;

  joinedAt: string;
}

export interface CampaignCore {
  version: 1;

  /*
   * campaignId === existing StoryForge worldId.
   */
  campaignId: string;

  members: CampaignMember[];

  /*
   * Character-scoped discoveries, perceptions,
   * beliefs, and revealed information.
   */
  knowledge: CampaignKnowledgeRecord[];

  roleDefaults: {
    dm: CampaignPermissions;
    player: CampaignPermissions;
  };

  createdAt: string;
  updatedAt: string;
}


export const DM_DEFAULT_PERMISSIONS:
  CampaignPermissions = {
    canManageCampaign: true,
    canManageMembers: true,

    canEditWorld: true,

    canViewKnownWorld: true,
    canViewHiddenKnowledge: true,

    canViewFullMap: true,
    canEditMap: true,

    canViewAllCharacters: true,
    canEditOwnCharacter: true,
    canEditAllCharacters: true,

    canViewAllCreatures: true,
    canEditCreatures: true,

    canJoinSessions: true,
    canRunSessions: true,

    canUseDice: true,

    canUseAIHelp: true,
    canInspectAI: true,
  };


export const PLAYER_DEFAULT_PERMISSIONS:
  CampaignPermissions = {
    canManageCampaign: false,
    canManageMembers: false,

    canEditWorld: false,

    canViewKnownWorld: true,
    canViewHiddenKnowledge: false,

    canViewFullMap: false,
    canEditMap: false,

    canViewAllCharacters: false,
    canEditOwnCharacter: true,
    canEditAllCharacters: false,

    canViewAllCreatures: false,
    canEditCreatures: false,

    canJoinSessions: true,
    canRunSessions: false,

    canUseDice: true,

    canUseAIHelp: true,
    canInspectAI: false,
  };


export function campaignCoreStorageKey(
  campaignId: string
) {
  return `storyforge-campaign-core-${campaignId}`;
}


export function createCampaignCore(
  campaignId: string
): CampaignCore {
  const now =
    new Date().toISOString();

  return {
    version:
      CAMPAIGN_CORE_VERSION,

    campaignId,

    /*
     * Development currently opens worlds from the
     * creator/DM side.
     *
     * Player membership comes in the next layer.
     */
    members: [
      {
        id: "local-dm",
        displayName: "Dungeon Master",
        role: "dm",
        joinedAt: now,
      },
    ],

    knowledge: [],

    roleDefaults: {
      dm: {
        ...DM_DEFAULT_PERMISSIONS,
      },

      player: {
        ...PLAYER_DEFAULT_PERMISSIONS,
      },
    },

    createdAt: now,
    updatedAt: now,
  };
}


function isCampaignCore(
  value: unknown,
  campaignId: string
): value is CampaignCore {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate =
    value as Partial<CampaignCore>;

  return (
    candidate.version ===
      CAMPAIGN_CORE_VERSION &&
    candidate.campaignId ===
      campaignId &&
    Array.isArray(
      candidate.members
    ) &&
    Array.isArray(
      candidate.knowledge
    ) &&
    !!candidate.roleDefaults
  );
}


export function readCampaignCore(
  campaignId: string
): CampaignCore | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        campaignCoreStorageKey(
          campaignId
        )
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    if (
      !isCampaignCore(
        parsed,
        campaignId
      )
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}


export function writeCampaignCore(
  core: CampaignCore
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    campaignCoreStorageKey(
      core.campaignId
    ),
    JSON.stringify(core)
  );
}


export function ensureCampaignCore(
  campaignId: string
) {
  const existing =
    readCampaignCore(
      campaignId
    );

  if (existing) {
    return existing;
  }

  const created =
    createCampaignCore(
      campaignId
    );

  writeCampaignCore(
    created
  );

  return created;
}



/*
 * STORYFORGE CAMPAIGN MEMBERSHIP V1
 *
 * Campaign members are the authority boundary
 * between DM and Player views.
 *
 * A player may be connected to one campaign
 * character. Knowledge remains character-scoped
 * so changing users does not rewrite what a
 * character knows.
 */

export function campaignActiveMemberStorageKey(
  campaignId: string
) {
  return `storyforge-campaign-active-member-${campaignId}`;
}


export function createCampaignPlayer(
  displayName: string,
  characterId?: string
): CampaignMember {
  const cleanName =
    displayName.trim() ||
    "Player";

  return {
    id:
      crypto.randomUUID(),

    displayName:
      cleanName,

    role:
      "player",

    characterId:
      characterId ||
      undefined,

    joinedAt:
      new Date()
        .toISOString(),
  };
}


export function addCampaignPlayer(
  core: CampaignCore,
  displayName: string,
  characterId?: string
): CampaignCore {
  const player =
    createCampaignPlayer(
      displayName,
      characterId
    );

  return {
    ...core,

    members: [
      ...core.members,
      player,
    ],
  };
}


export function removeCampaignMember(
  core: CampaignCore,
  memberId: string
): CampaignCore {
  const member =
    core.members.find(
      (candidate) =>
        candidate.id ===
        memberId
    );

  /*
   * The local campaign owner / DM cannot be
   * accidentally removed through this helper.
   */
  if (
    !member ||
    member.id === "local-dm" ||
    member.role === "dm"
  ) {
    return core;
  }

  return {
    ...core,

    members:
      core.members.filter(
        (candidate) =>
          candidate.id !==
          memberId
      ),
  };
}


export function renameCampaignMember(
  core: CampaignCore,
  memberId: string,
  displayName: string
): CampaignCore {
  const cleanName =
    displayName.trim();

  if (!cleanName) {
    return core;
  }

  return {
    ...core,

    members:
      core.members.map(
        (member) =>
          member.id ===
          memberId
            ? {
                ...member,
                displayName:
                  cleanName,
              }
            : member
      ),
  };
}


export function linkMemberCharacter(
  core: CampaignCore,
  memberId: string,
  characterId?: string
): CampaignCore {
  return {
    ...core,

    members:
      core.members.map(
        (member) =>
          member.id ===
          memberId &&
          member.role ===
            "player"
            ? {
                ...member,

                characterId:
                  characterId ||
                  undefined,
              }
            : member
      ),
  };
}


export function updateMemberPermissions(
  core: CampaignCore,
  memberId: string,
  overrides:
    Partial<CampaignPermissions>
): CampaignCore {
  return {
    ...core,

    members:
      core.members.map(
        (member) =>
          member.id ===
          memberId
            ? {
                ...member,

                permissions: {
                  ...(member.permissions ??
                    {}),
                  ...overrides,
                },
              }
            : member
      ),
  };
}


export function clearMemberPermissionOverrides(
  core: CampaignCore,
  memberId: string
): CampaignCore {
  return {
    ...core,

    members:
      core.members.map(
        (member) => {
          if (
            member.id !==
            memberId
          ) {
            return member;
          }

          const {
            permissions:
              _permissions,
            ...rest
          } = member;

          return rest;
        }
      ),
  };
}


export function readActiveCampaignMemberId(
  campaignId: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return (
    window.localStorage.getItem(
      campaignActiveMemberStorageKey(
        campaignId
      )
    ) || null
  );
}


export function writeActiveCampaignMemberId(
  campaignId: string,
  memberId: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    campaignActiveMemberStorageKey(
      campaignId
    ),
    memberId
  );
}



/*
 * STORYFORGE CAMPAIGN DELETE V1
 *
 * Removes browser data that belongs specifically
 * to one campaign/world ID.
 *
 * storyforge-worlds itself is intentionally NOT
 * modified here. App.tsx owns the campaign list.
 */
export function deleteCampaignLocalData(
  campaignId: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const suffix =
    `-${campaignId}`;

  /*
   * Remove backwards because localStorage indexes
   * shift whenever a key is deleted.
   *
   * Current StoryForge campaign storage follows
   * the pattern:
   *
   * storyforge-characters-<id>
   * storyforge-monsters-<id>
   * storyforge-maps-<id>
   * storyforge-item-compendium-<id>
   * storyforge-campaign-core-<id>
   * storyforge-campaign-active-member-<id>
   * dice/history keys ending in the same world ID
   */
  for (
    let index =
      window.localStorage.length - 1;
    index >= 0;
    index--
  ) {
    const key =
      window.localStorage.key(
        index
      );

    if (!key) {
      continue;
    }

    const isStoryForgeKey =
      key.startsWith(
        "storyforge-"
      );

    const belongsToCampaign =
      key.endsWith(
        suffix
      );

    if (
      isStoryForgeKey &&
      belongsToCampaign
    ) {
      window.localStorage.removeItem(
        key
      );
    }
  }
}


export function permissionsForMember(
  core: CampaignCore,
  member: CampaignMember
): CampaignPermissions {
  const defaults =
    core.roleDefaults[
      member.role
    ];

  return {
    ...defaults,
    ...(member.permissions ??
      {}),
  };
}

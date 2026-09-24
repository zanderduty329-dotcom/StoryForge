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

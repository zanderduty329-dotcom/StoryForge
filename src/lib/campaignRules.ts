/*
 * STORYFORGE CAMPAIGN RULES PROFILE V1
 *
 * Campaigns define their own mechanical stat language.
 *
 * Examples:
 *
 * Fantasy
 *   strength
 *   dexterity
 *   constitution
 *   intelligence
 *   wisdom
 *   charisma
 *
 * Sci-fi
 *   power
 *   reflex
 *   technology
 *   piloting
 *   psionics
 *   resolve
 *
 * Custom
 *   anything the campaign creator wants
 *
 * IMPORTANT:
 *
 * Stat IDs are stable mechanical identities.
 * Labels are presentation.
 *
 * An action stores:
 *
 *   attackStat: "technology"
 *
 * A campaign may later rename the visible label from:
 *
 *   Technology
 *
 * to:
 *
 *   Tech Aptitude
 *
 * without breaking the action reference.
 */


export type CampaignStatDefinition = {
  /*
   * Stable mechanical identity.
   *
   * Do not automatically change this when the
   * visible label changes.
   */
  id: string;

  /*
   * Player-facing name.
   */
  label: string;

  /*
   * Compact UI label.
   *
   * Examples:
   * STR
   * TECH
   * PSI
   */
  shortLabel?: string;

  description?: string;

  /*
   * Starting score given to a new actor when the
   * campaign uses this stat.
   */
  defaultScore: number;

  /*
   * Archived stats remain resolvable by old actions
   * but can be hidden from new creation workflows.
   *
   * This is safer than immediately deleting a stat
   * that may already be referenced by items,
   * monsters, spells, abilities, or characters.
   */
  archived?: boolean;
};


export type StoryForgeModifierRule = {
  id: "storyforge-9-10-zero-v1";
  kind: "storyforge";
};


export type RawScoreModifierRule = {
  id: string;
  kind: "raw-score";
};


export type NoModifierRule = {
  id: string;
  kind: "none";
};


export type ModifierTableEntry = {
  min: number;
  max: number;
  modifier: number;
};


export type TableModifierRule = {
  id: string;
  kind: "table";
  entries: ModifierTableEntry[];
};


export type CampaignModifierRule =
  | StoryForgeModifierRule
  | RawScoreModifierRule
  | NoModifierRule
  | TableModifierRule;


export type CampaignRulesProfile = {
  version: 1;

  campaignId: string;

  stats: CampaignStatDefinition[];

  modifierRule: CampaignModifierRule;

  createdAt: string;
  updatedAt: string;
};


export const DEFAULT_CAMPAIGN_STATS:
  CampaignStatDefinition[] = [
  {
    id: "strength",
    label: "Strength",
    shortLabel: "STR",
    defaultScore: 10,
  },
  {
    id: "dexterity",
    label: "Dexterity",
    shortLabel: "DEX",
    defaultScore: 10,
  },
  {
    id: "constitution",
    label: "Constitution",
    shortLabel: "CON",
    defaultScore: 10,
  },
  {
    id: "intelligence",
    label: "Intelligence",
    shortLabel: "INT",
    defaultScore: 10,
  },
  {
    id: "wisdom",
    label: "Wisdom",
    shortLabel: "WIS",
    defaultScore: 10,
  },
  {
    id: "charisma",
    label: "Charisma",
    shortLabel: "CHA",
    defaultScore: 10,
  },
];


export const DEFAULT_MODIFIER_RULE:
  StoryForgeModifierRule = {
  id: "storyforge-9-10-zero-v1",
  kind: "storyforge",
};


export function campaignRulesStorageKey(
  campaignId: string
) {
  return `storyforge-campaign-rules-${campaignId}`;
}


function cloneStatDefinition(
  stat: CampaignStatDefinition
): CampaignStatDefinition {
  return {
    ...stat,
  };
}


export function cloneCampaignRulesProfile(
  profile: CampaignRulesProfile
): CampaignRulesProfile {
  return {
    ...profile,

    stats:
      profile.stats.map(
        cloneStatDefinition
      ),

    modifierRule:
      profile.modifierRule.kind === "table"
        ? {
            ...profile.modifierRule,

            entries:
              profile.modifierRule.entries.map(
                (entry) => ({
                  ...entry,
                })
              ),
          }
        : {
            ...profile.modifierRule,
          },
  };
}


export function createDefaultCampaignRulesProfile(
  campaignId: string
): CampaignRulesProfile {
  const now =
    new Date().toISOString();

  return {
    version: 1,

    campaignId,

    stats:
      DEFAULT_CAMPAIGN_STATS.map(
        cloneStatDefinition
      ),

    modifierRule: {
      ...DEFAULT_MODIFIER_RULE,
    },

    createdAt:
      now,

    updatedAt:
      now,
  };
}


function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}


function isSafeScore(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= -10000 &&
    value <= 10000
  );
}


function isStatDefinition(
  value: unknown
): value is CampaignStatDefinition {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&

    typeof value.label === "string" &&
    value.label.trim().length > 0 &&

    (
      value.shortLabel === undefined ||
      typeof value.shortLabel === "string"
    ) &&

    (
      value.description === undefined ||
      typeof value.description === "string"
    ) &&

    isSafeScore(
      value.defaultScore
    ) &&

    (
      value.archived === undefined ||
      typeof value.archived === "boolean"
    )
  );
}


function isModifierRule(
  value: unknown
): value is CampaignModifierRule {
  if (!isObject(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.kind !== "string"
  ) {
    return false;
  }

  if (
    value.kind === "storyforge"
  ) {
    return (
      value.id ===
      "storyforge-9-10-zero-v1"
    );
  }

  if (
    value.kind === "raw-score" ||
    value.kind === "none"
  ) {
    return true;
  }

  if (
    value.kind === "table"
  ) {
    if (
      !Array.isArray(
        value.entries
      )
    ) {
      return false;
    }

    return value.entries.every(
      (entry) =>
        isObject(entry) &&
        isSafeScore(entry.min) &&
        isSafeScore(entry.max) &&
        isSafeScore(entry.modifier) &&
        entry.min <= entry.max
    );
  }

  return false;
}


function isCampaignRulesProfile(
  value: unknown,
  campaignId: string
): value is CampaignRulesProfile {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.version === 1 &&

    value.campaignId ===
      campaignId &&

    Array.isArray(
      value.stats
    ) &&

    value.stats.every(
      isStatDefinition
    ) &&

    isModifierRule(
      value.modifierRule
    ) &&

    typeof value.createdAt ===
      "string" &&

    typeof value.updatedAt ===
      "string"
  );
}


export function readCampaignRulesProfile(
  campaignId: string,
  storage:
    Pick<Storage, "getItem"> =
      localStorage
): CampaignRulesProfile {
  try {
    const raw =
      storage.getItem(
        campaignRulesStorageKey(
          campaignId
        )
      );

    if (!raw) {
      /*
       * Backward compatibility:
       *
       * Existing StoryForge campaigns behave exactly
       * as they did before Campaign Rules Profiles.
       *
       * Merely reading does NOT write or mutate the
       * user's campaign.
       */
      return (
        createDefaultCampaignRulesProfile(
          campaignId
        )
      );
    }

    const parsed: unknown =
      JSON.parse(raw);

    if (
      !isCampaignRulesProfile(
        parsed,
        campaignId
      )
    ) {
      /*
       * Preserve existing stored data.
       *
       * A malformed profile should not destroy or
       * overwrite campaign information.
       */
      return (
        createDefaultCampaignRulesProfile(
          campaignId
        )
      );
    }

    return (
      cloneCampaignRulesProfile(
        parsed
      )
    );
  } catch {
    return (
      createDefaultCampaignRulesProfile(
        campaignId
      )
    );
  }
}


export function saveCampaignRulesProfile(
  campaignId: string,
  profile: CampaignRulesProfile,
  storage:
    Pick<Storage, "setItem"> =
      localStorage
): CampaignRulesProfile {
  const now =
    new Date().toISOString();

  const normalized:
    CampaignRulesProfile = {
    version: 1,

    campaignId,

    stats:
      profile.stats.map(
        (stat) => ({
          ...stat,

          id:
            stat.id.trim(),

          label:
            stat.label.trim(),

          shortLabel:
            stat.shortLabel
              ?.trim() ||
            undefined,

          description:
            stat.description
              ?.trim() ||
            undefined,

          defaultScore:
            Math.max(
              -10000,
              Math.min(
                10000,
                Math.trunc(
                  stat.defaultScore
                )
              )
            ),
        })
      ),

    modifierRule:
      profile.modifierRule.kind ===
        "table"
        ? {
            ...profile.modifierRule,

            entries:
              profile.modifierRule.entries.map(
                (entry) => ({
                  min:
                    Math.trunc(
                      entry.min
                    ),

                  max:
                    Math.trunc(
                      entry.max
                    ),

                  modifier:
                    Math.trunc(
                      entry.modifier
                    ),
                })
              ),
          }
        : {
            ...profile.modifierRule,
          },

    createdAt:
      profile.createdAt ||
      now,

    updatedAt:
      now,
  };

  storage.setItem(
    campaignRulesStorageKey(
      campaignId
    ),
    JSON.stringify(
      normalized
    )
  );

  return (
    cloneCampaignRulesProfile(
      normalized
    )
  );
}


export function ensureCampaignRulesProfile(
  campaignId: string,
  storage:
    Pick<
      Storage,
      "getItem" | "setItem"
    > =
      localStorage
): CampaignRulesProfile {
  const key =
    campaignRulesStorageKey(
      campaignId
    );

  const existing =
    storage.getItem(key);

  if (existing) {
    return (
      readCampaignRulesProfile(
        campaignId,
        storage
      )
    );
  }

  const profile =
    createDefaultCampaignRulesProfile(
      campaignId
    );

  return (
    saveCampaignRulesProfile(
      campaignId,
      profile,
      storage
    )
  );
}


/*
 * Turn a player-facing name into a stable initial ID.
 *
 * The ID is generated only when the stat is CREATED.
 * Renaming the label later does not change the ID.
 */
export function createCampaignStatId(
  label: string,
  existingIds: string[]
) {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      ) ||
    "stat";

  const used =
    new Set(
      existingIds.map(
        (id) =>
          id.toLowerCase()
      )
    );

  if (
    !used.has(
      base
    )
  ) {
    return base;
  }

  let counter = 2;

  while (
    used.has(
      `${base}-${counter}`
    )
  ) {
    counter += 1;
  }

  return `${base}-${counter}`;
}


export function getCampaignStat(
  profile: CampaignRulesProfile,
  statId: string
) {
  const clean =
    statId
      .trim()
      .toLowerCase();

  return (
    profile.stats.find(
      (stat) =>
        stat.id
          .toLowerCase() ===
        clean
    ) ??
    profile.stats.find(
      (stat) =>
        stat.label
          .trim()
          .toLowerCase() ===
        clean
    )
  );
}


export function getActiveCampaignStats(
  profile: CampaignRulesProfile
) {
  return (
    profile.stats.filter(
      (stat) =>
        !stat.archived
    )
  );
}


/*
 * Modifier resolution is data-driven.
 *
 * No user-entered JavaScript or arbitrary formulas
 * are executed.
 */
export function getCampaignStatModifier(
  profile: CampaignRulesProfile,
  score: number
) {
  const safeScore =
    Math.max(
      -10000,
      Math.min(
        10000,
        Math.trunc(score)
      )
    );

  const rule =
    profile.modifierRule;

  if (
    rule.kind === "none"
  ) {
    return 0;
  }

  if (
    rule.kind === "raw-score"
  ) {
    return safeScore;
  }

  if (
    rule.kind === "table"
  ) {
    const match =
      rule.entries.find(
        (entry) =>
          safeScore >=
            entry.min &&
          safeScore <=
            entry.max
      );

    return (
      match?.modifier ??
      0
    );
  }

  /*
   * Existing StoryForge behavior:
   *
   * 9–10 = 0
   * 11–12 = +1
   * 19–20 = +5
   */
  return Math.floor(
    (safeScore - 9) / 2
  );
}


export function buildDefaultActorStatValues(
  profile: CampaignRulesProfile
): Record<string, number> {
  return Object.fromEntries(
    profile.stats.map(
      (stat) => [
        stat.id,
        stat.defaultScore,
      ]
    )
  );
}


/*
 * Upgrade an existing actor's stat object without
 * destroying old or custom values.
 *
 * Example old character:
 *
 * {
 *   health: 20,
 *   strength: 14,
 *   dexterity: 12
 * }
 *
 * Campaign later adds:
 *
 * technology
 *
 * Result:
 *
 * {
 *   health: 20,
 *   strength: 14,
 *   dexterity: 12,
 *   technology: 10
 * }
 */
export function mergeCampaignStatDefaults(
  profile: CampaignRulesProfile,
  current:
    Record<string, unknown>
): Record<string, unknown> {
  const updated = {
    ...current,
  };

  for (
    const stat of profile.stats
  ) {
    if (
      updated[stat.id] ===
      undefined
    ) {
      updated[stat.id] =
        stat.defaultScore;
    }
  }

  return updated;
}

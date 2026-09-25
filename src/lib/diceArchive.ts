import type {
  EntityRef,
  RollResult,
  RollSource,
  StatId,
} from "./dice";

import {
  getCampaignStat,
  readCampaignRulesProfile,
} from "./campaignRules";

import type {
  CampaignRulesProfile,
} from "./campaignRules";

import {
  getGameActionsForCreation,
} from "./gameActions";

import {
  getGameEffectFormula,
} from "./gameEffects";

import type {
  GameAction,
} from "./gameActions";

import type {
  GameEffect,
  GameEffectResolution,
} from "./gameEffects";

export type SavedAction = {
  id: string;
  name: string;
  formula: string;

  /*
   * Flat action modifier.
   *
   * If stat is also present, DiceTray applies the
   * StoryForge stat modifier plus this bonus.
   */
  bonus: number;

  /*
   * Standard StoryForge stat when the action uses one.
   * Custom campaign stats remain in GameAction data and
   * can be supported by the future rules-profile layer.
   */
  stat?: StatId;

  resolution?: GameEffectResolution;

  source: RollSource;
};
export type SavedSave = { id: string; name: string; stat: StatId; dc?: number; source: RollSource };
export type DiceActor = {
  key: string;
  ref: EntityRef;
  stats: Record<StatId, number>;
  actions: SavedAction[];
  saves: SavedSave[];
};

type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const list = (value: unknown): Obj[] => Array.isArray(value) ? value.map(object) : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

const whole = (
  value: unknown
): number | undefined =>
  typeof value === "number" &&
  Number.isSafeInteger(value)
    ? value
    : undefined;

const optionalText = (
  value: unknown
): string | undefined => {
  const valueText =
    typeof value === "string"
      ? value.trim()
      : "";

  return valueText || undefined;
};

function campaignStatId(
  profile: CampaignRulesProfile,
  value: unknown
): StatId | undefined {
  const candidate =
    text(value).trim();

  if (!candidate) {
    return undefined;
  }

  /*
   * Resolve known campaign stats to their stable ID.
   *
   * Unknown imported/custom IDs remain intact instead
   * of being rejected by the original six-stat list.
   */
  return (
    getCampaignStat(
      profile,
      candidate
    )?.id ??
    candidate
  );
}


function gameEffectResolution(
  value: unknown
): GameEffectResolution | undefined {
  const candidate = text(value);

  return [
    "automatic",
    "attack",
    "save",
    "choice",
    "custom",
  ].includes(candidate)
    ? candidate as GameEffectResolution
    : undefined;
}

function normalizeGameEffect(
  value: Obj,
  fallbackId: string
): GameEffect {
  const rawKind = text(value.kind);

  const kind =
    [
      "damage",
      "healing",
      "condition",
      "movement",
      "resource",
      "defense",
      "utility",
      "custom",
    ].includes(rawKind)
      ? rawKind as GameEffect["kind"]
      : undefined;

  const resolution =
    gameEffectResolution(
      value.resolution
    );

  const tags =
    Array.isArray(value.tags)
      ? value.tags.filter(
          (tag): tag is string =>
            typeof tag === "string"
        )
      : undefined;

  return {
    id:
      text(value.id) ||
      fallbackId,

    name:
      text(
        value.name,
        "Effect"
      ),

    ...(kind
      ? { kind }
      : {}),

    ...(optionalText(value.customKind)
      ? {
          customKind:
            optionalText(
              value.customKind
            ),
        }
      : {}),

    ...(optionalText(value.trigger)
      ? {
          trigger:
            optionalText(
              value.trigger
            ),
        }
      : {}),

    ...(resolution
      ? { resolution }
      : {}),

    ...(optionalText(value.attackStat)
      ? {
          attackStat:
            optionalText(
              value.attackStat
            ),
        }
      : {}),

    ...(whole(value.attackModifier) !==
    undefined
      ? {
          attackModifier:
            whole(
              value.attackModifier
            ),
        }
      : {}),

    ...(optionalText(value.saveStat)
      ? {
          saveStat:
            optionalText(
              value.saveStat
            ),
        }
      : {}),

    ...(whole(value.saveDC) !== undefined
      ? {
          saveDC:
            whole(value.saveDC),
        }
      : {}),

    ...(optionalText(value.formula)
      ? {
          formula:
            optionalText(
              value.formula
            ),
        }
      : {}),

    ...(optionalText(value.damage)
      ? {
          damage:
            optionalText(
              value.damage
            ),
        }
      : {}),

    ...(optionalText(value.damageType)
      ? {
          damageType:
            optionalText(
              value.damageType
            ),
        }
      : {}),

    ...(optionalText(value.condition)
      ? {
          condition:
            optionalText(
              value.condition
            ),
        }
      : {}),

    ...(optionalText(value.target)
      ? {
          target:
            optionalText(
              value.target
            ),
        }
      : {}),

    ...(optionalText(value.range)
      ? {
          range:
            optionalText(
              value.range
            ),
        }
      : {}),

    ...(optionalText(value.area)
      ? {
          area:
            optionalText(
              value.area
            ),
        }
      : {}),

    ...(optionalText(value.frequency)
      ? {
          frequency:
            optionalText(
              value.frequency
            ),
        }
      : {}),

    ...(whole(value.duration) !== undefined
      ? {
          duration:
            whole(value.duration),
        }
      : {}),

    ...(tags
      ? {
          tags: [...tags],
        }
      : {}),

    ...(optionalText(value.notes)
      ? {
          notes:
            optionalText(
              value.notes
            ),
        }
      : {}),
  };
}

function normalizeGameAction(
  value: Obj,
  fallbackId: string
): GameAction {
  const resolution =
    gameEffectResolution(
      value.resolution
    );

  const effects =
    list(value.effects).map(
      (effect, index) =>
        normalizeGameEffect(
          effect,
          `${fallbackId}:effect:${index}`
        )
    );

  const costs =
    list(value.costs).map(
      (cost) => ({
        resource:
          text(cost.resource),

        ...(whole(cost.amount) !== undefined
          ? {
              amount:
                whole(cost.amount),
            }
          : {}),

        ...(optionalText(cost.formula)
          ? {
              formula:
                optionalText(
                  cost.formula
                ),
            }
          : {}),

        ...(optionalText(cost.notes)
          ? {
              notes:
                optionalText(
                  cost.notes
                ),
            }
          : {}),
      })
    );

  const tags =
    Array.isArray(value.tags)
      ? value.tags.filter(
          (tag): tag is string =>
            typeof tag === "string"
        )
      : undefined;

  return {
    id:
      text(value.id) ||
      fallbackId,

    name:
      text(
        value.name,
        "Unnamed Action"
      ),

    ...(optionalText(value.description)
      ? {
          description:
            optionalText(
              value.description
            ),
        }
      : {}),

    ...(optionalText(value.activation)
      ? {
          activation:
            optionalText(
              value.activation
            ),
        }
      : {}),

    ...(resolution
      ? { resolution }
      : {}),

    ...(optionalText(value.attackStat)
      ? {
          attackStat:
            optionalText(
              value.attackStat
            ),
        }
      : {}),

    ...(whole(value.attackModifier) !==
    undefined
      ? {
          attackModifier:
            whole(
              value.attackModifier
            ),
        }
      : {}),

    ...(optionalText(value.saveStat)
      ? {
          saveStat:
            optionalText(
              value.saveStat
            ),
        }
      : {}),

    ...(whole(value.saveDC) !== undefined
      ? {
          saveDC:
            whole(value.saveDC),
        }
      : {}),

    ...(optionalText(value.target)
      ? {
          target:
            optionalText(
              value.target
            ),
        }
      : {}),

    ...(optionalText(value.range)
      ? {
          range:
            optionalText(
              value.range
            ),
        }
      : {}),

    ...(optionalText(value.area)
      ? {
          area:
            optionalText(
              value.area
            ),
        }
      : {}),

    costs,

    effects,

    ...(tags
      ? {
          tags: [...tags],
        }
      : {}),

    ...(optionalText(value.notes)
      ? {
          notes:
            optionalText(
              value.notes
            ),
        }
      : {}),
  };
}

export function readActors(
  worldId?: string,
  storage: Pick<Storage, "getItem"> = localStorage
): {
  actors: DiceActor[];
  errors: string[];
} {
  /*
   * STORYFORGE DYNAMIC DICE STATS V3C
   *
   * Dice actor data resolves against this world's
   * campaign-defined stat profile.
   */
  const rulesProfile =
    readCampaignRulesProfile(
      worldId ?? "__standalone__",
      storage
    );

  const actors: DiceActor[] = [];
  const errors: string[] = [];

  if (!worldId) {
    return {
      actors,
      errors,
    };
  }

  for (
    const category of [
      "characters",
      "monsters",
    ] as const
  ) {
    let rows: Obj[];

    try {
      const saved =
        storage.getItem(
          `storyforge-${category}-${worldId}`
        );

      const parsed: unknown =
        saved
          ? JSON.parse(saved)
          : [];

      if (!Array.isArray(parsed)) {
        throw new Error(
          "Expected an array"
        );
      }

      rows =
        list(parsed);
    } catch {
      errors.push(
        `Could not read this world's ${category}. Their saved data has not been changed.`
      );

      continue;
    }

    for (const row of rows) {
      const id =
        text(row.id);

      if (!id) {
        continue;
      }

      const isMonster =
        category === "monsters";

      const ref: EntityRef = {
        id,

        name:
          text(
            row.name,
            "Unnamed"
          ),

        kind:
          isMonster
            ? "monster"
            : row.kind === "npc"
              ? "npc"
              : "character",

        scope:
          "archive",
      };

      const actor: DiceActor = {
        key:
          `${category}:${id}`,

        ref,

        stats: {},

        actions: [],

        saves: [],
      };

      const stats =
        object(row.stats);

      /*
       * Preserve every valid saved actor stat.
       *
       * Stats are campaign-defined and are no longer
       * restricted to the original fantasy six.
       */
      for (
        const [
          rawStatId,
          rawScore,
        ] of Object.entries(stats)
      ) {
        const statId =
          campaignStatId(
            rulesProfile,
            rawStatId
          );

        if (
          statId &&
          typeof rawScore === "number" &&
          Number.isSafeInteger(rawScore) &&
          rawScore >= -10000 &&
          rawScore <= 10000
        ) {
          actor.stats[statId] =
            rawScore;
        }
      }

      /*
       * Actors created before new campaign stats were
       * added receive each stat's configured default.
       *
       * Archived stats remain available so old actions
       * and effects can still resolve correctly.
       */
      for (
        const stat of rulesProfile.stats
      ) {
        if (
          actor.stats[stat.id] ===
          undefined
        ) {
          actor.stats[stat.id] =
            stat.defaultScore;
        }
      }

      /*
       * --------------------------------------------------
       * MONSTERS
       *
       * Keep the existing monster attack model intact for
       * now. It already feeds DiceTray correctly.
       * --------------------------------------------------
       */
      if (isMonster) {
        for (
          const attack of list(
            row.attacks
          )
        ) {
          const attackId =
            text(attack.id);

          if (!attackId) {
            continue;
          }

          const name =
            text(
              attack.name,
              "Unnamed attack"
            );

          const formula =
            text(
              attack.damage
            );

          const source: RollSource = {
            owner: ref,

            kind:
              "monster-attack",

            id:
              attackId,

            name,

            savedFormula:
              formula,

            damageType:
              text(
                attack.damageType
              ),
          };

          actor.actions.push({
            id:
              attackId,

            name,

            formula,

            bonus:
              finite(
                attack.attackModifier
              ),

            resolution:
              "attack",

            source,
          });

          for (
            const effect of list(
              attack.effects
            )
          ) {
            const effectId =
              text(effect.id);

            if (!effectId) {
              continue;
            }

            const effectName =
              text(
                effect.name,
                "Effect"
              );

            const effectFormula =
              text(
                effect.damage
              );

            const effectSource:
              RollSource = {
              owner: ref,

              kind:
                "monster-effect",

              id:
                effectId,

              name:
                effectName,

              attackId,

              attackName:
                name,

              savedFormula:
                effectFormula,

              damageType:
                text(
                  effect.damageType
                ),

              condition:
                text(
                  effect.condition
                ),
            };

            if (effectFormula) {
              actor.actions.push({
                id:
                  `${attackId}:${effectId}`,

                name:
                  `${name} — ${effectName}`,

                formula:
                  effectFormula,

                bonus:
                  0,

                source:
                  effectSource,
              });
            }

            const stat =
              campaignStatId(rulesProfile,
                effect.saveStat
              );

            if (stat) {
              const rawDC =
                whole(
                  effect.saveDC
                );

              const dc =
                rawDC !== undefined &&
                rawDC > 0
                  ? rawDC
                  : undefined;

              actor.saves.push({
                id:
                  `${attackId}:${effectId}`,

                name:
                  `${name} — ${effectName}`,

                stat,

                dc,

                source: {
                  ...effectSource,

                  savedStat:
                    stat,

                  savedDC:
                    dc,
                },
              });
            }
          }
        }

        actors.push(actor);

        continue;
      }

      /*
       * --------------------------------------------------
       * CHARACTERS / NPCs
       *
       * Live Session only exposes equipped inventory.
       *
       * The inventory copy itself remains authoritative.
       * Campaign templates are NOT consulted here.
       * --------------------------------------------------
       */
      for (
        const item of list(
          row.inventory
        )
      ) {
        if (
          item.equipped !== true
        ) {
          continue;
        }

        const itemId =
          text(item.id);

        if (!itemId) {
          continue;
        }

        const itemName =
          text(
            item.name,
            "Unnamed item"
          );

        const flatEffects =
          list(
            item.effects
          ).map(
            (effect, index) =>
              normalizeGameEffect(
                effect,
                `${itemId}:legacy-effect:${index}`
              )
          );

        const explicitActions =
          list(
            item.actions
          ).map(
            (action, index) =>
              normalizeGameAction(
                action,
                `${itemId}:action:${index}`
              )
          );

        const hasExplicitActions =
          explicitActions.length > 0;

        const runtimeActions =
          getGameActionsForCreation({
            creationName:
              itemName,

            damage:
              text(item.damage),

            effects:
              flatEffects,

            actions:
              explicitActions,
          });

        runtimeActions.forEach(
          (
            gameAction,
            actionIndex
          ) => {
            /*
             * Legacy items keep their old stable item ID.
             * Explicit actions receive their own stable
             * action-level DiceArchive identity.
             */
            const savedActionId =
              hasExplicitActions
                ? `${itemId}:action:${gameAction.id}`
                : itemId;

            const actionName =
              hasExplicitActions
                ? `${itemName} — ${gameAction.name}`
                : itemName;

            const formulaEffects =
              gameAction.effects
                .map(
                  (
                    effect,
                    effectIndex
                  ) => ({
                    effect,
                    effectIndex,
                    formula:
                      getGameEffectFormula(
                        effect
                      ),
                  })
                )
                .filter(
                  (entry) =>
                    Boolean(
                      entry.formula
                    )
                );

            const primaryRoll =
              formulaEffects[0];

            const primaryFormula =
              primaryRoll?.formula ??
              "";

            const source:
              RollSource = {
              owner:
                ref,

              kind:
                "inventory-item",

              id:
                savedActionId,

              name:
                actionName,

              savedFormula:
                primaryFormula,

              ...(primaryRoll
                ?.effect
                .damageType
                ? {
                    damageType:
                      primaryRoll
                        .effect
                        .damageType,
                  }
                : {}),
            };

            /*
             * Attack actions must appear even when they
             * have no damage formula yet.
             *
             * Any action with a formula can also appear
             * under Damage / Effect rolls.
             */
            if (
              gameAction.resolution ===
                "attack" ||
              primaryFormula
            ) {
              actor.actions.push({
                id:
                  savedActionId,

                name:
                  actionName,

                formula:
                  primaryFormula,

                bonus:
                  gameAction
                    .attackModifier ??
                  0,

                stat:
                  campaignStatId(rulesProfile,
                    gameAction
                      .attackStat
                  ),

                resolution:
                  gameAction
                    .resolution,

                source,
              });
            }

            /*
             * Action-level saving throw.
             */
            const actionSaveStat =
              campaignStatId(rulesProfile,
                gameAction.saveStat
              );

            if (
              gameAction.resolution ===
                "save" &&
              actionSaveStat
            ) {
              actor.saves.push({
                id:
                  `${savedActionId}:save`,

                name:
                  actionName,

                stat:
                  actionSaveStat,

                dc:
                  gameAction.saveDC,

                source: {
                  ...source,

                  savedStat:
                    actionSaveStat,

                  savedDC:
                    gameAction.saveDC,
                },
              });
            }

            /*
             * Every additional formula-bearing effect
             * is available as a linked Effect roll.
             *
             * The first formula is already represented
             * by the primary action, so do not duplicate
             * it in the linked list.
             */
            gameAction.effects.forEach(
              (
                effect,
                effectIndex
              ) => {
                const effectFormula =
                  getGameEffectFormula(
                    effect
                  );

                const effectId =
                  effect.id ||
                  `${savedActionId}:effect:${effectIndex}`;

                const effectName =
                  effect.name ||
                  "Effect";

                const effectSource:
                  RollSource = {
                  owner:
                    ref,

                  kind:
                    "item-effect",

                  id:
                    effectId,

                  name:
                    effectName,

                  attackId:
                    savedActionId,

                  attackName:
                    actionName,

                  savedFormula:
                    effectFormula,

                  ...(effect.damageType
                    ? {
                        damageType:
                          effect.damageType,
                      }
                    : {}),

                  ...(effect.condition
                    ? {
                        condition:
                          effect.condition,
                      }
                    : {}),
                };

                const isPrimary =
                  primaryRoll
                    ?.effectIndex ===
                  effectIndex;

                if (
                  effectFormula &&
                  !isPrimary
                ) {
                  actor.actions.push({
                    id:
                      `${savedActionId}:${effectId}`,

                    name:
                      `${actionName} — ${effectName}`,

                    formula:
                      effectFormula,

                    bonus:
                      0,

                    source:
                      effectSource,
                  });
                }

                const saveStat =
                  campaignStatId(rulesProfile,
                    effect.saveStat
                  );

                if (saveStat) {
                  actor.saves.push({
                    id:
                      `${savedActionId}:${effectId}:save`,

                    name:
                      `${actionName} — ${effectName}`,

                    stat:
                      saveStat,

                    dc:
                      effect.saveDC,

                    source: {
                      ...effectSource,

                      savedStat:
                        saveStat,

                      savedDC:
                        effect.saveDC,
                    },
                  });
                }
              }
            );

            /*
             * Silence unused iterator warning while
             * retaining actionIndex for debugging and
             * future source metadata.
             */
            void actionIndex;
          }
        );
      }

      actors.push(actor);
    }
  }

  return {
    actors,
    errors,
  };
}


export const historyKey = (worldId?: string) => worldId ? `storyforge:dice:v1:world:${worldId}` : "storyforge:dice:v1:standalone";

function validRef(value: unknown) {
  if (value === undefined) return true;
  const ref = object(value);
  return typeof ref.id === "string" && typeof ref.name === "string" && ["character", "npc", "monster"].includes(text(ref.kind)) && ["archive", "session"].includes(text(ref.scope));
}

export function readHistory(worldId?: string, storage: Pick<Storage, "getItem"> = localStorage): RollResult[] {
  const raw = storage.getItem(historyKey(worldId));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.some((value) => {
    const row = object(value);
    const request = object(row.request);
    const stat = object(request.stat);
    const source = object(request.source);
    const numericFields = [row.constant, row.diceTotal, row.statBonus, row.adjustmentsTotal, row.total];
    return row.version !== 1 || typeof row.id !== "string" || typeof row.createdAt !== "string" || !Number.isFinite(Date.parse(row.createdAt))
      || numericFields.some((number) => !Number.isSafeInteger(number))
      || !Array.isArray(row.dice) || row.dice.some((value) => {
        const term = object(value);
        return ![1, -1].includes(finite(term.sign, 0)) || !Number.isSafeInteger(term.count) || !Number.isSafeInteger(term.sides)
          || !Array.isArray(term.values) || !Array.isArray(term.kept)
          || [...term.values, ...term.kept].some((number) => !Number.isSafeInteger(number));
      })
      || typeof request.formula !== "string" || request.worldId !== worldId
      || !["normal", "advantage", "disadvantage"].includes(text(request.mode))
      || !validRef(request.actor) || !validRef(request.opponent)
      || (request.dc !== undefined && !Number.isSafeInteger(request.dc))
      || (request.note !== undefined && typeof request.note !== "string")
      || (
          request.stat !== undefined &&
          (
            typeof stat.key !== "string" ||
            !text(stat.key).trim() ||
            !Number.isSafeInteger(
              stat.score
            ) ||
            (
              stat.modifier !== undefined &&
              !Number.isSafeInteger(
                stat.modifier
              )
            )
          )
        )
        || (
          request.modifierRule !== undefined &&
          (
            typeof request.modifierRule !== "string" ||
            !request.modifierRule.trim()
          )
        )
      || (request.adjustments !== undefined && (!Array.isArray(request.adjustments) || request.adjustments.some((value) => {
        const item = object(value);
        return typeof item.label !== "string" || !Number.isSafeInteger(item.value);
      })))
      || (request.source !== undefined && (!validRef(source.owner) || source.owner === undefined || typeof source.name !== "string" || typeof source.id !== "string" || (source.attackName !== undefined && typeof source.attackName !== "string")))
      || (row.outcome !== undefined && row.outcome !== "success" && row.outcome !== "failure");
  })) throw new Error("Saved roll history could not be read. Existing history has been kept.");
  return (parsed as RollResult[]).slice(0, 50);
}

export function recordRoll(roll: RollResult, storage: Pick<Storage, "getItem" | "setItem"> = localStorage): RollResult[] {
  const old = readHistory(roll.request.worldId, storage);
  if (old.some((item) => item.id === roll.id)) return old;
  const next = [roll, ...old].slice(0, 50);
  storage.setItem(historyKey(roll.request.worldId), JSON.stringify(next));
  return next;
}

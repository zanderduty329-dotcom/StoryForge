import { STAT_KEYS } from "./dice";
import type { EntityRef, RollResult, RollSource, StatKey } from "./dice";

export type SavedAction = { id: string; name: string; formula: string; bonus: number; source: RollSource };
export type SavedSave = { id: string; name: string; stat: StatKey; dc?: number; source: RollSource };
export type DiceActor = {
  key: string;
  ref: EntityRef;
  stats: Partial<Record<StatKey, number>>;
  actions: SavedAction[];
  saves: SavedSave[];
};

type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const list = (value: unknown): Obj[] => Array.isArray(value) ? value.map(object) : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function readActors(worldId?: string, storage: Pick<Storage, "getItem"> = localStorage): { actors: DiceActor[]; errors: string[] } {
  const actors: DiceActor[] = [];
  const errors: string[] = [];
  if (!worldId) return { actors, errors };
  for (const category of ["characters", "monsters"] as const) {
    let rows: Obj[];
    try {
      const saved = storage.getItem(`storyforge-${category}-${worldId}`);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      rows = list(parsed);
    } catch {
      errors.push(`Could not read this world's ${category}. Their saved data has not been changed.`);
      continue;
    }
    for (const row of rows) {
      const id = text(row.id);
      if (!id) continue;
      const isMonster = category === "monsters";
      const ref: EntityRef = { id, name: text(row.name, "Unnamed"), kind: isMonster ? "monster" : row.kind === "npc" ? "npc" : "character", scope: "archive" };
      const actor: DiceActor = { key: `${category}:${id}`, ref, stats: {}, actions: [], saves: [] };
      const stats = object(row.stats);
      for (const key of STAT_KEYS) {
        const value = stats[key] === undefined ? 10 : stats[key];
        if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1000) actor.stats[key] = value;
      }
      for (const item of list(isMonster ? row.attacks : row.inventory)) {
        const itemId = text(item.id);
        if (!itemId) continue;
        const name = text(item.name, isMonster ? "Unnamed attack" : "Unnamed item");
        const formula = text(item.damage);
        const source: RollSource = { owner: ref, kind: isMonster ? "monster-attack" : "inventory-item", id: itemId, name, savedFormula: formula, damageType: text(item.damageType) };
        if (isMonster || formula) actor.actions.push({ id: itemId, name, formula, bonus: isMonster ? finite(item.attackModifier) : 0, source });
        if (isMonster) for (const effect of list(item.effects)) {
          const effectId = text(effect.id);
          const stat = text(effect.saveStat).toLowerCase() as StatKey;
          if (!effectId || !STAT_KEYS.includes(stat)) continue;
          const rawDC = finite(effect.saveDC);
          const dc = Number.isSafeInteger(rawDC) && rawDC > 0 ? rawDC : undefined;
          const effectName = text(effect.name, "Effect");
          actor.saves.push({
            id: `${itemId}:${effectId}`,
            name: `${name} — ${effectName}`,
            stat, dc,
            source: { owner: ref, kind: "monster-effect", id: effectId, name: effectName, attackId: itemId, attackName: name, savedStat: stat, savedDC: dc, savedFormula: text(effect.damage), damageType: text(effect.damageType), condition: text(effect.condition) },
          });
        }
      }
      actors.push(actor);
    }
  }
  return { actors, errors };
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
      || (request.stat !== undefined && (!STAT_KEYS.includes(text(stat.key) as StatKey) || !Number.isSafeInteger(stat.score)))
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

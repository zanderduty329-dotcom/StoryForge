export const STAT_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
export type StatKey = typeof STAT_KEYS[number];
export type RollPurpose = "free" | "attack" | "damage" | "save" | "check";
export type RollMode = "normal" | "advantage" | "disadvantage";
export const MODIFIER_RULE = "storyforge-9-10-zero-v1";

export type EntityRef = {
  id: string;
  name: string;
  kind: "character" | "npc" | "monster";
  scope: "archive" | "session";
  instanceId?: string;
};
export type RollSource = {
  owner: EntityRef;
  kind: "monster-attack" | "inventory-item" | "monster-effect";
  id: string;
  name: string;
  attackId?: string;
  attackName?: string;
  damageType?: string;
  condition?: string;
  savedFormula?: string;
  savedStat?: StatKey;
  savedDC?: number;
};
export type RollRequest = {
  formula: string;
  mode?: RollMode;
  purpose?: RollPurpose;
  worldId?: string;
  sessionId?: string;
  actor?: EntityRef;
  opponent?: EntityRef;
  source?: RollSource;
  stat?: { key: StatKey; score: number };
  adjustments?: { label: string; value: number }[];
  dc?: number;
  note?: string;
};
export type DiceTerm = { sign: number; count: number; sides: number };
export type RollResult = {
  version: 1;
  id: string;
  createdAt: string;
  request: RollRequest;
  dice: (DiceTerm & { values: number[]; kept: number[]; subtotal: number })[];
  constant: number;
  diceTotal: number;
  statBonus: number;
  adjustmentsTotal: number;
  total: number;
  outcome?: "success" | "failure";
  modifierRule: typeof MODIFIER_RULE;
};

function integer(value: number, label: string, min: number, max: number) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return value;
}

export function statModifier(score: number) {
  integer(score, "Stat score", 0, 1000);
  return Math.floor((score - 9) / 2);
}

export function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

/** A single shared, unbiased die. Injectable entropy makes boundary tests deterministic. */
export function rollDie(sides: number, nextUint32 = () => {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}): number {
  integer(sides, "Die sides", 2, 1000);
  const range = 0x100000000;
  const limit = range - (range % sides);
  let value: number;
  do {
    value = integer(nextUint32(), "Random value", 0, range - 1);
  } while (value >= limit);
  return (value % sides) + 1;
}

/** Only dice, integer constants, + and - are accepted. Never executes user text. */
export function parseFormula(input: string): { formula: string; terms: DiceTerm[]; constant: number } {
  const formula = input.trim().toLowerCase().replace(/\s+/g, "").replace(/−/g, "-");
  if (!formula || formula.length > 120 || !/^[+-]?(?:\d*d\d+|\d+)(?:[+-](?:\d*d\d+|\d+))*$/.test(formula)) {
    throw new Error("Use a formula such as d20+3, 2d6, or 2d6+1d4-2.");
  }
  const terms: DiceTerm[] = [];
  let constant = 0;
  let countTotal = 0;
  for (const part of formula.match(/[+-]?(?:\d*d\d+|\d+)/g) ?? []) {
    const sign = part.startsWith("-") ? -1 : 1;
    const unsigned = part.replace(/^[+-]/, "");
    if (unsigned.includes("d")) {
      const [countText, sidesText] = unsigned.split("d");
      const count = integer(Number(countText || 1), "Dice count", 1, 100);
      const sides = integer(Number(sidesText), "Die sides", 2, 1000);
      countTotal += count;
      if (countTotal > 100) throw new Error("Roll at most 100 dice at a time.");
      terms.push({ sign, count, sides });
    } else {
      constant += sign * integer(Number(unsigned), "Formula modifier", 0, 10000);
      integer(constant, "Combined formula modifier", -10000, 10000);
    }
  }
  return { formula, terms, constant };
}

export function rollDice(request: RollRequest, die: (sides: number) => number = rollDie): RollResult {
  const parsed = parseFormula(request.formula);
  const mode = request.mode ?? "normal";
  if (!["normal", "advantage", "disadvantage"].includes(mode)) throw new Error("Choose a valid roll mode.");
  if (mode !== "normal" && !(parsed.terms.length === 1 && parsed.terms[0].count === 1 && parsed.terms[0].sides === 20 && parsed.terms[0].sign === 1)) {
    throw new Error("Advantage and disadvantage need one d20, optionally with a modifier.");
  }
  const statBonus = request.stat ? statModifier(request.stat.score) : 0;
  if (request.stat && !STAT_KEYS.includes(request.stat.key)) throw new Error("Choose a valid stat.");
  const adjustmentsTotal = (request.adjustments ?? []).reduce((sum, item) => sum + integer(item.value, item.label || "Adjustment", -10000, 10000), 0);
  integer(adjustmentsTotal, "Combined adjustments", -10000, 10000);
  if (request.dc !== undefined) integer(request.dc, "Difficulty", 0, 10000);
  // Validate everything before consuming randomness or recording a roll.
  const dice = parsed.terms.map((term) => {
    const values = Array.from({ length: mode === "normal" ? term.count : 2 }, () => integer(die(term.sides), "Die result", 1, term.sides));
    const kept = mode === "advantage" ? [Math.max(...values)] : mode === "disadvantage" ? [Math.min(...values)] : [...values];
    return { ...term, values, kept, subtotal: term.sign * kept.reduce((sum, value) => sum + value, 0) };
  });
  const diceTotal = dice.reduce((sum, term) => sum + term.subtotal, 0);
  const total = diceTotal + parsed.constant + statBonus + adjustmentsTotal;
  return {
    version: 1,
    id: globalThis.crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    request: JSON.parse(JSON.stringify({ ...request, formula: parsed.formula, mode, purpose: request.purpose ?? "free" })),
    dice,
    constant: parsed.constant,
    diceTotal,
    statBonus,
    adjustmentsTotal,
    total,
    outcome: request.dc === undefined ? undefined : total >= request.dc ? "success" : "failure",
    modifierRule: MODIFIER_RULE,
  };
}

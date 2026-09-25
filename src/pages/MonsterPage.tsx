import { useEffect, useMemo, useState } from "react";

import {
  getActiveCampaignStats,
  getCampaignStat,
  getCampaignStatModifier,
  mergeCampaignStatDefaults,
  readCampaignRulesProfile,
} from "../lib/campaignRules";

import type {
  CampaignRulesProfile,
} from "../lib/campaignRules";

type MonsterStats = {
  /*
   * StoryForge system fields.
   */
  health: number;
  armor: number;

  /*
   * Campaign-defined mechanical stats use
   * their stable Campaign Stat IDs.
   */
  [statId: string]: number;
};


type MonsterModifiers = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

type MonsterSize =
  | "Tiny"
  | "Small"
  | "Medium"
  | "Large"
  | "Huge"
  | "Gargantuan";

type MonsterSaveStat = string;


type MonsterEffect = {
  id: string;
  name: string;
  effectType: "Damage" | "Condition" | "Other";
  trigger: "On Hit";
  damage: string;
  damageType: string;
  condition: string;
  saveStat: MonsterSaveStat;
  saveDC: number;
  frequency: "Once" | "Every Turn" | "Every Round";
  durationAmount: number;
  durationUnit: "Instant" | "Turn" | "Round" | "Until Save";
  endsOnSuccessfulSave: boolean;
  description: string;
};

type MonsterAttack = {
  id: string;
  name: string;
  attackType: "Natural" | "Weapon" | "Special";
  damage: string;
  damageType: string;
  attackModifier: number;
  range: string;
  description: string;
  effects: MonsterEffect[];
};

type MonsterAbility = {
  id: string;
  name: string;
  description: string;
};

type MonsterDefense = {
  id: string;
  name: string;
  defenseType: "Natural Armor";
  armorBonus: number;
  damageReduction: number;
  description: string;
};

type Monster = {
  id: string;
  name: string;
  type: string;
  stats: MonsterStats;
  modifiers: MonsterModifiers;
  healthMode: "fixed" | "rolled";
  healthFormula: string;
  movementSpeed: number;
  size: MonsterSize;
  attacks: MonsterAttack[];
  abilities: MonsterAbility[];
  defenses: MonsterDefense[];
};

const blankMonsterStats: MonsterStats = {
  health: 10,
  armor: 10,
};


const blankMonsterModifiers: MonsterModifiers = {
  strength: 0,
  dexterity: 0,
  constitution: 0,
  intelligence: 0,
  wisdom: 0,
  charisma: 0,
};

function buildMonsterStats(
  profile: CampaignRulesProfile,
  current: Record<string, unknown> = {}
): MonsterStats {
  const merged =
    mergeCampaignStatDefaults(
      profile,
      {
        ...blankMonsterStats,
        ...current,
      }
    );

  const result: MonsterStats = {
    ...blankMonsterStats,
  };

  /*
   * Preserve all existing numeric stat values,
   * including archived campaign stats.
   */
  for (
    const [key, value]
    of Object.entries(merged)
  ) {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      result[key] = value;
    }
  }

  return result;
}


function normalizeMonsterSaveStat(
  profile: CampaignRulesProfile,
  value: unknown
): MonsterSaveStat {
  const raw =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !raw ||
    raw.toLowerCase() === "none"
  ) {
    return "None";
  }

  /*
   * Example legacy migration:
   *
   * "Strength" -> "strength"
   *
   * Unknown custom references remain intact.
   */
  return (
    getCampaignStat(
      profile,
      raw
    )?.id ??
    raw
  );
}


function monsterStatLabel(
  profile: CampaignRulesProfile,
  statId: string
) {
  if (
    !statId ||
    statId === "None"
  ) {
    return "None";
  }

  return (
    getCampaignStat(
      profile,
      statId
    )?.label ??
    statId
  );
}


export function MonsterPage({ worldId }: { worldId: string }) {
  const storageKey = `storyforge-monsters-${worldId}`;

  const rulesProfile =
    useMemo(
      () =>
        readCampaignRulesProfile(
          worldId
        ),
      [worldId]
    );

  const campaignStats =
    useMemo(
      () =>
        getActiveCampaignStats(
          rulesProfile
        ),
      [rulesProfile]
    );

  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [monsterType, setMonsterType] = useState("");
  const [stats, setStats] =
    useState<MonsterStats>(
      () =>
        buildMonsterStats(
          rulesProfile
        )
    );
  const [modifiers, setModifiers] = useState<MonsterModifiers>({
    ...blankMonsterModifiers,
  });
  const [healthMode, setHealthMode] = useState<"fixed" | "rolled">("fixed");
  const [healthFormula, setHealthFormula] = useState("");
  const [movementSpeed, setMovementSpeed] = useState(30);
  const [size, setSize] = useState<MonsterSize>("Medium");

  const [attacks, setAttacks] = useState<MonsterAttack[]>([]);
  const [editingAttackId, setEditingAttackId] = useState<string | null>(null);
  const [attackName, setAttackName] = useState("");
  const [attackType, setAttackType] =
    useState<MonsterAttack["attackType"]>("Natural");
  const [attackDamage, setAttackDamage] = useState("");
  const [attackDamageType, setAttackDamageType] = useState("");

  const [pendingEffects, setPendingEffects] =
    useState<MonsterEffect[]>([]);

  const [effectName, setEffectName] = useState("");
  const [effectType, setEffectType] =
    useState<MonsterEffect["effectType"]>("Damage");
  const [effectDamage, setEffectDamage] = useState("");
  const [effectDamageType, setEffectDamageType] = useState("");
  const [effectCondition, setEffectCondition] = useState("");

  const [effectSaveStat, setEffectSaveStat] =
    useState<MonsterSaveStat>("None");
  const [effectSaveDC, setEffectSaveDC] = useState(0);

  const [effectFrequency, setEffectFrequency] =
    useState<MonsterEffect["frequency"]>("Once");

  const [effectDurationAmount, setEffectDurationAmount] =
    useState(1);

  const [effectDurationUnit, setEffectDurationUnit] =
    useState<MonsterEffect["durationUnit"]>("Instant");

  const [effectEndsOnSave, setEffectEndsOnSave] =
    useState(true);

  const [effectDescription, setEffectDescription] =
    useState("");
  const [attackModifier, setAttackModifier] = useState(0);
  const [attackRange, setAttackRange] = useState("");
  const [attackDescription, setAttackDescription] = useState("");

  const [abilities, setAbilities] = useState<MonsterAbility[]>([]);
  const [abilityName, setAbilityName] = useState("");
  const [abilityDescription, setAbilityDescription] = useState("");


  const [defenses, setDefenses] = useState<MonsterDefense[]>([]);
  const [editingDefenseId, setEditingDefenseId] =
    useState<string | null>(null);

  const [defenseName, setDefenseName] = useState("");
  const [defenseArmorBonus, setDefenseArmorBonus] = useState(0);
  const [defenseDamageReduction, setDefenseDamageReduction] =
    useState(0);
  const [defenseDescription, setDefenseDescription] =
    useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];

      const upgraded: Monster[] = Array.isArray(parsed)
        ? parsed.map((monster) => ({
            ...monster,
            stats:
              buildMonsterStats(
                rulesProfile,
                monster.stats ?? {}
              ),
            modifiers: {
              ...blankMonsterModifiers,
              ...(monster.modifiers ?? {}),
            },
            healthMode: monster.healthMode ?? "fixed",
            healthFormula: monster.healthFormula ?? "",
            movementSpeed: monster.movementSpeed ?? 30,
            size: monster.size ?? "Medium",
            attacks: Array.isArray(monster.attacks)
              ? monster.attacks.map((attack: any) => ({
                  ...attack,
                  damageType: attack.damageType ?? "",
                  effects: Array.isArray(attack.effects)
                    ? attack.effects.map((effect: any) => ({
                        ...effect,
                        id: effect.id ?? crypto.randomUUID(),
                        name: effect.name ?? "Effect",
                        effectType: effect.effectType ?? "Damage",
                        trigger: "On Hit",
                        damage: effect.damage ?? "",
                        damageType: effect.damageType ?? "",
                        condition: effect.condition ?? "",
                        saveStat:
                        normalizeMonsterSaveStat(
                          rulesProfile,
                          effect.saveStat
                        ),
                        saveDC: effect.saveDC ?? 0,
                        frequency: effect.frequency ?? "Once",
                        durationAmount: effect.durationAmount ?? 1,
                        durationUnit: effect.durationUnit ?? "Instant",
                        endsOnSuccessfulSave:
                          effect.endsOnSuccessfulSave ?? true,
                        description: effect.description ?? "",
                      }))
                    : attack.secondaryEffect
                      ? [{
                          id: crypto.randomUUID(),
                          name: attack.secondaryEffect.name ?? "Effect",
                          effectType: "Damage",
                          trigger: "On Hit",
                          damage: attack.secondaryEffect.damage ?? "",
                          damageType: attack.secondaryEffect.damageType ?? "",
                          condition: "",
                          saveStat:
                            normalizeMonsterSaveStat(
                              rulesProfile,
                              attack.secondaryEffect.saveStat
                            ),
                          saveDC: attack.secondaryEffect.saveDC ?? 0,
                          frequency: attack.secondaryEffect.frequency ?? "Every Round",
                          durationAmount: 1,
                          durationUnit:
                            attack.secondaryEffect.endsOnSuccessfulSave
                              ? "Until Save"
                              : "Round",
                          endsOnSuccessfulSave:
                            attack.secondaryEffect.endsOnSuccessfulSave ?? true,
                          description: "",
                        }]
                      : [],
                }))
              : [],
            abilities: Array.isArray(monster.abilities) ? monster.abilities : [],
            defenses: Array.isArray(monster.defenses)
              ? monster.defenses.map((defense: any) => ({
                  ...defense,
                  id: defense.id ?? crypto.randomUUID(),
                  name: defense.name ?? "Natural Defense",
                  defenseType: "Natural Armor",
                  armorBonus: defense.armorBonus ?? 0,
                  damageReduction: defense.damageReduction ?? 0,
                  description: defense.description ?? "",
                }))
              : [],
          }))
        : [];

      setMonsters(upgraded);
      localStorage.setItem(storageKey, JSON.stringify(upgraded));
    } catch {
      setMonsters([]);
    }
  }, [storageKey, rulesProfile]);

  const filteredMonsters = monsters.filter((monster) =>
    `${monster.name} ${monster.type}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const exactMatch = monsters.some(
    (monster) =>
      monster.name.toLowerCase() === search.trim().toLowerCase()
  );

  const beginCreate = (monsterName: string) => {
    setEditingId(null);
    setEditorOpen(true);
    setSheetOpen(false);
    setName(monsterName);
    setMonsterType("");
    setStats(
      buildMonsterStats(
        rulesProfile
      )
    );
    setModifiers({ ...blankMonsterModifiers });
    setHealthMode("fixed");
    setHealthFormula("");
    setMovementSpeed(30);
    setSize("Medium");
    setAttacks([]);
    setAbilities([]);
    setDefenses([]);
    setEditingDefenseId(null);
    setPendingEffects([]);
    resetAttackEditor();
  };

  const beginEdit = (monster: Monster) => {
    setEditingId(monster.id);
    setEditorOpen(true);
    setSheetOpen(true);
    setName(monster.name);
    setMonsterType(monster.type);
    setStats(
      buildMonsterStats(
        rulesProfile,
        monster.stats
      )
    );
    setModifiers({
      ...blankMonsterModifiers,
      ...monster.modifiers,
    });
    setHealthMode(monster.healthMode ?? "fixed");
    setHealthFormula(monster.healthFormula ?? "");
    setMovementSpeed(monster.movementSpeed ?? 30);
    setSize(monster.size ?? "Medium");
    setAttacks(monster.attacks ?? []);
    setAbilities(monster.abilities ?? []);
    setDefenses(monster.defenses ?? []);
    setEditingDefenseId(null);
    setPendingEffects([]);
    resetAttackEditor();
  };

  const clearEditor = () => {
    setEditingId(null);
    setEditorOpen(false);
    setSheetOpen(false);
    setName("");
    setMonsterType("");
    setStats(
      buildMonsterStats(
        rulesProfile
      )
    );
    setModifiers({ ...blankMonsterModifiers });
    setHealthMode("fixed");
    setHealthFormula("");
    setMovementSpeed(30);
    setSize("Medium");
    setAttacks([]);
    setAbilities([]);
    setDefenses([]);
    setEditingDefenseId(null);
    setPendingEffects([]);
    resetAttackEditor();
  };

  const openCreatureSheet = () => {
    if (!name.trim()) return;

    setSheetOpen(true);
  };

  const saveMonster = () => {
    const cleanName = name.trim();

    if (!cleanName) return;

    const monster: Monster = {
      id: editingId ?? crypto.randomUUID(),
      name: cleanName,
      type: monsterType.trim() || "Creature",
      stats: { ...stats },
      modifiers: { ...modifiers },
      healthMode,
      healthFormula: healthFormula.trim(),
      movementSpeed,
      size,
      attacks,
      abilities,
      defenses,
    };

    const updated = editingId
      ? monsters.map((existing) =>
          existing.id === editingId ? monster : existing
        )
      : [...monsters, monster];

    setMonsters(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    setSearch(monster.name);
    clearEditor();
  };

  const updateStat = (
    stat: string,
    value: number
  ) => {
    setStats((old) => ({
      ...old,
      [stat]: value,
    }));
  };

  const updateModifier = (
    stat: keyof MonsterModifiers,
    value: number
  ) => {
    setModifiers((old) => ({
      ...old,
      [stat]: value,
    }));
  };

  const resetEffectEditor = () => {
    setEffectName("");
    setEffectType("Damage");
    setEffectDamage("");
    setEffectDamageType("");
    setEffectCondition("");
    setEffectSaveStat("None");
    setEffectSaveDC(0);
    setEffectFrequency("Once");
    setEffectDurationAmount(1);
    setEffectDurationUnit("Instant");
    setEffectEndsOnSave(true);
    setEffectDescription("");
  };

  const addEffect = () => {
    if (!effectName.trim()) return;

    const effect: MonsterEffect = {
      id: crypto.randomUUID(),
      name: effectName.trim(),
      effectType,
      trigger: "On Hit",
      damage: effectDamage.trim(),
      damageType: effectDamageType.trim(),
      condition: effectCondition.trim(),
      saveStat: effectSaveStat,
      saveDC: effectSaveDC,
      frequency: effectFrequency,
      durationAmount: effectDurationAmount,
      durationUnit: effectDurationUnit,
      endsOnSuccessfulSave: effectEndsOnSave,
      description: effectDescription.trim(),
    };

    setPendingEffects((old) => [...old, effect]);
    resetEffectEditor();
  };

  const removePendingEffect = (id: string) => {
    setPendingEffects((old) =>
      old.filter((effect) => effect.id !== id)
    );
  };

  const resetAttackEditor = () => {
    setEditingAttackId(null);
    setAttackName("");
    setAttackType("Natural");
    setAttackDamage("");
    setAttackDamageType("");
    setAttackModifier(0);
    setAttackRange("");
    setAttackDescription("");
    setPendingEffects([]);
    resetEffectEditor();
  };

  const beginEditAttack = (attack: MonsterAttack) => {
    setEditingAttackId(attack.id);
    setAttackName(attack.name);
    setAttackType(attack.attackType);
    setAttackDamage(attack.damage);
    setAttackDamageType(attack.damageType);
    setAttackModifier(attack.attackModifier);
    setAttackRange(attack.range);
    setAttackDescription(attack.description);
    setPendingEffects(
      (attack.effects ?? []).map((effect) => ({
        ...effect,
      }))
    );
    resetEffectEditor();
  };

  const saveAttack = () => {
    if (!attackName.trim()) return;

    const attack: MonsterAttack = {
      id: editingAttackId ?? crypto.randomUUID(),
      name: attackName.trim(),
      attackType,
      damage: attackDamage.trim(),
      damageType: attackDamageType.trim(),
      attackModifier,
      range: attackRange.trim(),
      description: attackDescription.trim(),
      effects: [...pendingEffects],
    };

    setAttacks((old) =>
      editingAttackId
        ? old.map((existing) =>
            existing.id === editingAttackId
              ? attack
              : existing
          )
        : [...old, attack]
    );

    resetAttackEditor();
  };

  const removeAttack = (id: string) => {
    setAttacks((old) =>
      old.filter((attack) => attack.id !== id)
    );

    if (editingAttackId === id) {
      resetAttackEditor();
    }
  };

  const resetDefenseEditor = () => {
    setEditingDefenseId(null);
    setDefenseName("");
    setDefenseArmorBonus(0);
    setDefenseDamageReduction(0);
    setDefenseDescription("");
  };

  const beginEditDefense = (defense: MonsterDefense) => {
    setEditingDefenseId(defense.id);
    setDefenseName(defense.name);
    setDefenseArmorBonus(defense.armorBonus);
    setDefenseDamageReduction(defense.damageReduction);
    setDefenseDescription(defense.description);
  };

  const saveDefense = () => {
    if (!defenseName.trim()) return;

    const defense: MonsterDefense = {
      id: editingDefenseId ?? crypto.randomUUID(),
      name: defenseName.trim(),
      defenseType: "Natural Armor",
      armorBonus: defenseArmorBonus,
      damageReduction: Math.max(0, defenseDamageReduction),
      description: defenseDescription.trim(),
    };

    setDefenses((old) =>
      editingDefenseId
        ? old.map((existing) =>
            existing.id === editingDefenseId
              ? defense
              : existing
          )
        : [...old, defense]
    );

    resetDefenseEditor();
  };

  const removeDefense = (id: string) => {
    setDefenses((old) =>
      old.filter((defense) => defense.id !== id)
    );

    if (editingDefenseId === id) {
      resetDefenseEditor();
    }
  };

  const addAbility = () => {
    if (!abilityName.trim()) return;

    const ability: MonsterAbility = {
      id: crypto.randomUUID(),
      name: abilityName.trim(),
      description: abilityDescription.trim(),
    };

    setAbilities((old) => [...old, ability]);

    setAbilityName("");
    setAbilityDescription("");
  };

  const removeAbility = (id: string) => {
    setAbilities((old) =>
      old.filter((ability) => ability.id !== id)
    );
  };

  return (
    <div>
      <h2>🐉 Monster & Creature Compendium</h2>

      <p>World: {worldId}</p>

      <label style={{ display: "block", marginTop: "16px" }}>
        <span style={{ display: "block", marginBottom: "4px" }}>
          Search Monsters
        </span>

        <input
          value={search}
          onChange={(event) => {
            const value = event.target.value;
            setSearch(value);

            if (!value.trim()) {
              clearEditor();
            }
          }}
          placeholder="Search monsters..."
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "8px",
          }}
        />
      </label>

      {search.trim() && (
        <div
          style={{
            marginTop: "8px",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {filteredMonsters.map((monster) => (
            <button
              key={monster.id}
              type="button"
              onClick={() => beginEdit(monster)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                textAlign: "left",
                border: "none",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <strong>{monster.name}</strong>

              <span
                style={{
                  display: "block",
                  fontSize: "0.85em",
                  opacity: 0.75,
                }}
              >
                {monster.type}
              </span>
            </button>
          ))}

          {!exactMatch && (
            <button
              type="button"
              onClick={() => beginCreate(search.trim())}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                textAlign: "left",
                border: "none",
                cursor: "pointer",
              }}
            >
              + Create "{search.trim()}"
            </button>
          )}
        </div>
      )}

      {editorOpen && (
      <div
          onKeyDown={(event) => {
            if (!sheetOpen && event.key === "Enter") {
              event.preventDefault();
              openCreatureSheet();
            }
          }}
        style={{
          marginTop: "20px",
          padding: "12px",
          border: "1px solid var(--border)",
          borderRadius: "8px",
        }}
      >
        <h3>{editingId ? "Edit Monster" : "Create Monster"}</h3>

        <label style={{ display: "block", marginTop: "8px" }}>
          Monster Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Goblin"
            style={{
              display: "block",
              width: "100%",
              marginTop: "4px",
              padding: "8px",
              borderRadius: "8px",
            }}
          />
        </label>

        <label style={{ display: "block", marginTop: "8px" }}>
          Monster Type
          <input
            value={monsterType}
            onChange={(event) => setMonsterType(event.target.value)}
            placeholder="Example: Humanoid, Beast, Undead"
            style={{
              display: "block",
              width: "100%",
              marginTop: "4px",
              padding: "8px",
              borderRadius: "8px",
            }}
          />
        </label>

          <label style={{ display: "block", marginTop: "10px" }}>
            Size
            <select
              value={size}
              onChange={(event) =>
                setSize(event.target.value as MonsterSize)
              }
              style={{
                display: "block",
                width: "100%",
                marginTop: "4px",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <option value="Tiny">Tiny</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
              <option value="Huge">Huge</option>
              <option value="Gargantuan">Gargantuan</option>
            </select>
          </label>

          {!sheetOpen && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={openCreatureSheet}
              >
                Open Creature Sheet
              </button>

              <button
                type="button"
                className="btn"
                onClick={clearEditor}
              >
                Cancel
              </button>
            </div>
          )}

          {sheetOpen && (
            <>
<details style={{ marginTop: "20px" }}>
  <summary style={{ cursor: "pointer", fontWeight: 700 }}>
    Health
  </summary>

          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "8px",
              flexWrap: "wrap",
            }}
          >
            <label>
              <input
                type="radio"
                name="monster-health-mode"
                checked={healthMode === "fixed"}
                onChange={() => setHealthMode("fixed")}
              />{" "}
              Fixed
            </label>

            <label>
              <input
                type="radio"
                name="monster-health-mode"
                checked={healthMode === "rolled"}
                onChange={() => setHealthMode("rolled")}
              />{" "}
              Rolled
            </label>
          </div>

          {healthMode === "fixed" ? (
            <label style={{ display: "block", marginTop: "8px" }}>
              Base Health
              <input
                type="number"
              onWheel={(event) => event.currentTarget.blur()}
              onKeyDown={(event) => {
                if (
                  event.key === "ArrowUp" ||
                  event.key === "ArrowDown"
                ) {
                  event.preventDefault();
                }
              }}
                min={0}
                value={stats.health}
                onChange={(event) =>
                  updateStat("health", Number(event.target.value))
                }
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>
          ) : (
            <label style={{ display: "block", marginTop: "8px" }}>
              Health Formula
              <input
                value={healthFormula}
                onChange={(event) =>
                  setHealthFormula(event.target.value)
                }
                placeholder="Example: 2d6"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>
          )}

</details>

<details style={{ marginTop: "20px" }}>
  <summary style={{ cursor: "pointer", fontWeight: 700 }}>
    Movement
  </summary>

          <label style={{ display: "block", marginTop: "8px" }}>
            Movement Speed (ft per turn)
            <input
              type="number"
              onWheel={(event) => event.currentTarget.blur()}
              onKeyDown={(event) => {
                if (
                  event.key === "ArrowUp" ||
                  event.key === "ArrowDown"
                ) {
                  event.preventDefault();
                }
              }}
              min={0}
              value={movementSpeed}
              onChange={(event) =>
                setMovementSpeed(Number(event.target.value))
              }
              style={{
                display: "block",
                width: "100%",
                marginTop: "4px",
                padding: "8px",
                borderRadius: "8px",
              }}
            />
          </label>

</details>

<details style={{ marginTop: "20px" }}>
  <summary style={{ cursor: "pointer", fontWeight: 700 }}>
    Core Stats
  </summary>

          <label style={{ display: "block", marginTop: "8px" }}>
            Armor
            <input
              type="number"
              onWheel={(event) => event.currentTarget.blur()}
              onKeyDown={(event) => {
                if (
                  event.key === "ArrowUp" ||
                  event.key === "ArrowDown"
                ) {
                  event.preventDefault();
                }
              }}
              min={0}
              value={stats.armor}
              onChange={(event) =>
                updateStat("armor", Number(event.target.value))
              }
              style={{
                display: "block",
                width: "100%",
                marginTop: "4px",
                padding: "8px",
                borderRadius: "8px",
              }}
            />
          </label>

          {campaignStats.map(
              (stat) => {
                const score =
                  stats[stat.id] ??
                  stat.defaultScore;

                const modifier =
                  getCampaignStatModifier(
                    rulesProfile,
                    score
                  );

                return (
                  <div
                    key={stat.id}
                    style={{
                      marginTop: "10px",
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 120px",
                      gap: "8px",
                      alignItems: "end",
                    }}
                  >
                    <label>
                      {stat.label}
                      {stat.shortLabel
                        ? ` (${stat.shortLabel})`
                        : ""}

                      <input
                        type="number"
                        value={score}
                        onWheel={(event) =>
                          event.currentTarget.blur()
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "ArrowUp" ||
                            event.key === "ArrowDown"
                          ) {
                            event.preventDefault();
                          }
                        }}
                        onChange={(event) =>
                          updateStat(
                            stat.id,
                            Number(
                              event.target.value
                            )
                          )
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          marginTop: "4px",
                          padding: "8px",
                          borderRadius: "8px",
                        }}
                      />
                    </label>

                    <label>
                      Modifier

                      <input
                        type="text"
                        value={
                          modifier >= 0
                            ? `+${modifier}`
                            : String(modifier)
                        }
                        readOnly
                        aria-label={
                          `${stat.label} modifier`
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          marginTop: "4px",
                          padding: "8px",
                          borderRadius: "8px",
                        }}
                      />
                    </label>
                  </div>
                );
              }
            )}

       </details>

          <details style={{ marginTop: "24px" }}>
<summary style={{ cursor: "pointer", fontWeight: 700, padding: "10px", border: "1px solid var(--border)", borderRadius: "8px" }}>
Defenses & Traits
</summary>


          <div
            style={{
              fontSize: "0.85em",
              opacity: 0.75,
              marginTop: "4px",
            }}
          >
            Natural defenses are separate from worn armor.
            Worn armor can later act as a durability barrier,
            while these defenses remain part of the creature.
          </div>

          {defenses.map((defense) => (
            <div
              key={defense.id}
              style={{
                marginTop: "8px",
                padding: "10px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <strong>{defense.name}</strong>

              <div style={{ marginTop: "4px", opacity: 0.8 }}>
                {defense.defenseType}
                {defense.armorBonus
                  ? ` • Armor Bonus ${
                      defense.armorBonus > 0 ? "+" : ""
                    }${defense.armorBonus}`
                  : ""}
                {defense.damageReduction
                  ? ` • Damage Reduction ${defense.damageReduction}`
                  : ""}
              </div>

              {defense.description && (
                <div style={{ marginTop: "4px" }}>
                  {defense.description}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "8px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() => beginEditDefense(defense)}
                >
                  Edit Defense
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => removeDefense(defense.id)}
                >
                  Remove Defense
                </button>
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <label style={{ display: "block" }}>
              Defense Name
              <input
                value={defenseName}
                onChange={(event) =>
                  setDefenseName(event.target.value)
                }
                placeholder="Example: Hardened Skin"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label style={{ display: "block", marginTop: "8px" }}>
              Defense Type
              <select
                value="Natural Armor"
                disabled
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              >
                <option value="Natural Armor">
                  Natural Armor
                </option>
              </select>
            </label>

            <label style={{ display: "block", marginTop: "8px" }}>
              Armor Bonus
              <input
                type="text"
                inputMode="numeric"
                value={defenseArmorBonus}
                onChange={(event) => {
                  const value = event.target.value;

                  if (
                    value === "" ||
                    value === "-" ||
                    /^-?\d+$/.test(value)
                  ) {
                    setDefenseArmorBonus(
                      value === "" || value === "-"
                        ? 0
                        : Number(value)
                    );
                  }
                }}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label style={{ display: "block", marginTop: "8px" }}>
              Damage Reduction
              <input
                type="text"
                inputMode="numeric"
                value={defenseDamageReduction}
                onChange={(event) => {
                  const value = event.target.value;

                  if (value === "" || /^\d+$/.test(value)) {
                    setDefenseDamageReduction(
                      value === "" ? 0 : Number(value)
                    );
                  }
                }}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label style={{ display: "block", marginTop: "8px" }}>
              Defense Notes
              <textarea
                value={defenseDescription}
                onChange={(event) =>
                  setDefenseDescription(event.target.value)
                }
                placeholder="Example: Thick natural hide protects the orc even without worn armor."
                rows={2}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <button
              type="button"
              className="btn"
              onClick={saveDefense}
              style={{ marginTop: "10px" }}
            >
              {editingDefenseId
                ? "Save Defense Changes"
                : "Add Defense"}
            </button>

            {editingDefenseId && (
              <button
                type="button"
                className="btn"
                onClick={resetDefenseEditor}
                style={{
                  marginTop: "10px",
                  marginLeft: "8px",
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          
</details>
<details style={{ marginTop: "24px" }}>
<summary style={{ cursor: "pointer", fontWeight: 700, padding: "10px", border: "1px solid var(--border)", borderRadius: "8px" }}>
Attacks
</summary>


          {attacks.map((attack) => (
            <div
              key={attack.id}
              style={{
                marginTop: "8px",
                padding: "10px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <strong>{attack.name}</strong>
              <div style={{ marginTop: "4px", opacity: 0.8 }}>
                {attack.attackType}
                {attack.damage ? ` • ${attack.damage}` : ""}
                {attack.damageType ? ` ${attack.damageType}` : ""}
                {attack.attackModifier
                  ? ` • Modifier ${
                      attack.attackModifier > 0 ? "+" : ""
                    }${attack.attackModifier}`
                  : ""}
                {attack.range ? ` • ${attack.range}` : ""}
              </div>

                <details style={{ marginTop: "24px" }}>
<summary style={{ cursor: "pointer", fontWeight: 700, padding: "10px", border: "1px solid var(--border)", borderRadius: "8px" }}>
Saved Attack Effects
</summary>
{attack.effects?.map((effect) => (
                  <div
                    key={effect.id}
                    style={{
                      marginTop: "6px",
                      padding: "8px",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                    }}
                  >
                    <strong>
                      Effect: {effect.name}
                    </strong>

                    <div style={{ marginTop: "4px", opacity: 0.8 }}>
                      {effect.effectType}
                      {effect.damage
                        ? ` • ${effect.damage}`
                        : ""}
                      {effect.damageType
                        ? ` ${effect.damageType}`
                        : ""}
                      {effect.condition
                        ? ` • ${effect.condition}`
                        : ""}
                    </div>

                    <div style={{ marginTop: "4px", opacity: 0.8 }}>
                      {effect.frequency}

                      {effect.durationUnit !== "Instant" && (
                        <>
                          {" • Duration: "}
                          {effect.durationUnit === "Until Save"
                            ? "Until Save"
                            : `${effect.durationAmount} ${effect.durationUnit}${
                                effect.durationAmount === 1 ? "" : "s"
                              }`}
                        </>
                      )}
                    </div>

                    {effect.saveStat !== "None" && (
                      <div style={{ marginTop: "4px" }}>
                        {monsterStatLabel(
                            rulesProfile,
                            effect.saveStat
                          )} Save
                        {effect.saveDC
                          ? ` • DC ${effect.saveDC}`
                          : ""}
                        {effect.endsOnSuccessfulSave
                          ? " • Success ends/prevents effect"
                          : ""}
                      </div>
                    )}

                    {effect.description && (
                      <div style={{ marginTop: "4px" }}>
                        {effect.description}
                      </div>
                    )}
                  </div>
                ))}
</details>


              {attack.description && (
                <div style={{ marginTop: "4px" }}>
                  {attack.description}
                </div>
              )}

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() => beginEditAttack(attack)}
                  >
                    Edit Attack
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => removeAttack(attack.id)}
                  >
                    Remove Attack
                  </button>
                </div>
            </div>
          ))}

          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <label style={{ display: "block" }}>
              Attack Name
              <input
                value={attackName}
                onChange={(event) =>
                  setAttackName(event.target.value)
                }
                placeholder="Example: Claws"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label style={{ display: "block", marginTop: "8px" }}>
              Attack Type
              <select
                value={attackType}
                onChange={(event) =>
                  setAttackType(
                    event.target.value as MonsterAttack["attackType"]
                  )
                }
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              >
                <option value="Natural">Natural</option>
                <option value="Weapon">Weapon</option>
                <option value="Special">Special</option>
              </select>
            </label>

            <label style={{ display: "block", marginTop: "8px" }}>
              Damage
              <input
                value={attackDamage}
                onChange={(event) =>
                  setAttackDamage(event.target.value)
                }
                placeholder="Example: 1d4"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

              <label style={{ display: "block", marginTop: "8px" }}>
                Damage Type
                <input
                  value={attackDamageType}
                  onChange={(event) =>
                    setAttackDamageType(event.target.value)
                  }
                  placeholder="Example: Bludgeoning, Slashing, Fire"
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "4px",
                    padding: "8px",
                    borderRadius: "8px",
                  }}
                />
              </label>

            <label style={{ display: "block", marginTop: "8px" }}>
              Attack Modifier
              <input
                type="text"
                inputMode="numeric"
                value={attackModifier}
                onChange={(event) => {
                  const value = event.target.value;

                  if (
                    value === "" ||
                    value === "-" ||
                    /^-?\d+$/.test(value)
                  ) {
                    setAttackModifier(
                      value === "" || value === "-"
                        ? 0
                        : Number(value)
                    );
                  }
                }}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label style={{ display: "block", marginTop: "8px" }}>
              Range / Reach
              <input
                value={attackRange}
                onChange={(event) =>
                  setAttackRange(event.target.value)
                }
                placeholder="Example: Melee, 5 ft, 30 ft"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>


              <div
                style={{
                  marginTop: "14px",
                  padding: "10px",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                <details style={{ marginTop: "24px" }}>
<summary style={{ cursor: "pointer", fontWeight: 700, padding: "10px", border: "1px solid var(--border)", borderRadius: "8px" }}>
Attack Effects
</summary>


                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "0.85em",
                    opacity: 0.75,
                  }}
                >
                  Add as many effects as this attack needs.
                  Every effect can have its own saving throw.
                  The DM can override any result during a live session.
                </div>

                {pendingEffects.map((effect, index) => (
                  <div
                    key={effect.id}
                    style={{
                      marginTop: "10px",
                      padding: "8px",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                    }}
                  >
                    <strong>
                      Effect {index + 1}: {effect.name}
                    </strong>

                    <div style={{ marginTop: "4px", opacity: 0.8 }}>
                      {effect.effectType}
                      {effect.damage ? ` • ${effect.damage}` : ""}
                      {effect.damageType
                        ? ` ${effect.damageType}`
                        : ""}
                      {effect.condition
                        ? ` • ${effect.condition}`
                        : ""}
                    </div>

                    {effect.saveStat !== "None" && (
                      <div style={{ marginTop: "4px" }}>
                        {monsterStatLabel(
                            rulesProfile,
                            effect.saveStat
                          )} Save
                        {effect.saveDC
                          ? ` • DC ${effect.saveDC}`
                          : ""}
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        removePendingEffect(effect.id)
                      }
                      style={{ marginTop: "6px" }}
                    >
                      Remove Effect
                    </button>
                  </div>
                ))}

                <label style={{ display: "block", marginTop: "12px" }}>
                  Effect Name
                  <input
                    value={effectName}
                    onChange={(event) =>
                      setEffectName(event.target.value)
                    }
                    placeholder="Example: Staggered"
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  />
                </label>

                <label style={{ display: "block", marginTop: "8px" }}>
                  Effect Type
                  <select
                    value={effectType}
                    onChange={(event) =>
                      setEffectType(
                        event.target.value as MonsterEffect["effectType"]
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  >
                    <option value="Damage">Damage</option>
                    <option value="Condition">Condition</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                {effectType === "Damage" && (
                  <>
                    <label style={{ display: "block", marginTop: "8px" }}>
                      Effect Damage
                      <input
                        value={effectDamage}
                        onChange={(event) =>
                          setEffectDamage(event.target.value)
                        }
                        placeholder="Example: 1d4"
                        style={{
                          display: "block",
                          width: "100%",
                          marginTop: "4px",
                          padding: "8px",
                          borderRadius: "8px",
                        }}
                      />
                    </label>

                    <label style={{ display: "block", marginTop: "8px" }}>
                      Damage Type
                      <input
                        value={effectDamageType}
                        onChange={(event) =>
                          setEffectDamageType(event.target.value)
                        }
                        placeholder="Example: Bludgeoning"
                        style={{
                          display: "block",
                          width: "100%",
                          marginTop: "4px",
                          padding: "8px",
                          borderRadius: "8px",
                        }}
                      />
                    </label>
                  </>
                )}

                {effectType === "Condition" && (
                  <label style={{ display: "block", marginTop: "8px" }}>
                    Condition
                    <input
                      value={effectCondition}
                      onChange={(event) =>
                        setEffectCondition(event.target.value)
                      }
                      placeholder="Example: Immobilized"
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: "4px",
                        padding: "8px",
                        borderRadius: "8px",
                      }}
                    />
                  </label>
                )}

                <label style={{ display: "block", marginTop: "8px" }}>
                  Saving Throw
                  <select
                    value={effectSaveStat}
                    onChange={(event) =>
                      setEffectSaveStat(
                        event.target.value
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  >
                    <option value="None">
                      None
                    </option>

                    {effectSaveStat !== "None" &&
                      !campaignStats.some(
                        (stat) =>
                          stat.id ===
                          effectSaveStat
                      ) && (
                      <option
                        value={effectSaveStat}
                      >
                        {
                          monsterStatLabel(
                            rulesProfile,
                            effectSaveStat
                          )
                        } (archived / custom)
                      </option>
                    )}

                    {campaignStats.map(
                      (stat) => (
                        <option
                          key={stat.id}
                          value={stat.id}
                        >
                          {stat.label}
                        </option>
                      )
                    )}
                  </select>
                </label>

                {effectSaveStat !== "None" && (
                  <label style={{ display: "block", marginTop: "8px" }}>
                    Save DC
                    <input
                      type="text"
                      inputMode="numeric"
                      value={effectSaveDC}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (value === "" || /^\d+$/.test(value)) {
                          setEffectSaveDC(
                            value === "" ? 0 : Number(value)
                          );
                        }
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: "4px",
                        padding: "8px",
                        borderRadius: "8px",
                      }}
                    />
                  </label>
                )}

                <label style={{ display: "block", marginTop: "8px" }}>
                  Frequency
                  <select
                    value={effectFrequency}
                    onChange={(event) =>
                      setEffectFrequency(
                        event.target.value as MonsterEffect["frequency"]
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  >
                    <option value="Once">Once</option>
                    <option value="Every Turn">Every Turn</option>
                    <option value="Every Round">Every Round</option>
                  </select>
                </label>

                <label style={{ display: "block", marginTop: "8px" }}>
                  Duration
                  <select
                    value={effectDurationUnit}
                    onChange={(event) =>
                      setEffectDurationUnit(
                        event.target.value as MonsterEffect["durationUnit"]
                      )
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  >
                    <option value="Instant">Instant</option>
                    <option value="Turn">Turn(s)</option>
                    <option value="Round">Round(s)</option>
                    <option value="Until Save">Until Save</option>
                  </select>
                </label>

                {(effectDurationUnit === "Turn" ||
                  effectDurationUnit === "Round") && (
                  <label style={{ display: "block", marginTop: "8px" }}>
                    Duration Amount
                    <input
                      type="text"
                      inputMode="numeric"
                      value={effectDurationAmount}
                      onChange={(event) => {
                        const value = event.target.value;

                        if (value === "" || /^\d+$/.test(value)) {
                          setEffectDurationAmount(
                            value === "" ? 0 : Number(value)
                          );
                        }
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: "4px",
                        padding: "8px",
                        borderRadius: "8px",
                      }}
                    />
                  </label>
                )}

                {effectSaveStat !== "None" && (
                  <label
                    style={{
                      display: "block",
                      marginTop: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={effectEndsOnSave}
                      onChange={(event) =>
                        setEffectEndsOnSave(event.target.checked)
                      }
                    />{" "}
                    Successful save prevents / ends this effect
                  </label>
                )}

                <label style={{ display: "block", marginTop: "8px" }}>
                  Effect Notes
                  <textarea
                    value={effectDescription}
                    onChange={(event) =>
                      setEffectDescription(event.target.value)
                    }
                    placeholder="Optional details..."
                    rows={2}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "4px",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  />
                </label>

                <button
                  type="button"
                  className="btn"
                  onClick={addEffect}
                  style={{ marginTop: "10px" }}
                >
                  + Add Effect
                </button>
</details>

              </div>

            <label style={{ display: "block", marginTop: "8px" }}>
              Attack Description
              <textarea
                value={attackDescription}
                onChange={(event) =>
                  setAttackDescription(event.target.value)
                }
                placeholder="Optional notes about this attack..."
                rows={2}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <button
              type="button"
              className="btn"
              onClick={saveAttack}
              style={{ marginTop: "10px" }}
            >
              {editingAttackId ? "Save Attack Changes" : "Add Attack"}
            </button>


              {editingAttackId && (
                <button
                  type="button"
                  className="btn"
                  onClick={resetAttackEditor}
                  style={{ marginTop: "10px", marginLeft: "8px" }}
                >
                  Cancel Edit
                </button>
              )}
          </div>

          
</details>
<details style={{ marginTop: "24px" }}>
<summary style={{ cursor: "pointer", fontWeight: 700, padding: "10px", border: "1px solid var(--border)", borderRadius: "8px" }}>
Abilities & Traits
</summary>


          {abilities.map((ability) => (
            <div
              key={ability.id}
              style={{
                marginTop: "8px",
                padding: "10px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <strong>{ability.name}</strong>

              {ability.description && (
                <div style={{ marginTop: "4px" }}>
                  {ability.description}
                </div>
              )}

              <button
                type="button"
                className="btn"
                onClick={() => removeAbility(ability.id)}
                style={{ marginTop: "8px" }}
              >
                Remove Ability
              </button>
            </div>
          ))}

          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <label style={{ display: "block" }}>
              Ability / Trait Name
              <input
                value={abilityName}
                onChange={(event) =>
                  setAbilityName(event.target.value)
                }
                placeholder="Example: Darkvision"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <label style={{ display: "block", marginTop: "8px" }}>
              Description
              <textarea
                value={abilityDescription}
                onChange={(event) =>
                  setAbilityDescription(event.target.value)
                }
                placeholder="What can this creature do?"
                rows={3}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              />
            </label>

            <button
              type="button"
              className="btn"
              onClick={addAbility}
              style={{ marginTop: "10px" }}
            >
              Add Ability
            </button>
          </div>

        
</details>
<div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "14px",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={saveMonster}
          >
            {editingId ? "Save Changes" : "Save Monster"}
          </button>

          <button
            type="button"
            className="btn"
            onClick={clearEditor}
          >
           Close Without Saving
          </button>
        </div>
            </>
          )}
      </div>
      )}
    </div>
  );
}

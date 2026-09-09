import { useEffect, useState } from "react";

type MonsterStats = {
  health: number;
  armor: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
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

type MonsterSaveStat =
  | "None"
  | "Strength"
  | "Dexterity"
  | "Constitution"
  | "Intelligence"
  | "Wisdom"
  | "Charisma";

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
};

const blankMonsterStats: MonsterStats = {
  health: 10,
  armor: 10,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};


const blankMonsterModifiers: MonsterModifiers = {
  strength: 0,
  dexterity: 0,
  constitution: 0,
  intelligence: 0,
  wisdom: 0,
  charisma: 0,
};

export function MonsterPage({ worldId }: { worldId: string }) {
  const storageKey = `storyforge-monsters-${worldId}`;

  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [monsterType, setMonsterType] = useState("");
  const [stats, setStats] = useState<MonsterStats>({ ...blankMonsterStats });
  const [modifiers, setModifiers] = useState<MonsterModifiers>({
    ...blankMonsterModifiers,
  });
  const [healthMode, setHealthMode] = useState<"fixed" | "rolled">("fixed");
  const [healthFormula, setHealthFormula] = useState("");
  const [movementSpeed, setMovementSpeed] = useState(30);
  const [size, setSize] = useState<MonsterSize>("Medium");

  const [attacks, setAttacks] = useState<MonsterAttack[]>([]);
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];

      const upgraded: Monster[] = Array.isArray(parsed)
        ? parsed.map((monster) => ({
            ...monster,
            stats: {
              ...blankMonsterStats,
              ...(monster.stats ?? {}),
            },
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
                        saveStat: effect.saveStat ?? "None",
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
                          saveStat: attack.secondaryEffect.saveStat ?? "None",
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
          }))
        : [];

      setMonsters(upgraded);
      localStorage.setItem(storageKey, JSON.stringify(upgraded));
    } catch {
      setMonsters([]);
    }
  }, [storageKey]);

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
    setStats({ ...blankMonsterStats });
    setModifiers({ ...blankMonsterModifiers });
    setHealthMode("fixed");
    setHealthFormula("");
    setMovementSpeed(30);
    setSize("Medium");
    setAttacks([]);
    setAbilities([]);
    setPendingEffects([]);
  };

  const beginEdit = (monster: Monster) => {
    setEditingId(monster.id);
    setEditorOpen(true);
    setSheetOpen(true);
    setName(monster.name);
    setMonsterType(monster.type);
    setStats({ ...blankMonsterStats, ...monster.stats });
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
    setPendingEffects([]);
  };

  const clearEditor = () => {
    setEditingId(null);
    setEditorOpen(false);
    setSheetOpen(false);
    setName("");
    setMonsterType("");
    setStats({ ...blankMonsterStats });
    setModifiers({ ...blankMonsterModifiers });
    setHealthMode("fixed");
    setHealthFormula("");
    setMovementSpeed(30);
    setSize("Medium");
    setAttacks([]);
    setAbilities([]);
    setPendingEffects([]);
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
    stat: keyof MonsterStats,
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

  const addAttack = () => {
    if (!attackName.trim()) return;

    const attack: MonsterAttack = {
      id: crypto.randomUUID(),
      name: attackName.trim(),
      attackType,
      damage: attackDamage.trim(),
      damageType: attackDamageType.trim(),
      attackModifier,
      range: attackRange.trim(),
      description: attackDescription.trim(),
      effects: [...pendingEffects],
    };

    setAttacks((old) => [...old, attack]);

    setAttackName("");
    setAttackType("Natural");
    setAttackDamage("");
    setAttackModifier(0);
    setAttackRange("");
    setAttackDescription("");
    setAttackDamageType("");
    setPendingEffects([]);
    resetEffectEditor();
    setHasSecondaryEffect(false);
    setEffectName("");
    setEffectDamage("");
    setEffectDamageType("");
    setEffectSaveStat("None");
    setEffectSaveDC(0);
    setEffectFrequency("Every Round");
    setEffectEndsOnSave(true);
  };

  const removeAttack = (id: string) => {
    setAttacks((old) =>
      old.filter((attack) => attack.id !== id)
    );
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
          <h3 style={{ marginTop: "20px" }}>Health</h3>

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

          <h3 style={{ marginTop: "20px" }}>Movement</h3>

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

          <h3 style={{ marginTop: "20px" }}>Core Stats</h3>

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

          {(
            [
              ["strength", "Strength"],
              ["dexterity", "Dexterity"],
              ["constitution", "Constitution"],
              ["intelligence", "Intelligence"],
              ["wisdom", "Wisdom"],
              ["charisma", "Charisma"],
            ] as const
          ).map(([stat, label]) => (
            <div
              key={stat}
              style={{
                marginTop: "10px",
                display: "grid",
                gridTemplateColumns: "1fr 120px",
                gap: "8px",
                alignItems: "end",
              }}
            >
              <label>
                {label}
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
                  value={stats[stat]}
                  onChange={(event) =>
                    updateStat(stat, Number(event.target.value))
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
                  value={modifiers[stat]}
                  onChange={(event) =>
                    updateModifier(
                      stat,
                      Number(event.target.value)
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
            </div>
          ))}

          <h3 style={{ marginTop: "24px" }}>
            Attacks
          </h3>

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
                        {effect.saveStat} Save
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

              {attack.description && (
                <div style={{ marginTop: "4px" }}>
                  {attack.description}
                </div>
              )}

              <button
                type="button"
                className="btn"
                onClick={() => removeAttack(attack.id)}
                style={{ marginTop: "8px" }}
              >
                Remove Attack
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
                <strong>Attack Effects</strong>

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
                        {effect.saveStat} Save
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
                        event.target.value as MonsterSaveStat
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
                    <option value="None">None</option>
                    <option value="Strength">Strength</option>
                    <option value="Dexterity">Dexterity</option>
                    <option value="Constitution">Constitution</option>
                    <option value="Intelligence">Intelligence</option>
                    <option value="Wisdom">Wisdom</option>
                    <option value="Charisma">Charisma</option>
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
              onClick={addAttack}
              style={{ marginTop: "10px" }}
            >
              Add Attack
            </button>
          </div>

          <h3 style={{ marginTop: "24px" }}>
            Abilities & Traits
          </h3>

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
            Clear
          </button>
        </div>
            </>
          )}
      </div>
      )}
    </div>
  );
}

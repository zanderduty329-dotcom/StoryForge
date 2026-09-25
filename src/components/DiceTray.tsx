import { useEffect, useId, useRef, useState } from "react";
import { rollDice, signed } from "../lib/dice";
import type {
  RollMode,
  RollPurpose,
  RollResult,
  StatId,
} from "../lib/dice";

import {
  createDefaultCampaignRulesProfile,
  getActiveCampaignStats,
  getCampaignStat,
  getCampaignStatModifier,
  readCampaignRulesProfile,
} from "../lib/campaignRules";
import { readActors, readHistory, recordRoll } from "../lib/diceArchive";
import type { DiceActor } from "../lib/diceArchive";
import "./DiceTray.css";

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const PURPOSES: { value: RollPurpose; label: string }[] = [
  { value: "free", label: "Free roll" }, { value: "attack", label: "Attack / to hit" },
  { value: "damage", label: "Damage / effect" }, { value: "save", label: "Saving throw" },
  { value: "check", label: "Stat / skill check" },
];

// StoryForge dice actor search v2
function ActorSearch({ label, searchLabel, emptyLabel, actors, value, disabled, onChange }: {
  label: string;
  searchLabel: string;
  emptyLabel: string;
  actors: DiceActor[];
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const listId = `${inputId}-matches`;
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = actors.find((item) => item.key === value);
  const [query, setQuery] = useState(selected?.ref.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = actors.filter((item) => item.ref.name.toLocaleLowerCase().includes(normalizedQuery));
  const expanded = open && !disabled;
  const describe = (item: DiceActor) => `${item.ref.name} · ${item.ref.kind === "monster" ? "Monster template" : title(item.ref.kind)}`;

  useEffect(() => {
    setQuery(selected?.ref.name ?? "");
    setActiveIndex(-1);
  }, [value, selected?.ref.name]);

  useEffect(() => {
    if (expanded && activeIndex >= 0) list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [expanded, activeIndex, query]);

  function choose(item: DiceActor) {
    onChange(item.key);
    setQuery(item.ref.name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function dismiss() {
    setOpen(false);
    setActiveIndex(-1);
    setQuery(selected?.ref.name ?? "");
  }

  return <div className="sf-dice-actor-search" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dismiss();
  }}>
    <label htmlFor={inputId}>{label}</label>
    <div className="sf-dice-combobox">
      <input id={inputId} ref={input} type="search" role="combobox" value={query} disabled={disabled}
        aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && matches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        placeholder={`${searchLabel} by name`} autoComplete="off" spellCheck={false}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((old) => !matches.length ? -1 : old < 0
              ? (direction === 1 ? 0 : matches.length - 1)
              : (old + direction + matches.length) % matches.length);
          } else if (event.key === "Enter" && expanded && matches[activeIndex]) {
            event.preventDefault();
            choose(matches[activeIndex]);
          } else if (event.key === "Escape" && expanded) {
            event.preventDefault();
            event.stopPropagation();
            dismiss();
          }
        }} />
      {expanded && <div className="sf-dice-suggestions">
        <ul id={listId} ref={list} role="listbox" aria-label={`${label} matches`}>
          {matches.map((item, index) => <li id={`${listId}-${index}`} key={item.key} role="option"
            aria-selected={index === activeIndex} className={index === activeIndex ? "sf-dice-option-active" : undefined}
            onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}>
            {describe(item)}
          </li>)}
        </ul>
        {!matches.length && <p role="status">No matching names. Try fewer letters.</p>}
      </div>}
    </div>
    <div className="sf-dice-selection">
      <span className="sf-dice-muted">{value ? selected ? `Selected: ${describe(selected)}` : "Selection unavailable" : emptyLabel}</span>
      {value && <button className="btn btn-secondary btn-sm" type="button" disabled={disabled}
        aria-label={`Clear ${label} selection`} onMouseDown={(event) => event.preventDefault()}
        onClick={() => { onChange(""); setQuery(""); setActiveIndex(-1); setOpen(true); input.current?.focus(); }}>Clear</button>}
    </div>
  </div>;
}

function Breakdown({ roll }: { roll: RollResult }) {
  const request = roll.request;
  return <div className="sf-dice-breakdown">
    <div>{request.formula} · {title(request.mode ?? "normal")}</div>
    {roll.dice.map((term, i) => <div key={i}>
      {term.sign < 0 ? "− " : ""}{term.count}d{term.sides}: [{term.values.join(", ")}]
      {request.mode !== "normal" ? ` → kept ${term.kept.join(", ")}` : ""}
    </div>)}
    {roll.constant !== 0 && <div>Formula modifier: {signed(roll.constant)}</div>}
    {request.stat && <div>{title(request.stat.key)} {request.stat.score}: {signed(roll.statBonus)}</div>}
    {request.adjustments?.filter((item) => item.value !== 0).map((item, i) => <div key={i}>{item.label}: {signed(item.value)}</div>)}
    <strong>Total: {roll.total}</strong>
    {roll.outcome && <div>{title(roll.outcome)} · difficulty {request.dc} · ties succeed</div>}
    {request.source && <div>From {request.source.owner.name}: {request.source.attackName ? `${request.source.attackName} — ` : ""}{request.source.name}</div>}
    {request.note && <div>{request.note}</div>}
  </div>;
}

export function DiceTray({ worldId }: { worldId?: string }) {
  return <DiceTrayBody key={worldId ? `world:${worldId}` : "standalone"} worldId={worldId} />;
}

function DiceTrayBody({ worldId }: { worldId?: string }) {
  /*
   * STORYFORGE DYNAMIC DICE STATS V3C
   *
   * The campaign profile defines available stats
   * and how scores become roll modifiers.
   */
  const rulesProfile =
    worldId
      ? readCampaignRulesProfile(
          worldId
        )
      : createDefaultCampaignRulesProfile(
          "__standalone__"
        );

  const [archive, setArchive] = useState(() => readActors(worldId));
  const [purpose, setPurpose] = useState<RollPurpose>("free");
  const [actorKey, setActorKey] = useState("");
  const [opponentKey, setOpponentKey] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [effectId, setEffectId] = useState("");
  const [statKey, setStatKey] = useState<StatId>("");
  const [formula, setFormula] = useState("1d20");
  const [mode, setMode] = useState<RollMode>("normal");
  const [adjustment, setAdjustment] = useState("0");
  const [dc, setDC] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<RollResult[]>([]);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const actor = archive.actors.find((item) => item.key === actorKey);
  const opponent = archive.actors.find((item) => item.key === opponentKey);
  const action = (purpose === "attack" || purpose === "damage")
    ? actor?.actions.find((item) => item.id === sourceId)
    : undefined;

  const primaryActions =
    actor?.actions.filter(
      (item) =>
        !item.source.attackId &&
        (
          purpose === "attack"
            ? (
                item.resolution === undefined ||
                item.resolution === "attack"
              )
            : purpose === "damage"
              ? Boolean(item.formula)
              : true
        )
    ) ?? [];

  const linkedEffects =
    sourceId
      ? actor?.actions.filter((item) => item.source.attackId === sourceId) ?? []
      : [];

  const effectAction =
    purpose === "damage" && effectId
      ? linkedEffects.find((item) => item.id === effectId)
      : undefined;

  const save = purpose === "save"
    ? opponent?.saves.find((item) => item.id === sourceId)
    : undefined;
  const activeStats =
    getActiveCampaignStats(
      rulesProfile
    );

  const selectedStatDefinition =
    statKey
      ? getCampaignStat(
          rulesProfile,
          statKey
        )
      : undefined;

  /*
   * Archived stats are hidden from ordinary
   * selection but remain usable by old actions.
   */
  const statOptions =
    selectedStatDefinition?.archived &&
    !activeStats.some(
      (stat) =>
        stat.id ===
        selectedStatDefinition.id
    )
      ? [
          ...activeStats,
          selectedStatDefinition,
        ]
      : activeStats;

  const score =
    statKey
      ? actor?.stats[statKey]
      : undefined;

  const statBonus =
    score === undefined
      ? undefined
      : getCampaignStatModifier(
          rulesProfile,
          score
        );

  const modifierRuleHint =
    rulesProfile.modifierRule.kind === "none"
      ? "Campaign rule: stats add no automatic modifier."
      : rulesProfile.modifierRule.kind === "raw-score"
        ? "Campaign rule: the full stat score is used as the modifier."
        : rulesProfile.modifierRule.kind === "table"
          ? "Campaign rule: modifier resolved from the campaign table."
          : "StoryForge modifier scale: 9–10 = 0; 11–12 = +1; 19–20 = +5.";

  useEffect(() => {
    function refresh() {
      setArchive(readActors(worldId));
      try { setHistory(readHistory(worldId)); setStorageError(""); }
      catch { setStorageError("Roll history could not be loaded. Existing saved history has been kept."); }
    }
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [worldId]);

  function changePurpose(value: RollPurpose) {
    setPurpose(value); setSourceId(""); setEffectId(""); setStatKey(""); setDC("");
    setFormula(value === "damage" ? "1d6" : "1d20"); setMode("normal"); setError("");
  }

  function chooseSource(value: string) {
    setSourceId(value); setEffectId(""); setError("");
    if (purpose === "save") {
      const selected = opponent?.saves.find((item) => item.id === value);
      setStatKey(selected?.stat ?? "");
      setDC(selected?.dc === undefined ? "" : String(selected.dc));
      setFormula("1d20"); setMode("normal");
    } else {
      const selected = actor?.actions.find((item) => item.id === value);
      if (purpose === "attack") {
        setFormula("1d20");

        setStatKey(
          selected?.stat ?? ""
        );
      } else {
        setFormula(
          selected?.formula ||
          "1d6"
        );
      }
      setMode("normal");
    }
  }

  function chooseEffect(value: string) {
    setEffectId(value);
    setError("");

    const selected = linkedEffects.find((item) => item.id === value);

    if (selected) {
      setFormula(selected.formula || "1d4");
    } else if (action) {
      setFormula(action.formula || "1d6");
    }

    setMode("normal");
  }

  function performRoll() {
    setError("");
    try {
      if (actorKey && !actor) throw new Error("Select a current character or creature to roll as.");
      if (opponentKey && !opponent) throw new Error("Select a current target or source creature.");
      if (sourceId && !action && !save) throw new Error("The saved action changed. Select it again.");
      if (effectId && !effectAction) throw new Error("The linked effect changed. Select it again.");
      if (
        statKey &&
        score === undefined
      ) {
        throw new Error(
          "Select a saved character or creature with a valid score for this stat."
        );
      }

      const requestStat =
        statKey &&
        score !== undefined &&
        statBonus !== undefined
          ? {
              key: statKey,
              score,
              modifier: statBonus,
            }
          : undefined;
      const adjustments = [{ label: "Situational / DM adjustment", value: adjustment.trim() === "" ? 0 : Number(adjustment) }];
      if (purpose === "attack" && action) adjustments.unshift({ label: `${action.name} attack bonus`, value: action.bonus });
      const rolled = rollDice({
        formula, mode, purpose, worldId, actor: actor?.ref, opponent: opponent?.ref,
        source: effectAction?.source ?? save?.source ?? action?.source, stat: requestStat, modifierRule: rulesProfile.modifierRule.id, adjustments,
        dc: dc.trim() === "" ? undefined : Number(dc), note: note.trim() || undefined,
      });
      setResult(rolled);
      try {
        setHistory(recordRoll(rolled)); setStorageError("");
      } catch {
        setHistory((old) => [rolled, ...old].slice(0, 50));
        setStorageError("This roll is visible here, but could not be saved. Keep this page open if you need the result.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The roll could not be completed.");
    }
  }

  return <div className="sf-dice">

    <div className="sf-dice-fields">
      <label>Dice formula<input value={formula} onChange={(event) => setFormula(event.target.value)} maxLength={120} placeholder="Example: 2d6+3" spellCheck={false} /></label>
      <label>Roll mode<select value={mode} onChange={(event) => setMode(event.target.value as RollMode)}>
        <option value="normal">Normal</option><option value="advantage">d20 advantage</option><option value="disadvantage">d20 disadvantage</option>
      </select></label>
    </div>

    <details className="sf-dice-context" open={worldId ? true : undefined}>
      <summary>Who is rolling, and why?</summary>
      {!worldId && <p>Select a world from Home to use saved characters and monsters. Free rolls are available now.</p>}
      {archive.errors.map((message) => <p role="alert" key={message}>{message}</p>)}
      <div className="sf-dice-fields">
        <label>Purpose<select value={purpose} onChange={(event) => changePurpose(event.target.value as RollPurpose)}>
          {PURPOSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></label>
        <ActorSearch label="Roll as" searchLabel="Search roller" emptyLabel="No character selected"
          actors={archive.actors} value={actorKey} disabled={!worldId} onChange={(value) => {
            setActorKey(value); if (purpose !== "save") setSourceId("");
            if (purpose !== "save" || !save) setStatKey("");
          }} />
        <ActorSearch label={purpose === "save" ? "Saving throw caused by" : "Target (optional)"}
          searchLabel={purpose === "save" ? "Search effect source" : "Search target"} emptyLabel="None"
          actors={archive.actors} value={opponentKey} disabled={!worldId} onChange={(value) => {
            setOpponentKey(value);
            if (purpose === "save") { setSourceId(""); setStatKey(""); setDC(""); }
          }} />
        <label>Stat<select
          value={statKey}
          onChange={(event) =>
            setStatKey(
              event.target.value
            )
          }
        >
          <option value="">
            None — no stat bonus
          </option>

          {statKey &&
            !selectedStatDefinition &&
            <option value={statKey}>
              {title(statKey)} (unregistered)
            </option>}

          {statOptions.map(
            (stat) =>
              <option
                key={stat.id}
                value={stat.id}
                disabled={stat.archived === true}
              >
                {stat.label}
                {stat.archived
                  ? " (archived)"
                  : ""}
              </option>
          )}
        </select></label>
      </div>

      {(purpose === "attack" || purpose === "damage") && primaryActions.length > 0 && <label className="sf-dice-full-label">Saved action or item<select value={sourceId} onChange={(event) => chooseSource(event.target.value)}>
        <option value="">Custom roll</option>
        {primaryActions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>}

      {purpose === "damage" && action && linkedEffects.length > 0 && <label className="sf-dice-full-label">Action effect<select value={effectId} onChange={(event) => chooseEffect(event.target.value)}>
        <option value="">Main roll · {action.formula || "No saved dice"}</option>
        {linkedEffects.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.formula || "No dice"}</option>)}
      </select></label>}
      {purpose === "save" && !!opponent?.saves.length && <label className="sf-dice-full-label">Saved action effect<select value={sourceId} onChange={(event) => chooseSource(event.target.value)}>
        <option value="">Custom saving throw</option>
        {opponent.saves.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>}
      {purpose === "save" && opponent && !opponent.saves.length && <p>This sheet has no saved action effects with a recognized saving stat. You can select a stat and difficulty below.</p>}

      <div className="sf-dice-fields">
        <label>Situational / DM adjustment<input type="number" step="1" min="-10000" max="10000" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} /></label>
        {(purpose === "attack" || purpose === "save" || purpose === "check") && <label>Difficulty (optional)<input type="number" step="1" min="0" max="10000" value={dc} onChange={(event) => setDC(event.target.value)} placeholder="No automatic success / failure" /></label>}
      </div>
      <label className="sf-dice-full-label">Reason / note (optional)<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Example: resist the Orc's poison" /></label>
    </details>

    <div className="sf-dice-preview">
      {!statKey
        ? "No stat bonus"
        : score === undefined
          ? "Select a sheet with a valid stat score"
          : `${selectedStatDefinition?.label ?? title(statKey)} ${score} → ${signed(statBonus!)}`}
      {purpose === "attack" && action && ` · Attack bonus ${signed(action.bonus)}`}
      {statKey &&
        <div className="sf-dice-muted">
          {modifierRuleHint}
        </div>}
      {(purpose === "damage" || purpose === "save") && <div className="sf-dice-muted">This records the roll. The DM confirms and applies damage, healing, resource changes, armor loss, movement, and conditions.</div>}
    </div>
    <button className="btn btn-primary sf-dice-roll" type="button" onClick={performRoll}>🎲 Roll {formula || "dice"}</button>
    {error && <p role="alert" className="sf-dice-error">{error}</p>}
    {storageError && <p role="alert" className="sf-dice-error">{storageError}</p>}

    <div className="sf-dice-result" role="status" aria-live="polite" aria-atomic="true">
      {result ? <>
        <div className="sf-dice-result-title">{result.request.actor?.name ?? "Free roll"}{result.request.opponent ? ` · ${result.request.purpose === "save" ? "against" : "target"} ${result.request.opponent.name}` : ""}</div>
        <div className="sf-dice-total">{result.total}</div>
        <Breakdown roll={result} />
      </> : <p>Choose your dice, then roll.</p>}
    </div>
    <details className="sf-dice-history" open>
      <summary>Roll history ({history.length})</summary>
      <p className="sf-dice-muted">Latest 50 rolls saved in this browser{worldId ? " for this world" : " for standalone use"}. Online session sharing comes later.</p>
      {!history.length && <p>No rolls yet.</p>}
      {history.map((roll) => <details className="sf-dice-history-item" key={roll.id}>
        <summary>{new Date(roll.createdAt).toLocaleTimeString()} · {roll.request.actor?.name ?? "Free roll"} · {PURPOSES.find((item) => item.value === roll.request.purpose)?.label ?? "Roll"} · {roll.request.formula} = <strong>{roll.total}</strong>{roll.outcome ? ` · ${title(roll.outcome)}` : ""}</summary>
        {roll.request.opponent && <p>{roll.request.purpose === "save" ? "Save against" : "Target"}: {roll.request.opponent.name}</p>}
        <Breakdown roll={roll} />
      </details>)}
    </details>
  </div>;
}

import { useEffect, useState } from "react";
import { rollDice, signed, statModifier, STAT_KEYS } from "../lib/dice";
import type { RollMode, RollPurpose, RollResult, StatKey } from "../lib/dice";
import { readActors, readHistory, recordRoll } from "../lib/diceArchive";
import "./DiceTray.css";

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const PURPOSES: { value: RollPurpose; label: string }[] = [
  { value: "free", label: "Free roll" }, { value: "attack", label: "Attack / to hit" },
  { value: "damage", label: "Damage" }, { value: "save", label: "Saving throw" },
  { value: "check", label: "Stat / skill check" },
];

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
  const [archive, setArchive] = useState(() => readActors(worldId));
  const [purpose, setPurpose] = useState<RollPurpose>("free");
  const [actorKey, setActorKey] = useState("");
  const [opponentKey, setOpponentKey] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [statKey, setStatKey] = useState<StatKey | "none">("none");
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
  const action = (purpose === "attack" || purpose === "damage") ? actor?.actions.find((item) => item.id === sourceId) : undefined;
  const save = purpose === "save" ? opponent?.saves.find((item) => item.id === sourceId) : undefined;
  const score = statKey === "none" ? undefined : actor?.stats[statKey];
  const statBonus = score === undefined ? undefined : statModifier(score);

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
    setPurpose(value); setSourceId(""); setStatKey("none"); setDC("");
    setFormula(value === "damage" ? "1d6" : "1d20"); setMode("normal"); setError("");
  }

  function chooseSource(value: string) {
    setSourceId(value); setError("");
    if (purpose === "save") {
      const selected = opponent?.saves.find((item) => item.id === value);
      setStatKey(selected?.stat ?? "none");
      setDC(selected?.dc === undefined ? "" : String(selected.dc));
      setFormula("1d20"); setMode("normal");
    } else {
      const selected = actor?.actions.find((item) => item.id === value);
      setFormula(purpose === "damage" ? selected ? selected.formula : "1d6" : "1d20");
      setMode("normal");
    }
  }

  function performRoll() {
    setError("");
    try {
      if (actorKey && !actor) throw new Error("Select a current character or creature to roll as.");
      if (opponentKey && !opponent) throw new Error("Select a current target or source creature.");
      if (sourceId && !action && !save) throw new Error("The saved action changed. Select it again.");
      if (statKey !== "none" && score === undefined) throw new Error("Select a saved character or creature with a valid score for this stat.");
      const requestStat = statKey !== "none" && score !== undefined ? { key: statKey, score } : undefined;
      const adjustments = [{ label: "Situational / DM adjustment", value: adjustment.trim() === "" ? 0 : Number(adjustment) }];
      if (purpose === "attack" && action) adjustments.unshift({ label: `${action.name} attack bonus`, value: action.bonus });
      const rolled = rollDice({
        formula, mode, purpose, worldId, actor: actor?.ref, opponent: opponent?.ref,
        source: save?.source ?? action?.source, stat: requestStat, adjustments,
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
        <label>Roll as<select value={actorKey} disabled={!worldId} onChange={(event) => {
          setActorKey(event.target.value); if (purpose !== "save") setSourceId("");
          if (purpose !== "save" || !save) setStatKey("none");
        }}>
          <option value="">No character selected</option>
          {archive.actors.map((item) => <option key={item.key} value={item.key}>{item.ref.name} · {item.ref.kind === "monster" ? "Monster template" : title(item.ref.kind)}</option>)}
        </select></label>
        <label>{purpose === "save" ? "Saving throw caused by" : "Target (optional)"}<select value={opponentKey} disabled={!worldId} onChange={(event) => {
          setOpponentKey(event.target.value);
          if (purpose === "save") { setSourceId(""); setStatKey("none"); setDC(""); }
        }}>
          <option value="">None</option>
          {archive.actors.map((item) => <option key={item.key} value={item.key}>{item.ref.name} · {item.ref.kind === "monster" ? "Monster template" : title(item.ref.kind)}</option>)}
        </select></label>
        <label>Stat<select value={statKey} onChange={(event) => setStatKey(event.target.value as StatKey | "none")}>
          <option value="none">None — no stat bonus</option>
          {STAT_KEYS.map((key) => <option key={key} value={key}>{title(key)}</option>)}
        </select></label>
      </div>

      {(purpose === "attack" || purpose === "damage") && !!actor?.actions.length && <label className="sf-dice-full-label">Saved attack or item<select value={sourceId} onChange={(event) => chooseSource(event.target.value)}>
        <option value="">Custom roll</option>
        {actor.actions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>}
      {purpose === "save" && !!opponent?.saves.length && <label className="sf-dice-full-label">Saved attack effect<select value={sourceId} onChange={(event) => chooseSource(event.target.value)}>
        <option value="">Custom saving throw</option>
        {opponent.saves.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>}
      {purpose === "save" && opponent && !opponent.saves.length && <p>This sheet has no saved attack effects with a saving stat. You can select a stat and difficulty below.</p>}

      <div className="sf-dice-fields">
        <label>Situational / DM adjustment<input type="number" step="1" min="-10000" max="10000" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} /></label>
        {(purpose === "attack" || purpose === "save" || purpose === "check") && <label>Difficulty (optional)<input type="number" step="1" min="0" max="10000" value={dc} onChange={(event) => setDC(event.target.value)} placeholder="No automatic success / failure" /></label>}
      </div>
      <label className="sf-dice-full-label">Reason / note (optional)<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Example: resist the Orc's poison" /></label>
    </details>

    <div className="sf-dice-preview">
      {statKey === "none" ? "No stat bonus" : score === undefined ? "Select a sheet with a valid stat score" : `${title(statKey)} ${score} → ${signed(statBonus!)}`}
      {purpose === "attack" && action && ` · Attack bonus ${signed(action.bonus)}`}
      {statKey !== "none" && <div className="sf-dice-muted">StoryForge scale: 9–10 = 0; 11–12 = +1; 19–20 = +5.</div>}
      {(purpose === "damage" || purpose === "save") && <div className="sf-dice-muted">This records the roll. The DM applies damage, armor loss, and conditions.</div>}
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

import { useState } from "react";

const dice = [4, 6, 8, 10, 12, 20, 100];

function rollDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

export function SessionPage({ worldId }: { worldId: string }) {
  const [modifier, setModifier] = useState(0);
  const [result, setResult] = useState("Choose a die to roll.");
  const [history, setHistory] = useState<string[]>([]);

  const addHistory = (text: string) => {
    setHistory((old) => [text, ...old].slice(0, 12));
  };

  const normalRoll = (sides: number) => {
    const roll = rollDie(sides);
    const total = roll + modifier;
    const text =
      modifier === 0
        ? `d${sides}: ${roll}`
        : `d${sides}: ${roll} ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${total}`;

    setResult(text);
    addHistory(text);
  };

  const rollAdvantage = () => {
    const a = rollDie(20);
    const b = rollDie(20);
    const chosen = Math.max(a, b);
    const total = chosen + modifier;

    const text = `Advantage: ${a}, ${b} → ${chosen}${
      modifier ? ` ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${total}` : ""
    }`;

    setResult(text);
    addHistory(text);
  };

  const rollDisadvantage = () => {
    const a = rollDie(20);
    const b = rollDie(20);
    const chosen = Math.min(a, b);
    const total = chosen + modifier;

    const text = `Disadvantage: ${a}, ${b} → ${chosen}${
      modifier ? ` ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${total}` : ""
    }`;

    setResult(text);
    addHistory(text);
  };

  const rollMultiple = (count: number, sides: number) => {
    const rolls = Array.from({ length: count }, () => rollDie(sides));
    const subtotal = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = subtotal + modifier;

    const text = `${count}d${sides}: [${rolls.join(", ")}] = ${subtotal}${
      modifier ? ` ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${total}` : ""
    }`;

    setResult(text);
    addHistory(text);
  };

  return (
    <div>
      <h2>⚔️ Live Session Dice</h2>
      <p>Active world: {worldId}</p>

      <div style={{ marginTop: "20px" }}>
        <label>
          Modifier:{" "}
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(Number(e.target.value))}
            style={{
              width: "90px",
              padding: "8px",
              borderRadius: "8px",
            }}
          />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        {dice.map((sides) => (
          <button
            key={sides}
            className="btn"
            onClick={() => normalRoll(sides)}
            style={{ padding: "16px" }}
          >
            d{sides}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        <button className="btn" onClick={rollAdvantage}>
          🎯 d20 Advantage
        </button>

        <button className="btn" onClick={rollDisadvantage}>
          ⚠️ d20 Disadvantage
        </button>

        <button className="btn" onClick={() => rollMultiple(2, 6)}>
          2d6
        </button>

        <button className="btn" onClick={() => rollMultiple(2, 8)}>
          2d8
        </button>

        <button className="btn" onClick={() => rollMultiple(3, 6)}>
          3d6
        </button>

        <button className="btn" onClick={() => rollMultiple(4, 6)}>
          4d6
        </button>
      </div>

      <div
        style={{
          marginTop: "24px",
          padding: "22px",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          fontSize: "22px",
          fontWeight: "bold",
        }}
      >
        🎲 {result}
      </div>

      <div style={{ marginTop: "24px" }}>
        <h3>Roll History</h3>

        {history.length === 0 ? (
          <p>No rolls yet.</p>
        ) : (
          history.map((item, index) => (
            <div
              key={index}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

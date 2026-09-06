import { useState } from "react";

type Die = {
  label: string;
  sides: number;
  purpose: string;
};

const dice: Die[] = [
  { label: "d4", sides: 4, purpose: "Direction" },
  { label: "d6", sides: 6, purpose: "Character" },
  { label: "d8", sides: 8, purpose: "Location" },
  { label: "d10", sides: 10, purpose: "Encounter" },
  { label: "d12", sides: 12, purpose: "Creature" },
  { label: "d20", sides: 20, purpose: "Fate" },
  { label: "d100", sides: 100, purpose: "Chaos" },
];

const promptTables = {
  Direction: [
    "Push forward",
    "Retreat or regroup",
    "Take the risky path",
    "Seek another solution",
  ],
  Character: [
    "A nervous scholar",
    "A charming thief",
    "A battle-scarred veteran",
    "A mysterious child",
    "A disgraced noble",
    "A traveling healer",
  ],
  Location: [
    "A ruined tower",
    "A flooded cavern",
    "A forgotten shrine",
    "A crowded market",
    "A haunted forest",
    "A mountain fortress",
    "An abandoned village",
    "A hidden underground city",
  ],
  Encounter: [
    "A desperate plea for help",
    "An ambush",
    "A strange discovery",
    "A dangerous bargain",
    "A chase",
    "A sudden betrayal",
    "A mysterious traveler",
    "A magical disturbance",
    "A trapped survivor",
    "An unexpected celebration",
  ],
  Creature: [
    "A wounded beast",
    "A territorial monster",
    "A clever predator",
    "An ancient guardian",
    "A cursed creature",
    "A swarm",
    "A shapeshifter",
    "A friendly monster",
    "A creature protecting its young",
    "A summoned horror",
    "A legendary beast",
    "An intelligent enemy",
  ],
  Fate: [
    "A hidden truth is revealed",
    "An ally arrives",
    "A trusted person betrays someone",
    "A dangerous opportunity appears",
    "Something valuable is lost",
    "A secret door is discovered",
    "An enemy gains the advantage",
    "A prophecy begins to come true",
    "The party is blamed for something",
    "A powerful artifact appears",
    "Someone disappears",
    "An old enemy returns",
    "A peaceful situation turns violent",
    "A disaster changes the region",
    "A rival offers an alliance",
    "Someone important asks for help",
    "A forbidden place becomes accessible",
    "A major misunderstanding occurs",
    "A long-forgotten threat awakens",
    "The heroes get exactly what they wanted—with a cost",
  ],
  Chaos: Array.from({ length: 100 }, (_, i) => `Chaos result ${i + 1}`),
};

function roll(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

export function InspirationPage() {
  const [result, setResult] = useState("Choose a die or let StoryForge surprise you.");

  const rollDie = (die: Die) => {
    const rolled = roll(die.sides);
    const table = promptTables[die.purpose as keyof typeof promptTables];
    const prompt = table[(rolled - 1) % table.length];

    setResult(`${die.label} — ${die.purpose}\nRoll: ${rolled}\n${prompt}`);
  };

  const surpriseMe = () => {
    const character = promptTables.Character[roll(6) - 1];
    const location = promptTables.Location[roll(8) - 1];
    const encounter = promptTables.Encounter[roll(10) - 1];
    const fate = promptTables.Fate[roll(20) - 1];

    setResult(
      `🎲 SURPRISE ME\n\n${character} is found at ${location.toLowerCase()}.\n\nSomething happens: ${encounter.toLowerCase()}.\n\nTwist: ${fate}.`
    );
  };

  return (
    <div>
      <h2>🎲 Inspiration Dice</h2>
      <p>
        Use these dice when creating characters, locations, monsters, encounters,
        and story ideas.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginTop: "24px",
        }}
      >
        {dice.map((die) => (
          <button
            key={die.label}
            className="btn"
            onClick={() => rollDie(die)}
            style={{ padding: "18px" }}
          >
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{die.label}</div>
            <div>{die.purpose}</div>
          </button>
        ))}
      </div>

      <button
        className="btn"
        onClick={surpriseMe}
        style={{
          marginTop: "24px",
          width: "100%",
          padding: "18px",
          fontSize: "20px",
        }}
      >
        ✨ Surprise Me
      </button>

      <div
        style={{
          marginTop: "24px",
          padding: "20px",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          whiteSpace: "pre-wrap",
        }}
      >
        {result}
      </div>
    </div>
  );
}

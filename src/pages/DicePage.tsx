import { DiceTray } from "../components/DiceTray";

export function DicePage({ worldId }: { worldId?: string }) {
  return <div>
    <h2>🎲 Dice Roller</h2>
    <p>Roll freely, or connect a roll to a saved sheet and an action.</p>
    <DiceTray worldId={worldId} />
  </div>;
}

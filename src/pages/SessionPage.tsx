import { useRef, useState } from "react";
import { DiceTray } from "../components/DiceTray";

export function SessionPage({ worldId }: { worldId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return <div>
    <h2>⚔️ Live Session Dice</h2>
    <p>Use the shared tray for attacks, damage, saving throws, and free rolls.</p>
    <button className="btn btn-primary" type="button" onClick={() => {
      setOpen(true); dialog.current?.showModal();
    }}>🎲 Open Dice Tray</button>
    <dialog ref={dialog} className="sf-dice-dialog" aria-labelledby="sf-session-dice-title" onClose={() => setOpen(false)}>
      <div className="sf-dice-dialog-header">
        <h3 id="sf-session-dice-title">Dice Tray</h3>
        <button className="btn btn-secondary" type="button" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      {open && <DiceTray worldId={worldId} />}
    </dialog>
  </div>;
}

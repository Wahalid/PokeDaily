import { Button } from "./Button";

/** "Ayuda · Estadísticas" row at the top of every Spanish game. */
export function GameToolbar({ onHelp, onStats }: { onHelp: () => void; onStats: () => void }) {
  return (
    <div className="flex justify-center gap-2">
      <Button variant="ghost" className="px-3" onClick={onHelp}>
        <span aria-hidden>?</span> Ayuda
      </Button>
      <Button variant="ghost" className="px-3" onClick={onStats}>
        <span aria-hidden>▤</span> Estadísticas
      </Button>
    </div>
  );
}

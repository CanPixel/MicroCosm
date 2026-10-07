import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/game/engine';
import { Architect } from './Architect';
import { useStore } from './hooks';
import { Hud } from './Hud';
import { DivisionScreen, EndScreen, PauseMenu, TitleScreen, Toasts } from './Screens';

export function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const e = new GameEngine(host);
    setEngine(e);
    if (import.meta.env.DEV) (window as unknown as { __mc?: GameEngine }).__mc = e;
    return () => e.dispose();
  }, []);

  return (
    <div className="mc-root">
      <div ref={hostRef} className="mc-stage" />
      {engine && <Game engine={engine} />}
    </div>
  );
}

function Game({ engine }: { engine: GameEngine }) {
  const hud = useStore(engine.hud);
  const toasts = useStore(engine.toasts);
  const screen = hud.screen;
  return (
    <>
      {screen === 'title' && <TitleScreen engine={engine} hud={hud} />}
      {screen !== 'title' && <Hud engine={engine} hud={hud} />}
      {screen === 'playing' && hud.architect && <Architect engine={engine} hud={hud} />}
      {screen !== 'title' && <Toasts toasts={toasts} engine={engine} docked={hud.architect} />}
      {screen === 'paused' && <PauseMenu engine={engine} hud={hud} />}
      {screen === 'division' && <DivisionScreen engine={engine} hud={hud} />}
      {screen === 'dead' && <EndScreen engine={engine} hud={hud} victory={false} />}
      {screen === 'victory' && <EndScreen engine={engine} hud={hud} victory />}
    </>
  );
}

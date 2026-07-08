"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BioCell, BioCellHandle } from "./BioCell";
import { GameUI } from "./GameUI";
import { GameOverDialog } from "./GameOverDialog";
import { Sugar } from "./Sugar";
import { ShaderBackground } from "./ShaderBackground";
import { Bokeh } from "./Bokeh";
import { GameDefs } from "./GameDefs";
import { Antiviral } from "./Antiviral";
import { OrganismLayer } from "./OrganismLayer";
import { THEME_CALM, THEME_VIBRANT } from "@/lib/theme";
import { createSimulation, Simulation } from "@/lib/game/sim";
import {
  INITIAL_CELL_SIZE,
  MAX_THEME_SIZE,
  RENDER_PADDING,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "@/lib/game/constants";
import { OrganelleType } from "@/lib/game/types";

const HUD_SYNC_INTERVAL = 0.1; // seconds between React HUD updates

type GameContainerProps = {
  onGameOver: () => void;
};

type HudState = {
  size: number;
  score: number;
  energy: number;
  starving: boolean;
  infected: boolean;
  infectionProgress: number;
  dying: boolean;
  collectedOrganelles: Set<string>;
};

const lerpHSL = (
  [h1, s1, l1]: [number, number, number],
  [h2, s2, l2]: [number, number, number],
  t: number
): [number, number, number] => [h1 + (h2 - h1) * t, s1 + (s2 - s1) * t, l1 + (l2 - l1) * t];

function applyTheme(cellSize: number) {
  const progress = Math.min(
    Math.max((cellSize - INITIAL_CELL_SIZE) / (MAX_THEME_SIZE - INITIAL_CELL_SIZE), 0),
    1
  );
  const bg = lerpHSL(THEME_CALM.background, THEME_VIBRANT.background, progress);
  const primary = lerpHSL(THEME_CALM.primary, THEME_VIBRANT.primary, progress);
  const accent = lerpHSL(THEME_CALM.accent, THEME_VIBRANT.accent, progress);
  const root = document.documentElement;
  root.style.setProperty("--background", `${bg[0]} ${bg[1]}% ${bg[2]}%`);
  root.style.setProperty("--primary", `${primary[0]} ${primary[1]}% ${primary[2]}%`);
  root.style.setProperty("--accent", `${accent[0]} ${accent[1]}% ${accent[2]}%`);
}

export function GameContainer({ onGameOver }: GameContainerProps) {
  // The simulation lives outside React and is created on the client only,
  // so SSR markup stays deterministic.
  const simRef = useRef<Simulation | null>(null);
  const [ready, setReady] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showNames, setShowNames] = useState(false);

  // Membership versions: bumping these re-renders the corresponding lists.
  const [, setOrganismsVersion] = useState(0);
  const [, setSugarsVersion] = useState(0);
  const [, setAntiviralsVersion] = useState(0);

  const [hud, setHud] = useState<HudState>({
    size: INITIAL_CELL_SIZE,
    score: INITIAL_CELL_SIZE,
    energy: 100,
    starving: false,
    infected: false,
    infectionProgress: 0,
    dying: false,
    collectedOrganelles: new Set(),
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cellWrapperRef = useRef<HTMLDivElement>(null);
  const cellApiRef = useRef<BioCellHandle>(null);
  const organismElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const keysRef = useRef<Record<string, boolean>>({});
  const pointerRef = useRef({ down: false, x: 0, y: 0 });
  const viewRef = useRef({ width: 1, height: 1 });

  const registerOrganismEl = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) organismElsRef.current.set(id, el);
    else organismElsRef.current.delete(id);
  }, []);

  // --- Input listeners ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key.startsWith("arrow")) event.preventDefault();
      keysRef.current[key] = true;
      if (key === "e") setShowNames(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = false;
      if (key === "e") setShowNames(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      pointerRef.current = { down: true, x: event.clientX, y: event.clientY };
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (pointerRef.current.down) {
        pointerRef.current.x = event.clientX;
        pointerRef.current.y = event.clientY;
      }
    };
    const handlePointerUp = () => {
      pointerRef.current.down = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    const container = containerRef.current;
    container?.addEventListener("pointerdown", handlePointerDown);
    container?.addEventListener("pointermove", handlePointerMove);
    container?.addEventListener("pointerup", handlePointerUp);
    container?.addEventListener("pointerleave", handlePointerUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      container?.removeEventListener("pointerdown", handlePointerDown);
      container?.removeEventListener("pointermove", handlePointerMove);
      container?.removeEventListener("pointerup", handlePointerUp);
      container?.removeEventListener("pointerleave", handlePointerUp);
    };
  }, []);

  // --- Track viewport size ---
  useEffect(() => {
    const measure = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) viewRef.current = { width: rect.width, height: rect.height };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // --- Create simulation (client only) ---
  useEffect(() => {
    if (simRef.current) return;
    const sim = createSimulation();
    sim.initialSpawns(viewRef.current);
    simRef.current = sim;
    setReady(true);
  }, []);

  // --- Main game loop ---
  useEffect(() => {
    if (!ready || isGameOver) return;
    const sim = simRef.current;
    if (!sim) return;

    let frameId: number;
    let lastTime = 0;
    let hudTimer = 0;

    const readInput = () => {
      const view = viewRef.current;
      if (pointerRef.current.down) {
        const dx = pointerRef.current.x - view.width / 2;
        const dy = pointerRef.current.y - view.height / 2;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) return { moveX: dx / dist, moveY: dy / dist };
        return { moveX: 0, moveY: 0 };
      }
      const keys = keysRef.current;
      let moveX = 0;
      let moveY = 0;
      if (keys["w"] || keys["arrowup"]) moveY -= 1;
      if (keys["s"] || keys["arrowdown"]) moveY += 1;
      if (keys["a"] || keys["arrowleft"]) moveX -= 1;
      if (keys["d"] || keys["arrowright"]) moveX += 1;
      if (moveX !== 0 && moveY !== 0) {
        const inv = 1 / Math.SQRT2;
        moveX *= inv;
        moveY *= inv;
      }
      return { moveX, moveY };
    };

    const syncHud = () => {
      const p = sim.state.player;
      setHud((prev) => {
        const collected =
          prev.collectedOrganelles.size === sim.state.collectedOrganelles.size
            ? prev.collectedOrganelles
            : new Set(sim.state.collectedOrganelles);
        return {
          size: p.size,
          score: p.score,
          energy: p.energy,
          starving: p.starving,
          infected: p.infected,
          infectionProgress: p.infectionProgress,
          dying: p.dying,
          collectedOrganelles: collected,
        };
      });
      applyTheme(sim.state.player.size);
    };

    const tick = (timestamp: number) => {
      const dt = lastTime === 0 ? 1 / 60 : (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      const view = viewRef.current;

      const events = sim.step(dt, readInput(), view);

      for (const event of events) {
        if (event.type === "damaged") cellApiRef.current?.takeDamage();
        if (
          event.type === "infected" ||
          event.type === "cured" ||
          event.type === "organelleCollected" ||
          event.type === "died"
        ) {
          hudTimer = HUD_SYNC_INTERVAL; // force an immediate HUD sync
        }
      }

      const { player, camera } = sim.state;

      // Imperative DOM sync: camera, player, organisms.
      if (worldRef.current) {
        const camX = -camera.pos.x * camera.zoom + view.width / 2;
        const camY = -camera.pos.y * camera.zoom + view.height / 2;
        worldRef.current.style.transform = `translate(${camX}px, ${camY}px) scale(${camera.zoom})`;
      }

      if (cellWrapperRef.current) {
        cellWrapperRef.current.style.transform = `translate(${player.pos.x}px, ${player.pos.y}px)`;
        const invulnerable = sim.state.time < player.invulnerableUntil;
        cellWrapperRef.current.classList.toggle("opacity-50", invulnerable && !player.flickering);
        cellWrapperRef.current.classList.toggle("animate-flicker", player.flickering);
      }

      // BioCell's membrane stretch was tuned for px/frame velocities.
      cellApiRef.current?.updateVelocity(player.vel.x / 60, player.vel.y / 60);

      // Organisms: move + cull + organelle glow, without React re-renders.
      const renderW = view.width / camera.zoom + RENDER_PADDING * 2;
      const renderH = view.height / camera.zoom + RENDER_PADDING * 2;
      const viewLeft = camera.pos.x - renderW / 2;
      const viewRight = camera.pos.x + renderW / 2;
      const viewTop = camera.pos.y - renderH / 2;
      const viewBottom = camera.pos.y + renderH / 2;

      for (const o of sim.state.organisms) {
        const el = organismElsRef.current.get(o.id);
        if (!el) continue;
        const dim = typeof o.size === "number" ? o.size : Math.max(o.size.width, o.size.height);
        const visible =
          o.pos.x + dim > viewLeft &&
          o.pos.x - dim < viewRight &&
          o.pos.y + dim > viewTop &&
          o.pos.y - dim < viewBottom;
        el.style.display = visible ? "" : "none";
        if (!visible) continue;
        const rotation = o.autonomous ? o.displayRotation : 0;
        el.style.transform = `translate(${o.pos.x}px, ${o.pos.y}px) rotate(${rotation}deg)`;
        if (o.kind === "organelle") {
          el.style.filter = sim.state.eligibleOrganelles.has(o.id)
            ? "drop-shadow(0 0 8px hsl(var(--primary) / 0.7))"
            : "none";
          el.style.opacity = sim.state.eligibleOrganelles.has(o.id) ? "1" : "0.5";
        }
      }

      // React syncs: membership versions bail out when unchanged.
      setOrganismsVersion(sim.state.organismsVersion);
      setSugarsVersion(sim.state.sugarsVersion);
      setAntiviralsVersion(sim.state.antiviralsVersion);

      hudTimer += dt;
      if (hudTimer >= HUD_SYNC_INTERVAL) {
        hudTimer = 0;
        syncHud();
      }

      if (player.dead) {
        syncHud();
        setIsGameOver(true);
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [ready, isGameOver]);

  const sim = simRef.current;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-background select-none touch-none"
    >
      <GameDefs />
      {sim && <ShaderBackground camera={sim.state.camera} />}
      {sim && <Bokeh camera={sim.state.camera} />}

      <div
        ref={worldRef}
        className="absolute top-0 left-0"
        style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT, transformOrigin: "0 0" }}
      >
        {ready && sim && (
          <>
            <OrganismLayer
              organisms={sim.state.organisms}
              showNames={showNames}
              registerEl={registerOrganismEl}
            />

            <div className="absolute inset-0 z-20 pointer-events-none">
              {sim.state.sugars.map((sugar) => (
                <Sugar key={sugar.id} position={sugar} size={sugar.size} />
              ))}
              {sim.state.antivirals.map((antiviral) => (
                <Antiviral key={antiviral.id} position={antiviral} />
              ))}
            </div>

            <div ref={cellWrapperRef} className="absolute z-30 transition-opacity duration-100">
              <BioCell
                ref={cellApiRef}
                size={hud.size}
                score={hud.score}
                isDying={hud.dying}
                collectedOrganelles={hud.collectedOrganelles}
                isInfected={hud.infected}
              />
            </div>
          </>
        )}
      </div>

      <div
        className={
          "fixed inset-0 bg-black z-40 transition-opacity duration-1000 " +
          (hud.dying ? "opacity-100" : "opacity-0 pointer-events-none")
        }
      />

      <GameUI
        cellSize={hud.size}
        score={hud.score}
        energy={hud.energy}
        isStarving={hud.starving}
        collectedOrganelles={hud.collectedOrganelles as Set<OrganelleType & string>}
        isInfected={hud.infected}
        infectionProgress={hud.infectionProgress}
      />

      <GameOverDialog score={hud.score} isOpen={isGameOver} onRestart={onGameOver} />
    </div>
  );
}

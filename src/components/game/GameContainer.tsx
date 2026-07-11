"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BioCell, BioCellHandle } from "./BioCell";
import { GameUI } from "./GameUI";
import { GameOverDialog } from "./GameOverDialog";
import { Sugar } from "./Sugar";
import { ShaderBackground } from "./ShaderBackground";
import { GameDefs } from "./GameDefs";
import { Antiviral } from "./Antiviral";
import { OrganismLayer } from "./OrganismLayer";
import { THEME_CALM, THEME_VIBRANT } from "@/lib/theme";
import { createSimulation, Simulation } from "@/lib/game/sim";
import { Soundscape } from "@/lib/game/audio";
import {
  INITIAL_CELL_SIZE,
  MAX_THEME_SIZE,
  RENDER_PADDING,
  USER_ZOOM_MAX,
  USER_ZOOM_MIN,
  USER_ZOOM_STEP,
} from "@/lib/game/constants";
import { OrganelleType } from "@/lib/game/types";
import { renderDimensions } from "@/lib/game/world";

const HUD_SYNC_INTERVAL = 0.1; // seconds between React HUD updates

type GameContainerProps = {
  onGameOver: () => void;
};

type HudState = {
  size: number;
  score: number;
  energy: number;
  glucose: number;
  biomass: number;
  integrity: number;
  maxIntegrity: number;
  organelleLevels: Record<OrganelleType, number>;
  threatLevel: number;
  elapsed: number;
  kills: number;
  shielded: boolean;
  starving: boolean;
  infected: boolean;
  infectionProgress: number;
  dying: boolean;
  collectedOrganelles: Set<string>;
  zoomMultiplier: number;
  electronMix: number;
};

const lerpHSL = (
  [h1, s1, l1]: [number, number, number],
  [h2, s2, l2]: [number, number, number],
  t: number
): [number, number, number] => [h1 + (h2 - h1) * t, s1 + (s2 - s1) * t, l1 + (l2 - l1) * t];

let lastThemeStep = -1;

function applyTheme(cellSize: number) {
  const rawProgress = Math.min(
    Math.max((cellSize - INITIAL_CELL_SIZE) / (MAX_THEME_SIZE - INITIAL_CELL_SIZE), 0),
    1
  );
  const themeStep = Math.round(rawProgress * 120);
  if (themeStep === lastThemeStep) return;
  lastThemeStep = themeStep;
  const progress = themeStep / 120;
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
    glucose: 32,
    biomass: 0,
    integrity: 100,
    maxIntegrity: 100,
    organelleLevels: { mitochondrion: 0, golgi: 0, nucleus: 0 },
    threatLevel: 1,
    elapsed: 0,
    kills: 0,
    shielded: false,
    starving: false,
    infected: false,
    infectionProgress: 0,
    dying: false,
    collectedOrganelles: new Set(),
    zoomMultiplier: 1,
    electronMix: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cellWrapperRef = useRef<HTMLDivElement>(null);
  const cellApiRef = useRef<BioCellHandle>(null);
  const organismElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const keysRef = useRef<Record<string, boolean>>({});
  const pointerRef = useRef({ activeId: null as number | null, x: 0, y: 0 });
  const viewRef = useRef({ width: 1, height: 1 });
  const audioRef = useRef<Soundscape | null>(null);
  const [muted, setMuted] = useState(false);
  if (audioRef.current === null && typeof window !== "undefined") {
    audioRef.current = new Soundscape();
  }

  const registerOrganismEl = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) organismElsRef.current.set(id, el);
    else organismElsRef.current.delete(id);
  }, []);

  const applyZoom = useCallback((value: number) => {
    const sim = simRef.current;
    if (!sim) return;
    sim.setZoomMultiplier(value);
    const zoomMultiplier = sim.state.camera.zoomMultiplier;
    setHud((current) => ({
      ...current,
      zoomMultiplier,
      electronMix: Math.min(1, Math.max(0, (zoomMultiplier - 1.05) / 1.35)),
    }));
  }, []);

  const runAbility = useCallback((type: OrganelleType) => {
    const sim = simRef.current;
    audioRef.current?.unlock();
    if (!sim?.activate(type)) return;

    audioRef.current?.devour();
    const cell = cellWrapperRef.current;
    const fxClass = type === 'golgi' ? 'fx-lysosome' : type === 'mitochondrion' ? 'fx-atp-surge' : 'fx-shield';
    cell?.classList.remove(fxClass);
    void cell?.offsetWidth;
    cell?.classList.add(fxClass);
    window.setTimeout(() => cell?.classList.remove(fxClass), 900);
    const player = sim.state.player;
    setHud((current) => ({
      ...current,
      size: player.size,
      score: player.score,
      energy: player.energy,
      glucose: player.glucose,
      biomass: player.biomass,
      integrity: player.integrity,
      maxIntegrity: player.maxIntegrity,
      organelleLevels: { ...player.organelleLevels },
      kills: player.kills,
      shielded: sim.state.time < player.shieldUntil,
      infected: player.infected,
      infectionProgress: player.infectionProgress,
    }));
  }, []);

  // --- Input listeners ---
  useEffect(() => {
    const container = containerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('button,input,textarea,select,[role="slider"],[contenteditable="true"]')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === 'BracketLeft') {
        event.preventDefault();
        const sim = simRef.current;
        if (sim) applyZoom(Math.max(USER_ZOOM_MIN, sim.state.camera.zoomMultiplier - USER_ZOOM_STEP));
        return;
      }
      if (event.code === 'BracketRight') {
        event.preventDefault();
        const sim = simRef.current;
        if (sim) applyZoom(Math.min(USER_ZOOM_MAX, sim.state.camera.zoomMultiplier + USER_ZOOM_STEP));
        return;
      }
      const key = event.key.toLowerCase();
      if (key.startsWith("arrow")) event.preventDefault();
      keysRef.current[key] = true;
      if (key === "e") setShowNames(true);
      if (key === "1") runAbility('mitochondrion');
      if (key === "2") runAbility('nucleus');
      if (key === "3") runAbility('golgi');
      audioRef.current?.unlock(); // browsers require a gesture to start audio
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = false;
      if (key === "e") setShowNames(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest('[data-game-ui]')) return;
      if (!event.isPrimary || event.button !== 0 || pointerRef.current.activeId !== null) return;
      pointerRef.current = { activeId: event.pointerId, x: event.clientX, y: event.clientY };
      container?.setPointerCapture(event.pointerId);
      audioRef.current?.unlock();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (pointerRef.current.activeId === event.pointerId) {
        pointerRef.current.x = event.clientX;
        pointerRef.current.y = event.clientY;
      }
    };
    const handlePointerEnd = (event: PointerEvent) => {
      if (pointerRef.current.activeId !== event.pointerId) return;
      pointerRef.current.activeId = null;
      if (container?.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
    };
    const handleLostPointerCapture = (event: PointerEvent) => {
      if (pointerRef.current.activeId === event.pointerId) pointerRef.current.activeId = null;
    };
    const clearInput = () => {
      keysRef.current = {};
      const pointerId = pointerRef.current.activeId;
      pointerRef.current.activeId = null;
      if (pointerId !== null && container?.hasPointerCapture(pointerId)) container.releasePointerCapture(pointerId);
      setShowNames(false);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) clearInput();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    container?.addEventListener("pointerdown", handlePointerDown);
    container?.addEventListener("pointermove", handlePointerMove);
    container?.addEventListener("pointerup", handlePointerEnd);
    container?.addEventListener("pointercancel", handlePointerEnd);
    container?.addEventListener("lostpointercapture", handleLostPointerCapture);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      container?.removeEventListener("pointerdown", handlePointerDown);
      container?.removeEventListener("pointermove", handlePointerMove);
      container?.removeEventListener("pointerup", handlePointerEnd);
      container?.removeEventListener("pointercancel", handlePointerEnd);
      container?.removeEventListener("lostpointercapture", handleLostPointerCapture);
    };
  }, [applyZoom, runAbility]);

  // --- Track viewport size ---
  useEffect(() => {
    const measure = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) viewRef.current = { width: rect.width, height: rect.height };
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (containerRef.current) observer?.observe(containerRef.current);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  // --- Create simulation (client only) ---
  useEffect(() => {
    if (simRef.current) return;
    const requestedSeed = Number(new URLSearchParams(window.location.search).get('seed'));
    const sim = createSimulation(Number.isFinite(requestedSeed) && requestedSeed > 0 ? requestedSeed : undefined);
    sim.initialSpawns(viewRef.current);
    simRef.current = sim;
    setReady(true);
  }, []);

  // --- Audio: mute sync + teardown ---
  useEffect(() => {
    audioRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.dispose();
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
      if (pointerRef.current.activeId !== null) {
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
          glucose: p.glucose,
          biomass: p.biomass,
          integrity: p.integrity,
          maxIntegrity: p.maxIntegrity,
          organelleLevels: { ...p.organelleLevels },
          threatLevel: sim.state.threatLevel,
          elapsed: sim.state.time,
          kills: p.kills,
          shielded: sim.state.time < p.shieldUntil,
          starving: p.starving,
          infected: p.infected,
          infectionProgress: p.infectionProgress,
          dying: p.dying,
          collectedOrganelles: collected,
          zoomMultiplier: sim.state.camera.zoomMultiplier,
          electronMix: Math.min(1, Math.max(0, (sim.state.camera.zoomMultiplier - 1.05) / 1.35)),
        };
      });
      applyTheme(sim.state.player.size);
    };

    const tick = (timestamp: number) => {
      const dt = lastTime === 0 ? 1 / 60 : (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      const view = viewRef.current;

      const events = sim.step(dt, readInput(), view);

      const audio = audioRef.current;
      let sugarThisFrame = 0;
      let biggestSugar = 0;
      for (const event of events) {
        switch (event.type) {
          case "damaged":
            cellApiRef.current?.takeDamage();
            audio?.damageThud();
            hudTimer = HUD_SYNC_INTERVAL;
            break;
          case "sugarEaten":
            // Coalesce a cluster eaten in one frame into a single pop.
            sugarThisFrame++;
            biggestSugar = Math.max(biggestSugar, event.size);
            break;
          case "devoured":
            audio?.devour();
            break;
          case "organelleCollected":
            audio?.collectChime();
            hudTimer = HUD_SYNC_INTERVAL;
            break;
          case "infected":
            audio?.infectionStart();
            hudTimer = HUD_SYNC_INTERVAL;
            break;
          case "cured":
            audio?.cure();
            hudTimer = HUD_SYNC_INTERVAL;
            break;
          case "died":
            audio?.death();
            hudTimer = HUD_SYNC_INTERVAL;
            break;
          case "wave":
            audio?.infectionStart();
            hudTimer = HUD_SYNC_INTERVAL;
            break;
          case "ability":
          case "upgrade":
            break;
        }
      }
      if (sugarThisFrame > 0) audio?.absorptionPop(biggestSugar / 8);

      const { player, camera } = sim.state;
      const electronMix = Math.min(1, Math.max(0, (camera.zoomMultiplier - 1.05) / 1.35));

      // Imperative DOM sync: camera, player, organisms.
      if (worldRef.current) {
        const camX = -camera.pos.x * camera.zoom + view.width / 2;
        const camY = -camera.pos.y * camera.zoom + view.height / 2;
        worldRef.current.style.transform = `translate(${camX}px, ${camY}px) scale(${camera.zoom})`;
      }

      if (cellWrapperRef.current) {
        cellWrapperRef.current.style.transform = `translate(${player.pos.x}px, ${player.pos.y}px)`;
        const invulnerable = sim.state.time < player.invulnerableUntil;
        cellWrapperRef.current.classList.toggle("cell-invulnerable", invulnerable && !player.flickering);
        cellWrapperRef.current.classList.toggle("cell-damage-flicker", player.flickering);
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
        const bounds = renderDimensions(o);
        const dim = Math.max(bounds.width, bounds.height);
        const visible =
          o.pos.x + dim > viewLeft &&
          o.pos.x - dim < viewRight &&
          o.pos.y + dim > viewTop &&
          o.pos.y - dim < viewBottom;
        el.style.display = visible ? "" : "none";
        if (!visible) continue;
        const rotation = o.autonomous ? o.displayRotation : 0;
        el.style.transform = `translate(${o.pos.x - bounds.width / 2}px, ${o.pos.y - bounds.height / 2}px) rotate(${rotation}deg)`;
        const baseOpacity = o.kind === "organelle"
          ? (sim.state.eligibleOrganelles.has(o.id) ? 1 : 0.5)
          : o.render.opacity;
        el.style.opacity = `${baseOpacity * (1 - electronMix * 0.62)}`;
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
      className="relative h-[100dvh] w-full overflow-hidden bg-background select-none touch-none"
    >
      <GameDefs />
      {sim && <ShaderBackground camera={sim.state.camera} />}
      <div className="micrograph-overlay pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />

      <div
        ref={worldRef}
        className="absolute left-0 top-0 h-full w-full overflow-visible"
        style={{ transformOrigin: "0 0" }}
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
                shielded={hud.shielded}
                electronMix={hud.electronMix}
              />
            </div>
          </>
        )}
      </div>

      <div
        className="electron-micrograph-overlay pointer-events-none absolute inset-0 z-[35]"
        style={{ opacity: hud.electronMix * 0.13 }}
        aria-hidden="true"
      />

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
        glucose={hud.glucose}
        biomass={hud.biomass}
        integrity={hud.integrity}
        maxIntegrity={hud.maxIntegrity}
        organelleLevels={hud.organelleLevels}
        threatLevel={hud.threatLevel}
        elapsed={hud.elapsed}
        kills={hud.kills}
        shielded={hud.shielded}
        muted={muted}
        zoomMultiplier={hud.zoomMultiplier}
        electronMix={hud.electronMix}
        onZoomChange={applyZoom}
        onToggleMute={() => {
          audioRef.current?.unlock();
          setMuted((m) => !m);
        }}
        getUpgradeCost={(type) => sim?.upgradeCosts(type) ?? { glucose: 0, biomass: 0 }}
        getAbilityState={(type) => sim?.abilityState(type) ?? { cost: 0, cooldown: 0, active: false }}
        onUpgrade={(type) => {
          if (sim?.upgrade(type)) {
            audioRef.current?.collectChime();
            const player = sim.state.player;
            setHud((current) => ({
              ...current,
              glucose: player.glucose,
              biomass: player.biomass,
              integrity: player.integrity,
              maxIntegrity: player.maxIntegrity,
              organelleLevels: { ...player.organelleLevels },
            }));
          }
        }}
        onAbility={runAbility}
      />

      <GameOverDialog score={hud.score} isOpen={isGameOver} onRestart={onGameOver} />
    </div>
  );
}

# MicroCosm

**MicroCosm** is a real-time cellular survival strategy game. Swim through a procedural microscopic ecosystem while managing glucose, ATP, biomass, membrane integrity, organelle upgrades, and tactical abilities.

## About The Game

You are a single biological cell adrift in a vast, primordial soup. Your only goals are to survive and to thrive. Navigate a dynamic, microscopic world teeming with energy, consume what you can to grow larger, and evolve into a more complex organism by collecting organelles. The ecosystem is alive with other organisms, some harmless and some hostile, and constantly shifting around you. Adapt or be absorbed.

The world streams deterministic procedural chunks without world borders. Its illustrated cellular ecology transitions into a granular monochrome microscopy view as magnification increases.

## How to Play

-   **Movement:** Use the **W, A, S, D** or **Arrow Keys** to move your cell through the environment. You can also click or tap to move in a specific direction.
-   **Microscope:** Use the bottom-right slider or the **[** and **]** keys to move between a wide ecosystem view and close electron-micrograph inspection.
-   **Growth:** Consume the small, white sugar crystals scattered throughout the world to increase your cell's size and score.
-   **Metabolism:** Sugar replenishes glucose. Mitochondria continuously convert glucose into ATP, which powers movement and active abilities.
-   **Evolution:** Collect Mitochondria, a Nucleus, and a Golgi Apparatus to unlock ATP Surge, Membrane Shield, and Lysosome Burst. Spend glucose and biomass to upgrade each system.
-   **Survival:** Avoid hostile organisms. Some are too large to eat, while others are inherently dangerous. Colliding with them will drain your energy and shrink your cell.
-   **Genome hijack:** An upgraded Nucleus unlocks RNA interference, while an upgraded Golgi unlocks an autophagy purge. Either can reduce or clear an active giant-virus infection.

## Tech Stack

This project demonstrates building an interactive experience using modern web technologies:

-   **Runtime:** [Vite](https://vite.dev/) + React, managed with [Bun](https://bun.sh/)
-   **Native shell:** [Tauri 2](https://tauri.app/) for desktop builds and the Android path
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Deployment:** Static client build with no Firebase or server dependency

## Running the Project

To run the development server:

```bash
bun install
bun run dev
```

Open the Vite URL shown in the terminal. The same responsive build is playable in Android browsers.

To run the native desktop window:

```bash
bun tauri dev
```

To verify the simulation and production build:

```bash
bun test
bun run build
```
```

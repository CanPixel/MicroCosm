# MicroCosm

**MicroCosm** is a real-time cellular survival strategy game. Swim through a procedural microscopic ecosystem while managing glucose, ATP, biomass, membrane integrity, organelle upgrades, and tactical abilities.

## About The Game

You are a single biological cell adrift in a vast, primordial soup. A complete run progresses through five phases: ignite metabolism, assemble internal systems, stabilize the cell plan, build replication reserves, and complete controlled cytokinesis. The ecosystem remains active while you redesign the cell, so the external survival loop and internal strategy loop continuously compete for attention and resources.

The world streams deterministic procedural chunks without world borders. Its illustrated cellular ecology transitions into a granular monochrome microscopy view as magnification increases.

## How to Play

-   **Movement:** Use the **W, A, S, D** or **Arrow Keys** to move your cell through the environment. You can also click or tap to move in a specific direction.
-   **Microscope:** Use the bottom-right slider or the **[** and **]** keys to move between a wide ecosystem view and close electron-micrograph inspection.
-   **Growth:** Consume the small, white sugar crystals scattered throughout the world to increase your cell's size and score.
-   **Metabolism:** Sugar replenishes glucose. Mitochondria continuously convert glucose into ATP, which powers movement and active abilities.
-   **Cell Architect:** Increase microscope zoom into ultrastructure, press **Tab**, or select the current objective to phase the internal-cell plan directly over the living specimen. Zoom back out to return to exploration. Drag or tap organelles across nine illuminated genome, metabolic, and membrane receptors. Layout changes ATP yield, transport, viral resistance, biomass synthesis, movement, and lysosome reach.
-   **Metabolic stance:** Switch between Forage Flux, Homeostasis, and Replication. These trade speed and uptake against repair, ATP conservation, or biomass synthesis.
-   **Evolution:** Collect Mitochondria, a Nucleus, and a Golgi Apparatus to unlock ATP Surge, Membrane Shield, and Lysosome Burst. Spending glucose and biomass grows an additional placeable organelle unit at each upgrade level.
-   **Survival:** Avoid hostile organisms. Some are too large to eat, while others are inherently dangerous. Colliding with them will drain your energy and shrink your cell.
-   **Genome hijack:** An upgraded Nucleus unlocks RNA interference, while an upgraded Golgi unlocks an autophagy purge. Either can reduce or clear an active giant-virus infection.
-   **Regulatory RNA:** Fold optional Emergency RNAi and Autophagy Reflex programs in Cell Architect. They automate threat responses but still consume ATP and respect cooldowns.
-   **Victory:** Build a coherent architecture, reach 95 μm, preserve 75% membrane integrity, and reserve enough ATP, glucose, and biomass to begin cytokinesis. Division takes place in real time and a viral infection aborts it.

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

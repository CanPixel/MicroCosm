# MicroCosm (V1)

Welcome to **MicroCosm**, an interactive cellular ecosystem simulation built with Next.js and prototyped in Firebase Studio. Dive into a mesmerizing, microscopic world and guide your cell from a simple organism to a complex life form.

## About The Game

You are a single biological cell adrift in a vast, primordial soup. Your only goals are to survive and to thrive. Navigate a dynamic, microscopic world teeming with energy, consume what you can to grow larger, and evolve into a more complex organism by collecting organelles. The ecosystem is alive with other organisms—some harmless, some hostile—and constantly shifting around you. Adapt or be absorbed.

The world is rendered with a beautiful, animated Voronoi pattern that shifts with a parallax effect as you move, creating a deep, immersive experience.

## How to Play

-   **Movement:** Use the **W, A, S, D** or **Arrow Keys** to move your cell through the environment. You can also click or tap to move in a specific direction.
-   **Growth:** Consume the small, white sugar crystals scattered throughout the world to increase your cell's size and score.
-   **Energy:** Moving consumes your vital energy. Consuming sugar is the only way to replenish it. If your energy drains completely, your cell will begin to starve and shrink. If your size reaches zero, the simulation ends.
-   **Evolution:** Find and collect organelles (Mitochondria, Golgi Apparatus, Nucleus) to gain special abilities and evolve your cell. You must be larger than an organelle to absorb it.
-   **Survival:** Avoid hostile organisms. Some are too large to eat, while others are inherently dangerous. Colliding with them will drain your energy and shrink your cell.

## Tech Stack

This project demonstrates building an interactive experience using modern web technologies:

-   **Framework:** [Next.js](https://nextjs.org/) (with App Router)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Generative AI:** [Genkit](https://firebase.google.com/docs/genkit)
-   **Development Environment:** Prototyped in [Firebase Studio](https://firebase.google.com/docs/studio).

## Running the Project

To run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result. You can start editing the page by modifying `src/app/page.tsx`.
#
```
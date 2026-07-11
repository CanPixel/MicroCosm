import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameContainer } from '@/components/game/GameContainer';
import { Toaster } from '@/components/ui/toaster';
import '@/app/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <main className="relative min-h-[100dvh] w-full text-foreground">
      <GameContainer onGameOver={() => window.location.reload()} />
      <Toaster />
    </main>
  </React.StrictMode>,
);

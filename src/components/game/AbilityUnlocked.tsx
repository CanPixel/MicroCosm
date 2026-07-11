
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AbilityUnlockedProps = {
  abilityName: string;
};

export function AbilityUnlocked({ abilityName }: AbilityUnlockedProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mount animation
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 3500); // Start fading out before it's removed from the DOM

    return () => clearTimeout(timer);
  }, [abilityName]);

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out transform",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}
    >
      <div className="relative font-zcool-kuaile text-lg text-primary animate-pulse-glow-text">
        <span
          className="font-bold"
          style={{
            textShadow: "0 0 12px hsl(var(--primary) / .7)",
          }}
        >
          {abilityName} Unlocked!
        </span>
      </div>
    </div>
  );
}

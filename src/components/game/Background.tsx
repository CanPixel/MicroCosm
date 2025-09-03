
"use client";

import { cn } from "@/lib/utils";

const layers = [
  {
    class: "bg-pan-1",
    style: {
      backgroundImage:
        "radial-gradient(circle at 10% 20%, white 1px, transparent 1.5px), radial-gradient(circle at 50% 40%, white 1px, transparent 1.5px), radial-gradient(circle at 90% 60%, white 1px, transparent 1.5px), radial-gradient(circle at 30% 80%, white 1px, transparent 1.5px), radial-gradient(circle at 70% 90%, white 0.5px, transparent 1px)",
      backgroundSize: "200px 200px",
      opacity: 0.1,
    },
  },
  {
    class: "bg-pan-2",
    style: {
      backgroundImage:
        "radial-gradient(circle at 25% 95%, white 1px, transparent 1.5px), radial-gradient(circle at 65% 5%, white 1px, transparent 1.5px), radial-gradient(circle at 5% 55%, white 0.5px, transparent 1px)",
      backgroundSize: "300px 300px",
      opacity: 0.15,
    },
  },
  {
    class: "bg-pan-3",
    style: {
      backgroundImage:
        "radial-gradient(circle at 80% 30%, white 1px, transparent 1.5px), radial-gradient(circle at 15% 70%, white 0.5px, transparent 1px), radial-gradient(circle at 55% 65%, white 1px, transparent 1.5px)",
      backgroundSize: "400px 400px",
      opacity: 0.08,
    },
  },
];

export function Background() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
      {layers.map((layer, i) => (
        <div
          key={i}
          className={cn("absolute inset-[-200px] bg-repeat", layer.class)}
          style={layer.style}
        />
      ))}
    </div>
  );
}


"use client";

import { cn } from "@/lib/utils";

type OrganismNameLabelProps = {
    name?: string;
    size: number;
    showName: boolean;
};

export function OrganismNameLabel({ name, size, showName }: OrganismNameLabelProps) {
    if (!name) return null;

    const style: React.CSSProperties = {
        top: `-${size * 0.2 + 10}px`,
        left: '50%',
        transform: 'translateX(-50%)',
    };

    return (
        <div 
            style={style}
            className={cn(
                "absolute text-center transition-opacity duration-300",
                showName ? "opacity-100" : "opacity-0"
            )}
        >
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap bg-black/30 px-2 py-1 rounded-md">
                {name}
            </span>
        </div>
    );
}

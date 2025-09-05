
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
        top: `-${size * 0.2 + 20}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        width: size * 2, // Give it ample width to prevent wrapping
    };

    return (
        <div 
            style={style}
            className={cn(
                "absolute text-center transition-opacity duration-300 pointer-events-none",
                showName ? "opacity-100" : "opacity-0"
            )}
        >
            <span className="text-[10px] font-zcool-kuaile tracking-wider text-muted-foreground whitespace-nowrap bg-black/20 px-2 py-1 rounded-md">
                {name}
            </span>
        </div>
    );
}

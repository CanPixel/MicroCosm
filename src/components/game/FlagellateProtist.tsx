
"use client";
import React from 'react';
import { FlagellateProtistBody } from './FlagellateProtistBody';
import { Flagella } from './Flagella';

type FlagellateProtistProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  animationDirection?: 'normal' | 'reverse';
  rotation?: number;
  isMoving?: boolean;
};

export function FlagellateProtist({ 
    position, 
    size, 
    duration, 
    delay, 
    opacity, 
    initialRotation = 0, 
    animationDirection = 'normal', 
    rotation = initialRotation, 
    isMoving = false 
}: FlagellateProtistProps) {

    const style: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
        transform: `rotate(${rotation + 90}deg)`,
    };

    return (
        <div style={style} className="absolute">
            <FlagellateProtistBody 
                size={size}
                duration={duration}
                delay={delay}
                animationDirection={animationDirection}
            />
            <Flagella
                size={size}
                duration={duration}
                delay={delay}
                isMoving={isMoving}
            />
        </div>
    );
}

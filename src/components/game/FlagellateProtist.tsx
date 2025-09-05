
"use client";
import React from 'react';
import { FlagellateProtistBody } from './FlagellateProtistBody';
import { Flagella } from './Flagella';
import { OrganismNameLabel } from './OrganismNameLabel';

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
  showName?: boolean;
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
    isMoving = false,
    showName = false
}: FlagellateProtistProps) {

    const containerStyle: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
    };
    
    const bodyStyle: React.CSSProperties = {
        transform: `rotate(${rotation + 90}deg)`,
        width: '100%',
        height: '100%',
    };

    return (
        <div style={containerStyle} className="absolute">
            <OrganismNameLabel name={FlagellateProtist.displayName} size={size} showName={showName} />
            <div style={bodyStyle}>
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
        </div>
    );
}

FlagellateProtist.displayName = 'Flagellate Protist';

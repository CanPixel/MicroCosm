"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;

type AutonomousProps = {
  children: React.ReactNode;
  initialPosition: { x: number; y: number };
};

export function Autonomous({ children, initialPosition }: AutonomousProps) {
  const [position, setPosition] = useState(initialPosition);
  const [rotation, setRotation] = useState(0);
  const velocityRef = useRef({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 });
  const speed = useMemo(() => Math.random() * 0.5 + 0.25, []); // Random speed for variety

  useEffect(() => {
    let animationFrameId: number;

    const move = () => {
      setPosition(prevPosition => {
        let newX = prevPosition.x + velocityRef.current.x * speed;
        let newY = prevPosition.y + velocityRef.current.y * speed;

        // Bounce off world boundaries
        if (newX <= 0 || newX >= WORLD_WIDTH) {
          velocityRef.current.x *= -1;
        }
        if (newY <= 0 || newY >= WORLD_HEIGHT) {
          velocityRef.current.y *= -1;
        }
        
        newX = Math.max(0, Math.min(WORLD_WIDTH, newX));
        newY = Math.max(0, Math.min(WORLD_HEIGHT, newY));

        // Occasionally change direction randomly
        if (Math.random() < 0.005) {
            const angleChange = (Math.random() - 0.5) * (Math.PI / 2);
            const { x, y } = velocityRef.current;
            const newAngle = Math.atan2(y, x) + angleChange;
            velocityRef.current.x = Math.cos(newAngle);
            velocityRef.current.y = Math.sin(newAngle);
        }
        
        // Update rotation
        const angle = Math.atan2(velocityRef.current.y, velocityRef.current.x) * (180 / Math.PI);
        setRotation(angle);

        return { x: newX, y: newY };
      });

      animationFrameId = requestAnimationFrame(move);
    };

    animationFrameId = requestAnimationFrame(move);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [speed]);
  
  // We need to clone the child to inject the new position and rotation props
  const childWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, { position, rotation });
    }
    return child;
  });

  return <>{childWithProps}</>;
}

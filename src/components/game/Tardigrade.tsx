
"use client";
import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type TardigradeProps = {
  position: { x: number; y: number };
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  initialRotation?: number;
  animationDirection?: 'normal' | 'reverse';
  rotation?: number;
  showName?: boolean;
};

// A simplified tardigrade
export function Tardigrade({ position, size, duration, delay, opacity, initialRotation = 0, animationDirection = 'normal', rotation = initialRotation, showName = false }: TardigradeProps) {
    const animationName = animationDirection === 'reverse' ? 'spin-reverse' : 'spin';

    const animationStyle: React.CSSProperties = {
        animation: `sway ${duration * 1.5}s ease-in-out infinite, ${animationName} ${duration * 3}s linear infinite`,
        animationDelay: `${delay}s, ${delay}s`,
        transformOrigin: 'center center',
    };

    const containerStyle: React.CSSProperties = {
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: opacity,
    };

    const bodyStyle: React.CSSProperties = {
        transform: `rotate(${rotation}deg)`,
        width: '100%',
        height: '100%',
    };

    return (
        <div style={containerStyle} className="absolute">
            <OrganismNameLabel name={Tardigrade.displayName} size={size} showName={showName} />
            <div style={bodyStyle}>
                <div style={animationStyle} className="w-full h-full">
                    <svg width={size} height={size} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
                        <g transform="rotate(90 20 20)">
                          {/* Plump overlapping segments and four paired clawed limbs. */}
                          {[0, 1, 2, 3].map(i => <g key={`legs-${i}`}>
                            <path d={`M12 ${11+i*6}Q3 ${12+i*6} 7 ${16+i*6}M28 ${11+i*6}Q37 ${12+i*6} 33 ${16+i*6}`} fill="none" stroke="#ed938c" strokeWidth="4" strokeLinecap="round" />
                            <path d={`M7 ${15+i*6}l-3 3 1-4M33 ${15+i*6}l3 3-1-4`} fill="#e1f6e9" stroke="#e1f6e9" strokeWidth=".5" />
                          </g>)}
                          {[3, 2, 1, 0].map(i => <g key={`body-${i}`}>
                            <ellipse cx="20" cy={12+i*5.5} rx={10-i*.45} ry="7" fill={i%2 ? '#ed8e89' : '#f5a49a'} stroke="#ffe2c9" strokeWidth=".8" />
                            <path d={`M12 ${11+i*5.5}Q20 ${4+i*5.5} 28 ${11+i*5.5}`} fill="none" stroke="#ffd5b4" strokeWidth=".8" opacity=".75" />
                          </g>)}
                          <ellipse cx="20" cy="9" rx="6" ry="5" fill="#f3ad98" stroke="#ffe5ca" strokeWidth=".8" />
                          <ellipse cx="20" cy="7.5" rx="3.5" ry="2.5" fill="#5e3047" />
                          <path d="M14 8Q20 1 26 8" fill="none" stroke="#ffd9b8" strokeWidth="1" />
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
}

Tardigrade.displayName = 'Tardigrade';

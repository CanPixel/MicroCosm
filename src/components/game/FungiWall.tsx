import React from 'react';
import { OrganismNameLabel } from './OrganismNameLabel';

type Props = {
  position: { x: number; y: number };
  size: { width: number; height: number };
  opacity: number;
  showName?: boolean;
};

const septa = [17, 35, 53, 71, 88];
const nuclei = [9, 27, 45, 63, 81, 95];

export function FungiWall({ position, size, opacity, showName = false }: Props) {
  const horizontal = size.width >= size.height;
  const groupTransform = horizontal ? undefined : 'translate(40 0) rotate(90)';

  return (
    <div
      className="absolute"
      style={{ top: position.y, left: position.x, width: size.width, height: size.height, opacity }}
    >
      <OrganismNameLabel name={FungiWall.displayName} size={Math.max(size.width, size.height)} showName={showName} />
      <svg
        width="100%"
        height="100%"
        viewBox={horizontal ? '0 0 100 40' : '0 0 40 100'}
        preserveAspectRatio="none"
        aria-hidden
      >
        <g transform={groupTransform}>
          {/* A septate fungal hypha: a narrow chitin tube with cellular partitions. */}
          <path
            d="M0 15C8 12 12 15 19 13c7-2 12 2 19 0 8-2 13 2 21 0 8-2 13 2 21 0 8-2 14 0 20 2v11c-7 3-13 0-20 2-8 2-14-2-21 0-8 2-14-2-21 0-7 2-13-2-19 0-8 2-13-1-19-2Z"
            fill="hsl(73 16% 17% / .92)"
            stroke="hsl(46 25% 62% / .9)"
            strokeWidth="1.15"
          />
          <path
            d="M2 17c10-3 15 1 24-1 10-2 16 2 26 0 10-2 17 2 27 0 7-2 13-1 19 1v7c-8 2-14-1-22 1-10 2-16-2-26 0-10 2-16-2-25 0-9 2-15-1-23 0Z"
            fill="hsl(82 21% 26% / .48)"
          />

          {/* Septa divide the hypha into cells; central pores remain visible. */}
          {septa.map((x) => (
            <g key={x} stroke="hsl(45 25% 68% / .62)" fill="none" strokeWidth=".72">
              <path d={`M${x} 14.5v5.1M${x} 22.4v5.2`} />
              <circle cx={x} cy="21" r="1.25" />
            </g>
          ))}

          {/* Small nuclei and granular cytoplasm, intentionally subdued. */}
          <g fill="hsl(55 31% 66% / .5)">
            {nuclei.map((x, i) => <ellipse key={x} cx={x} cy={i % 2 ? 23.2 : 18.7} rx="1.7" ry="1.35" />)}
          </g>
          <g fill="hsl(83 24% 55% / .28)">
            <circle cx="13" cy="23" r=".65" /><circle cx="31" cy="18" r=".55" />
            <circle cx="48" cy="24" r=".7" /><circle cx="67" cy="18.5" r=".6" />
            <circle cx="84" cy="23" r=".55" />
          </g>

          {/* A single restrained branch indicates mycelial growth. */}
          <path d="M61 14c2-5 5-8 10-10" fill="none" stroke="hsl(46 25% 62% / .75)" strokeWidth="1.25" strokeLinecap="round" />
          <path d="M61 15c2-4 5-7 10-10" fill="none" stroke="hsl(77 18% 22% / .9)" strokeWidth=".65" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

FungiWall.displayName = 'Septate fungal hypha';
FungiWall.isHarmful = true;

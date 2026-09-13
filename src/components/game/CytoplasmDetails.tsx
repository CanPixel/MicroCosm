import { memo } from 'react';
import { Delaunay } from 'd3-delaunay';
import { mulberry32 } from '@/lib/game/rng';

// Shared, deterministic geometry. Computed once, then clipped by each membrane.
const random = mulberry32(1707);
const sites: [number, number][] = Array.from({ length: 110 }, () => [(random() - .5) * 120, (random() - .5) * 120]);
const voronoi = Delaunay.from(sites).voronoi([-65, -65, 65, 65]);
const tiles = sites.map((_, i) => voronoi.renderCell(i));
const inclusions = Array.from({ length: 26 }, () => ({ x: (random() - .5) * 85, y: (random() - .5) * 85, r: 1 + random() * 3.8 }));

/** Normalized intracellular structure, spanning -50..50 on each axis. */
export const CytoplasmDetails = memo(function CytoplasmDetails({ electron = 0 }: { electron?: number }) {
  return <g>
    <path d="M-28-11C-42-29-21-35-13-24S9-24 19-11 36-5 27 14 1 17-12 26-29 16-21 5-21-4-28-11Z" fill="#cff4e5" opacity=".22" />
    <g stroke={electron > .6 ? '#d6ddd9' : '#83d5d3'} strokeWidth=".85" strokeLinejoin="round" opacity={.27 + electron * .32}>
      {tiles.map((d, i) => <path key={i} d={d ?? ''} fill={i % 4 === 0 ? '#a3e6d0' : i % 3 === 0 ? '#163d51' : '#286677'} fillOpacity={i % 4 === 0 ? .3 : .45} />)}
    </g>
    {inclusions.map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx={p.r} ry={p.r * .78} transform={`rotate(${i * 37} ${p.x} ${p.y})`} fill={i % 3 === 0 ? '#e6fff1' : '#092a3a'} fillOpacity={i % 3 === 0 ? .55 : .48} stroke={i % 3 === 1 ? '#c6f9e7' : 'none'} strokeOpacity=".55" strokeWidth=".65" />)}
    <g fill="none" stroke="#a5e5d6" strokeWidth="1.1" strokeLinecap="round" opacity=".68">
      <path d="M-18-6C-28-18-10-29 1-23M-22-4C-35-21-11-35 5-27M15 9C29 16 20 30 7 28M18 6C34 14 26 34 9 33" />
    </g>
  </g>;
});

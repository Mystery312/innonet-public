import React from 'react';

/**
 * Animated constellation SVG for the auth page visual stage.
 * Ported from the design reference HeroVisuals.jsx.
 */
const HeroVisual: React.FC = () => {
  const nodes = [
    { x: 270, y: 270, r: 18, c: '#3232FF', primary: true },
    { x: 130, y: 180, r: 10, c: '#7A7AFF' },
    { x: 410, y: 160, r: 12, c: '#7C3AED' },
    { x: 420, y: 360, r: 9, c: '#06B6D4' },
    { x: 150, y: 400, r: 11, c: '#3232FF' },
    { x: 80, y: 290, r: 7, c: '#7A7AFF' },
    { x: 460, y: 260, r: 7, c: '#3232FF' },
    { x: 270, y: 100, r: 8, c: '#7C3AED' },
    { x: 280, y: 460, r: 7, c: '#3232FF' },
    { x: 200, y: 80, r: 5, c: '#7A7AFF' },
    { x: 480, y: 440, r: 5, c: '#06B6D4' },
    { x: 60, y: 130, r: 4, c: '#7A7AFF' },
    { x: 60, y: 460, r: 4, c: '#7C3AED' },
  ];
  const edges: [number, number][] = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
    [1,5],[1,7],[2,6],[2,7],[3,6],[3,10],[4,5],[4,8],
    [7,9],[1,11],[4,12],
  ];

  return (
    <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <radialGradient id="authHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3232FF" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#3232FF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={270} cy={270} r={60} fill="url(#authHalo)" />
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke="#3232FF"
          strokeOpacity={a === 0 ? 0.45 : 0.18}
          strokeWidth={a === 0 ? 1.5 : 1}
          className={i % 3 === 0 ? 'edge-trace' : ''}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i} className={i < 4 ? `float-${'abc'[i % 3]}` : ''}>
          {n.primary && <circle cx={n.x} cy={n.y} r={n.r + 14} fill="#3232FF" opacity={0.15} />}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} className="node-pulse" />
          {n.primary && <circle cx={n.x} cy={n.y} r={n.r * 0.4} fill="#fff" />}
        </g>
      ))}
    </svg>
  );
};

export default HeroVisual;

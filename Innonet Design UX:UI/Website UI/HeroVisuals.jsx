// HeroVisuals.jsx — 4 abstract motion graphics for the hero stage

const HeroVisualOrbits = () => (
  <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="orbCore" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#7A7AFF" stopOpacity="1"/>
        <stop offset="60%" stopColor="#3232FF" stopOpacity="1"/>
        <stop offset="100%" stopColor="#3232FF" stopOpacity="0"/>
      </radialGradient>
      <filter id="orbGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6"/>
      </filter>
    </defs>
    {/* orbit rings */}
    <g transform="translate(270 270)">
      <circle r="80" fill="none" stroke="#3232FF" strokeOpacity="0.15" strokeWidth="1"/>
      <circle r="140" fill="none" stroke="#3232FF" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="2 4"/>
      <circle r="200" fill="none" stroke="#3232FF" strokeOpacity="0.08" strokeWidth="1"/>
      <circle r="245" fill="none" stroke="#3232FF" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="1 6"/>
    </g>
    {/* core */}
    <g transform="translate(270 270)">
      <circle r="55" fill="url(#orbCore)" opacity="0.4" filter="url(#orbGlow)"/>
      <circle r="14" fill="#3232FF"/>
      <circle r="6" fill="#fff"/>
    </g>
    {/* orbit 1 */}
    <g transform="translate(270 270)" className="spin-slow">
      <g transform="translate(80 0)">
        <circle r="6" fill="#3232FF"/>
        <circle r="3" fill="#fff"/>
      </g>
      <g transform="translate(-56 56)">
        <circle r="4" fill="#7A7AFF"/>
      </g>
    </g>
    {/* orbit 2 */}
    <g transform="translate(270 270)" className="spin-med">
      <g transform="translate(-140 0)">
        <circle r="8" fill="#7C3AED"/>
        <circle r="4" fill="#fff"/>
      </g>
      <g transform="translate(99 99)">
        <circle r="5" fill="#3232FF"/>
      </g>
      <g transform="translate(99 -99)">
        <circle r="3" fill="#06B6D4"/>
      </g>
    </g>
    {/* orbit 3 */}
    <g transform="translate(270 270)" className="spin-fast">
      <g transform="translate(200 0)">
        <circle r="5" fill="#3232FF"/>
      </g>
      <g transform="translate(-141 141)">
        <circle r="3" fill="#7A7AFF"/>
      </g>
      <g transform="translate(0 -200)">
        <circle r="4" fill="#06B6D4"/>
      </g>
    </g>
    {/* outermost */}
    <g transform="translate(270 270)" className="spin-slow">
      <g transform="translate(245 0)">
        <circle r="3" fill="#7A7AFF" opacity="0.8"/>
      </g>
      <g transform="translate(-173 173)">
        <circle r="2" fill="#3232FF" opacity="0.6"/>
      </g>
    </g>
  </svg>
);

const HeroVisualConstellation = () => {
  // node positions (cluster of "people" with edges)
  const nodes = [
    { x: 270, y: 270, r: 18, c: '#3232FF', label: 'you', primary: true },
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
  const edges = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
    [1,5],[1,7],[2,6],[2,7],[3,6],[3,10],[4,5],[4,8],
    [7,9],[1,11],[4,12]
  ];
  return (
    <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cstHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3232FF" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#3232FF" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="270" cy="270" r="60" fill="url(#cstHalo)"/>
      {edges.map(([a,b], i) => (
        <line key={i}
              x1={nodes[a].x} y1={nodes[a].y}
              x2={nodes[b].x} y2={nodes[b].y}
              stroke="#3232FF" strokeOpacity={a===0?0.45:0.18} strokeWidth={a===0?1.5:1}
              className={i % 3 === 0 ? "edge-trace" : ""}/>
      ))}
      {nodes.map((n, i) => (
        <g key={i} className={i < 4 ? `float-${'abc'[i%3]}` : ''}>
          {n.primary && <circle cx={n.x} cy={n.y} r={n.r + 14} fill="#3232FF" opacity="0.15"/>}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} className="node-pulse"/>
          {n.primary && <circle cx={n.x} cy={n.y} r={n.r * 0.4} fill="#fff"/>}
        </g>
      ))}
    </svg>
  );
};

const HeroVisualFlowField = () => {
  // concentric arc field, animated rotation
  const arcs = [];
  for (let i = 0; i < 10; i++) {
    const r = 40 + i * 22;
    const op = 0.8 - i * 0.07;
    arcs.push({ r, op, gap: 30 + i * 8 });
  }
  return (
    <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ffGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3232FF"/>
          <stop offset="100%" stopColor="#7C3AED"/>
        </linearGradient>
      </defs>
      <g transform="translate(270 270)">
        {arcs.map((a, i) => (
          <circle key={i} r={a.r}
                  fill="none"
                  stroke="url(#ffGrad)"
                  strokeOpacity={a.op}
                  strokeWidth="1.5"
                  strokeDasharray={`${a.gap} ${a.gap * 1.5}`}
                  className={i % 2 === 0 ? "spin-slow" : "spin-med"}/>
        ))}
        {/* center */}
        <circle r="10" fill="#3232FF"/>
        <circle r="4" fill="#fff"/>
        {/* outer particles */}
        <g className="spin-fast">
          <circle cx="240" cy="0" r="3" fill="#7A7AFF"/>
          <circle cx="-240" cy="0" r="2" fill="#3232FF"/>
          <circle cx="0" cy="240" r="3" fill="#7C3AED"/>
          <circle cx="0" cy="-240" r="2" fill="#06B6D4"/>
        </g>
      </g>
    </svg>
  );
};

const HeroVisualGrid = () => {
  const gridSize = 12;
  const cellSize = 540 / gridSize;
  const lit = [
    [3,4],[4,4],[5,4],[5,5],[5,6],[6,6],[6,7],
    [3,7],[8,3],[9,3],[9,4],[2,8],[2,9],[3,9],
    [8,8],[8,9],[9,8],[9,9],[10,5],[1,5]
  ];
  return (
    <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg">
      <g className="grid-bg">
        {Array.from({length: gridSize+1}).map((_, i) => (
          <React.Fragment key={i}>
            <line x1={i*cellSize} y1={0} x2={i*cellSize} y2={540}/>
            <line x1={0} y1={i*cellSize} x2={540} y2={i*cellSize}/>
          </React.Fragment>
        ))}
      </g>
      {lit.map(([cx, cy], i) => (
        <rect key={i}
              x={cx*cellSize + 3}
              y={cy*cellSize + 3}
              width={cellSize - 6}
              height={cellSize - 6}
              fill="#3232FF"
              className="grid-cell"
              style={{animationDelay: `${(i % 6) * 0.4}s`}}/>
      ))}
      {/* center bright square */}
      <rect x={5*cellSize + 3} y={5*cellSize + 3} width={cellSize*2 - 6} height={cellSize*2 - 6}
            fill="#3232FF"/>
      <rect x={5*cellSize + 3} y={5*cellSize + 3} width={cellSize*2 - 6} height={cellSize*2 - 6}
            fill="none" stroke="#7A7AFF" strokeWidth="2"/>
      {/* corner accents */}
      <circle cx={cellSize*2} cy={cellSize*2} r="4" fill="#7C3AED"/>
      <circle cx={cellSize*10} cy={cellSize*10} r="4" fill="#06B6D4"/>
    </svg>
  );
};

window.HeroVisualOrbits = HeroVisualOrbits;
window.HeroVisualConstellation = HeroVisualConstellation;
window.HeroVisualFlowField = HeroVisualFlowField;
window.HeroVisualGrid = HeroVisualGrid;

// LiveGraph.jsx — interactive network graph for the homepage section

const LiveGraph = () => {
  const [filter, setFilter] = React.useState('all');
  const [hovered, setHovered] = React.useState(null);

  const nodes = [
    { id: 'mei', x: 50, y: 50, r: 22, label: 'Mei Chen', sub: 'Builder · Shanghai · 92% match', kind: 'builder', primary: true },
    { id: 'alex', x: 28, y: 32, r: 16, label: 'Alex Rivera', sub: 'Founder · arc', kind: 'builder' },
    { id: 'rai',  x: 72, y: 30, r: 14, label: 'Rai Patel',  sub: 'Engineer · SAS', kind: 'builder' },
    { id: 'noor', x: 78, y: 70, r: 13, label: 'Noor Ahmed', sub: 'Designer · Pudong', kind: 'builder' },
    { id: 'jun',  x: 22, y: 72, r: 12, label: 'Jun Li',     sub: 'Builder · Hangzhou', kind: 'builder' },
    { id: 'kit',  x: 14, y: 50, r: 10, label: 'Kit Tanaka', sub: 'Hardware · Tokyo', kind: 'builder' },

    { id: 'hack-sh', x: 40, y: 12, r: 14, label: 'Hack Shanghai 2026', sub: 'Event · Mar 14–16', kind: 'event' },
    { id: 'beyond',  x: 86, y: 50, r: 11, label: 'Beyond the Bottle',  sub: 'Project · 12 builders', kind: 'project' },
    { id: 'tutor',   x: 50, y: 86, r: 12, label: 'AI Tutor v0.2',      sub: 'Project · Mei + 3', kind: 'project' },
    { id: 'graph-c', x: 60, y: 18, r: 10, label: 'Graph builders',     sub: 'Community · 248', kind: 'community' },
  ];
  const edges = [
    ['mei','alex'], ['mei','rai'], ['mei','noor'], ['mei','jun'], ['mei','kit'],
    ['mei','hack-sh'], ['mei','tutor'], ['mei','graph-c'],
    ['alex','hack-sh'], ['alex','beyond'], ['rai','beyond'], ['rai','graph-c'],
    ['noor','beyond'], ['jun','tutor'], ['kit','beyond'], ['noor','hack-sh'],
    ['jun','hack-sh']
  ];

  const colorFor = (kind) => ({
    builder:   '#3232FF',
    event:     '#7C3AED',
    project:   '#06B6D4',
    community: '#F59E0B'
  })[kind];

  const visible = (n) => filter === 'all' || n.kind === filter || n.id === 'mei';
  const edgeVisible = (a, b) => visible(byId[a]) && visible(byId[b]);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className="graph-stage">
      <div className="graph-overlay">
        <span className="eyebrow" style={{margin:0}}>
          <span className="pulse" style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'currentColor',marginRight:6}}></span>
          Live · 487 nodes
        </span>
      </div>
      <div className="graph-toolbar">
        {[
          { k: 'all', label: 'All' },
          { k: 'builder', label: 'Builders' },
          { k: 'event', label: 'Events' },
          { k: 'project', label: 'Projects' },
          { k: 'community', label: 'Communities' }
        ].map(t => (
          <button key={t.k}
                  className={`graph-chip${filter === t.k ? ' is-active' : ''}`}
                  onClick={() => setFilter(t.k)}>
            {t.label}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 100 100" className="graph-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="lgHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3232FF" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#3232FF" stopOpacity="0"/>
          </radialGradient>
        </defs>
        {edges.map(([a,b], i) => {
          if (!edgeVisible(a,b)) return null;
          const na = byId[a], nb = byId[b];
          const isPrimary = a === 'mei' || b === 'mei';
          const isHovered = hovered && (hovered === a || hovered === b);
          return (
            <line key={i}
                  x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                  stroke="#3232FF"
                  strokeOpacity={isHovered ? 0.8 : (isPrimary ? 0.45 : 0.18)}
                  strokeWidth={isHovered ? 0.4 : (isPrimary ? 0.25 : 0.15)}
                  className={i % 4 === 0 ? "edge-trace" : ""}/>
          );
        })}
        {nodes.map(n => {
          if (!visible(n)) return null;
          const isHovered = hovered === n.id;
          return (
            <g key={n.id}
               onMouseEnter={() => setHovered(n.id)}
               onMouseLeave={() => setHovered(null)}
               style={{cursor: 'pointer'}}>
              {n.primary && <circle cx={n.x} cy={n.y} r={n.r/3 + 4} fill="url(#lgHalo)"/>}
              <circle cx={n.x} cy={n.y} r={n.r/8 + (isHovered ? 0.5 : 0)}
                      fill={colorFor(n.kind)}
                      stroke={n.primary ? '#fff' : 'none'}
                      strokeWidth={n.primary ? 0.5 : 0}
                      className={n.primary ? '' : 'node-pulse'}
                      style={{transition: 'r 0.2s'}}/>
              {n.primary && <circle cx={n.x} cy={n.y} r={n.r/22} fill="#fff"/>}
            </g>
          );
        })}
      </svg>

      {hovered && byId[hovered] && (() => {
        const n = byId[hovered];
        return (
          <div className="graph-tooltip" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
            <div>{n.label}</div>
            <div className="tt-sub">{n.sub}</div>
          </div>
        );
      })()}

      <div className="graph-legend">
        <span className="lg-item"><i className="lg-dot" style={{background:'#3232FF'}}></i>Builder</span>
        <span className="lg-item"><i className="lg-dot" style={{background:'#7C3AED'}}></i>Event</span>
        <span className="lg-item"><i className="lg-dot" style={{background:'#06B6D4'}}></i>Project</span>
        <span className="lg-item"><i className="lg-dot" style={{background:'#F59E0B'}}></i>Community</span>
      </div>
    </div>
  );
};

window.LiveGraph = LiveGraph;

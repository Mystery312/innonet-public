/* DiscoverData.js — demo profiles for offline preview, plus shared icons */
window.DEMO_PROFILES = [
  {
    user_id: 'demo-1', username: 'mei',
    full_name: 'Mei Chen', role: 'Frontend dev · Hardware tinkerer',
    location: 'Shanghai, CN',
    bio: 'Building tools for high-school robotics teams. Recently finished a custom IDE for FRC. Looking for a co-founder who actually likes paperwork.',
    top_skills: ['React', 'TypeScript', 'Embedded C', 'CAD'],
    similarity_score: 0.94,
    shared_skills: ['React', 'TypeScript'],
    shared_communities: ['Hack Shanghai', 'FRC Builders'],
    match_reasons: [
      'You both ship in **React + TypeScript**',
      'Member of **Hack Shanghai** (where you are)',
      'Working on **hardware** like 3 of your closest connections',
    ],
    accent: 'linear-gradient(135deg,#5B6BFF,#8b5cf6)',
  },
  {
    user_id: 'demo-2', username: 'jamal',
    full_name: 'Jamal Reeves', role: 'AI researcher · Stanford freshman',
    location: 'Palo Alto, US',
    bio: 'Working on small-LM agents for code review. Open-sourced a tool last month that hit 3k stars. Want to talk to people building AI products, not just papers.',
    top_skills: ['Python', 'PyTorch', 'Triton', 'Rust'],
    similarity_score: 0.89,
    shared_skills: ['Python', 'PyTorch'],
    shared_communities: ['ML Twitter Reading Group'],
    match_reasons: [
      'You both shipped **AI tooling** in the last 30 days',
      'Member of **ML Twitter Reading Group**',
      '2 mutual connections in **Bay Area builders**',
    ],
    accent: 'linear-gradient(135deg,#f59e0b,#ef4444)',
  },
  {
    user_id: 'demo-3', username: 'sofia',
    full_name: 'Sofía Marín', role: 'Designer + dev · 17',
    location: 'Mexico City, MX',
    bio: 'Independent designer who codes. Made a directory for Latam student founders that has 800 sign-ups. Looking for engineering collaborators in LatAm time zones.',
    top_skills: ['Figma', 'Next.js', 'Prisma', 'Brand'],
    similarity_score: 0.86,
    shared_skills: ['Next.js', 'Figma'],
    shared_communities: ['LatAm Builders'],
    match_reasons: [
      'Both work the **design/eng** seam',
      'Active in **LatAm Builders** (47 mutual members)',
      'Similar **shipping cadence** — 4+ projects this year',
    ],
    accent: 'linear-gradient(135deg,#ec4899,#f59e0b)',
  },
  {
    user_id: 'demo-4', username: 'arjun',
    full_name: 'Arjun Patel', role: 'Bio + ML · IIT Delhi',
    location: 'Delhi, IN',
    bio: 'Computational biologist using diffusion models for protein design. Published in NeurIPS at 19. Looking for software people to help productize a wet-lab tool.',
    top_skills: ['Python', 'JAX', 'Biology', 'Wet lab'],
    similarity_score: 0.82,
    shared_skills: ['Python'],
    shared_communities: ['BioML', 'NeurIPS Students'],
    match_reasons: [
      '**Bio + ML** background — matches your saved interest',
      'In **NeurIPS Students** with 2 of your connections',
      'Looking for **engineering collaborators**',
    ],
    accent: 'linear-gradient(135deg,#10b981,#06b6d4)',
  },
  {
    user_id: 'demo-5', username: 'kira',
    full_name: 'Kira Tanaka', role: 'Mobile · Tokyo',
    location: 'Tokyo, JP',
    bio: 'Mobile-first engineer. Shipped an app for Japanese high-schoolers that hit 50k DAU. Quitting school next month to go full-time. Looking for a technical co-founder.',
    top_skills: ['Swift', 'Kotlin', 'Backend', 'Firebase'],
    similarity_score: 0.79,
    shared_skills: ['Backend'],
    shared_communities: ['Tokyo Builders Club'],
    match_reasons: [
      'Both shipped **mobile apps** with real users',
      '**Tokyo Builders** member',
      'Your saved filter: **co-founder search**',
    ],
    accent: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
  },
  {
    user_id: 'demo-6', username: 'ola',
    full_name: 'Ola Adeyemi', role: 'Founder · Lagos',
    location: 'Lagos, NG',
    bio: 'Building payments rails for African creators. 19, dropped out of UI for this. We just did $400k in volume last month. Looking to talk to growth-y people.',
    top_skills: ['Go', 'Postgres', 'Payments', 'Growth'],
    similarity_score: 0.74,
    shared_skills: [],
    shared_communities: ['African Founders'],
    match_reasons: [
      'Active **founder** with traction',
      '**African Founders** community overlap',
      'Looking for the **growth** profile you saved',
    ],
    accent: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
  },
  {
    user_id: 'demo-7', username: 'lucas',
    full_name: 'Lucas Brennan', role: 'Hardware · Boston',
    location: 'Boston, US',
    bio: 'Mechanical engineer who codes. Built a CNC for under $1k while in high school. Now studying robotics at MIT. Want to talk to people doing physical products.',
    top_skills: ['CAD', 'Embedded C', 'PCB', 'Python'],
    similarity_score: 0.71,
    shared_skills: ['Embedded C'],
    shared_communities: ['MIT Makers'],
    match_reasons: [
      'You both work in **embedded / hardware**',
      '**MIT Makers** with 4 mutual members',
      'Active **physical product** builder',
    ],
    accent: 'linear-gradient(135deg,#f59e0b,#84cc16)',
  },
  {
    user_id: 'demo-8', username: 'priya',
    full_name: 'Priya Singh', role: 'Frontend · Bangalore',
    location: 'Bangalore, IN',
    bio: 'Design-engineer working on collaborative tools. Built a Figma plugin used by 12k people. Looking for people to riff with on creative tooling.',
    top_skills: ['React', 'WebGL', 'Figma API', 'Animation'],
    similarity_score: 0.68,
    shared_skills: ['React'],
    shared_communities: ['Design Engineers'],
    match_reasons: [
      'Both **design engineers**',
      '**Design Engineers** community',
      'Similar tools — **WebGL + React**',
    ],
    accent: 'linear-gradient(135deg,#ec4899,#8b5cf6)',
  },
];

window.RECENT_ACTIVITY = [
  { initial: 'D', name: 'Daria Kim',     sub: 'Connect · 2m ago',  action: 'connect', accent: 'linear-gradient(135deg,#5B6BFF,#8b5cf6)' },
  { initial: 'M', name: 'Marcus Lee',    sub: 'Pass · 5m ago',     action: 'pass',    accent: 'linear-gradient(135deg,#10b981,#06b6d4)' },
  { initial: 'H', name: 'Hana Yamamoto', sub: 'Connect · 14m ago', action: 'connect', accent: 'linear-gradient(135deg,#f59e0b,#ec4899)' },
  { initial: 'I', name: 'Ibrahim Touré', sub: 'Connect · 1h ago',  action: 'connect', accent: 'linear-gradient(135deg,#8b5cf6,#ef4444)' },
];

window.QUICK_FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'builders',  label: 'Builders' },
  { id: 'founders',  label: 'Founders' },
  { id: 'students',  label: 'Students' },
  { id: 'mentors',   label: 'Mentors' },
];

window.LOCATION_OPTIONS = [
  { id: '',         label: 'Anywhere' },
  { id: 'us',       label: 'United States' },
  { id: 'in',       label: 'India' },
  { id: 'cn',       label: 'China' },
  { id: 'eu',       label: 'Europe' },
  { id: 'latam',    label: 'Latin America' },
  { id: 'africa',   label: 'Africa' },
];

/* Renders the **bold** segments inside reasons */
window.renderReason = function (s) {
  const parts = String(s).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <b key={i}>{p.slice(2, -2)}</b>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

/* Step 8 — Apply the KnowledgeGraph polish edits in place.
 *
 * The KnowledgeGraph.tsx is ~870 lines; rather than shipping the whole file
 * (which would risk overwriting unrelated edits you've made), this script
 * applies the four surgical changes by exact-string replacement:
 *
 *   1. Add `chrome` to the destructured props + a chromeFlags useMemo.
 *   2. Add a `meHalo` radialGradient to <defs>.
 *   3. Paint the halo behind a user node when `isCurrentUser`, and switch the
 *      selected-state stroke from kind-color → white.
 *   4. Auto-on cluster hulls when `enableClustering` is true.
 *   5. Gate the three built-in chrome JSX blocks behind chromeFlags.
 *
 * Run from your frontend root:
 *   node scripts/polish-knowledge-graph.mjs
 *
 * The script REFUSES to write if any anchor isn't found exactly once — that
 * way an upstream edit you made won't get silently mangled. Re-running on an
 * already-patched file is a no-op (each step detects its own marker).
 */

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('src/features/graph/components/KnowledgeGraph/KnowledgeGraph.tsx');

if (!fs.existsSync(FILE)) {
  console.error('Missing: ' + FILE);
  console.error('Run this from your frontend root (the folder with package.json).');
  process.exit(1);
}

const original = fs.readFileSync(FILE, 'utf8');
let src = original;
const steps = [];

/** Replace exactly once, with a marker that lets us detect already-applied. */
function applyStep(name, anchor, replacement, marker) {
  if (src.includes(marker)) {
    steps.push({ name, status: 'already-applied' });
    return;
  }
  const matches = src.split(anchor).length - 1;
  if (matches === 0) {
    steps.push({ name, status: 'anchor-missing', anchor: anchor.slice(0, 60) });
    return;
  }
  if (matches > 1) {
    steps.push({ name, status: 'anchor-ambiguous', count: matches });
    return;
  }
  src = src.replace(anchor, replacement);
  steps.push({ name, status: 'patched' });
}

// ───── 1. chrome prop + chromeFlags useMemo ─────
applyStep(
  '1. chrome destructure + flags',
  `  enableClustering = false,
}) => {`,
  `  enableClustering = false,
  chrome = true,
}) => {
  // Resolve the chrome flags once per change.
  const chromeFlags = useMemo(() => {
    if (chrome === false) return { legend: false, controls: false, viewMode: false };
    if (chrome === true)  return { legend: true,  controls: true,  viewMode: true  };
    return {
      legend:   chrome.showLegend ?? true,
      controls: chrome.showControls ?? true,
      viewMode: chrome.showViewModeIndicator ?? true,
    };
  }, [chrome]);`,
  'const chromeFlags = useMemo(() => {'
);

// ───── 2. meHalo gradient (inserted after the pathGlow filter) ─────
applyStep(
  '2. meHalo gradient',
  `    const pathMerge = pathGlow.append('feMerge');
    pathMerge.append('feMergeNode').attr('in', 'coloredBlur');
    pathMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const container = svg.append('g');`,
  `    const pathMerge = pathGlow.append('feMerge');
    pathMerge.append('feMergeNode').attr('in', 'coloredBlur');
    pathMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // "Me" halo — soft radial behind the current-user node.
    const meHalo = defs.append('radialGradient')
      .attr('id', 'meHalo')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
    meHalo.append('stop').attr('offset', '0%')
      .attr('stop-color', NODE_COLORS.user || '#5B6BFF').attr('stop-opacity', '0.5');
    meHalo.append('stop').attr('offset', '100%')
      .attr('stop-color', NODE_COLORS.user || '#5B6BFF').attr('stop-opacity', '0');

    const container = svg.append('g');`,
  `'meHalo')`
);

// ───── 3a. User node halo + white selected stroke ─────
applyStep(
  '3a. user halo + selected stroke',
  `      if (d.type === 'user') {
        // Circle for users
        g.append('circle')
          .attr('r', radius)
          .attr('fill', isCurrentUser ? color : '#f6f8fa')
          .attr('stroke', color)
          .attr('stroke-width', isSelected || isFocusNode ? 4 : 2)
          .attr('filter', isFocusNode || d.isInPath ? 'url(#glow)' : null);`,
  `      if (d.type === 'user') {
        // Halo behind the current user — pulls the eye to "me" on the graph.
        if (isCurrentUser) {
          g.append('circle')
            .attr('r', radius * 1.9)
            .attr('fill', 'url(#meHalo)')
            .attr('pointer-events', 'none');
        }
        // Circle for users
        g.append('circle')
          .attr('r', radius)
          .attr('fill', isCurrentUser ? color : '#f6f8fa')
          .attr('stroke', isSelected ? '#fff' : color)
          .attr('stroke-width', isSelected ? 4 : isFocusNode ? 4 : 2)
          .attr('filter', isFocusNode || d.isInPath || isCurrentUser ? 'url(#glow)' : null);`,
  `'url(#meHalo)'`
);

// ───── 4. Cluster hulls — auto-on when clustering is enabled ─────
applyStep(
  '4. cluster hulls default-on',
  `if (enableClustering && clusterOptions?.showHulls) {`,
  `if (enableClustering && (clusterOptions?.showHulls ?? true)) {`,
  `(clusterOptions?.showHulls ?? true)`
);

// ───── 5a. viewModeIndicator behind chromeFlags ─────
applyStep(
  '5a. viewModeIndicator gate',
  `      {/* View mode indicator */}
      {viewMode !== 'full' && (`,
  `      {/* View mode indicator */}
      {chromeFlags.viewMode && viewMode !== 'full' && (`,
  `chromeFlags.viewMode && viewMode`
);

// ───── 5b. legend behind chromeFlags ─────
applyStep(
  '5b. legend gate',
  `      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.user }} />
          <span>People</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.skill }} />
          <span>Skills</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.community }} />
          <span>Communities</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.event }} />
          <span>Events</span>
        </div>
      </div>`,
  `      {chromeFlags.legend && (
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.user }} />
            <span>People</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.skill }} />
            <span>Skills</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.community }} />
            <span>Communities</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: NODE_COLORS.event }} />
            <span>Events</span>
          </div>
        </div>
      )}`,
  `{chromeFlags.legend && (`
);

// ───── 5c. controls hint behind chromeFlags ─────
applyStep(
  '5c. controls hint gate',
  `      <div className={styles.controls}>
        <p>Drag nodes to rearrange • Scroll to zoom • Click nodes for details • Hover to highlight connections</p>
      </div>`,
  `      {chromeFlags.controls && (
        <div className={styles.controls}>
          <p>Drag nodes to rearrange • Scroll to zoom • Click nodes for details • Hover to highlight connections</p>
        </div>
      )}`,
  `{chromeFlags.controls && (`
);

// ───── Report ─────
const failed = steps.filter((s) => s.status === 'anchor-missing' || s.status === 'anchor-ambiguous');
if (failed.length) {
  console.error('\nABORT — some anchors did not match cleanly. File NOT modified.\n');
  steps.forEach((s) => {
    const icon = s.status === 'patched' ? '✓' : s.status === 'already-applied' ? '·' : '✗';
    console.error(`  ${icon} ${s.name} — ${s.status}${s.anchor ? ' (anchor: ' + s.anchor + '…)' : ''}${s.count ? ' (found ' + s.count + 'x)' : ''}`);
  });
  console.error('\nThis usually means you have already-edited code in KnowledgeGraph.tsx.');
  console.error('Open the file, search for the missing anchor text, and apply the diff in step 4 of README.md by hand.');
  process.exit(1);
}

if (src === original) {
  console.log('Nothing to do — file is already polished.');
  steps.forEach((s) => console.log('  · ' + s.name + ' — ' + s.status));
  process.exit(0);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log('\nPatched ' + FILE + '\n');
steps.forEach((s) => {
  const icon = s.status === 'patched' ? '✓' : '·';
  console.log(`  ${icon} ${s.name} — ${s.status}`);
});
console.log('\nNow restart `npm run dev` and reload /roadmap.');

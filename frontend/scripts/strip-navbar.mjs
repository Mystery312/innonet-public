/* Step 7 — Drop <Navbar/> + <Footer/> from protected pages.
 *
 * This script applies the find/replace patterns to the 9 protected pages so
 * each one stops drawing its own topbar/footer (the AppShell already does it).
 *
 * Run from your frontend root:
 *   node scripts/strip-navbar.mjs
 *
 * Idempotent — re-running on an already-clean file is a no-op. Touches only
 * files whose contents actually change.
 */

import fs from 'node:fs';
import path from 'node:path';

const FILES = [
  'src/pages/Events/EventsListPage.tsx',
  'src/pages/Events/EventDetailPage.tsx',
  'src/pages/Communities/CommunitiesPage.tsx',
  'src/pages/Communities/CommunityDetailPage.tsx',
  'src/pages/Communities/CreateCommunityPage.tsx',
  'src/pages/Communities/PostDetailPage.tsx',
  'src/pages/Challenges/ChallengesPage.tsx',
  'src/pages/Challenges/ChallengeDetailPage.tsx',
  'src/pages/Messages/MessagesPage.tsx',
];

/** Each entry: a regex to match and the replacement (or '' to delete). */
const RULES = [
  // Drop both bracketed and default Navbar imports.
  [/^\s*import\s+\{\s*Navbar\s*\}\s+from\s+['"][^'"]+Navbar['"];\s*\n/m, ''],
  [/^\s*import\s+Navbar\s+from\s+['"][^'"]+Navbar['"];\s*\n/m, ''],
  // Drop the Footer import.
  [/^\s*import\s+\{\s*Footer\s*\}\s+from\s+['"][^'"]+Footer['"];\s*\n/m, ''],
  // Drop standalone <Navbar /> and <Footer /> JSX (both self-closing & open/close forms).
  [/^\s*<Navbar\s*\/>\s*\n/gm, ''],
  [/^\s*<Footer\s*\/>\s*\n/gm, ''],
  [/^\s*<Navbar><\/Navbar>\s*\n/gm, ''],
  [/^\s*<Footer><\/Footer>\s*\n/gm, ''],
];

let changed = 0;
let skipped = 0;
let missing = 0;

for (const rel of FILES) {
  const file = path.resolve(rel);
  if (!fs.existsSync(file)) {
    console.warn('  · missing  ' + rel);
    missing++;
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  for (const [pattern, repl] of RULES) {
    after = after.replace(pattern, repl);
  }
  if (after === before) {
    console.log('  · clean    ' + rel);
    skipped++;
    continue;
  }
  fs.writeFileSync(file, after, 'utf8');
  console.log('  ✓ patched  ' + rel);
  changed++;
}

console.log(`\nDone — patched ${changed}, already clean ${skipped}, missing ${missing}`);
console.log('\nManual follow-ups (the script is conservative and won\'t touch these):');
console.log('  • Some pages wrap content in `<div className={styles.page}>` + `<main className={styles.main}>`');
console.log('    The wrapper is harmless but redundant inside AppShell. Simplify to `<main>` when convenient.');
console.log('  • `BackButton` on list pages (EventsListPage, CommunitiesPage, ChallengesPage) is redundant now');
console.log('    that the sidebar shows current location. Consider removing in a follow-up.');
console.log('  • If you see a TS error about an unused `useNavigate` import, drop it — happens on pages that');
console.log('    only used navigate() inside an action that\'s no longer there.');

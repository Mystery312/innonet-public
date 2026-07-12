# InnoNet Design System

> **InnoNet** is a professional networking platform for young, skilled
> entrepreneurs (high‑school + early college). Members build companies,
> ship hackathon projects, find collaborators, and join real‑world events
> through an Obsidian‑style **knowledge graph** of people, projects,
> companies, posts, and skills.

The product brand is **electric blue on deep neutrals** — a single
saturated primary (`#4D4DFF`) sitting on near‑black surfaces. The visual
identity leans technical, geometric, and energetic: graph nodes,
connections, motion, and data.

> Tagline: **"From ideas to impact, faster."**

---

## Sources

This design system was reverse‑engineered from:

| Source | Path / URL |
|---|---|
| Brand mark (provided) | `uploads/Screenshot 2026-04-26 at 6.54.12 PM.png` |
| Production codebase | `https://github.com/Mystery312/innonet-public` |
| Imported design tokens | `frontend/src/index.css` (in repo) |
| Imported component CSS | `frontend/src/components/common/**/*.module.css` |
| Imported page sources | `frontend/src/pages/Home/*` |
| Logo SVGs | `frontend/public/logo.svg`, `logo-dark.svg`, `logo-icon.svg` |

The Beyond‑the‑Bottle / Thermos workshop guidelines mentioned in the
brief belong to a *sub‑brand programme* run by InnoNet. They are
**not** applied to this core platform system — the platform's identity
is electric blue, not teal/amber. Those tokens can be derived as a
sub‑theme later if needed.

---

## Index

| File | Purpose |
|---|---|
| `README.md` | This file. Brand context, content + visual fundamentals. |
| `colors_and_type.css` | All CSS custom properties + semantic type classes. |
| `SKILL.md` | Agent‑skill manifest (cross‑compatible with Claude Code). |
| `assets/` | Logos, marks, illustrative assets. |
| `preview/` | Card files rendered into the Design System tab. |
| `ui_kits/innonet-web/` | Hi‑fi recreation of the InnoNet web product. |

---

## Content fundamentals

**Voice.** Direct, builder‑first, slightly aspirational. Speaks to
people who already make things, never to passive users. Avoids
hand‑holding, avoids hype. Confidence without exclamation marks.

**Pronouns.** "You" for the reader, "we" only when speaking from the
product team. Never "users."

**Casing.** Sentence case for headlines, buttons, navigation, badges.
**No Title Case. No ALL CAPS** except for the eyebrow tag style
(letter‑spaced, primary‑blue, used once per section max).

**Length.**
- Headlines ≤ 7 words, prefer 4–5.
- Sub‑headlines ≤ 18 words.
- Card titles ≤ 5 words.
- CTA labels are verb‑first, ≤ 4 words.

**Verbs over nouns.** "Browse events" not "Event browser." "Find
collaborators" not "Collaborator discovery."

**Numbers are loud.** Stats are displayed in the display font at
`--fs-40`/`--fw-black` in primary blue. "500+ builders. 50+ events.
30+ communities."

**Emoji.** Not used in product UI. The repo README uses GitHub status
emoji (✅, ⭐) but those are dev‑facing. Keep platform copy emoji‑free.

**Examples drawn from the codebase**

> "From ideas to impact, faster"
> "Discover nearby builders, hackathons, and projects — so collaboration happens faster and smarter."
> "Tools designed for builders, not just networkers."
> "Get early access"
> "Join 500+ builders already on the waitlist"
> "AI‑powered networking" *(eyebrow tag)*
> "Smart Discovery" / "Events & Hackathons" / "Network Graph" *(feature names)*
> "Create your account" *(CTA)*

---

## Visual foundations

### Colour
The system has **one** brand colour: `#4D4DFF` (Innonet Blue, the
`--blue-500` token). It carries CTAs, links, active states, graph
edges, stats, badges, and focus rings. Everything else is neutral.

- **Light theme:** white surfaces over a `#F8FAFC` page background;
  blue used at full saturation against white.
- **Dark theme** (the brand‑forward, default in marketing): an
  `#111114` page over `#0A0A0F` page‑secondary, with `#1A1A1F`
  surfaces. Blue at full saturation reads as electric.
- **Accents** (`--violet-500`, `--cyan-500`) are reserved for graph
  variety and info states only — never primary UI.
- **Status:** green (success), amber (warning), red (danger), cyan (info).

### Type
- **Display:** *Space Grotesk* — geometric, modern, slightly technical.
  Substituted from Google Fonts since the source codebase uses a
  system stack. **Flag:** if the team has a real display licence,
  swap it in `colors_and_type.css` and the preview cards will update.
- **Body:** system stack (matches codebase).
- **Mono:** *JetBrains Mono* for stat numbers and IDs.
- Hero titles run at `--fs-64` / `--fw-black` / `--tracking-tighter`.
  The codebase uses 800 weight — never lighter.

### Layout
- Max content width 1200px (codebase `.container`).
- Hero blocks are 8rem vertical padding desktop, generous breathing
  room throughout.
- Two‑column hero (copy / preview card) collapses to stacked under
  1024px.
- Cards use `--radius-xl` (16px); pills/badges use `--radius-pill`.

### Backgrounds
- Marketing surfaces use a slow, animated **conic‑style linear
  gradient** of the brand blue at 4–12% opacity. From the codebase:

  ```css
  background: linear-gradient(
    135deg,
    rgba(77, 77, 255, 0.04) 0%,
    rgba(77, 77, 255, 0.08) 40%,
    rgba(120, 80, 255, 0.06) 70%,
    rgba(77, 77, 255, 0.02) 100%
  );
  animation: gradientShift 12s ease infinite;
  ```

- Dark theme uses solid near‑black surfaces with the same gradient at
  ~2× opacity.
- No textures, no grain, no full‑bleed photography. The product feel
  is software‑native, not editorial.

### Imagery
The codebase ships **no photographic assets** — the hero is a synthetic
"profile preview card" with an SVG mini‑graph drawn in primary blue at
varying opacity. Any future photography should be cool‑toned, neutral
backgrounds, no warm fluorescents.

### Cards
- Background: `--color-surface`.
- Border: none in light, optional `0.5px` of `--color-border` in dark.
- Border‑radius: `--radius-xl` (16px).
- Shadow: very soft, multi‑layer (`--shadow-md` / `--shadow-lg`).
  The codebase uses a 3‑stop shadow stack on hero cards.
- Hover: lifts `translateY(-2px)`, deepens shadow.

### Buttons
- Primary: solid `--color-primary`, white text, `--radius-md`,
  `--fw-medium`. Hover deepens to `--blue-600`.
- Outline: 1px primary border, transparent fill, primary text. Hover
  fills with primary.
- Ghost: transparent, secondary text. Hover gets a `--gray-100` tint.
- Pill CTAs (waitlist) live inside a white capsule at `--radius-pill`.

### Animation
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (out) for almost
  everything; `cubic-bezier(0.65, 0, 0.35, 1)` for through‑states.
- **Durations:** 120ms (hover), 200ms (component transitions),
  320ms (page‑level fades).
- The animated background gradient runs at 12s linear loop.
- No bouncy springs, no over‑the‑top entrance animations.

### Hover & press states
- Hover: deeper variant of the same colour (never a generic gray).
- Links: gain colour, never get an underline. Outline buttons fill.
- Press: brief opacity drop (`opacity: 0.9`) — no shrink/scale.
- Focus: 4px primary blue ring at 12% opacity (`--glow-primary-sm`).

### Borders
- Default `1px` of `--color-border` (light: `#E2E8F0`; dark: `#353541`).
- Dividers fade to `--color-border-subtle`.
- Single‑sided accent borders (e.g. callouts) are 3px primary blue,
  never rounded on the accent side.

### Shadows
- Soft, multi‑layer, neutral colour. Dark theme uses pure black
  shadows at higher opacity. Never coloured shadows except the
  branded `--glow-primary-md` halo on hero CTAs and important cards.

### Transparency / blur
- The navbar uses `rgba(255, 255, 255, 0.8)` + 12px backdrop blur
  in light, `rgba(17, 17, 17, 0.8)` + blur in dark. This is the
  primary place blur is used.
- Tints (`--color-primary-soft`, `--color-primary-tint`) sit at 10–22%
  opacity over surfaces.

### Corner radii
| Token | px | Use |
|---|---|---|
| `--radius-sm` | 4 | Inline tags, small chips |
| `--radius-md` | 8 | Buttons, inputs |
| `--radius-lg` | 12 | Small cards, menus |
| `--radius-xl` | 16 | Default card |
| `--radius-2xl` | 24 | Featured/hero cards |
| `--radius-pill` | ∞ | Badges, capsule CTAs, avatars |

### Iconography
The codebase uses **inline SVG icons** drawn at 24×24 with
`stroke-width: 2`, `stroke-linecap: round`, `stroke-linejoin: round`,
no fill — the *Feather / Lucide* style. Examples in the imported
`HeroSection.tsx` and `FeaturesSection.tsx`.

There is **no icon font** and **no icon sprite**. We standardise on
**Lucide** via CDN as the closest match — flag this substitution if
the team adopts a custom set later.

```html
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="search"></i>
```

Emoji and unicode glyphs are **not used** in product UI. Status pips
and graph nodes are drawn as SVG circles, not characters.

---

## How to use

1. Link `colors_and_type.css` first, then your component CSS.
2. Add `data-theme="dark"` on `<html>` for dark mode.
3. Use semantic tokens (`--color-primary`), never primitives
   (`--blue-500`), in component code.
4. For typography, prefer the `.t-*` classes over re‑specifying
   font‑size/weight/line‑height inline.

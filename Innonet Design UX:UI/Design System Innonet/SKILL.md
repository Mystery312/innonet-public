---
name: innonet-design
description: Use this skill to generate well-branded interfaces and assets for InnoNet, the professional networking platform for young entrepreneurial builders. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. Brand identity is electric blue (#4D4DFF) on deep neutrals, knowledge-graph forward.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files (`colors_and_type.css`, `assets/`, `preview/`, `ui_kits/innonet-web/`).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. Always link `colors_and_type.css` first and use the semantic tokens (`--color-primary`, `--color-fg`, `--color-bg`) over the primitive ramps.

If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Quick rules of thumb:
- One brand color: `#4D4DFF` (Innonet blue). Carry it on CTAs, links, active states, graph edges, stats, focus rings.
- Dark theme is the brand-forward default for marketing surfaces (`#0A0A0F` / `#111114` / `#1A1A1F`).
- Display type: Space Grotesk, 700–800, tight tracking. Body: system stack. Mono: JetBrains Mono for stat numbers + IDs.
- Sentence case everywhere, no emoji in product UI, verbs over nouns in CTAs.
- Iconography: Lucide / Feather, 24px, stroke 2, rounded caps.
- Cards: `--radius-xl` (16px), soft multi-layer shadow, no borders in light mode.
- Featured states use the branded blue glow (`--glow-primary-md/lg`), never coloured borders.
- The knowledge-graph motif (nodes + edges, primary blue + accent violet/cyan) is core to the brand — use it where appropriate.

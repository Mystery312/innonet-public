# UI Designer Memory — Innonet

## Design System Tokens

**Primary Brand Color:** Electric blue (#3232FF / --blue-500)
- Hover: #2222E6 (--blue-600)
- Active: #1A1ACC (--blue-700)
- Soft background: rgba(50, 50, 255, 0.10)

**Typography:**
- Display/Brand: Space Grotesk (700-800 weight for headings)
- Body: System font stack (-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto)
- Code: JetBrains Mono

**Spacing Scale:**
- Small: 4px, 8px, 12px
- Medium: 16px, 20px, 24px
- Large: 32px, 48px, 64px

**Border Radius:**
- Small: 4px (--radius-sm)
- Medium: 8px (--radius-md)
- Large: 12px (--radius-lg)

**Animation Timings:**
- Fast: 120ms (hover states, small UI changes)
- Base: 200ms (color transitions, button states)
- Slow: 320ms (slide-in panels, drawers)
- Easing: cubic-bezier(0.22, 1, 0.36, 1) for --ease-out

**Shadows:**
- sm: Subtle lift (buttons, small cards)
- md: Standard elevation (cards, dropdowns)
- lg: High elevation (modals, drawers)

## Component Patterns

**Dark Mode:**
- Uses `data-theme="dark"` attribute on `<html>`
- Tailwind custom variant: `@custom-variant dark`
- Background switches from #FFFFFF to --ink-900 (#111114)

**Navbar Pattern:**
- Sticky top navigation with backdrop blur (12px)
- Semi-transparent background (rgba with 0.8 alpha)
- Border-bottom for subtle separation
- Desktop: Horizontal flex layout
- Mobile: Recommend slide-out drawer for 7+ nav items

**Touch Targets:**
- Minimum 44px for mobile (WCAG AAA compliance)
- Icon buttons: 44x44px footprint even if icon is smaller

**shadcn/ui Integration:**
- Uses Radix UI primitives under the hood
- Class Variance Authority (cva) for variant management
- cn() utility from @/lib/utils.ts (clsx + tailwind-merge)
- Components in frontend/src/components/ui/

## Mobile Navigation Patterns

**Recommended for Innonet:** Slide-out drawer (hamburger menu)
- Best for 7+ navigation items
- Familiar pattern, high discoverability
- Scales well without layout constraints
- Desktop → Mobile continuity

**Alternative patterns explored:**
1. Bottom tab bar: Good for 4-5 primary items, more mobile-native feel
2. Priority+ pattern: Show what fits, hide overflow — best for 6-8 items

## Layout Conventions

**Container:**
- Max-width: 1200px
- Horizontal padding: 24px
- Centered with `margin: 0 auto`

**Card Pattern:**
- Background: --color-surface
- Border: 1px solid --color-border
- Border-radius: --radius-md (8px) or --radius-lg (12px)
- Shadow: --shadow-md on hover

**Interactive States:**
- Hover: Subtle background change or opacity shift
- Active: Scale down slightly (0.95) for tactile feedback
- Focus: 2px ring with primary color

## Files to Reference

- Design tokens: `frontend/src/index.css` (:root and [data-theme="dark"])
- shadcn components: `frontend/src/components/ui/`
- Legacy components: `frontend/src/components/common/` (CSS Modules)
- Current Navbar: `frontend/src/components/common/Navbar/Navbar.tsx`
- Utils: `frontend/src/lib/utils.ts` (cn function)

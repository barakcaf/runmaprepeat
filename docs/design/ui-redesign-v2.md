# UI Redesign — Design Document (v2)

**Issue:** #78 — Full UI Overhaul  
**Author:** Principal Engineer  
**Date:** 2026-04-02  
**Updated:** 2026-04-02 (v2 — incorporates UX Engineer review feedback)  
**Status:** Draft v2

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Design System Specification](#2-design-system-specification)
3. [Layout Architecture](#3-layout-architecture)
4. [Page-by-Page Redesign Plan](#4-page-by-page-redesign-plan)
5. [Component Inventory](#5-component-inventory)
6. [Implementation Plan — Ordered Tasks](#6-implementation-plan--ordered-tasks)
7. [Technical Decisions](#7-technical-decisions)
8. [Appendix A: File Structure After Redesign](#appendix-a-file-structure-after-redesign)
9. [Appendix B: Migration Risk Assessment](#appendix-b-migration-risk-assessment)
10. [Appendix C: Estimated Timeline](#appendix-c-estimated-timeline)
11. [Appendix D: UX Review Findings — Traceability Matrix](#appendix-d-ux-review-findings--traceability-matrix)

---

## 1. Current State Assessment

### 1.1 Component Structure

The frontend is a React 18 + Vite + TypeScript SPA with 6 main pages and ~10 components:

```
pages/
  Dashboard.tsx         — run list + stats + charts
  NewRunPage.tsx        — create run form + map
  RunDetailPage.tsx     — view/edit/delete a run
  PlannedRunsPage.tsx   — planned run list + complete modal
  ProfilePage.tsx       — view/edit profile
  ProfileSetupPage.tsx  — onboarding form

components/
  NavBar/BottomNav.tsx          — fixed bottom tab bar
  Map/RunMap.tsx                — interactive route drawing map
  Map/RouteMap.tsx              — read-only route display map
  Map/LocationSearch.tsx        — location search input
  Dashboard/StatsCards.tsx      — period comparison stat cards
  Dashboard/WeeklyDistanceChart.tsx  — recharts bar chart
  Dashboard/MonthlyDistanceChart.tsx — recharts bar chart
  Spotify/SpotifySearch.tsx     — audio search + selection

auth/
  AuthProvider.tsx, LoginPage.tsx, RegisterPage.tsx,
  ProtectedRoute.tsx, ProfileGate.tsx
```

**What works well:**
- Clean separation: pages → components → api → types
- CSS Modules (no global style leakage)
- All API calls centralized in `src/api/client.ts`
- Proper TypeScript types — no `any`
- Functional components + hooks throughout
- Already has `data-testid` attributes on key elements
- StatsCards has loading skeletons — good pattern
- BottomNav uses `env(safe-area-inset-bottom)` for iOS notch

### 1.2 CSS Approach — Problems

**Hardcoded colors everywhere.** Every CSS module redefines the same values:
- `#ff6b35` (primary orange) appears in: `shared.module.css`, `Dashboard.module.css`, `BottomNav.module.css`, `WeeklyDistanceChart.tsx` (inline), `MonthlyDistanceChart.tsx` (inline)
- `#1a1a1a` (text) appears in 8+ files
- `#666` (secondary text) appears in 10+ files
- `#d32f2f` (error red) hardcoded in `shared.module.css`

**No design tokens.** Colors, spacing, typography, shadows, radii are all magic numbers scattered across files.

**Inline styles used in components.** `Dashboard.tsx` uses `style={{ padding: "0.75rem" }}`. `ProfileSetupPage.tsx` uses `style={{ color: "#666" }}`. `ProfilePage.tsx` uses `style={{ width: "100%", flex: 1 }}`. These bypass CSS Modules and are unmaintainable.

**Mixed units.** `rem` in most places, `px` in some (`28px` marker elements, `64px` nav height), `vh` for map heights. No consistent scale.

**Duplicate styles.** `shared.module.css` acts as a pseudo-design-system but with hardcoded values. Each page's CSS module re-implements similar patterns (e.g., split containers in both `NewRunPage.module.css` and `RunDetailPage.module.css` are copy-pasted).

### 1.3 Responsive Behavior — Problems

**Single breakpoint at 769px.** Only `NewRunPage` and `RunDetailPage` have `@media (min-width: 769px)` for a desktop split-panel layout. No tablet treatment. No small-phone handling.

**Dashboard has no desktop layout.** Single-column card list at all widths — wastes space on desktop.

**PlannedRunsPage has no responsive treatment at all.** Single-column only.

**ProfilePage has no responsive treatment.** Single-column only.

**StatsCards grid** switches from 2-col to 4-col at 768px — decent but could be more fluid with container queries.

### 1.4 Accessibility Gaps

| Gap | Severity | WCAG Criterion |
|-----|----------|----------------|
| No skip-to-content link | Medium | 2.4.1 Bypass Blocks |
| No `<main>` landmark wrapping page content | Medium | 1.3.1 Info and Relationships |
| No `<nav>` `aria-label` on BottomNav | Low | 1.3.1 |
| Dashboard run cards use `role="button"` + `tabIndex={0}` (good) but no `aria-label` | Low | 4.1.2 Name, Role, Value |
| PlannedRunsPage "Run it!" button triggers modal — no focus trap in modal | High | 2.4.3 Focus Order |
| Modal has no `role="dialog"` or `aria-modal="true"` | High | 4.1.2 |
| Modal background click dismisses — no Escape key handler | Medium | 2.1.1 Keyboard |
| `window.confirm()` for delete — not customizable, but accessible | Low | — |
| Loading states are plain text — no `aria-live="polite"` region | Medium | 4.1.3 Status Messages |
| Error states have no `role="alert"` | Medium | 4.1.3 |
| Color contrast: `#999` on `#f5f5f5` background = 2.8:1 (FAILS AA) | High | 1.4.3 Contrast |
| Color contrast: `#666` on `#fff` = 5.7:1 (passes) | — | — |
| BottomNav label at `0.625rem` (10px) — very small | Medium | 1.4.4 Resize Text |
| Charts (Recharts) lack screen-reader alternative text | Medium | 1.1.1 Non-text Content |
| No `prefers-reduced-motion` handling | Low | 2.3.3 Animation from Interactions |
| Focus indicators rely on browser defaults — no visible custom focus ring | Medium | 2.4.7 Focus Visible |
| Emoji used as icons (🏠 ➕ 📋 👤) — screen readers may announce differently across platforms | Low | 1.1.1 |

### [UPDATED] 1.5 Touch Target Audit

> *Updated per UX review [AC-3]: Added comprehensive touch target audit as a design system requirement.*

**Project-wide minimum: 44×44px** for all interactive elements (matching WCAG 2.5.5 AAA / project rules).

| Element | Current Size | Status | Fix |
|---------|-------------|--------|-----|
| BottomNav tabs | 44px+ (full `.tab` element) | ✅ Pass | — |
| BottomNav labels | 10px text (0.625rem) | ⚠️ Readability | Increase to `--text-xs` (11-12px min) |
| Waypoint markers (RunMap) | 28×28px inline-styled | ❌ Fail | Increase to 48×48px with padding (see §4.2) |
| Form buttons | 44px (via shared.module.css) | ✅ Pass | — |
| Run cards (Dashboard) | Large touch target | ✅ Pass | — |
| Map popup close/remove buttons | ~30px | ❌ Fail | Increase to 44×44px |
| Chart tooltip triggers (Recharts) | Variable, often <44px | ⚠️ Risk | Add `activeDot={{ r: 22 }}` or touch-friendly overlay |
| Stat card tap areas | Full card | ✅ Pass | — |

**Rule:** Every new interactive element must be ≥44×44px. Code review must verify this. Add a linting comment pattern: `/* touch-target: 44px verified */` for unusual sizing.

### 1.6 Performance Observations

- **Recharts is ~180KB gzipped** — heavy for two bar charts. Consider lighter alternatives long-term.
- No route-based code splitting — entire app loads upfront.
- MapLibre GL JS is ~200KB gzipped — acceptable, already lazy-loading tiles.
- No image optimization strategy (Spotify album art loaded as-is).
- No skeleton/shimmer states on most pages (only StatsCards has one).

---

## 2. Design System Specification

### 2.1 Color Palette

All colors defined as CSS custom properties on `:root` with HSL values for easy dark mode manipulation.

#### Brand Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-primary` | `#F26522` | `#F27B3D` | CTAs, active nav, accent |
| `--color-primary-hover` | `#D9551A` | `#F26522` | Button hover states |
| `--color-primary-subtle` | `#FFF0E8` | `#3D2012` | Backgrounds, tags |
| `--color-secondary` | `#1A73E8` | `#5BA3F5` | Links, info elements |
| `--color-secondary-hover` | `#1557B0` | `#1A73E8` | Link hover |
| `--color-secondary-subtle` | `#E8F0FE` | `#12283D` | Info backgrounds |

#### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-success` | `#1B873A` | `#3FB950` | Positive stats, up arrows |
| `--color-success-subtle` | `#DAFBE1` | `#0D2818` | Success backgrounds |
| `--color-warning` | `#BF6A02` | `#D29922` | Warnings |
| `--color-warning-subtle` | `#FFF5E0` | `#3D2A05` | Warning backgrounds |
| `--color-error` | `#CF222E` | `#F85149` | Errors, delete, down arrows |
| `--color-error-subtle` | `#FFEBE9` | `#3D1215` | Error backgrounds |

#### Neutral Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-bg-primary` | `#FFFFFF` | `#0D1117` | Card backgrounds |
| `--color-bg-secondary` | `#F6F8FA` | `#161B22` | Page backgrounds |
| `--color-bg-tertiary` | `#EAEEF2` | `#21262D` | Input backgrounds, wells |
| `--color-border-primary` | `#D0D7DE` | `#30363D` | Card borders, dividers |
| `--color-border-secondary` | `#EAEEF2` | `#21262D` | Subtle borders |
| `--color-text-primary` | `#1F2328` | `#E6EDF3` | Headings, body text |
| `--color-text-secondary` | `#656D76` | `#8B949E` | Labels, metadata |
| `--color-text-tertiary` | `#767B83` | `#848D97` | Placeholders, hints |
| `--color-text-on-primary` | `#FFFFFF` | `#FFFFFF` | Text on primary buttons |

#### [UPDATED] Utility Colors

> *Updated per UX review [DS-1, DS-2]: Added focus-ring and overlay tokens.*

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-focus-ring` | `#2563EB` | `#58A6FF` | Focus indicators (always visible regardless of bg) |
| `--color-overlay` | `rgba(0, 0, 0, 0.5)` | `rgba(0, 0, 0, 0.7)` | Modal/dialog backdrop |

#### [UPDATED] Chart Colors (Colorblind-Safe)

> *Updated per UX review [DS-6]: Added chart-specific data visualization palette.*

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-chart-1` | `var(--color-primary)` | `var(--color-primary)` | Primary bars/lines |
| `--color-chart-2` | `var(--color-secondary)` | `var(--color-secondary)` | Secondary/comparison data |
| `--color-chart-3` | `#8B5CF6` | `#A78BFA` | Tertiary data series |
| `--color-chart-bg` | `var(--color-bg-tertiary)` | `var(--color-bg-tertiary)` | Chart background fill |
| `--color-chart-grid` | `var(--color-border-secondary)` | `var(--color-border-secondary)` | Grid lines, axes |
| `--color-chart-text` | `var(--color-text-secondary)` | `var(--color-text-secondary)` | Axis labels, legend text |

These colors are tested for distinguishability under protanopia, deuteranopia, and tritanopia (orange vs blue is safe across all three common CVD types).

**[UPDATED] Contrast verification (AA):**

> *Updated per UX review [AC-4]: Darkened `--color-text-tertiary` to pass 4.5:1 in both modes.*

- `--color-text-primary` on `--color-bg-primary`: 15.4:1 ✅ (light), 13.2:1 ✅ (dark)
- `--color-text-secondary` on `--color-bg-primary`: 5.5:1 ✅ (light), 4.6:1 ✅ (dark)
- `--color-text-tertiary` on `--color-bg-primary`: **4.6:1 ✅ (light: `#767B83` on `#FFFFFF`)**, **4.8:1 ✅ (dark: `#848D97` on `#0D1117`)** — passes AA for normal text. Safe for placeholders, hints, and small labels.
- `--color-primary` on `--color-bg-primary`: 4.6:1 ✅ for large text/UI components
- `--color-focus-ring` on `--color-bg-primary`: 8.6:1 ✅ (light), 5.4:1 ✅ (dark) — always visible

### [UPDATED] 2.2 Typography Scale

> *Updated per UX review [P-1]: Resolved contradictory font strategy. Self-hosted Inter only — no Google Fonts references.*

**Font stack:**
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace;
```

**Self-hosted Inter via woff2 files.** Subset to Latin characters only (~25KB for 4 weights: 400, 500, 600, 700). Use `font-display: swap` to prevent FOIT. Preload the regular (400) weight in `<link rel="preload">`. Other weights load on demand.

```html
<link rel="preload" href="/fonts/inter-latin-400.woff2" as="font" type="font/woff2" crossorigin>
```

**Do NOT use Google Fonts CDN** — avoids external dependency and extra DNS lookup.

**Fluid type scale (using `clamp()`):**

| Token | Min (320px) | Preferred | Max (1280px) | Weight | Usage |
|-------|-------------|-----------|--------------|--------|-------|
| `--text-xs` | 11px | `clamp(0.6875rem, 0.65rem + 0.1vw, 0.75rem)` | 12px | 400 | Labels, badges |
| `--text-sm` | 13px | `clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)` | 14px | 400 | Secondary text, metadata |
| `--text-base` | 15px | `clamp(0.9375rem, 0.9rem + 0.15vw, 1rem)` | 16px | 400 | Body text, inputs |
| `--text-lg` | 17px | `clamp(1.0625rem, 1rem + 0.2vw, 1.125rem)` | 18px | 600 | Section headers |
| `--text-xl` | 20px | `clamp(1.25rem, 1.15rem + 0.3vw, 1.375rem)` | 22px | 700 | Page titles |
| `--text-2xl` | 24px | `clamp(1.5rem, 1.35rem + 0.5vw, 1.75rem)` | 28px | 700 | Hero stat values |
| `--text-3xl` | 28px | `clamp(1.75rem, 1.55rem + 0.7vw, 2.25rem)` | 36px | 700 | Dashboard greeting |

**Line heights:**
```css
--leading-tight: 1.2;   /* headings */
--leading-normal: 1.5;  /* body */
--leading-relaxed: 1.75; /* long-form text */
```

### 2.3 Spacing System

8px base grid. 4px for tight/compact spacing.

> *[UPDATED] per UX review [I-1]: Use CSS logical properties throughout for RTL readiness.*

**Rule:** All spacing in CSS modules must use **logical properties**: `padding-inline-start` instead of `padding-left`, `margin-block-end` instead of `margin-bottom`, `inset-inline-start` instead of `left`. This future-proofs for RTL locales at zero cost.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Tight gaps (icon-to-label) |
| `--space-2` | `8px` | Compact gaps (chip padding) |
| `--space-3` | `12px` | Small padding |
| `--space-4` | `16px` | Base padding, card gap |
| `--space-5` | `20px` | Section gap |
| `--space-6` | `24px` | Card padding |
| `--space-8` | `32px` | Section spacing |
| `--space-10` | `40px` | Large section spacing |
| `--space-12` | `48px` | Page top padding |
| `--space-16` | `64px` | Hero spacing |

### [UPDATED] 2.4 Component Tokens

> *Updated per UX review [DS-4]: Added convenience transition composite tokens.*

```css
/* Border radius */
--radius-sm: 6px;     /* inputs, small pills */
--radius-md: 10px;    /* cards, buttons */
--radius-lg: 16px;    /* modals, sheets */
--radius-xl: 24px;    /* large cards, FABs */
--radius-full: 9999px; /* circular elements, toggles */

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.16);

/* Individual transition tokens */
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 350ms;
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Convenience composite transitions */
--transition-colors: color var(--duration-fast) var(--ease-default),
                     background-color var(--duration-fast) var(--ease-default),
                     border-color var(--duration-fast) var(--ease-default);
--transition-shadow: box-shadow var(--duration-normal) var(--ease-default);
--transition-transform: transform var(--duration-fast) var(--ease-default);

/* Z-index scale */
--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-overlay: 300;
--z-modal: 400;
--z-toast: 500;
--z-nav: 600;
```

### 2.5 CSS Custom Properties Structure

```
frontend/src/styles/
  tokens/
    colors.css        — color tokens + dark mode overrides + chart palette + focus/overlay
    typography.css    — font family, scale, line-height
    spacing.css       — spacing tokens
    components.css    — radius, shadow, transition, z-index tokens
    index.css         — @import barrel
  global.css          — reset + base styles (imports tokens/index.css)
```

`global.css` imports `tokens/index.css` which imports all token files. Every CSS module references tokens via `var(--token-name)`.

### 2.6 Dark Mode Approach

**CSS-only with user preference override.**

```css
/* In colors.css */
:root {
  --color-bg-primary: #FFFFFF;
  --color-text-primary: #1F2328;
  /* ... all light mode values ... */
}

:root[data-theme="dark"] {
  --color-bg-primary: #0D1117;
  --color-text-primary: #E6EDF3;
  /* ... all dark mode values ... */
}

/* Auto-detect if no explicit preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg-primary: #0D1117;
    --color-text-primary: #E6EDF3;
    /* ... */
  }
}
```

**ThemeProvider React context:**
- Reads `localStorage.getItem('theme')` on mount
- Falls back to `prefers-color-scheme` media query
- Sets `data-theme` attribute on `<html>`
- Persists choice to `localStorage`
- Exposes `theme`, `setTheme('light' | 'dark' | 'system')` via hook

### [UPDATED] 2.7 Heading Hierarchy

> *Added per UX review [A-7]: Document heading structure for every page to ensure screen reader navigation.*

Each page must maintain a strict heading hierarchy with no level skips:

| Page | `<h1>` | `<h2>` sections |
|------|--------|-----------------|
| Dashboard | Greeting ("Good morning, Barak") | "Weekly Distance", "Monthly Distance", "Recent Runs" |
| NewRunPage | "New Run" | "Route", "Audio" (if sectioned) |
| RunDetailPage | Run title (e.g., "Morning Run") | "Stats", "Audio", "Notes" |
| PlannedRunsPage | "Planned Runs" | (none — flat list) |
| ProfilePage | "Profile" | "Personal Info", "Preferences" |
| ProfileSetupPage | "Welcome to RunMapRepeat" | (none — single form) |
| LoginPage | "Sign In" | — |
| RegisterPage | "Create Account" | — |

**Rule:** Every page must have exactly one `<h1>`. Subheadings must be `<h2>`. Never skip levels (e.g., `<h1>` → `<h3>`).

---

## 3. Layout Architecture

### 3.1 Breakpoint Strategy

| Name | Min Width | Target |
|------|-----------|--------|
| `sm` | 0px | Phone portrait (320–479px) |
| `md` | 480px | Phone landscape / small tablet |
| `lg` | 768px | Tablet portrait |
| `xl` | 1024px | Tablet landscape / small desktop |
| `2xl` | 1280px | Desktop |

CSS custom media (using PostCSS or native when supported):
```css
@media (min-width: 480px) { /* md */ }
@media (min-width: 768px) { /* lg */ }
@media (min-width: 1024px) { /* xl */ }
@media (min-width: 1280px) { /* 2xl */ }
```

**Mobile-first:** base styles are mobile, breakpoints add complexity upward.

### 3.2 Mobile Layout (< 768px)

```
┌──────────────────────────┐
│  Status bar (OS)         │
├──────────────────────────┤
│                          │
│  Page Header             │
│  (title, optional back)  │
│                          │
├──────────────────────────┤
│                          │
│                          │
│  Scrollable Content      │
│  (full width, padded)    │
│                          │
│                          │
│                          │
│                          │
├──────────────────────────┤
│  Bottom Nav Bar          │
│  (fixed, 64px + safe)    │
└──────────────────────────┘
```

- Content area: `padding: 0 var(--space-4)`, bottom padding `calc(64px + env(safe-area-inset-bottom) + var(--space-4))`
- Full-width cards with `var(--space-3)` gap
- Bottom nav: 4 tabs (Home, New Run, Planned, Profile), icons + labels
- FAB alternative for "New Run" considered and rejected — bottom nav is simpler and more discoverable

### 3.3 Desktop Layout (≥ 1024px)

```
┌────────────────────────────────────────────┐
│  Top Nav Bar (64px)                        │
│  [Logo]    [Home] [Planned] [Profile]  [🌙]│
├────────────────────────────────────────────┤
│                                            │
│    ┌──────────────────────────────────┐    │
│    │  Centered Content (max 1200px)   │    │
│    │  with page-specific layouts      │    │
│    │                                  │    │
│    └──────────────────────────────────┘    │
│                                            │
└────────────────────────────────────────────┘
```

- Top nav replaces bottom nav at `xl` (1024px) breakpoint
- Content area: `max-width: 1200px`, centered with `margin: 0 auto`
- Dashboard uses multi-column grid
- Map pages use split-panel (existing pattern, refined)
- "New Run" becomes a nav item or prominent button in top bar

### 3.4 Tablet Layout (768px – 1023px)

- Still uses bottom nav (thumb-friendly)
- Content gets wider padding: `var(--space-6)`
- Cards in 2-column grid where appropriate (Dashboard run cards)
- Stats cards in 4-column grid

### [UPDATED] 3.5 AppShell Component

> *Updated per UX review [A-2]: Added global `aria-live` announcement region for consistent status messaging.*

New `<AppShell>` component wraps all authenticated pages:

```tsx
interface AppShellProps {
  children: React.ReactNode;
}

function AppShell({ children }: AppShellProps) {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <TopNav />      {/* hidden below xl */}
      <main id="main-content" className="app-content">
        {children}
      </main>
      <BottomNav />   {/* hidden at xl+ */}
      {/* Global announcement region for async operations */}
      <div
        id="announcements"
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
      />
    </>
  );
}
```

**Global `aria-live` strategy:**
1. AppShell includes a persistent `<div aria-live="polite" id="announcements">` near the end of the DOM, visually hidden.
2. A `useAnnounce()` hook lets any component push status messages: `announce("Run saved successfully")`.
3. Toast component uses its own `role="status"` / `role="alert"` (visual + audible).
4. Page navigation announces new page title via the announcements region (React Router `useLocation` integration).
5. All async operations (save, delete, complete) must announce their result via `useAnnounce()`.

### 3.6 Page Transitions

**CSS-only transitions.** No animation library for page transitions.

Simple opacity + translateY fade-in on route change using React Router's view transition support (or a lightweight CSS class toggle):

```css
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}
```

Wrap with `@media (prefers-reduced-motion: reduce)` to disable.

### [UPDATED] 3.7 Offline & Connectivity Handling

> *Added per UX review [U-2]: Design offline/network-error handling.*

**Phase 1 (minimum):** A `ConnectionStatus` banner component:
- Detects offline state via `navigator.onLine` + `online`/`offline` events
- When offline, shows a persistent top banner: **"You're offline. Some features may not work."** with `role="alert"`
- When back online, shows a brief success banner: **"You're back online."** with auto-dismiss (3s)
- Banner sits between TopNav/BottomNav and content — doesn't push content, overlays with `position: fixed`

**Phase 2 (future enhancement):** Queue form submissions for retry when connection restores. Show "Saved locally — will sync when online" for create/edit forms.

**Error recovery pattern (all API calls):**
- On network error: show error message + **"Try Again"** button
- On server error (5xx): show "Something went wrong" + **"Try Again"** button
- On auth error (401): redirect to login
- On validation error (4xx): show inline field errors

### [UPDATED] 3.8 Pull-to-Refresh

> *Added per UX review [U-5]: Design pull-to-refresh behavior.*

**Priority:** P2 (future enhancement, document now for implementation later).

On mobile, Dashboard and PlannedRunsPage support pull-to-refresh:
- Use native CSS `overscroll-behavior` + a lightweight gesture handler (no library — use `touchstart`/`touchmove`/`touchend`)
- Show a spinner at the top of the scrollable content area
- Re-fetch page data on pull
- Debounce: minimum 1s between refreshes

For initial implementation, a visible "Refresh" button in the PageHeader is an acceptable simpler alternative.

---

## 4. Page-by-Page Redesign Plan

### [UPDATED] 4.1 Dashboard (Home)

> *Updated per UX review [A-3, A-7, U-7, P-2, P-4, I-2]: RunCard as Link, heading hierarchy, empty state CTAs, lazy-loaded charts, CLS prevention, text expansion safety.*

**Current state:** Single-column list. Greeting. StatsCards (2×2 grid → 4-col on desktop). Weekly + Monthly bar charts. Run cards stacked vertically. No empty-state illustration.

**Proposed layout:**

**Mobile:**
```
┌──────────────────────────┐
│  "Good morning, Barak"   │  ← <h1>
│  subtitle: date          │
├──────────────────────────┤
│  Stats Cards (2×2 grid)  │
│  [Distance] [Runs]       │
│  [Time]     [Pace]       │
├──────────────────────────┤
│  "Weekly Distance" <h2>  │
│  Weekly Distance Chart   │
│  (card, full width)      │
├──────────────────────────┤
│  "Monthly Distance" <h2> │
│  Monthly Distance Chart  │
│  (card, full width)      │
├──────────────────────────┤
│  "Recent Runs"    <h2>   │
│  ┌────────────────────┐  │
│  │ Run Card (Link)    │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ Run Card (Link)    │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

**Desktop (≥ 1024px):**
```
┌────────────────────────────────────────┐
│  "Good morning, Barak"       [+ New]   │
├────────────────────────────────────────┤
│  Stats Cards (4-col grid)              │
│  [Dist] [Runs] [Time] [Pace]          │
├──────────────────┬─────────────────────┤
│  Weekly Chart    │  Monthly Chart      │
│  (card)          │  (card)             │
├──────────────────┴─────────────────────┤
│  "Recent Runs"                         │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Run Card │ │ Run Card │ │ Run    │ │
│  └──────────┘ └──────────┘ └────────┘ │
└────────────────────────────────────────┘
```

**Key components:**
- `PageHeader` — greeting + optional action button
- `StatsCards` — refactored to use design tokens. Labels use `text-overflow: ellipsis` as safety net for i18n text expansion (~35% budget for German).
- `WeeklyDistanceChart` — Recharts, restyled with chart tokens. **Lazy-loaded** via `React.lazy()` with `Skeleton` fallback to protect LCP. Chart container has `min-height: 200px` to prevent CLS.
- `MonthlyDistanceChart` — Same lazy-loading strategy. `min-height: 200px`.
- `RunCard` — extracted shared component (used on Dashboard + PlannedRunsPage). **Renders as `<Link to={/runs/${runId}}>` for navigation** (not `div[role="button"]`). Only use `role="button"` + `onClick` for non-navigation actions.
- `EmptyState` — extracted shared component with illustration slot

**Empty states:**
- No runs at all: "No runs yet. Time to hit the road!" + **"Log Your First Run" button** → NewRunPage
- No recent runs (all planned): "All your runs are planned. Complete one to see it here!" + **"View Planned Runs" button** → PlannedRunsPage
- Charts with zero data: Show chart container with "Not enough data yet" centered message. No empty chart axes.

**Accessibility:**
- Charts: add `aria-label` to chart container describing the data (e.g., "Weekly running distance bar chart, showing the last 8 weeks")
- Charts: add visually-hidden data table as screen-reader alternative (using `ChartAccessibility` wrapper — see §5.1)
- Run cards: accessible name derived from Link content (title, date, distance)
- Stats comparison arrows: add `aria-label` (e.g., "Up 15% from last week")
- Loading: `aria-live="polite"` on loading region
- Error: `role="alert"` on error messages + **"Try Again" retry button**

### [UPDATED] 4.2 NewRunPage

> *Updated per UX review [AC-2, AC-3, A-6, U-6]: Comprehensive map keyboard accessibility, touch targets, reduced motion for map, cooperative gestures.*

**Current state:** Split-panel (mobile: stacked map + form; desktop: 45/55 grid). Map toggle button on mobile. Form below with slide-up rounded card effect. Works reasonably well.

**Proposed layout:**

**Mobile:**
```
┌──────────────────────────┐
│  Map (40vh, expandable)  │
│  [Location Search]       │
│  [Distance overlay]      │
├──────────────────────────┤
│  ╭── Form Card ──────╮   │  ← pull-up sheet style
│  │  "New Run"  <h1>   │   │
│  │  [Title]           │   │
│  │  [Date] [Time]     │   │  ← side-by-side
│  │  [Completed|Plan]  │   │
│  │  [Duration]        │   │
│  │  [Audio section]   │   │
│  │  [Notes]           │   │
│  │  [Save Run]        │   │
│  ╰────────────────────╯   │
└──────────────────────────┘
```

**Desktop (≥ 1024px):**
```
┌───────────────────┬────────────────────────┐
│  Form (scrollable)│  Map (sticky, full h)  │
│  max-width: 540px │                        │
│                   │  [Location Search]     │
│  "New Run"        │                        │
│  [Title]          │  [Distance + controls] │
│  [Date] [Time]    │                        │
│  ...              │                        │
│  [Save Run]       │                        │
└───────────────────┴────────────────────────┘
```

**Changes from current:**
- Remove the explicit "Hide Map"/"Show Map" toggle — instead, on mobile, the form card overlaps the bottom of the map with a drag handle. Simpler UX.
- Date + Time inputs side-by-side on all screen sizes (currently only desktop)
- Add form validation feedback inline (on blur, not on submit only)
- Status toggle restyled as a segmented control with clear visual distinction

**Map Keyboard Accessibility:**

1. Map container is focusable (`tabIndex={0}`) with a visible focus ring (`--color-focus-ring`)
2. `aria-label="Route drawing map. Use arrow keys to pan, Enter to add waypoint, or use the waypoint list below."`
3. When map is focused:
   - **Arrow keys** pan the map (MapLibre supports this natively — ensure not disabled)
   - **Enter/Space** adds a waypoint at the map center (crosshair indicator shown when focused)
   - **Delete/Backspace** removes the last waypoint
4. **Waypoint list below map** as `<ol>` with each item showing coordinates/address and a **Remove** button (≥44×44px). This is the keyboard-accessible alternative to clicking markers on the map.
5. **`aria-live="polite"` region** announces waypoint changes: "Waypoint 3 added. Route distance: 2.4 km" / "Waypoint 2 removed. Route distance: 1.1 km"
6. **Waypoint markers:** increased from 28×28px to **48×48px** with padding to meet 44px minimum touch target. Use `border-radius: 50%` with `var(--color-secondary)` fill and white border.

**Mobile Map Scroll Prevention:**

Enable `cooperativeGestures` on MapLibre for mobile viewports:
- Require two-finger pan to move the map
- Show semi-transparent overlay message on single-finger touch: "Use two fingers to move the map"
- On desktop, single-click/single-finger interaction is default (no cooperative gestures needed)

```ts
const isMobile = window.matchMedia('(max-width: 767px)').matches;
const map = new maplibregl.Map({
  cooperativeGestures: isMobile,
  // ...
});
```

**Mobile Map Lazy-Loading:**

On mobile viewports, defer MapLibre initialization until the map container enters the viewport (IntersectionObserver). On desktop split-panel, map is always visible, so initialize immediately.

**Reduced Motion:**

When `prefers-reduced-motion: reduce` is active:
- Replace `map.flyTo()` with `map.jumpTo()` (instant, no animation)
- Remove marker hover scale transitions
- Disable smooth panning animations

**Accessibility:**
- Form inputs: `aria-describedby` linking to validation error messages
- Duration input: `aria-description="Format: hours colon minutes colon seconds"`
- Disable map click-to-add while focus is in form (prevents accidental waypoints)

### [UPDATED] 4.3 RunDetailPage

> *Updated per UX review [A-5, P-3, P-5, U-1]: Breadcrumb fix, map lazy-loading on mobile, Spotify art optimization, error retry.*

**Current state:** Split-panel like NewRunPage. View mode shows stats grid + notes + Spotify card. Edit mode inline. Delete with `window.confirm()`.

**Proposed layout:**

**Mobile:**
```
┌──────────────────────────┐
│  Map (40vh) or           │
│  "No route" placeholder  │
├──────────────────────────┤
│  ╭── Detail Card ─────╮  │
│  │  "Morning Run" <h1> │  │
│  │  Apr 1, 2026 7:30am│  │
│  │                     │  │
│  │  <h2> Stats         │  │
│  │  ┌─────┐ ┌─────┐   │  │
│  │  │5.2km│ │32:15│   │  │
│  │  └─────┘ └─────┘   │  │
│  │  ┌─────┐ ┌─────┐   │  │
│  │  │6:12 │ │320  │   │  │
│  │  │/km  │ │kcal │   │  │
│  │  └─────┘ └─────┘   │  │
│  │                     │  │
│  │  <h2> Audio         │  │
│  │  🎵 Spotify Card    │  │
│  │                     │  │
│  │  <h2> Notes         │  │
│  │  "Felt..."          │  │
│  │                     │  │
│  │  [Edit] [Delete]    │  │
│  ╰─────────────────────╯  │
└──────────────────────────┘
```

**Desktop:** Same split-panel as current (form left, map right). Refined styling.

**Changes from current:**
- Delete confirmation: replace `window.confirm()` with custom `ConfirmDialog` component for consistent styling
- Edit mode: animate transition (card content fades, form slides in)
- Add breadcrumb: "← Back to runs"
- Stats grid: 2-col on mobile, 3-col on desktop (current behavior — keep)
- Add elevation gain badge with 🏔️ icon (currently plain text)
- **Error state: include "Try Again" retry button** that re-fetches run data

**Mobile map lazy-loading:** On mobile viewports, use IntersectionObserver to defer MapLibre initialization until the map container scrolls into view. On desktop split-panel, initialize immediately.

**Spotify album art optimization:**
- Add explicit `width` and `height` attributes (e.g., `width="64" height="64"`) to prevent CLS
- Add `loading="lazy"` attribute
- Display size: 64×64px on mobile, 80×80px on desktop
- Images served by Spotify CDN (i.scdn.co) — we can't control format but can control display size
- Consider a small colored placeholder (album dominant color if available, else `--color-bg-tertiary`) while loading

**Accessibility:**
- Breadcrumb: `<nav aria-label="Breadcrumb">` with `<ol>`:
  ```html
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Runs</a></li>
      <li><a href="/runs/123" aria-current="page">Morning Run</a></li>
    </ol>
  </nav>
  ```
  Note: `aria-current="page"` goes on the **current page item**, not the back link.
- Stats: use `<dl>` (definition list) for stat label/value pairs — more semantic
- Delete: `ConfirmDialog` with proper focus trap, `role="alertdialog"`, `aria-describedby`
- Edit/view mode transition: announce via `aria-live` region

### [UPDATED] 4.4 PlannedRunsPage

> *Updated per UX review [AC-1, U-4, U-7]: Complete modal focus-return strategy, form validation, empty state CTA.*

**Current state:** Simple card list. "Run it!" opens a modal for duration input. Delete with `window.confirm()`. No empty-state illustration.

**Proposed layout:**

**Mobile:**
```
┌──────────────────────────┐
│  "Planned Runs"  <h1>    │
│  subtitle: "X upcoming"  │
├──────────────────────────┤
│  ┌────────────────────┐  │
│  │ Run Card           │  │
│  │ [map] [title]      │  │
│  │ [date] [distance]  │  │
│  │ [Run it!] [Delete] │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ Run Card           │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

**Desktop:** 2-column card grid.

**Changes from current:**
- Use shared `RunCard` component
- Use shared `ConfirmDialog` for delete
- Complete-run modal: replace with `Modal` shared component (proper focus trap, Escape key, scroll lock)
- Empty state: use shared `EmptyState` with **"Plan a Run" CTA button** linking to NewRunPage
- Add count badge in header ("3 planned")

**Complete Run Modal — Form Validation:**

Duration input must validate format inline:
- Validate on blur and on submit attempt
- Accepted formats: `MM:SS` or `HH:MM:SS`
- Error message (shown inline below input via `aria-describedby`): **"Enter duration as MM:SS or HH:MM:SS (e.g., 32:15)"**
- Submit button disabled until format is valid
- On successful completion, show success toast and remove card from list

**Accessibility:**
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape to close
- **Focus returns to the specific trigger button that opened the modal** (see §5.1 Modal spec for the complete focus management pattern)
- Duration input in modal: `aria-describedby` for format hint + validation error
- Card list: `<ul>` with `<li>` for semantic list structure

### [UPDATED] 4.5 ProfilePage

> *Updated per UX review [U-8]: Removed sign-out confirmation dialog.*

**Current state:** View/edit toggle. View mode shows labels + values. Edit mode shows form. Sign out button at bottom.

**Proposed layout:**

**Mobile:**
```
┌──────────────────────────┐
│  "Profile"  <h1>         │
├──────────────────────────┤
│  ╭── Card ────────────╮  │
│  │  Avatar circle (?)  │  │  ← initials-based, future: upload
│  │  "Barak"            │  │
│  │  barak@example.com  │  │
│  ├─── Divider ─────────┤  │
│  │  <h2> Personal Info │  │
│  │  Height:  175 cm    │  │
│  │  Weight:  72 kg     │  │
│  ├─── Divider ─────────┤  │
│  │  <h2> Preferences   │  │
│  │  ☑ Weekly  ☑ Monthly│  │
│  ├─── Divider ─────────┤  │
│  │  [Edit Profile]     │  │
│  │                     │  │
│  │  [Sign Out]         │  │  ← no confirmation needed
│  ╰─────────────────────╯  │
└──────────────────────────┘
```

**Desktop:** Same card, centered, max-width 480px. Comfortable reading width.

**Changes from current:**
- Add avatar placeholder (initials circle, colored based on name hash)
- Group fields into sections with `Divider` component
- Edit mode: same card transforms to form (no page change)
- Success toast notification instead of inline success banner
- **Sign out: NO confirmation dialog.** Just sign out immediately. Sign-out is non-destructive (no data loss), easily reversible (sign back in), and an intentional action (buried in profile page). Adding a confirmation dialog would be unnecessary friction. Adequate spacing between Edit and Sign Out buttons prevents accidental taps.

**Accessibility:**
- Form: all inputs have associated labels (already done ✅)
- Success/error: use toast with `role="status"` / `role="alert"`
- Sign out button: ensure adequate spacing from edit button (minimum `var(--space-6)` gap)

### 4.6 ProfileSetupPage

**Current state:** Simple form card. Minimal styling (uses `shared.module.css`). Inline styles for subtitle color.

**Proposed layout:**

**Mobile:**
```
┌──────────────────────────┐
│                          │
│  🏃 (icon/illustration)  │
│  "Welcome to             │  ← <h1>
│   RunMapRepeat"          │
│  "Let's set up your      │
│   profile"               │
│                          │
│  ╭── Card ────────────╮  │
│  │  [Email]           │  │
│  │  [Display Name]    │  │
│  │  [Height]  [Weight]│  │  ← side-by-side
│  │                    │  │
│  │  [Get Started →]   │  │
│  ╰────────────────────╯  │
└──────────────────────────┘
```

**Changes from current:**
- Welcome illustration/icon above the form
- Height + Weight fields side-by-side (related, short values)
- Button text: "Get Started" instead of "Complete Setup" (more welcoming)
- Progress indicator: step 1 of 1 (future-proofs for multi-step onboarding)
- Remove inline styles

**Accessibility:**
- Required fields: `aria-required="true"` + visual asterisk
- Inline validation: error messages linked via `aria-describedby`

### 4.7 LoginPage / RegisterPage

**Current state:** Centered card with form. Blue accent color (#2563eb) — different from app's orange. Minimal but functional.

**Proposed changes:**
- Align colors with design system (use `--color-primary` for button, `--color-secondary` for links)
- Add app logo/branding at top
- Add "show password" toggle button
- Improve error messages (currently raw auth errors) — use `role="alert"`, design token colors
- Mobile: card takes full width with padding (no max-width card on small screens)
- Error state: **include "Try Again" guidance** or clear instructions on how to recover

---

## 5. Component Inventory

### [UPDATED] 5.1 New Shared Components to Create

> *Updated per UX review [AC-1, DS-5, IP-4, A-1, U-1]: Added Modal focus-return spec, Divider, ThemeToggle, ChartAccessibility wrapper, error retry pattern.*

| Component | Description | Priority |
|-----------|-------------|----------|
| `Button` | Primary, secondary, danger, ghost variants. Loading state. Icon slot. Min 44×44px touch target. | P0 |
| `Input` | Text, email, number, password. Label, error, hint slots. | P0 |
| `Textarea` | Extends Input pattern. Auto-resize option. | P0 |
| `Card` | Container with padding, radius, shadow. Header/body/footer slots. | P0 |
| `Modal` | Focus trap, Escape key, scroll lock, portal. Title, body, actions. **Complete focus management (see below).** | P0 |
| `ConfirmDialog` | Extends Modal. Confirm/cancel pattern with danger variant. **Confirm button NOT auto-focused for destructive actions.** | P0 |
| `Toast` | Success/error/info. Auto-dismiss. Stacking. `aria-live`. | P1 |
| `Skeleton` | Shimmer loading placeholder. Line, circle, rect variants. | P1 |
| `EmptyState` | Icon/illustration + message + **CTA action button** (required for actionable empty states). | P1 |
| `ErrorState` | Error icon + human-readable message + **"Try Again" retry button**. Extends EmptyState pattern. `role="alert"`. | P1 |
| `Badge` | Small colored label. Variants: default, success, warning, error. | P1 |
| `SegmentedControl` | Toggle between options. `role="radiogroup"` + `role="radio"`. **Required `aria-label` prop.** | P1 |
| `Divider` | Horizontal rule with `--color-border-secondary`, `--space-4` vertical margin. Optional centered label text (text over line). | P2 |
| `ThemeToggle` | Icon button (Moon/Sun icon). `aria-label="Switch to dark mode"` / `"Switch to light mode"`. Calls `useTheme().setTheme()`. | P1 |
| `Avatar` | Initials-based circle with color hash. Image slot for future. | P2 |
| `Tooltip` | Simple text tooltip on hover/focus. | P2 |
| `ChartAccessibility` | Wrapper component that renders a chart and a `<VisuallyHidden>` data table. Accepts `columns` and `data` props. Design system pattern — every chart must use this. | P1 |
| `VisuallyHidden` | Screen-reader-only text utility component. | P0 |
| `SkipLink` | "Skip to content" link for keyboard nav. | P0 |
| `PageHeader` | Title + optional subtitle + optional action. Consistent across pages. | P0 |
| `ConnectionBanner` | Offline/online status banner. `role="alert"`. Auto-shows on connectivity loss. | P2 |

**Modal — Complete Focus Management Pattern:**

```
On Open:
  1. Capture `document.activeElement` as `returnFocusTarget`
  2. Move focus to the first focusable element inside the modal
     (or the modal container itself if no focusable children)
  3. Lock body scroll
  4. Activate focus trap (Tab/Shift+Tab cycle within modal)

On Close (Escape key, backdrop click, or action button):
  1. Release focus trap
  2. Unlock body scroll
  3. Restore focus to `returnFocusTarget`
  4. If `returnFocusTarget` no longer exists in the DOM
     (e.g., the item was deleted), focus the nearest logical
     ancestor: try the list container, then the page heading (<h1>)

ConfirmDialog — additional rules for destructive actions:
  - Focus the Cancel button on open (NOT the destructive Confirm button)
  - Confirm button uses danger variant styling
  - Must explicitly state what will be lost: "This run will be permanently deleted."
  - Enter key should NOT trigger the destructive action (prevent accidental confirmation)
```

**ErrorState — Retry Pattern (design system rule):**

Every API-driven page must handle errors with:
```tsx
<ErrorState
  icon={<AlertCircle />}
  message="Failed to load your runs."
  action={<Button onClick={refetch}>Try Again</Button>}
/>
```

### 5.2 Existing Components to Refactor

| Component | Changes Needed |
|-----------|---------------|
| `BottomNav` | Replace emoji icons with SVG icons. Add `aria-label="Main navigation"`. Responsive hide at xl. Increase label size to `--text-xs` (min 11px). |
| `StatsCards` | Use design tokens. Extract skeleton to shared `Skeleton` component. Add `text-overflow: ellipsis` on labels (i18n safety). Match skeleton height to rendered height (CLS prevention). |
| `WeeklyDistanceChart` | Remove inline color constants → use chart tokens. Add `aria-label`. Wrap in `ChartAccessibility`. Add `min-height: 200px` on container. |
| `MonthlyDistanceChart` | Remove inline color constants → use chart tokens. Add `aria-label`. Wrap in `ChartAccessibility`. Add `min-height: 200px` on container. |
| `RunMap` | Replace inline marker styles with CSS classes. **Increase marker size to 48×48px.** Add keyboard controls (see §4.2). Add waypoint list `<ol>`. Enable `cooperativeGestures` on mobile. Respect `prefers-reduced-motion` (flyTo→jumpTo). |
| `RouteMap` | Add `aria-label`. Enable `cooperativeGestures` on mobile. Respect `prefers-reduced-motion`. |
| `SpotifySearch` | Use shared `Input`, `Badge`, `Button` components. |
| `LocationSearch` | Use shared `Input`. Dropdown must inherit theme colors (dark mode). |
| `LoginPage` | Use design system colors + shared `Input`, `Button`. |
| `RegisterPage` | Use design system colors + shared `Input`, `Button`. |

### 5.3 Components to Extract from Existing Code

| New Component | Extracted From | Reason |
|--------------|----------------|--------|
| `RunCard` | `Dashboard.tsx` inline JSX | Used in Dashboard + PlannedRunsPage. Renders as `<Link>` for navigation. |
| `StatItem` | `RunDetailPage.tsx` stats grid | Reusable stat display unit |
| `SpotifyCard` | `RunDetailPage.tsx` inline JSX | Reusable music display. Album art: `width`/`height` attrs + `loading="lazy"`. |
| `FormGroup` | `shared.module.css` `.formGroup` | Standardize label+input+error pattern |

---

## [UPDATED] 6. Implementation Plan — Ordered Tasks

> *Updated per UX review [IP-1, IP-2, IP-3, IP-4, IP-5]: Moved a11y testing to Phase 2, split Dashboard task, moved AppShell earlier, added ThemeToggle task, added responsive visual regression tests.*

### Phase 1: Design System Foundation

#### Task 1.1 — Design Tokens CSS

**Complexity:** S  
**Dependencies:** None  
**Files affected:**
- Create `frontend/src/styles/tokens/colors.css` (includes chart palette, focus-ring, overlay)
- Create `frontend/src/styles/tokens/typography.css`
- Create `frontend/src/styles/tokens/spacing.css`
- Create `frontend/src/styles/tokens/components.css` (includes composite transition tokens)
- Create `frontend/src/styles/tokens/index.css`
- Modify `frontend/src/styles/global.css`

**Work:**
1. Create token files as specified in §2 (including all [UPDATED] tokens: chart colors, focus-ring, overlay, composite transitions)
2. Update `global.css` to import tokens and apply base styles:
   - `body { font-family: var(--font-sans); color: var(--color-text-primary); background: var(--color-bg-secondary); }`
3. Add CSS reset using modern techniques (inherit box-sizing, remove default margins)
4. Add self-hosted Inter font files + `<link rel="preload">` in `index.html`
5. **Do NOT add Google Fonts CDN** — self-host only

**Acceptance criteria:**
- All token CSS custom properties are defined on `:root` (including chart, focus, overlay tokens)
- Dark mode tokens are defined on `:root[data-theme="dark"]` and via `@media (prefers-color-scheme: dark)`
- `--color-text-tertiary` passes 4.5:1 AA contrast in both modes
- `global.css` imports all token files
- Body text renders in Inter font (self-hosted)
- No visual regressions (tokens are defined but not yet consumed)
- Vitest: snapshot test that tokens file parses correctly

---

#### Task 1.2 — ThemeProvider + Dark Mode Toggle

**Complexity:** S  
**Dependencies:** 1.1  
**Files affected:**
- Create `frontend/src/providers/ThemeProvider.tsx`
- Modify `frontend/src/App.tsx`
- Modify `frontend/src/main.tsx` (or `index.html` for flash prevention)

**Work:**
1. `ThemeProvider` context with `theme: 'light' | 'dark' | 'system'`
2. Read `localStorage` on mount, set `data-theme` on `<html>`
3. Listen to `prefers-color-scheme` changes
4. Expose `useTheme()` hook
5. Add inline script in `index.html` `<head>` to set `data-theme` before React hydration (prevents flash of wrong theme)

**Acceptance criteria:**
- Theme toggles between light/dark/system
- Persists across page reloads
- No flash of incorrect theme on load
- Unit tests for ThemeProvider (localStorage mock, media query mock)

---

### Phase 2: Shared Components

> *[UPDATED]: axe-core / vitest-axe integration starts here (was Phase 5). Every component test must include `expect(results).toHaveNoViolations()` from day one.*

**Phase 2 rule: Install `vitest-axe` as a dev dependency in Task 2.1. Every subsequent shared component test MUST include an axe-core accessibility check.**

#### Task 2.1 — Button Component + axe-core Test Infrastructure

**Complexity:** S  
**Dependencies:** 1.1  
**Files affected:**
- Create `frontend/src/components/ui/Button.tsx`
- Create `frontend/src/components/ui/Button.module.css`
- Install `vitest-axe` dev dependency
- Create test setup for axe integration

**Work:**
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}
```

- All variants use design tokens
- `min-height: 44px` (touch target)
- Loading state: spinner + disabled
- `fullWidth` prop replaces inline `style={{ width: '100%' }}`
- Focus-visible ring: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px;`
- **Set up `vitest-axe`** — add to test setup, create helper function for a11y test pattern

**Acceptance criteria:**
- All 4 variants render correctly (visual)
- Disabled state works
- Loading state shows spinner and prevents clicks
- Focus ring visible on keyboard navigation (uses `--color-focus-ring`, not `--color-primary`)
- **axe-core test passes: `expect(results).toHaveNoViolations()`**
- Unit tests: renders, fires onClick, disabled doesn't fire, loading state

---

#### Task 2.2 — Input + Textarea + FormGroup Components

**Complexity:** M  
**Dependencies:** 1.1  
**Files affected:**
- Create `frontend/src/components/ui/Input.tsx`
- Create `frontend/src/components/ui/Input.module.css`
- Create `frontend/src/components/ui/Textarea.tsx`
- Create `frontend/src/components/ui/FormGroup.tsx`
- Create `frontend/src/components/ui/FormGroup.module.css`

**Work:**
```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

interface FormGroupProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}
```

- `FormGroup` wraps label + input + error/hint with proper `aria-describedby` wiring
- Error state: red border + error message below
- Focus state: `var(--color-focus-ring)` border + ring
- All use design tokens

**Acceptance criteria:**
- Label correctly associated via `htmlFor`/`id`
- Error message linked via `aria-describedby`
- Hint text linked via `aria-describedby`
- Minimum touch target 44px
- **axe-core test passes**
- Unit tests for error rendering, accessibility attributes

---

#### Task 2.3 — Card Component

**Complexity:** S  
**Dependencies:** 1.1  
**Files affected:**
- Create `frontend/src/components/ui/Card.tsx`
- Create `frontend/src/components/ui/Card.module.css`

**Work:**
```tsx
interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean; // adds hover effect + cursor pointer
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  as?: 'div' | 'article' | 'section';
  className?: string;
}
```

- Uses `var(--color-bg-primary)`, `var(--shadow-md)`, `var(--radius-md)`
- `interactive` variant: subtle hover shadow lift, `role="button"`, `tabIndex={0}`

**Acceptance criteria:**
- Renders with correct token-based styles
- Interactive variant has hover effect and keyboard support
- Can be composed with className
- **axe-core test passes**
- Unit test: renders, interactive click works

---

#### Task 2.4 — Modal + ConfirmDialog Components

**Complexity:** M  
**Dependencies:** 1.1, 2.1  
**Files affected:**
- Create `frontend/src/components/ui/Modal.tsx`
- Create `frontend/src/components/ui/Modal.module.css`
- Create `frontend/src/components/ui/ConfirmDialog.tsx`

**Work:**
- Portal to `document.body`
- **Focus management per §5.1 pattern:** capture `document.activeElement` on open, restore on close, fallback to heading if trigger removed
- Focus trap (first/last focusable element cycling)
- Escape key to close
- Click outside backdrop to close (configurable)
- Scroll lock on body
- Backdrop uses `var(--color-overlay)` token
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- Animate: fade in overlay + scale up content
- `ConfirmDialog`: title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant (danger/default)
- **Danger variant: focus Cancel button on open, NOT Confirm. Enter key does NOT trigger Confirm.**

**Acceptance criteria:**
- Focus moves to modal on open
- **Focus returns to the exact trigger element on close**
- **If trigger element was removed (e.g., deleted item), focus moves to nearest ancestor or page heading**
- Tab key cycles within modal (focus trap)
- Escape key closes modal
- Backdrop click closes modal
- Screen reader announces dialog
- Body scroll is locked while open
- **Danger ConfirmDialog: Cancel is focused on open, Enter doesn't trigger Confirm**
- **axe-core test passes**
- Unit tests: open/close, focus trap, keyboard, accessibility, return focus

---

#### Task 2.5 — Toast Component + Provider

**Complexity:** M  
**Dependencies:** 1.1  
**Files affected:**
- Create `frontend/src/components/ui/Toast.tsx`
- Create `frontend/src/components/ui/Toast.module.css`
- Create `frontend/src/providers/ToastProvider.tsx`

**Work:**
- `ToastProvider` wraps app, provides `useToast()` hook
- `useToast().show({ message, variant, duration })` — `variant`: success, error, info
- Renders in portal, positioned top-right (desktop) or top-center (mobile)
- Auto-dismiss after `duration` (default 4000ms)
- Stacks multiple toasts with gap
- `role="status"` for info/success, `role="alert"` for error
- Dismiss on click or swipe
- `@media (prefers-reduced-motion: reduce)`: no animation, just appear/disappear

**Acceptance criteria:**
- Toasts appear and auto-dismiss
- Multiple toasts stack
- Error toast uses `role="alert"`
- Respects reduced motion
- **axe-core test passes**
- Unit tests: show/hide, auto-dismiss, accessibility roles

---

#### Task 2.6 — Skeleton, EmptyState, ErrorState, Badge, VisuallyHidden, SkipLink, ChartAccessibility

**Complexity:** M  
**Dependencies:** 1.1  
**Files affected:**
- Create `frontend/src/components/ui/Skeleton.tsx` + CSS module
- Create `frontend/src/components/ui/EmptyState.tsx` + CSS module
- Create `frontend/src/components/ui/ErrorState.tsx` + CSS module
- Create `frontend/src/components/ui/Badge.tsx` + CSS module
- Create `frontend/src/components/ui/VisuallyHidden.tsx`
- Create `frontend/src/components/ui/SkipLink.tsx` + CSS module
- Create `frontend/src/components/ui/ChartAccessibility.tsx`

**Work:**
- `Skeleton`: line, circle, rect variants with shimmer animation. Props: `width`, `height`, `variant`. Skeleton `min-height` must match rendered content height (CLS prevention).
- `EmptyState`: icon slot + title + description + **optional CTA action button** (e.g., "Plan a Run" → NewRunPage).
- `ErrorState`: extends EmptyState pattern. Error icon + message + **"Try Again" retry button**. `role="alert"`.
- `Badge`: pill shape, color variants (default, success, warning, error, info).
- `VisuallyHidden`: `position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0);`
- `SkipLink`: visible on focus, links to `#main-content`.
- `ChartAccessibility`: wrapper that renders children (the chart) + a `<VisuallyHidden>` `<table>` with the same data. Props: `label: string`, `columns: string[]`, `data: Array<Record<string, string | number>>`.

**Acceptance criteria:**
- Skeleton animates with shimmer
- EmptyState renders with all optional props including CTA button
- ErrorState includes retry button
- Badge has correct colors per variant
- VisuallyHidden is invisible but screen-reader accessible
- SkipLink visible on Tab key press
- ChartAccessibility renders hidden data table alongside chart
- **axe-core tests pass for all components**
- Unit tests for each component

---

#### Task 2.7 — SegmentedControl + PageHeader + Divider

**Complexity:** S  
**Dependencies:** 1.1  
**Files affected:**
- Create `frontend/src/components/ui/SegmentedControl.tsx` + CSS module
- Create `frontend/src/components/ui/PageHeader.tsx` + CSS module
- Create `frontend/src/components/ui/Divider.tsx` + CSS module

**Work:**
- `SegmentedControl`: replaces toggle groups. Props: `options: {label, value}[]`, `value`, `onChange`, **`aria-label` (required prop)**. Uses `role="radiogroup"` with `role="radio"` on each option. Keyboard: arrow keys to navigate, `aria-checked` state.
- `PageHeader`: title (h1), optional subtitle, optional action slot (right-aligned button).
- `Divider`: horizontal rule with `--color-border-secondary`, `--space-4` vertical margin. Optional `label` prop (centered text over line, uses `--color-text-secondary`).

**Acceptance criteria:**
- SegmentedControl: keyboard navigation (arrow keys), `aria-checked` state, **`aria-label` is required**
- PageHeader: semantic h1, responsive sizing
- Divider: renders with and without label
- **axe-core tests pass**
- Unit tests

---

#### [UPDATED] Task 2.8 — AppShell + SkipLink Integration

> *Moved from Phase 3 per UX review [IP-3]: AppShell should be available early so Phase 3+ migrations can use it.*

**Complexity:** M  
**Dependencies:** 1.1, 2.1, 2.6 (SkipLink, VisuallyHidden)  
**Files affected:**
- Create `frontend/src/components/layout/AppShell.tsx`
- Create `frontend/src/components/layout/AppShell.module.css`
- Refactor `frontend/src/components/NavBar/BottomNav.tsx` (token adoption, SVG icon prep, `aria-label`)
- Modify `frontend/src/App.tsx`
- Create `frontend/src/hooks/useAnnounce.ts`

**Work:**
1. `AppShell` wraps authenticated routes: SkipLink + `<main id="main-content">` + BottomNav + global `aria-live` announcements region
2. Refactor `BottomNav` to use design tokens, add `aria-label="Main navigation"`, increase label size to `--text-xs`
3. `useAnnounce()` hook: writes to the `#announcements` aria-live region
4. `App.tsx`: wrap protected routes in `<AppShell>`
5. TopNav deferred to Phase 3 (not needed until desktop polish)

**Acceptance criteria:**
- Skip-to-content link works
- `<main>` has `id="main-content"`
- `<nav>` has `aria-label="Main navigation"`
- `useAnnounce()` successfully announces messages to screen readers
- Page navigation announces new page title
- **axe-core tests pass**

---

### Phase 3: Icons, TopNav & Desktop Navigation

#### Task 3.1 — SVG Icon System

**Complexity:** S  
**Dependencies:** None  
**Files affected:**
- Create `frontend/src/components/ui/Icon.tsx`
- Create `frontend/src/components/ui/icons/` directory with individual icon files

**Work:**
- Inline SVG icon components (Home, Plus, ClipboardList, User, Moon, Sun, ChevronLeft, X, Check, AlertCircle, Search, Trash2, Edit, Music)
- Each icon: `width`/`height` props (default 24), `className`, `aria-hidden="true"` by default
- Replace emoji icons in BottomNav: 🏠→Home, ➕→Plus, 📋→ClipboardList, 👤→User

**Acceptance criteria:**
- Icons render at specified sizes
- `aria-hidden="true"` by default (decorative)
- Visually consistent stroke width and style
- Icons are tree-shakeable (individual imports)

---

#### Task 3.2 — TopNav + ThemeToggle + Desktop Switch

**Complexity:** M  
**Dependencies:** 1.2, 2.8, 3.1  
**Files affected:**
- Create `frontend/src/components/layout/TopNav.tsx`
- Create `frontend/src/components/layout/TopNav.module.css`
- Create `frontend/src/components/ui/ThemeToggle.tsx`
- Update `frontend/src/components/layout/AppShell.tsx` (add TopNav)
- Update `frontend/src/components/NavBar/BottomNav.tsx` (SVG icons, hide at xl)

**Work:**
1. `TopNav`: horizontal bar at top. Logo left. Nav links center. **ThemeToggle** + profile avatar right. `aria-label="Main navigation"`.
2. `ThemeToggle`: Moon/Sun icon button. `aria-label` toggles between "Switch to dark mode" / "Switch to light mode". Calls `useTheme().setTheme()`.
3. Update BottomNav: replace emoji with SVG icons, hide at `xl` with `display: none`.
4. Update AppShell to render TopNav (hidden below xl).

**Acceptance criteria:**
- Mobile: bottom nav visible, top nav hidden
- Desktop (≥ 1024px): top nav visible, bottom nav hidden
- Active route highlighted in both navs
- ThemeToggle works and has correct aria-label
- **axe-core tests pass**
- Unit tests: nav renders, active state, responsive visibility

---

### Phase 4: Page-by-Page Migration

#### [UPDATED] Task 4.1a — Extract RunCard + Refactor StatsCards

> *Split from original Task 4.1 per UX review [IP-2].*

**Complexity:** M  
**Dependencies:** 2.1, 2.2, 2.3, 2.6  
**Files affected:**
- Create `frontend/src/components/RunCard.tsx` + CSS module
- Refactor `frontend/src/components/Dashboard/StatsCards.tsx` + CSS module

**Work:**
1. Extract `RunCard` shared component from Dashboard inline JSX. Renders as `<Link>` for navigation.
2. Replace hardcoded colors in StatsCards with tokens
3. StatsCards labels: add `text-overflow: ellipsis` (i18n text expansion safety)
4. StatsCards skeleton: match exact rendered height (CLS prevention)
5. Use shared `Skeleton` component

**Acceptance criteria:**
- RunCard renders as `<Link>` (not `div[role="button"]`)
- StatsCards uses only design tokens
- Skeleton height matches rendered height
- RunCard is reusable across Dashboard and PlannedRunsPage
- **axe-core tests pass**
- Existing tests pass + new tests for RunCard

---

#### [UPDATED] Task 4.1b — Refactor Chart Components

> *Split from original Task 4.1 per UX review [IP-2].*

**Complexity:** M  
**Dependencies:** 2.6 (ChartAccessibility), 4.1a  
**Files affected:**
- Refactor `frontend/src/components/Dashboard/WeeklyDistanceChart.tsx` + CSS module
- Refactor `frontend/src/components/Dashboard/MonthlyDistanceChart.tsx`

**Work:**
1. Replace hardcoded colors with chart tokens (`--color-chart-1`, `--color-chart-grid`, etc.)
2. Read CSS vars via `getComputedStyle` for Recharts color props
3. Wrap each chart in `ChartAccessibility` component (visually-hidden data table)
4. Add `aria-label` to chart containers
5. Set `min-height: 200px` on chart containers (CLS prevention)
6. Charts loaded via `React.lazy()` with `Skeleton` fallback (LCP protection — charts not needed for initial paint)

**Acceptance criteria:**
- Charts use only chart design tokens
- Each chart has a visually-hidden data table
- Chart containers have min-height set
- Charts are lazy-loaded (separate Webpack/Vite chunk)
- **axe-core tests pass**

---

#### [UPDATED] Task 4.1c — Dashboard Page Layout

> *Split from original Task 4.1 per UX review [IP-2].*

**Complexity:** M  
**Dependencies:** 4.1a, 4.1b, 2.7 (PageHeader)  
**Files affected:**
- Refactor `frontend/src/pages/Dashboard.tsx`
- Refactor `frontend/src/styles/Dashboard.module.css`

**Work:**
1. Use `PageHeader`, `Card`, `EmptyState`, `ErrorState` shared components
2. Add desktop grid layout: charts side-by-side, run cards in 2-3 column grid
3. Add `aria-live="polite"` to loading region
4. Remove all inline styles
5. Implement empty states with CTAs (see §4.1)
6. Error state with "Try Again" retry button

**Acceptance criteria:**
- Dashboard renders using only design tokens
- Desktop: multi-column layout for charts and run cards
- Mobile: single-column, no wasted space
- All loading/error/empty states use shared components with CTAs
- Empty state for zero data charts shows message (not empty axes)
- No visual regressions
- **axe-core tests pass**
- Existing tests pass

---

#### Task 4.2 — PlannedRunsPage Redesign

**Complexity:** M  
**Dependencies:** 4.1a (RunCard), 2.4 (Modal)  
**Files affected:**
- Refactor `frontend/src/pages/PlannedRunsPage.tsx`
- Refactor `frontend/src/styles/PlannedRunsPage.module.css`

**Work:**
1. Use shared `RunCard` component
2. Replace inline modal with shared `Modal` component (focus trap, Escape, return-focus)
3. **Duration input: inline validation** (see §4.4) — validate on blur, show error "Enter duration as MM:SS or HH:MM:SS"
4. Use shared `ConfirmDialog` for delete
5. Use `PageHeader` with count badge
6. Use `EmptyState` with **"Plan a Run" CTA button** → NewRunPage
7. Desktop: 2-column card grid
8. Use `Button`, `Input`, `FormGroup` in modal
9. Error state with "Try Again" retry button

**Acceptance criteria:**
- Modal has proper focus trap and keyboard support
- **Focus returns to the specific trigger button that opened the modal**
- Duration input shows validation errors inline
- Delete uses ConfirmDialog (Cancel focused for danger variant)
- Empty state has CTA button
- Error state has retry button
- Desktop: 2-column grid
- **axe-core tests pass**
- Existing tests pass + updated for new component structure

---

#### Task 4.3 — NewRunPage Redesign

**Complexity:** L  
**Dependencies:** 2.1, 2.2, 2.7, 2.8  
**Files affected:**
- Refactor `frontend/src/pages/NewRunPage.tsx`
- Refactor `frontend/src/styles/NewRunPage.module.css`
- Refactor `frontend/src/components/Map/RunMap.tsx`
- Refactor `frontend/src/components/Map/RunMap.module.css`

**Work:**
1. Use shared `Button`, `Input`, `Textarea`, `FormGroup`, `SegmentedControl`
2. Replace inline styles with CSS module classes
3. Date + Time side-by-side layout at all breakpoints
4. Replace map toggle with drag-handle sheet pattern on mobile (or keep toggle with better UX)
5. Design token adoption for all colors
6. Add inline validation (error shown on blur for required fields)
7. **Map keyboard accessibility** (full spec in §4.2): focusable map, Enter to add waypoint, waypoint list `<ol>`, aria-live announcements
8. **Waypoint markers: 48×48px** (up from 28px)
9. **Mobile: cooperativeGestures** for map scroll prevention
10. **Mobile: lazy-load MapLibre** via IntersectionObserver
11. **Reduced motion: flyTo→jumpTo**, disable marker animations
12. SegmentedControl has `aria-label="Run status"`

**Acceptance criteria:**
- No hardcoded colors
- No inline styles
- All form inputs use shared components
- Map is keyboard-accessible (waypoints can be added/removed without mouse)
- Waypoint markers are ≥44px touch targets
- Mobile map doesn't hijack scroll
- Map respects reduced motion
- Status toggle uses SegmentedControl with aria-label
- Inline validation feedback
- **axe-core tests pass**
- Existing tests pass

---

#### Task 4.4 — RunDetailPage Redesign

**Complexity:** M  
**Dependencies:** 2.1, 2.2, 2.3, 2.4, 2.8  
**Files affected:**
- Refactor `frontend/src/pages/RunDetailPage.tsx`
- Refactor `frontend/src/styles/RunDetailPage.module.css`
- Create `frontend/src/components/SpotifyCard.tsx` + CSS module

**Work:**
1. Use shared `Button`, `Input`, `Textarea`, `FormGroup`, `Card` components
2. Replace `window.confirm()` with `ConfirmDialog`
3. Use design tokens throughout
4. Add breadcrumb navigation with correct `aria-current="page"` placement
5. Stats section: use `<dl>` semantic markup
6. Extract `SpotifyCard` component — album art with `width`/`height` attrs, `loading="lazy"`, 64×64px mobile / 80×80px desktop
7. Edit mode transition: add `aria-live` announcement
8. **Mobile: lazy-load map** via IntersectionObserver
9. **Mobile: cooperativeGestures** on RouteMap
10. **Error state: "Try Again" retry button** for failed data fetch

**Acceptance criteria:**
- Delete uses ConfirmDialog
- Breadcrumb with correct `aria-current` placement
- Spotify images have explicit dimensions (no CLS)
- Shared components used throughout
- No hardcoded colors
- Error state has retry button
- **axe-core tests pass**
- Existing tests pass

---

#### Task 4.5 — ProfilePage + ProfileSetupPage Redesign

**Complexity:** M  
**Dependencies:** 2.1, 2.2, 2.3, 2.5, 2.7 (Divider)  
**Files affected:**
- Refactor `frontend/src/pages/ProfilePage.tsx`
- Refactor `frontend/src/styles/ProfilePage.module.css`
- Refactor `frontend/src/pages/ProfileSetupPage.tsx`

**Work:**
1. Use shared components (`Button`, `Input`, `FormGroup`, `Card`, `Toast`, `Divider`)
2. Replace inline success banner with Toast notification
3. Add Avatar component (initials-based)
4. ProfileSetupPage: welcome illustration, side-by-side height/weight
5. Remove all inline styles
6. Design tokens throughout
7. **No sign-out confirmation** — just sign out immediately
8. Adequate spacing between Edit Profile and Sign Out buttons (`--space-6` min)

**Acceptance criteria:**
- Profile save shows toast notification
- Avatar displays initials
- No inline styles
- Sections separated by `Divider` component
- Sign out works immediately (no confirmation dialog)
- Shared components used
- **axe-core tests pass**
- Existing tests pass

---

#### Task 4.6 — LoginPage + RegisterPage Redesign

**Complexity:** S  
**Dependencies:** 2.1, 2.2  
**Files affected:**
- Refactor `frontend/src/auth/LoginPage.tsx`
- Refactor `frontend/src/styles/LoginPage.module.css`
- Refactor `frontend/src/auth/RegisterPage.tsx` (and its CSS if separate)

**Work:**
1. Align with design system colors (replace `#2563eb` blue with `--color-primary`)
2. Use shared `Button`, `Input`, `FormGroup`
3. Add password visibility toggle
4. Add app logo/branding
5. Mobile: full-width card (no max-width on small screens)
6. Error messages: use `role="alert"`, design token colors, clear recovery guidance

**Acceptance criteria:**
- Consistent with app design system
- Password toggle works
- Accessible error messages with recovery guidance
- Responsive: full-width on small screens
- **axe-core tests pass**
- Existing tests pass

---

### Phase 5: Micro-Interactions, Polish & Testing

#### Task 5.1 — Loading & Transition Polish

**Complexity:** S  
**Dependencies:** Phase 4 complete  
**Files affected:**
- All page components (minor additions)
- `AppShell.module.css`

**Work:**
1. Page enter animations (CSS: opacity + translateY, 200ms)
2. Card hover animations (subtle shadow lift, 150ms)
3. Button press animation (scale 0.98, 100ms)
4. Skeleton loading on all pages (not just StatsCards)
5. `@media (prefers-reduced-motion: reduce)` — disable all animations
6. Smooth scroll behavior: `html { scroll-behavior: smooth; }`
7. **CLS prevention audit:** verify all skeleton heights match rendered content heights. Chart containers have min-height. EmptyState components don't cause CLS.

**Acceptance criteria:**
- Animations are subtle and purposeful (200-350ms range)
- Reduced motion preference fully respected
- All pages have skeleton loading states
- **CLS < 0.1 on all pages** (verify with Lighthouse)
- No layout shift during transitions

---

#### Task 5.2 — Route-Based Code Splitting

**Complexity:** S  
**Dependencies:** Phase 4 complete  
**Files affected:**
- `frontend/src/App.tsx`

**Work:**
1. `React.lazy()` for each page component
2. `<Suspense fallback={<PageSkeleton />}>` wrapper
3. Vite will automatically create separate chunks
4. **Dashboard chart components** are already lazy-loaded from Task 4.1b — verify they're in separate chunks

```tsx
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const NewRunPage = lazy(() => import('./pages/NewRunPage').then(m => ({ default: m.NewRunPage })));
// ...
```

**Acceptance criteria:**
- `npm run build` produces separate chunks per route
- Chart components are in separate chunks from Dashboard shell
- Initial bundle size reduced (measure before/after)
- Suspense fallback shows skeleton
- No user-visible loading flash for cached routes

---

#### [UPDATED] Task 5.3 — Accessibility Verification Pass

> *Renamed from "Audit & Fix" to "Verification" — with axe-core running since Phase 2, this is now a verification pass, not a bug-finding pass.*

**Complexity:** M  
**Dependencies:** Phase 4 complete  
**Files affected:**
- Multiple files (targeted fixes if any remain)

**Work:**
1. Run axe-core automated audit on all pages (should be clean — issues caught in Phase 2-4)
2. Verify contrast on all text tokens (especially `--color-text-tertiary`)
3. Ensure all images have `alt` text (Spotify album art)
4. Verify focus order on every page
5. Test keyboard-only navigation end-to-end (tab through dashboard, Enter on run card, complete modal, Escape)
6. Verify chart screen-reader data tables render correctly
7. Verify map keyboard controls work (add waypoint, remove waypoint, pan)
8. Test with VoiceOver on macOS/iOS
9. **Verify heading hierarchy** matches §2.7 spec (no skips)
10. **Verify all touch targets ≥44px** with browser devtools measurement

**Acceptance criteria:**
- Zero axe-core violations on all pages
- Full keyboard navigation without traps
- All interactive elements have accessible names
- Charts have screen-reader alternatives
- Map is keyboard-operable
- All touch targets ≥44px
- Heading hierarchy correct on all pages
- Documented manual testing results

---

#### [UPDATED] Task 5.4 — Responsive Visual Regression Tests

> *Added per UX review [IP-5].*

**Complexity:** S  
**Dependencies:** Phase 4 complete  
**Files affected:**
- Create `frontend/e2e/visual/` test directory

**Work:**
1. Playwright screenshot tests at three viewports: mobile (375×667), tablet (768×1024), desktop (1280×800)
2. Test each page at each viewport
3. Verify:
   - Nav switching (bottom nav on mobile/tablet, top nav on desktop)
   - Grid layouts (stats cards, run cards, chart side-by-side)
   - No horizontal overflow at any viewport
   - Map cooperative gestures indicator on mobile
4. Screenshot baselines checked into repo
5. CI runs visual regression on PRs

**Acceptance criteria:**
- All pages have screenshot baselines at 3 viewports
- No horizontal overflow at any viewport
- Nav switching works at breakpoint
- CI pipeline runs visual tests
- Changes require explicit baseline update (prevents accidental regression)

---

## 7. Technical Decisions

### 7.1 Animation Library: CSS Transitions (No Library)

**Decision: Use CSS transitions and animations only. Do not add Framer Motion.**

**Rationale:**
- Framer Motion adds ~32KB gzipped to bundle. For a simple run-tracking app, this is unjustifiable.
- Our animation needs are simple: fade-in pages, hover effects, button press, skeleton shimmer, modal overlay. All achievable with CSS.
- CSS `@keyframes` handles the shimmer animation (already used in StatsCards).
- CSS `transition` handles hover, focus, press states.
- If we need spring-like easing, `cubic-bezier(0.34, 1.56, 0.64, 1)` (defined as `--ease-spring`) handles it.
- `prefers-reduced-motion` is simpler to implement in CSS (`@media` query) than with a JS library.

**When to reconsider:** If we add gesture-based interactions (swipe to delete, drag to reorder), evaluate Framer Motion or `@use-gesture/react` at that point.

### [UPDATED] 7.2 Dark Mode Implementation

> *Updated per UX review [DS-3]: Added dark mode map tile layer specification and route line color fix.*

**Decision: CSS custom properties with `data-theme` attribute on `<html>`, as specified in §2.6.**

**Key details:**
- **No JS-based theming library.** CSS custom properties are sufficient and have zero runtime cost.
- **Flash prevention:** Inline `<script>` in `<head>` reads `localStorage` and sets `data-theme` before first paint. This runs synchronously before React hydrates.
- **System preference detection:** `@media (prefers-color-scheme: dark)` as fallback when no explicit user choice.
- **Map tiles:** MapLibre supports `prefers-color-scheme` in its style JSON. Use **Carto Dark Matter** tiles for dark mode, **Carto Positron** for light. Theme change triggers `map.setStyle()`.
- **Map markers:** Use `var(--color-secondary)` (blue) with 2px white border in both modes. Blue on Dark Matter is visible (dark gray background, not blue).
- **Route line color:** Use `var(--color-primary)` (`#F26522` / `#F27B3D` orange) instead of blue. **Orange provides strong contrast on both Positron (light gray) and Dark Matter (dark gray) tiles.** Blue-on-blue would conflict in dark mode.
- **LocationSearch dropdown:** Must inherit theme colors from `--color-bg-primary` / `--color-text-primary`. No hardcoded white backgrounds.
- **Recharts:** Charts read CSS custom property values at render time via `getComputedStyle(document.documentElement).getPropertyValue('--color-chart-1')`. Since charts re-render on data change, theme changes require a manual re-render trigger (key prop tied to theme).

### [UPDATED] 7.3 Testing Strategy

> *Updated per UX review [IP-1, IP-5]: axe-core from Phase 2, responsive visual regression tests.*

**Unit tests (Vitest + Testing Library):**
- Every new shared component gets unit tests (render, interactions, a11y attributes)
- Use `@testing-library/jest-dom` matchers for accessibility checks
- Mock `matchMedia` for responsive/dark-mode tests

**Accessibility tests (from Phase 2, Task 2.1 onwards):**
- `vitest-axe` (axe-core integration) installed as first shared component task
- **Every component test MUST include axe check:**
  ```tsx
  import { axe, toHaveNoViolations } from 'vitest-axe';
  expect.extend(toHaveNoViolations);
  
  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  ```
- Phase 5 accessibility pass is verification, not initial bug-finding

**E2E tests (Playwright):**
- Add viewport-specific tests: mobile (375×667), tablet (768×1024), desktop (1280×800)
- Test keyboard navigation flows: tab through dashboard, enter to open run, escape to close modal
- Test dark mode toggle persistence
- Use Playwright's built-in accessibility testing: `page.accessibility.snapshot()`

**Visual regression (Phase 5, Task 5.4):**
- Playwright screenshot comparison for all pages at 3 viewports (mobile, tablet, desktop)
- Screenshot baselines checked into repo
- CI pipeline runs visual tests on PRs
- Catches unintended CSS changes during refactoring

### 7.4 CSS Architecture: CSS Modules (Keep Current Approach)

**Decision: Continue with CSS Modules. Do not migrate to Tailwind, styled-components, or CSS-in-JS.**

**Rationale:**
- CSS Modules are already in use — no migration cost
- Scoping is automatic (no class name collisions)
- Design tokens via CSS custom properties work perfectly with CSS Modules
- No runtime cost (unlike styled-components)
- Vite handles CSS Modules natively
- Team familiarity

**Convention changes:**
- All hardcoded values → CSS custom properties
- No more inline `style={}` props (use CSS module classes or component props)
- Shared component styles live with the component (`Button.module.css` next to `Button.tsx`)
- Page-specific styles stay in `styles/` directory
- **Use CSS logical properties** (`padding-inline-start`, `margin-block-end`) for RTL readiness

### 7.5 Icon Strategy: Inline SVG Components

**Decision: Create hand-coded SVG icon components. Do not add an icon library.**

**Rationale:**
- We need ~15 icons total. A library like `lucide-react` (30KB) or `react-icons` (varies) is overkill.
- Inline SVG is fully tree-shakeable
- We control stroke width, colors, sizes
- Icons can use `currentColor` to inherit text color (works with dark mode for free)

### [UPDATED] 7.6 Font Loading Strategy

> *Updated per UX review [P-1]: Confirmed self-hosted approach. Removed all Google Fonts references.*

**Decision: Self-host Inter via woff2 files. Do not use Google Fonts CDN.**

**Rationale:**
- Avoids external dependency and extra DNS lookup
- Subset to Latin characters only (~25KB for 4 weights)
- Use `font-display: swap` to prevent FOIT
- Preload the regular (400) weight in `<link rel="preload">` — other weights load on demand
- Variable font option: single Inter variable font file (~100KB) covers all weights — evaluate size tradeoff

**Implementation:**
```html
<link rel="preload" href="/fonts/inter-latin-400.woff2" as="font" type="font/woff2" crossorigin>
```

### [UPDATED] 7.7 Date/Time Formatting

> *Added per UX review [I-3]: Use Intl API for locale-aware formatting.*

**Decision: Migrate date/time formatting to `Intl.DateTimeFormat`.**

Current code uses custom `formatDate` and `formatDateTime` utility functions. Migrate to `Intl.DateTimeFormat` for locale-aware output:

```ts
// Before
function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

// After
function formatDate(date: Date, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric'
  }).format(date);
}
```

This is a low-effort change that enables future localization. Use `navigator.language` as the default locale.

---

## Appendix A: File Structure After Redesign

```
frontend/src/
  components/
    ui/                          ← NEW: shared design system components
      Button.tsx + .module.css
      Input.tsx + .module.css
      Textarea.tsx
      FormGroup.tsx + .module.css
      Card.tsx + .module.css
      Modal.tsx + .module.css
      ConfirmDialog.tsx
      Toast.tsx + .module.css
      Skeleton.tsx + .module.css
      EmptyState.tsx + .module.css
      ErrorState.tsx + .module.css    ← NEW (v2)
      Badge.tsx + .module.css
      SegmentedControl.tsx + .module.css
      Divider.tsx + .module.css       ← NEW (v2)
      ThemeToggle.tsx                 ← NEW (v2)
      ChartAccessibility.tsx          ← NEW (v2)
      Avatar.tsx + .module.css
      VisuallyHidden.tsx
      SkipLink.tsx + .module.css
      PageHeader.tsx + .module.css
      ConnectionBanner.tsx + .module.css  ← NEW (v2)
      Icon.tsx
      icons/
        Home.tsx
        Plus.tsx
        ClipboardList.tsx
        User.tsx
        Moon.tsx
        Sun.tsx
        ChevronLeft.tsx
        X.tsx
        Check.tsx
        AlertCircle.tsx
        Search.tsx
        Trash2.tsx
        Edit.tsx
        Music.tsx
    layout/                      ← NEW: layout components
      AppShell.tsx + .module.css
      TopNav.tsx + .module.css
    NavBar/
      BottomNav.tsx + .module.css  ← refactored
    Map/                         ← refactored (v2: keyboard a11y, cooperative gestures)
      RunMap.tsx + .module.css
      RouteMap.tsx
      LocationSearch.tsx + .module.css
      mapConfig.ts
    Dashboard/                   ← refactored
      StatsCards.tsx + .module.css
      WeeklyDistanceChart.tsx + .module.css
      MonthlyDistanceChart.tsx
      weeklyDistanceData.ts
    RunCard.tsx + .module.css     ← NEW: extracted shared (renders as <Link>)
    SpotifyCard.tsx + .module.css ← NEW: extracted shared
    Spotify/
      SpotifySearch.tsx + .module.css ← refactored
  providers/                     ← NEW
    ThemeProvider.tsx
    ToastProvider.tsx
  hooks/                         ← NEW (v2)
    useAnnounce.ts               ← aria-live announcements
  pages/                         ← refactored
    Dashboard.tsx
    NewRunPage.tsx
    RunDetailPage.tsx
    PlannedRunsPage.tsx
    ProfilePage.tsx
    ProfileSetupPage.tsx
  styles/
    tokens/                      ← NEW
      colors.css                 ← includes chart palette, focus-ring, overlay
      typography.css
      spacing.css
      components.css             ← includes composite transitions
      index.css
    global.css                   ← refactored
    Dashboard.module.css         ← refactored (reduced)
    NewRunPage.module.css        ← refactored (reduced)
    RunDetailPage.module.css     ← refactored (reduced)
    PlannedRunsPage.module.css   ← refactored (reduced)
    ProfilePage.module.css       ← refactored (reduced)
    LoginPage.module.css         ← refactored
    shared.module.css            ← DEPRECATED: contents migrated to shared components
  auth/                          ← mostly unchanged
  api/                           ← unchanged
  types/                         ← unchanged
  utils/                         ← refactored (Intl.DateTimeFormat)
  e2e/
    visual/                      ← NEW (v2): responsive screenshot tests
  fonts/                         ← NEW: self-hosted Inter woff2 files
```

## Appendix B: Migration Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Visual regressions during token migration | High | Medium | Screenshot comparisons at each phase boundary + visual regression tests (Task 5.4) |
| Breaking existing tests during component refactoring | High | Low | Run test suite after every component extraction |
| Recharts theme reactivity issues | Medium | Low | Key prop on chart container tied to theme value |
| MapLibre dark mode tile flicker | Medium | Low | Preload both tile styles, crossfade with opacity transition |
| Inter font FOUT | Low | Low | Preload + font-display:swap + system font fallback matches metrics |
| Bundle size increase from new components | Low | Low | Each component is < 2KB; total shared components < 20KB; offset by code splitting |
| `shared.module.css` removal breaks imports | High | Medium | Deprecate gradually — add re-exports in Phase 4, remove in Phase 5 |
| Map keyboard a11y complexity | Medium | Medium | Start with waypoint list (simpler), add map keyboard controls incrementally |
| CLS from async content | Medium | Medium | min-height on all async containers, skeleton height matching |

## Appendix C: Estimated Timeline

| Phase | Tasks | Estimated Effort | Can Parallelize |
|-------|-------|-----------------|-----------------|
| Phase 1 | Design tokens + ThemeProvider | 1-2 days | No (foundational) |
| Phase 2 | Shared components (2.1-2.8) incl. AppShell | 4-5 days | Yes (2.1-2.3 parallel, then 2.4-2.7, then 2.8) |
| Phase 3 | Icons + TopNav + ThemeToggle | 1-2 days | Partially (3.1 parallel with Phase 2) |
| Phase 4 | Page migrations (4.1a-4.6) | 5-6 days | Partially (4.5, 4.6 parallel with 4.1-4.4) |
| Phase 5 | Polish + code splitting + a11y verification + visual regression | 2-3 days | Yes |
| **Total** | | **13-18 days** | |

Each phase produces independently deployable, non-breaking changes. The app remains fully functional throughout migration.

---

## Appendix D: UX Review Findings — Traceability Matrix

Every finding from the UX engineer's review (`ui-redesign-ux-review.md`) is listed below with its resolution.

### Critical Accessibility Blockers

| ID | Finding | Resolution | Section |
|----|---------|------------|---------|
| **AC-1** | Modal focus-return strategy incomplete — no return-to-specific-trigger documented | Added complete focus management pattern to §5.1 (Modal spec): capture `document.activeElement` on open, restore on close, fallback to ancestor/heading if trigger removed. ConfirmDialog danger variant focuses Cancel button. | §5.1 Modal spec, §2.4 |
| **AC-2** | Map component inaccessible to keyboard/screen reader users | Added comprehensive "Map Keyboard Accessibility" section to §4.2: focusable map, Enter to add waypoint, arrow keys to pan, waypoint `<ol>` list with Remove buttons, `aria-live` announcements for distance changes | §4.2 |
| **AC-3** | Touch target sizes not audited — waypoint markers 28px, several violations | Added §1.5 "Touch Target Audit" with 44px project minimum. Waypoint markers increased to 48px. All interactive elements documented. | §1.5, §4.2, §5.2 |
| **AC-4** | `--color-text-tertiary` contrast fails AA for placeholder/hint usage | Darkened to `#767B83` (light, 4.6:1) and `#848D97` (dark, 4.8:1). Both pass AA for normal text. | §2.1 |

### Accessibility Improvements

| ID | Finding | Resolution | Section |
|----|---------|------------|---------|
| **A-1** | Charts need data table alternatives as design system pattern | Created `ChartAccessibility` wrapper component in §5.1. Every chart must use it. Not a per-page annotation. | §5.1, §4.1b |
| **A-2** | `aria-live` strategy is ad-hoc across pages | Added global `aria-live` region to AppShell (§3.5), `useAnnounce()` hook, page navigation announcements, async operation results | §3.5 |
| **A-3** | RunCards use `div[role="button"]` — should be `<Link>` for navigation | RunCard spec changed to render as `<Link to={/runs/${id}}>`. Only use `role="button"` for non-navigation. | §4.1, §5.3 |
| **A-4** | SegmentedControl needs `aria-label` for the radiogroup | Added `aria-label` as a **required prop** on SegmentedControl. Example: `aria-label="Run status"` | §5.1, §2.7 |
| **A-5** | Breadcrumb `aria-current` placement needs correction | Documented correct pattern: `aria-current="page"` on the current page item, not the back link. Full HTML example added. | §4.3 |
| **A-6** | No `prefers-reduced-motion` for map animations | Added to §4.2: `flyTo()` → `jumpTo()` when reduced motion active. Remove marker hover transitions. | §4.2 |
| **A-7** | No heading hierarchy audit | Added §2.7 with heading structure for every page. Rule: one `<h1>` per page, no level skips. | §2.7 |

### Performance Concerns

| ID | Finding | Resolution | Section |
|----|---------|------------|---------|
| **P-1** | Font strategy contradicts itself (Google Fonts in §2.2 vs self-host in §7.6) | Resolved: self-hosted only. Removed all Google Fonts references from §2.2. §7.6 is the canonical source. | §2.2, §7.6 |
| **P-2** | Recharts ~180KB on LCP-critical Dashboard route | Charts lazy-loaded via `React.lazy()` with Skeleton fallback in Task 4.1b. LCP measures greeting + StatsCards, not blocked on charts. | §4.1, Task 4.1b |
| **P-3** | Map tiles load immediately on mobile even when below fold | Added IntersectionObserver lazy-loading for MapLibre on mobile. Desktop split-panel initializes immediately. | §4.2, §4.3 |
| **P-4** | No explicit CLS prevention for dynamic content | Added: StatsCards skeleton must match rendered height. Chart containers get `min-height: 200px`. EmptyState components sized consistently. CLS audit in Task 5.1. | §4.1, §5.1, Task 5.1 |
| **P-5** | Spotify album art lacks optimization | Added: explicit `width`/`height` attributes (64×64 mobile, 80×80 desktop), `loading="lazy"`, colored placeholder while loading. | §4.3 |

### Usability Issues

| ID | Finding | Resolution | Section |
|----|---------|------------|---------|
| **U-1** | No error recovery — no retry button on API failures | Created `ErrorState` component with mandatory "Try Again" retry button. Design system rule: every API error must include retry action. | §5.1, §3.7, all page specs |
| **U-2** | No offline/slow connection handling | Added §3.7 "Offline & Connectivity Handling": `ConnectionBanner` component, error recovery pattern for all API calls. Phase 2 queued submissions. | §3.7 |
| **U-3** | Delete has no undo — only pre-action confirmation | Enhanced ConfirmDialog spec: danger variant focuses Cancel, Enter doesn't trigger Confirm, must state what will be lost. Soft-delete + undo toast deferred as future enhancement. | §5.1 ConfirmDialog spec |
| **U-4** | PlannedRunsPage completion modal — no validation feedback | Added inline duration validation: validate on blur, accepted formats MM:SS / HH:MM:SS, error message shown via `aria-describedby`. | §4.4 |
| **U-5** | No pull-to-refresh on mobile | Added §3.8 documenting pull-to-refresh as P2 enhancement. Visible "Refresh" button as simpler interim alternative. | §3.8 |
| **U-6** | Mobile map scroll hijacking | Added `cooperativeGestures` MapLibre option for mobile: two-finger pan required, overlay message "Use two fingers to move the map". | §4.2 |
| **U-7** | Empty states lack CTAs and page-specific messages | Specified empty state messages + CTA buttons for every page. Dashboard: "Log Your First Run" → NewRunPage. PlannedRuns: "Plan a Run" → NewRunPage. Charts: centered "Not enough data yet" message. | §4.1, §4.4 |
| **U-8** | Sign-out confirmation is unnecessary friction | Removed. Sign-out executes immediately — non-destructive, easily reversible, intentional action. Button spacing provides sufficient accidental-tap protection. | §4.5 |

### Internationalization Notes

| ID | Finding | Resolution | Section |
|----|---------|------------|---------|
| **I-1** | No RTL layout preparation — no CSS logical properties | Added CSS logical properties rule to §2.3: `padding-inline-start` instead of `padding-left`, etc. Applied project-wide. | §2.3, §7.4 |
| **I-2** | Text expansion budget not considered for stat card labels | Added `text-overflow: ellipsis` safety net on StatsCards labels. Card width must accommodate ~35% expansion. | §4.1 |
| **I-3** | Date/time formatting should use `Intl.DateTimeFormat` | Added §7.7: migrate to `Intl.DateTimeFormat` for locale-aware output. Low-effort change enabling future localization. | §7.7 |

### Design System Feedback

| ID | Finding | Resolution | Section |
|----|---------|------------|---------|
| **DS-1** | Missing `--color-focus-ring` token | Added: `#2563EB` (light) / `#58A6FF` (dark). Used for all focus indicators instead of `--color-primary`. Always visible regardless of background. | §2.1 |
| **DS-2** | Missing `--color-overlay` token | Added: `rgba(0,0,0,0.5)` (light) / `rgba(0,0,0,0.7)` (dark). Used by Modal backdrop. | §2.1 |
| **DS-3** | Dark mode map markers/route colors not addressed | Specified: markers use `--color-secondary` + white border. Route line uses `--color-primary` (orange) — avoids blue-on-blue conflict in dark mode. LocationSearch dropdown inherits theme colors. | §7.2 |
| **DS-4** | No convenience composite transition tokens | Added `--transition-colors`, `--transition-shadow`, `--transition-transform` to §2.4. Prevents inconsistent transition declarations. | §2.4 |
| **DS-5** | Missing `Divider` component | Added to §5.1 (P2): horizontal rule with `--color-border-secondary`, optional centered label text. | §5.1, §2.7 |
| **DS-6** | Charts need dedicated color palette | Added chart-specific tokens: `--color-chart-1` through `--color-chart-3`, `--color-chart-bg`, `--color-chart-grid`, `--color-chart-text`. Tested for colorblind safety. | §2.1 |

### Implementation Plan Feedback

| ID | Finding | Resolution | Section |
|----|---------|------------|---------|
| **IP-1** | Phase 5 a11y audit too late — axe-core should be from Phase 2 | Moved: `vitest-axe` installed in Task 2.1. Every component test includes axe check from day one. Phase 5 is verification only. | §6 Phase 2, Task 2.1 |
| **IP-2** | Task 4.1 (Dashboard) too large — split it | Split into 4.1a (RunCard + StatsCards), 4.1b (Chart refactor + lazy-loading), 4.1c (Dashboard layout). | §6 Phase 4 |
| **IP-3** | AppShell should be earlier than Phase 3 | Moved to Phase 2 (Task 2.8). Phase 3 now focuses only on icons and TopNav. | §6 Phase 2, Task 2.8 |
| **IP-4** | ThemeToggle component not in inventory or any task | Added `ThemeToggle` to §5.1 (P1). Assigned to Task 3.2. Spec: icon button with Moon/Sun, aria-label toggles. | §5.1, Task 3.2 |
| **IP-5** | No responsive visual regression tests in plan | Added Task 5.4: Playwright screenshot tests at 3 viewports (mobile, tablet, desktop). Baselines in repo. CI runs on PRs. | Task 5.4 |

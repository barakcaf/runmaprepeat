---
description: Rules for frontend React/TypeScript code
globs: frontend/**
---

# Frontend Conventions

- Functional components only, hooks for state — no class components
- Strict TypeScript: no `any` unless absolutely necessary
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- CSS modules or inline styles — no CSS-in-JS libraries
- All API calls go through `src/api/` module — never call fetch directly in components
- Error boundaries on route-level components
- Use `const` by default, `let` only when mutation is needed

## Testing
- Run: `cd frontend && npm run test`
- Coverage requirements: see CLAUDE.md § Testing Requirements


## Deep Expertise

## Accessibility (WCAG 2.2)
- **AA required**, AAA aspirational
- ARIA roles, states, and properties — correct landmark usage, live regions,
  focus management after dynamic updates
- Color contrast: 4.5:1 normal text, 3:1 large text and UI components
- Keyboard: logical tab order, visible focus indicators, no keyboard traps,
  skip navigation links
- Screen reader: NVDA, JAWS, VoiceOver compatibility
- Motor impairment: target size minimum 44×44px, no time-limited interactions,
  pointer cancellation (mouseup not mousedown for destructive actions)
- Cognitive: plain language, consistent navigation, error prevention,
  progressive disclosure

## Performance (Core Web Vitals)
- **LCP** < 2.5s: image optimization (WebP, srcset), preload hints, CDN
- **CLS** < 0.1: reserve space for async content, explicit width/height on images
- **INP** < 200ms: main thread budgeting, deferred non-critical JS
- Bundle splitting (route-based), lazy loading, tree shaking
- Critical CSS inlining, above-the-fold prioritization
- Font strategy: font-display:swap, variable fonts, subset loading

## Design Systems & Components
- Design tokens: color, spacing, typography, motion — single source of truth
- Component API: prop naming consistency, compound component patterns,
  controlled vs uncontrolled, polymorphic components
- Responsive: mobile-first breakpoints, fluid typography (clamp()), container queries
- Dark mode: CSS custom properties, system preference detection, user override persistence
- Motion: prefers-reduced-motion respect, purposeful animation (200–500ms),
  no vestibular triggers

## Usability (Nielsen's 10 Heuristics)
1. **Visibility of system status** — loading states, progress, feedback within 1s
2. **Match system ↔ real world** — user language, not system language
3. **User control and freedom** — undo, cancel, back, escape hatches
4. **Consistency and standards** — platform conventions, design system
5. **Error prevention** — constraints, confirmation for destructive actions
6. **Recognition over recall** — visible options, contextual help
7. **Flexibility and efficiency** — shortcuts for expert users
8. **Aesthetic and minimalist design** — remove the unnecessary
9. **Error recovery** — plain language error messages with next steps
10. **Help and documentation** — contextual, searchable, task-oriented

## Internationalization
- RTL layout support (CSS logical properties: margin-inline-start vs margin-left)
- Text expansion budget: German/Finnish strings can be 35% longer than English
- Date, number, currency formatting via Intl API
- Gender-neutral language, inclusive imagery

## Modern UI Patterns
- Forms: inline validation (on blur not keystroke), autofill attributes, password toggle
- All states required: empty, loading skeleton, error, success — never raw spinners alone
- Navigation: breadcrumbs for deep hierarchies, consistent back behavior on mobile
- Data tables: sortable columns, pagination vs infinite scroll tradeoffs,
  sticky headers, responsive collapse strategy

## Frontend Review Output Format
Prefixes: **[A11Y-CRITICAL]**, **[PERF]**, **[UX]**, **[I18N]**
Always provide before/after code. Cite WCAG criterion numbers (e.g., 1.4.3).
Map usability issues to Nielsen heuristic number.

---
phase: 01-next-js-foundation
plan: 02
subsystem: styling
tags: [css, glassmorphism, path-aliases, typescript]
requires: [01-01]
provides: [custom-css-globals, typescript-path-aliases]
affects: [styling-system, import-paths]
tech-stack-added: []
tech-stack-patterns: [css-variables, glassmorphism, backdrop-filter]
key-files:
  created: []
  modified:
    - app/globals.css
    - tsconfig.json
decisions:
  - "Used CSS variables (--font-inter, --font-montserrat) for font-family references in body and heading styles"
  - "Configured @/* path aliases to map to project root (.) matching Vite behavior"
  - "Updated jsx to 'preserve' for Next.js App Router compatibility"
metrics:
  duration: 625
  tasks_completed: 2
  commits: 2
  files_created: 0
  files_modified: 2
  completed_date: 2026-02-27
---

# Phase 01 Plan 02: CSS and Path Configuration Summary

**One-liner:** Migrated complete glassmorphism design system (mesh-bg, liquid-glass, glass-input, btn-primary-liquid, glow-camera-liquid) from index.html to app/globals.css and configured TypeScript @/ path aliases to project root.

## What Was Built

Ported all custom CSS styling from Vite's index.html to Next.js app/globals.css, preserving the complete glassmorphism design system with mesh background gradients, liquid glass effects, and orange pulse animations. Configured TypeScript path aliases to enable @/ imports pointing to project root, matching the original Vite configuration.

### Task 1: Port custom CSS from index.html to globals.css
**Commit:** `83b8dcd`

Migrated all custom CSS from index.html (style block lines 10-103) to app/globals.css, preserving the complete glassmorphism design system and color variables.

**Key changes:**
- Added CSS variables: --primary-orange (#f97316), --primary-orange-light (#fb923c)
- Added body styles: Inter font-family via CSS variable, overflow-x hidden, no scrollbar
- Added heading styles: Montserrat font-family via CSS variable
- Added .mesh-bg: Multi-layer radial gradient background with fixed attachment
- Added .liquid-glass: Glassmorphism card with backdrop-filter blur(24px), border, box-shadow, and ::before pseudo-element for shine effect
- Added .glass-input: Glassmorphism input with focus states (border-color, box-shadow, transform)
- Added .btn-primary-liquid: Orange gradient button with hover scale and brightness effects
- Added .glow-camera-liquid: Pulsing orange glow with animation
- Added @keyframes pulse-orange: Animation definition for glow effect
- Added scrollbar hiding styles: webkit-scrollbar, -ms-overflow-style, scrollbar-width

**Files modified:**
- `app/globals.css` - 105 lines added (3 Tailwind directives + 105 lines custom CSS)

### Task 2: Configure TypeScript path aliases for @/ imports
**Commit:** `6cbdba4`

Updated tsconfig.json to configure @/ path aliases mapping to project root, matching Vite's path.resolve(__dirname, '.') behavior.

**Key changes:**
- Added "baseUrl": "." to make paths relative to project root
- Verified "paths": { "@/*": ["./*"] } maps @/ to project root (not app/ or src/)
- Updated "jsx": "preserve" for Next.js App Router compatibility (was "react-jsx")
- Updated "target": "ES2022" and "lib": ["ES2022", "DOM", "DOM.Iterable"]
- Added "forceConsistentCasingInFileNames": true for consistency
- Cleaned up "include" paths (removed redundant .next/dev/types/**/*.ts and **/*.mts)
- Preserved Next.js TypeScript plugin configuration

**Files modified:**
- `tsconfig.json` - 7 insertions, 7 deletions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical Functionality] Updated jsx compiler setting for Next.js App Router**
- **Found during:** Task 2
- **Issue:** tsconfig.json had "jsx": "react-jsx" which is incompatible with Next.js App Router. Next.js App Router requires "jsx": "preserve" to allow Next.js to transform JSX during build.
- **Fix:** Changed "jsx": "react-jsx" to "jsx": "preserve"
- **Files modified:** tsconfig.json
- **Commit:** 6cbdba4 (included in Task 2 commit)
- **Rationale:** This is a critical configuration for Next.js App Router to function correctly. Without "jsx": "preserve", the build system would fail or behave incorrectly.

**2. [Rule 2 - Critical Functionality] Updated TypeScript target and lib for Next.js**
- **Found during:** Task 2
- **Issue:** tsconfig.json had "target": "ES2017" which is outdated for Next.js 16 best practices
- **Fix:** Updated "target": "ES2022" and "lib": ["ES2022", "DOM", "DOM.Iterable"]
- **Files modified:** tsconfig.json
- **Commit:** 6cbdba4 (included in Task 2 commit)
- **Rationale:** Next.js 16 supports and recommends ES2022 for better performance and modern JavaScript features

**3. [Rule 2 - Critical Functionality] Added forceConsistentCasingInFileNames**
- **Found during:** Task 2
- **Issue:** Missing TypeScript setting that prevents case-sensitivity issues across different operating systems
- **Fix:** Added "forceConsistentCasingInFileNames": true
- **Files modified:** tsconfig.json
- **Commit:** 6cbdba4 (included in Task 2 commit)
- **Rationale:** This is a best practice setting that prevents bugs caused by inconsistent file name casing, especially important for cross-platform development

## Technical Decisions

1. **CSS Variables for Font References:** Used var(--font-inter) and var(--font-montserrat) in body and heading styles instead of hardcoded font-family names. This allows the CSS to reference fonts defined by Next.js's next/font/google in app/layout.tsx, ensuring proper font loading and optimization.

2. **Preserved All Glassmorphism Effects:** Maintained exact CSS values from index.html including backdrop-filter blur, box-shadow values, border-radius, and animation timing. This ensures visual parity with the original Vite application during migration.

3. **Path Aliases to Project Root:** Configured @/* to map to "./*" (project root) rather than "app/*" or "src/*", matching the Vite configuration. This allows imports like @/components/Dashboard and @/lib/types to work identically in both environments.

4. **Updated jsx Compiler Setting:** Changed from "react-jsx" to "preserve" to align with Next.js App Router requirements. Next.js handles JSX transformation during build, so TypeScript should preserve JSX syntax.

## Verification Results

All verification checks passed:

1. **CSS Verification:**
   - app/globals.css has 108 lines (3 Tailwind directives + 105 custom CSS)
   - 8 occurrences of glassmorphism classes confirmed: liquid-glass (2), mesh-bg (1), glass-input (2), btn-primary-liquid (2), glow-camera-liquid (1)
   - @keyframes pulse-orange animation defined
   - backdrop-filter styles present (3 occurrences)
   - Tailwind directives (@tailwind base/components/utilities) at top of file

2. **Path Alias Verification:**
   - baseUrl: "." confirmed (points to project root)
   - paths: { "@/*": ["./*"] } confirmed (maps @/ to project root)
   - Next.js plugin still present: "name": "next"
   - jsx: "preserve" confirmed

3. **Files Ready:**
   - app/globals.css has Tailwind directives + custom CSS
   - tsconfig.json has path aliases configured
   - Ready for Plan 03 to verify dev server and build

## Dependencies

### Requires
- **01-01:** Next.js project structure with app/layout.tsx defining font CSS variables

### Provides
- `custom-css-globals`: Complete glassmorphism design system in app/globals.css
- `typescript-path-aliases`: @/ import paths configured for project root

### Affects
- `styling-system`: All custom CSS now in Next.js globals.css (index.html style block ready for removal)
- `import-paths`: @/ path aliases enabled for future component imports

## Next Steps

1. **Phase 01 Plan 03:** Verify dev server starts successfully and builds without errors
2. Future plans will migrate React components using the @/ import syntax
3. index.html style block can be removed after component migration completes

## Self-Check: PASSED

All claimed artifacts verified:

**Files modified exist:**
- FOUND: app/globals.css (108 lines)
- FOUND: tsconfig.json

**Configuration verified:**
- app/globals.css contains all glassmorphism classes: mesh-bg, liquid-glass, glass-input, btn-primary-liquid, glow-camera-liquid
- app/globals.css contains @keyframes pulse-orange
- app/globals.css contains backdrop-filter styles
- tsconfig.json contains baseUrl: "."
- tsconfig.json contains paths: { "@/*": ["./*"] }
- tsconfig.json contains jsx: "preserve"
- tsconfig.json contains Next.js plugin

**Commits exist:**
- FOUND: 83b8dcd (Task 1 - Port custom CSS)
- FOUND: 6cbdba4 (Task 2 - Configure path aliases)

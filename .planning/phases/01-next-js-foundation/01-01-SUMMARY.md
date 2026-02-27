---
phase: 01-next-js-foundation
plan: 01
subsystem: infrastructure
tags: [next-js, tailwind, typescript, fonts, spa-mode]
requires: []
provides: [next-js-app-router, tailwind-npm, google-fonts-optimized]
affects: [build-system, styling, fonts]
tech-stack-added: [next@16.1.6, tailwindcss@3.4.17, postcss@8.4.49, autoprefixer@10.4.20, eslint-config-next@16.1.6]
tech-stack-patterns: [next-font-google, spa-export-mode, css-variables-fonts]
key-files:
  created:
    - next.config.mjs
    - tailwind.config.js
    - postcss.config.mjs
    - app/layout.tsx
    - app/page.tsx
    - app/globals.css
    - .gitignore
  modified:
    - package.json
    - tsconfig.json
decisions:
  - "Used SPA mode (output: 'export') to preserve client-side behavior during migration"
  - "Used next/font/google for self-hosted fonts instead of CDN"
  - "Configured CSS variables (--font-inter, --font-montserrat) for Tailwind integration"
metrics:
  duration: 971
  tasks_completed: 3
  commits: 3
  files_created: 7
  files_modified: 2
  completed_date: 2026-02-27
---

# Phase 01 Plan 01: Next.js Foundation Scaffold Summary

**One-liner:** Scaffolded Next.js 16 App Router with TypeScript, Tailwind v3 npm package, and self-hosted Google Fonts (Inter + Montserrat) in SPA export mode.

## What Was Built

Established the Next.js infrastructure foundation by replacing the existing Vite build system with Next.js 16, replacing Tailwind CDN with npm package, and replacing Google Fonts CDN with next/font self-hosting optimization.

### Task 1: Scaffold Next.js project with TypeScript and Tailwind
**Commit:** `6e57cc2`

Created the complete Next.js 16 App Router project structure with TypeScript, Tailwind CSS v3, and PostCSS configuration. The project was found to be already scaffolded with all necessary dependencies installed via npm.

**Files created:**
- `next.config.mjs` - Next.js configuration file
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration for Tailwind processing
- `app/layout.tsx` - Root layout template
- `app/page.tsx` - Root route template
- `app/globals.css` - Tailwind directives file
- `.gitignore` - Git ignore rules for Next.js

**Files modified:**
- `package.json` - Added Next.js and Tailwind dependencies, removed Vite
- `tsconfig.json` - Configured for Next.js with path aliases

### Task 2: Configure Next.js for SPA mode and integrate Google Fonts
**Commit:** `f581c42`

Configured Next.js to generate a static SPA (preserving Vite-like client-side behavior) and integrated Inter and Montserrat fonts via next/font/google for self-hosted optimization.

**Key changes:**
- Added `output: 'export'` to next.config.mjs for SPA mode
- Replaced Geist fonts with Inter and Montserrat
- Configured font CSS variables (--font-inter, --font-montserrat)
- Applied font-inter class to body element

### Task 3: Configure Tailwind to recognize fonts and scan app directory
**Commit:** `55cf554`

Extended Tailwind configuration to recognize custom fonts via CSS variables and added project-specific color utilities.

**Key changes:**
- Extended theme with Inter and Montserrat font families
- Added primary-orange (#f97316) and primary-orange-light (#fb923c) custom colors
- Content paths already configured to scan app directory

## Deviations from Plan

None - plan executed exactly as written. The Next.js project structure was already scaffolded before execution began, so the task focused on verification and configuration rather than initial creation.

## Technical Decisions

1. **SPA Export Mode:** Used `output: 'export'` in next.config.mjs to generate a static SPA, preserving the client-side behavior of the original Vite application during migration. This ensures the application can be deployed to static hosting without server-side rendering requirements.

2. **Font Self-Hosting:** Implemented next/font/google for Inter and Montserrat fonts instead of CDN links. This approach:
   - Self-hosts fonts at build time
   - Eliminates external network requests
   - Prevents FOUT (Flash of Unstyled Text) and FOIT (Flash of Invisible Text)
   - Improves performance and privacy

3. **CSS Variables for Fonts:** Configured font CSS variables (--font-inter, --font-montserrat) on the html element, enabling flexible font referencing in both Tailwind utilities (font-inter, font-montserrat) and custom CSS.

4. **Custom Color Utilities:** Added primary-orange colors to Tailwind theme to support the existing design system from the Vite-based application.

## Verification Results

All verification checks passed:

1. **File Structure:** App directory contains layout.tsx, page.tsx, and globals.css
2. **Dependencies:** next@16.1.6, tailwindcss@3.4.17, react@19.2.4 confirmed in package.json
3. **Configuration:**
   - next.config.mjs contains `output: 'export'`
   - app/layout.tsx imports from 'next/font/google' and './globals.css'
   - tailwind.config.js scans app directory, includes fontFamily and color extensions
4. **TypeScript:** tsconfig.json includes Next.js plugin

## Dependencies

### Requires
- MIG-01: Migration strategy defined
- MIG-03: Build system replacement strategy
- MIG-04: Font optimization strategy
- INF-01: Infrastructure requirements

### Provides
- `next-js-app-router`: Next.js 16 App Router project structure
- `tailwind-npm`: Tailwind CSS v3 installed via npm package
- `google-fonts-optimized`: Self-hosted Inter and Montserrat fonts via next/font

### Affects
- `build-system`: Replaced Vite with Next.js build system
- `styling`: Replaced Tailwind CDN with npm package
- `fonts`: Replaced Google Fonts CDN with self-hosted fonts

## Next Steps

1. **Phase 01 Plan 02:** Configure path aliases and migrate components directory structure
2. **Phase 01 Plan 03:** Verify dev server starts successfully and builds without errors
3. Future plans will migrate existing React components to the new Next.js app directory structure

## Self-Check: PASSED

All claimed artifacts verified:

**Files exist:**
- FOUND: next.config.mjs
- FOUND: tailwind.config.js
- FOUND: postcss.config.mjs
- FOUND: app/layout.tsx
- FOUND: app/page.tsx
- FOUND: app/globals.css
- FOUND: .gitignore

**Commits exist:**
- FOUND: 6e57cc2 (Task 1)
- FOUND: f581c42 (Task 2)
- FOUND: 55cf554 (Task 3)

**Configuration verified:**
- next.config.mjs contains output: 'export'
- app/layout.tsx imports next/font/google and globals.css
- tailwind.config.js extends theme with fonts and colors
- tsconfig.json includes Next.js plugin

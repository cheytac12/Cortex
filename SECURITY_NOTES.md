# Security Notes

## NPM Audit Vulnerability Status

**Last audited:** 2026-03-23  
**Total vulnerabilities:** 19 (2 low, 7 moderate, 10 high)

---

## ⚠️ Important Context

> **These vulnerabilities are in development-time dependency chains only.**  
> They live in tooling packages (Expo CLI, React Native CLI, TypeScript ESLint) and are **not present in the production runtime bundle** shipped to end users.  
> No direct production application code is affected.

---

## Blocked Items (Cannot Fix Without Breaking Upgrades)

| Package | Severity | Introduced via | Required Fix | Breaking? |
|---------|----------|----------------|--------------|-----------|
| `fast-xml-parser` | High | React Native CLI deps | React Native ≥ 0.84 | Yes |
| `minimatch` | High | `@typescript-eslint` deps | `@typescript-eslint` v8+ (conflicts with `eslint-config-expo`) | Yes |
| `send` | Moderate | Expo CLI deps | Expo SDK ≥ 55 | Yes |
| `tar` | High | Expo CLI deps | Expo SDK ≥ 55 | Yes |

All other vulnerabilities roll up through these same dependency chains and will be resolved as part of the phased upgrades below.

---

## Non-Breaking Actions (Done / Immediate)

- ✅ TypeScript strict mode enabled (`tsconfig.json`)
- ✅ `forceConsistentCasingInFileNames: true` in tsconfig to catch case-sensitivity bugs
- ✅ `npm run typecheck` script added — catches import path issues at CI time
- ✅ GitHub Actions CI workflow added (lint + typecheck + web export sanity check)
- ✅ Fixed broken import paths in `App.tsx` (was importing from `./screens/` instead of `@/screens/`)

---

## Phased Upgrade Plan

### Phase 1 — Expo SDK 55+ Migration
**Goal:** Resolve `send` and `tar` vulnerabilities; modernize Expo toolchain.

- [ ] Create a dedicated upgrade branch: `feat/expo-55-upgrade`
- [ ] Follow official [Expo upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [ ] Run `npx expo install --fix` to align peer dependencies
- [ ] Update `react-native` to compatible version per Expo 55 release notes
- [ ] Re-run `npm audit` and capture residuals
- [ ] Full regression checklist (see below)

### Phase 2 — React Native 0.84+ Migration
**Goal:** Resolve `fast-xml-parser` vulnerability.

- [ ] Upgrade React Native to ≥ 0.84 (aligned with Expo 55+ base)
- [ ] Address any New Architecture / Bridgeless mode changes
- [ ] Update native dependencies (`react-native-screens`, `react-native-safe-area-context`, etc.)
- [ ] Full regression checklist (see below)

### Phase 3 — ESLint / @typescript-eslint v8 Compatibility
**Goal:** Resolve `minimatch` vulnerability; modernize linting stack.

- [ ] Check if `eslint-config-expo` has released v8 compatibility
- [ ] Upgrade `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` to v8+
- [ ] Update `.eslintrc.js` for any breaking rule renames in v8
- [ ] Run `npm run lint` and fix any new errors
- [ ] Re-run `npm audit`

---

## Regression Testing Checklist

Run this checklist after each major upgrade phase before merging:

### Build & Bundle
- [ ] `npm run typecheck` — no TypeScript errors
- [ ] `npm run lint` — no lint errors
- [ ] `npx expo export --platform web` — web bundle succeeds
- [ ] `npx expo start --android` — Android bundle succeeds
- [ ] `npx expo start --ios` — iOS bundle succeeds

### Functional (Manual QA)
- [ ] App initializes without blank white screen on web
- [ ] Demo user / mock auth flow works
- [ ] Task creation works (TaskEntry screen)
- [ ] Forced Start protocol countdown works
- [ ] Focus screen (locked mode) works
- [ ] Review screen renders
- [ ] Navigation between all screens works
- [ ] Supabase auth (real user) works end-to-end
- [ ] Supabase data persistence (tasks, sessions) works

### Security
- [ ] `npm audit --omit=dev` — zero production runtime vulnerabilities
- [ ] `npm audit` — reduced total count after each phase

---

## CI Enforcement

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push/PR:
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript import/type validation  
- `npx expo export --platform web` — Web bundle sanity check

This prevents regressions like broken import paths from reaching the main branch.

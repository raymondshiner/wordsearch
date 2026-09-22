# wordsearch

> Planning doc. Edit before shipping Cycle 1. Cycles ship as feature branches → PRs.

## Vision

A word search **generator** — you give it words (typed, picked from a themed preset, or
conjured from a theme by an LLM) and it produces a print-ready puzzle: grid, word bank,
and a separate answer key. Built as a portfolio piece: the placement engine is a real
constraint-satisfaction problem with tunable difficulty, wrapped in a deliberately clean
architecture and a UI that doesn't look templated. The thesis it exists to demonstrate —
*software's only real requirement is that it stays easy to change* — should be visible in
the folder tree, not just claimed in the README.

Audience is a hiring manager reading a résumé link, and secondarily anyone who actually
wants a worksheet. It has to work, not just demo.

## Non-goals

Things we are explicitly NOT building (prevents scope creep):
- **Not a player.** No drag-to-select, no timer, no daily puzzle, no streaks. Generation only.
- **Not a solver.** No OCR of existing grids, no image input.
- **No accounts, no backend database.** Puzzles are ephemeral or shareable via encoded URL —
  no Supabase, no auth, no RLS. (Overrides the ~/src hard defaults; see Stack.)
- **No monetization, no print sales, no teacher SaaS tier.** Not a Shiner Software product.
- **No native mobile.** PWA only, per standing doctrine.
- **Not a crossword / cryptogram / sudoku engine.** One puzzle type, done properly.

## Stack

Defaults from `~/src/CLAUDE.md` (Vite + React 19 + TS strict, Tailwind v4, shadcn/ui Radix Nova, Vercel) unless noted below.

- **Build:** Vite + TypeScript (strict), React 19
- **UI:** Tailwind v4 + shadcn/ui (Radix Nova), Geist + JetBrains Mono
- **Data:** none — client-side only. Puzzle state lives in memory; shareable puzzles encode
  seed + settings + word list into the URL hash. Presets ship as a static JSON file.
- **Hosting:** Vercel, SPA rewrite + immutable asset cache
- **Export:** TBD — see Open Questions. Leaning `@react-pdf/renderer`.
- **Testing:** Vitest for the engine (it is pure logic and deserves real TDD);
  Playwright `tests/verify-ui.mjs` for the shell, per workspace convention.

**Overrides / reasons:**
- **Vite, not Next.** Litmus run: nobody discovers this via search — the URL arrives in a
  résumé or a message. No CMS, no content surface, every screen is the tool. Tiebreaker
  rule says Vite; PWA support is also proven on this lane and unproven on Next.
- **No Supabase.** The hard default assumes stored user data. There is none here: generation
  is deterministic from (seed, words, settings), so a URL is a database. Adding Postgres
  would be architecture theater on a portfolio piece.
- **PWA gated to `command === 'build'`** with the `import.meta.env.DEV` unregister guard —
  a dev service worker defeats HMR (`SOLUTIONS.md` → "Gate the PWA to production").

## Cycles

Each cycle is one batch of cohesive functionality, shipped together on a feature branch.

### Cycle 1 — MVP

**Theme:** Words in, printable puzzle out — one screen, end to end.

**Done when:**
- [ ] Engine places a word list into an N×N grid across 8 directions with
      backwards/diagonal toggles, fills remaining cells, and is deterministic from a seed.
- [ ] Engine reports failures honestly — a word that cannot be placed is surfaced to the
      user, never silently dropped.
- [ ] Engine is covered by Vitest: placement correctness, overlap legality, determinism
      (same seed → identical grid), and the unplaceable-word path.
- [ ] Single screen: word input → live grid preview → size/difficulty controls.
- [ ] Export produces a print-ready PDF with puzzle + word bank on page 1 and the
      answer key on page 2.
- [ ] Deployed to Vercel at a shareable URL.
- [ ] `tests/verify-ui.mjs` drives desktop + mobile viewports and passes.

**Scope:**
- Placement engine as a standalone, dependency-free module (`src/engine/`) — pure functions,
  no React imports. This is the showpiece; it gets written test-first.
- Manual word entry (textarea or chip input), with validation: length bounds, dedupe,
  strip non-letters, cap count against grid capacity.
- Grid size + difficulty as a small number of honest knobs, not a wall of checkboxes.
- Print layout: the grid must stay legible on paper at realistic word counts.

**Out of scope for this cycle (deferred to later):**
- Themed presets and AI-generated word lists (Cycle 2) — manual entry only.
- Shareable URL encoding (Cycle 2).
- Multi-puzzle packets, theming/skins, any visual flourish beyond "clean".

### Cycle 2 — Word lists without typing

**Theme:** Two more doors into the same engine.

**Done when:**
- [ ] Themed presets ship as static JSON and populate the input in one click.
- [ ] Typing a theme ("dinosaurs") returns a usable word list via an LLM.
- [ ] A generated puzzle round-trips through a shareable URL.

**Scope:**
- Curated preset lists — enough categories to make first-run feel finished.
- LLM word generation via a Vercel serverless function (key never reaches the client),
  with a rate limit and a graceful failure back to manual entry.
- URL-hash encoding of seed + settings + words; loading a link reproduces the exact grid.

### Cycle 3+ — backlog
- Architecture pass as a deliberate artifact: hierarchical/co-located structure, a README
  section arguing the boundaries, the "easy to change" thesis made legible.
- UI craft pass — distinctive visual direction, live-preview polish, motion.
- Difficulty tuning: density targets, decoy-letter weighting biased toward the word list.
- Multi-puzzle packet export (one PDF, N puzzles, keys at the back).
- Shaped / non-square grids.
- Accessibility + print-contrast audit.

## Open questions

Things to decide before Cycle 1 starts:
- [ ] **PDF pipeline.** `@react-pdf/renderer` (exact control, real multi-page, batch-ready
      later — but a second rendering model to maintain) vs. `@media print` + `@page` CSS
      (proven in-house on `momir-card-printer`, zero deps, ships faster — but page breaks
      and answer-key pagination get fiddly, and "Save as PDF" is a browser dialog, not a
      button). **Recommendation: react-pdf**, given PDF was chosen over print-CSS on purpose
      and Cycle 3 wants packets.
- [ ] **Difficulty model.** Is difficulty a single 1–5 dial that derives grid size, direction
      set, and overlap density? Or are those three independent controls? (Leaning: one dial
      plus an "advanced" disclosure.)
- [ ] **Domain.** Vercel subdomain, a path under an existing Shiner/rshiner domain, or its
      own? Domain availability unchecked — needs a `JARVIS_MCP=code` session for the godaddy MCP.
- [ ] **Repo visibility.** Public from commit one (it's a portfolio piece) — confirm.
- [ ] **Grid capacity rule.** What's the honest max word count for a given N, and do we
      block the user at that line or just warn?

## Risks / unknowns

- **Placement backtracking can pathologically stall** on dense lists of long words in a small
  grid. Needs an iteration budget and a clean "couldn't place these" result — not a hang.
- **"Deterministic from a seed" is easy to break.** Any stray `Math.random()` in the fill step
  silently kills reproducibility, and the share-link feature in Cycle 2 depends on it. The
  determinism test is load-bearing, not decoration.
- **Print legibility is the real difficulty**, not the algorithm. A 20×20 grid that looks fine
  at 1440px can be unusable on paper. Verify on an actual print early, not at the end.
- **Portfolio-piece scope creep.** "One more polish pass" is the failure mode here. Cycle 1
  ships plain and gets deployed; craft is an explicit later cycle.
- **LLM word generation (C2) is the only thing with a cost and a key.** Keep it optional and
  degradable — the app must be fully usable if that function is down or disabled.

---
*Created 2026-09-22. Private ops log: `~/jarvis/claude/project-logs/wordsearch/log.md`*

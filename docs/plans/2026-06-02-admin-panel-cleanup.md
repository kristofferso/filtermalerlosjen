# Admin Panel Cleanup Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Restructure admin so active rounds remain operational, order rows collapse by default, rounds are compact dashboard cards linking to detail pages, and coffee catalog management moves to its own page.

**Architecture:** Keep `/admin` as the main authenticated shell and reuse existing components. Add small tested helper functions for round summaries and default order expansion. Add file routes for `/admin/kaffe` and `/admin/runder/$roundId`, with server loader support for all rounds and a single round.

**Tech Stack:** React 19, TanStack Router file routes, TanStack Start server functions, Vitest, Tailwind CSS.

---

### Task 1: Tested admin summary helpers

**Files:**

- Create: `src/lib/admin-rounds.ts`
- Test: `src/lib/admin-rounds.test.ts`

Steps:

1. Write failing tests for compact round card summaries and closed-by-default order expansion.
2. Run `npm test src/lib/admin-rounds.test.ts` and verify failure.
3. Implement helper functions.
4. Run the test and verify pass.

### Task 2: Server data supports all rounds and detail route

**Files:**

- Modify: `src/server/coffee.ts`

Steps:

1. Extend admin dashboard to return all closed/ready rounds, not limited to 10.
2. Add `getAdminRoundDetail(roundId)` returning one round with supplier, coffees, and orders.
3. Typecheck after implementation.

### Task 3: Dashboard cleanup

**Files:**

- Modify: `src/routes/admin.tsx`

Steps:

1. Import Link and helper functions.
2. Move coffee catalog section off dashboard when no active round.
3. Replace history section with compact rounds cards linking to detail pages.
4. Keep customers as today.
5. Make active order rows collapsed by default.

### Task 4: Coffee catalog page

**Files:**

- Create: `src/routes/admin.kaffe.tsx`

Steps:

1. Load admin dashboard.
2. Reuse catalog section for coffee management.
3. Preserve admin unlock behavior.

### Task 5: Round detail page

**Files:**

- Create: `src/routes/admin.runder.$roundId.tsx`

Steps:

1. Load one round by route param.
2. Show full round detail with stats, settlement, totals, and orders collapsed by default.
3. Link back to dashboard.

### Task 6: Verification

Run:

- `npm test`
- `npm run typecheck`
- `npm run build`

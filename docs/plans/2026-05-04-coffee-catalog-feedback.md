# Coffee Catalog Feedback Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Address deployment feedback by improving desktop layout, adding optional coffee image URLs, and replacing destructive coffee deletion with soft archive behavior.

**Architecture:** Extend the Drizzle schema with `image_url`, `is_deleted`, and `image_url_snapshot` fields. Keep historical rounds stable by snapshotting image URLs into `round_coffees`. Server functions remain the application boundary and filter archived coffees out of normal catalog/open-round workflows.

**Tech Stack:** TanStack Start, React 19, TypeScript, Tailwind, Drizzle ORM, Neon Postgres, Vitest.

---

### Task 1: Extend schema for images and soft delete

**Files:**
- Modify: `src/db/schema.ts`
- Generated: `drizzle/*`

**Steps:**
1. Add `imageUrl: text("image_url").notNull().default("")` and `isDeleted: boolean("is_deleted").notNull().default(false)` to `coffees`.
2. Add `imageUrlSnapshot: text("image_url_snapshot").notNull().default("")` to `round_coffees`.
3. Run `bun run db:generate`.
4. Run `bun run typecheck`.
5. Commit with `feat: add coffee image and archive schema`.

### Task 2: Update server functions for image URLs and archive delete

**Files:**
- Modify: `src/server/coffee.ts`

**Steps:**
1. Extend add/update coffee schemas with `imageUrl: z.string().trim().url().or(z.literal("")).optional().default("")`.
2. Export `archiveCoffee` server function accepting `{ id: uuid }`, requiring admin, and setting `isDeleted: true`, `isActive: false`, `updatedAt`.
3. Filter `getAdminDashboard` coffees with `isDeleted = false`.
4. Filter `openRound` selected coffees with `isDeleted = false`.
5. Snapshot `imageUrl` into `round_coffees.imageUrlSnapshot`.
6. Include `imageUrl` in `getCustomerHomeData` open-round coffee data.
7. Run `bun run typecheck`.
8. Commit with `feat: support coffee images and archiving`.

### Task 3: Update customer ordering layout and images

**Files:**
- Modify: `src/routes/index.tsx`

**Steps:**
1. Change page background to full-width stone gradient/background and keep content in centered cards.
2. Display coffee images when `imageUrl` exists, with safe `alt` text and rounded thumbnail/card image.
3. Keep mobile ordering behavior intact.
4. Run `bun run typecheck`.
5. Commit with `feat: improve customer layout and coffee images`.

### Task 4: Update admin catalog image editing and archive action

**Files:**
- Modify: `src/routes/admin.tsx`

**Steps:**
1. Add image URL input to add coffee form.
2. Add image URL input to edit coffee form.
3. Show coffee thumbnail in catalog rows when present.
4. Add Delete button that calls `archiveCoffee` and refreshes dashboard.
5. Show round/customer/history images where helpful without clutter.
6. Run `bun run typecheck`.
7. Commit with `feat: add admin image editing and archive action`.

### Task 5: Final verification and merge

**Files:**
- No intentional code changes unless fixes are needed.

**Steps:**
1. Run `bun test`.
2. Run `bun run typecheck`.
3. Run `bun run build`.
4. Note that lint remains outside scope if it still fails due existing strict rules.
5. Merge to main after verification.

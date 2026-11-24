# Kanban Board — Plan

The build order for the Kanban Board app. Each milestone has a **done when**
condition that can be checked, not a description of intent.

Status legend: **done** · _in progress_ · pending

---

## M0 — Scaffold and tooling · **done**

Monorepo, toolchain, database, health endpoint.

- pnpm 12.23.0 + Turborepo 2.11.13, four workspace packages
  (`apps/web`, `packages/{db,ui,config,ai}`)
- Node 26.13.1 pinned in `.nvmrc` and `engines`
- Biome 2.6.8 for lint and format, nano-staged + simple-git-hooks for commits
- PostgreSQL 19 on port 5434 via Docker Compose, with a healthcheck
- Zod environment validation in `@kanban/config`, one `.env` at the repo root
- Prisma 7.10.1 with the `pg` driver adapter, first migration committed,
  idempotent seed
- `GET /api/health` reporting database reachability
- `GET /` rendering a placeholder that proves Server Component → Prisma →
  Postgres and the `@kanban/ui` primitives both work

**Done when:** `pnpm install && pnpm docker:up && pnpm db:migrate && pnpm db:seed && pnpm dev`
serves a working page, `/api/health` reports `ok`, and `pnpm lint`, `pnpm test`
and `pnpm build` all pass.

---

## M1 — Data model and seed · **done**

The full Kanban schema, plus realistic demo data.

- Models: `Project`, `Board`, `Column`, `Task`, `Label`, `TaskLabel`,
  `Activity`, `ProjectMember`, `BoardMember`, and the `User` model that
  already exists
- Enums: `Role` (OWNER / EDITOR / VIEWER), `Priority` (LOW / MEDIUM / HIGH /
  URGENT), `ActivityAction`
- Subtasks are tasks (`parentId` self-relation), not a separate table
- A task holds both `boardId` and `columnId`: the column is the foreign key,
  the board is denormalised so a board loads in one indexed query
- Column deletion never cascades to tasks — the delete action reassigns them
- Query helper layer in `packages/db/src/queries.js`, grouped by entity
- Seed: 2 projects, 3 boards, 15 columns, 61 tasks and 10 subtasks, 11
  labels, 8 project memberships, 2 board role overrides and 28 activity rows
- Indexes on `Task(columnId, position)`, `Task(boardId)`, `Task(assigneeId)`,
  `Task(dueDate)`, `Activity(boardId, createdAt)`

**Done when:** `pnpm db:migrate && pnpm db:seed` run twice leaves identical
row counts, and `pnpm db:studio` opens on a populated database.

---

## M2 — Projects and boards

- Project dashboard, project detail page, board switcher
- Board create / rename / describe / archive
- Column add, rename, recolour, reorder, delete (with mandatory
  reassignment target), WIP limit, "Done" column flag
- Dev user switcher — swaps the `kb_user_id` cookie so the permission matrix
  can be exercised by hand without a login
- Membership models wired to the UI: add a member, change a role, remove them

**Done when:** a project → board → custom column can be created from the UI,
deleting a column never loses a task, and the dev user switcher changes what
the UI offers.

---

## M3 — Tasks

- Task card: title, description, priority, due date, assignee, labels,
  subtask progress
- Task drawer (Radix Dialog) with inline title editing and every field
- Inline "add task" per column, plus a global create
- Subtasks: add, toggle complete, delete, progress shown on the parent card
- Soft delete (archive) with restore; hard delete for owners
- Due-date presentation: overdue, due today, due this week, no date

**Done when:** full task CRUD works from the board, the card shows "2/5" for
subtasks, and overdue and due-today styling are distinct.

---

## M4 — Drag and drop

- dnd-kit: `DndContext` at board level, a `SortableContext` per column,
  `DragOverlay` for the floating card
- PointerSensor with an 8px activation constraint, plus KeyboardSensor with
  `sortableKeyboardCoordinates` — keyboard drag is a WCAG 2.2 requirement
- Optimistic local update during the drag, server-authoritative commit on
  drop, snapshot rollback and a toast when the server rejects the move
- The server computes the position from the target index; the client never
  sends a float
- Fractional float positions with renormalisation when the gap between two
  neighbours drops below `1e-6`
- Columns are reorderable with the same primitives

**Done when:** a card can be dragged within and across columns, the order
survives a refresh, the whole flow works from the keyboard, and a rejected
move rolls back with a visible explanation.

---

## M5 — Filtering, sorting and search

- Filter bar: assignee (including "Me"), priority, due-date bucket, label,
  free-text search over the title
- Filters AND together; each shows the number of matching tasks
- Filter state mirrored to URL search params, so a filtered view is shareable
  and survives a reload
- Column sort modes: MANUAL, PRIORITY, DUE_DATE, CREATED — manual ordering is
  preserved and restored when switching back

**Done when:** filters combine correctly, the URL restores the view on reload,
and the counts update live.

---

## M6 — Activity history and permissions

- Every mutation writes an `Activity` row in the same transaction as the change
- `metadata` holds the diff (`fromColumnId`, `toColumnId`, `fromAssigneeId`, …)
- Timeline UI: actor, action, relative time, filter by actor and by action,
  paginated
- Permission module in `@kanban/config` with `assertCan(userId, boardId,
  capability)` called as the first line of every server action
- Member management UI, restricted to owners

**Done when:** every change appears in the timeline with the right actor, a
viewer's mutation is rejected by the server and not merely hidden in the UI,
and an editor cannot manage members.

---

## M7 — Live updates

- `pg_notify` on the `board_events` channel, emitted in the same transaction
  as the activity row
- A dedicated `pg` client holding a long-lived `LISTEN` connection — pooled
  connections cannot hold a listener
- SSE route at `/api/boards/[boardId]/events` with an in-process subscriber
  filtered by board id
- `EventSource` client that patches the local store on each event, with
  native reconnection and a refresh fallback

**Done when:** a second browser window sees a task move in about a second
without refreshing, and the client recovers when the stream drops.

---

## M8 — AI surface

- Provider contract in `@kanban/ai` with a `null` provider that reports no
  model is configured
- Server actions: suggest subtasks, categorise a task, draft a description —
  all Zod-validated and wired to real UI affordances
- Clean "not configured" states rather than errors
- A settings page showing the active provider and whether it is usable
- Activity rows recorded when an AI suggestion is accepted

**Done when:** the buttons exist, validate, and report that no provider is
configured — and adding a real provider later is one file plus an environment
change, with no edits outside `packages/ai`.

---

## M9 — Polish and accessibility

- Keyboard navigation across the whole board, visible focus rings
- ARIA roles and labels on the board, columns and cards
- Screen-reader announcements when a task moves
- Colour contrast audit against WCAG 2.2 AA
- Empty states, skeletons, error boundaries, toasts
- Rate limiting on mutations

**Done when:** there are no console errors, the board is usable at 1440px and
375px, and the basic WCAG 2.2 AA checks pass.

---

## M10 — Documentation, CI and portfolio packaging

- README with the feature list, a screen recording, the architecture diagram
  (mermaid), the ERD, five-step quick start, the notable engineering
  decisions and a "what I learned"
- `docs/` for the architecture and data model write-ups
- `CLAUDE.md`, `.cursor/rules/` and `.github/copilot-instructions.md`
- GitHub Actions: lint, test (with a PostgreSQL service container) and build
- Seed data that looks like a real product screenshot
- An honest statement of the two deliberate limitations: no authentication and
  no deployment

**Done when:** `pnpm lint`, `pnpm test` and `pnpm build` are green in CI, and a
stranger can clone the repository and get to a running board in five commands.

---

## Estimated effort

| Milestone | Days       |
| --------- | ---------- |
| M0        | 0.5 (done) |
| M1        | 1 (done)   |
| M2        | 1–1.5      |
| M3        | 2          |
| M4        | 1.5        |
| M5        | 1          |
| M6        | 1.5        |
| M7        | 1          |
| M8        | 1          |
| M9        | 1          |
| M10       | 0.5–1      |
| **Total** | **12–14**  |

M0–M5 is about seven days and yields a fully working board.

---

## Known constraints

- **Single instance.** The SSE listener lives in the app process. With no
  deployment target this is a non-issue, but it is why the notifier sits
  behind its own module — adding Redis pub/sub later is a one-file change.
- **Simulated identity.** The permission _enforcement_ is real and server-side;
  only the identity is a dev cookie.
- **Prisma 8 is not usable.** npm's `latest` tag points at `8.0.0-rc.35`. The
  CLI, client and driver adapter are all pinned to 7.10.1.
- **Prisma 7.10.1 warns on Node 26.** Its preinstall check lists Node 20.19+,
  22.12+ and 24.0+. The warning is cosmetic and the toolchain works, but it
  is the first thing to look at if Prisma misbehaves.

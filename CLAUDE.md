# Kanban Board — AI Context

Read this before changing anything. These are the non-negotiable rules for the
repository. Update this file when the structure changes.

## Non-negotiable rules

1. **ESM only.** Every file uses `import` / `export`. Never `require()`,
   `module.exports`, or `__dirname` — use `import.meta.dirname`.
2. **No TypeScript in source.** `.js` and `.jsx` only. The one exception is
   Prisma's generated client (`packages/db/src/generated/`), which is emitted
   as TypeScript by the `prisma-client` generator. Never edit it, never add
   hand-written `.ts` files.
3. **Zod at every boundary.** Every Server Action, API route and form parses
   its input with a schema from `@kanban/config`. Nothing reaches the database
   unvalidated.
4. **No `throw new Error` for expected failures.** Use the result envelope from
   `@kanban/config` (`{ ok: true, data }` / `{ ok: false, error }`) so the
   client never has to try/catch. Reserve throwing for genuinely exceptional
   states.
5. **No `console.log` in application code.** Use `createLogger(name)` from
   `@kanban/config`.
6. **Every Prisma model needs `createdAt` and `updatedAt`.**
7. **Query through the helper layer.** Pages and actions call the helpers in
   `packages/db/src/queries.js`. Never call `prisma.*` directly from a page or
   an action.
8. **Import UI from `@kanban/ui`.** Never from a local `components/ui` folder.
   Every primitive accepts `className`.
9. **Server Components are the default.** Add `"use client"` only when a
   component genuinely needs state, effects or event handlers.

## Package boundaries

| Package          | Owns                                                       |
| ---------------- | ---------------------------------------------------------- |
| `@kanban/web`    | Routes, server actions, API routes, client components      |
| `@kanban/db`     | Prisma schema, migrations, seed, query helpers, the client |
| `@kanban/ui`     | Shared presentational primitives                           |
| `@kanban/config` | Environment schema, constants, permissions, logger         |
| `@kanban/ai`     | The AI provider contract and its implementations           |

A package may depend on `@kanban/config`. `@kanban/db` must never import from
`@kanban/web`. `@kanban/ui` must stay free of server-only code and of any
dependency on `@kanban/db`.

## Database

- One `packages/db/src/queries.js` layer, grouped by entity, is the only way
  to touch Prisma from application code. The groups are `user`, `project`,
  `board`, `column`, `task`, `label`, `member`, `activity` and `stats`.
- The connection string is built in `packages/db/src/connection.js` and used
  by both the Prisma client and the Prisma CLI, so the two can never disagree.
- Task ordering is fractional. `packages/db/src/ordering.js` holds the pure
  functions; the server computes the position from the drop index and never
  trusts a position sent by the client.
- A column cannot be deleted while it still holds tasks. The relation is
  `ON DELETE NO ACTION`, which PostgreSQL checks at the end of the statement,
  so deleting a whole board still cascades cleanly.
- Migrations are committed. `prisma migrate dev` prompts for a migration name
  — pass `--name <name>` to create one non-interactively. `prisma migrate
  deploy` is the non-interactive path and is what CI uses.
- The seed is idempotent: every record is written with an upsert, so running
  it twice leaves the same rows with the same values. Re-running it resets
  the demo data rather than duplicating it. Due dates are anchored to
  midnight UTC of the current day, so the demo always shows a realistic mix
  of overdue, due today and upcoming work.

## Server Actions

Actions live next to the route that owns them, in a file named `actions.js`.

```js
"use server";

import { z } from "zod";

const inputSchema = z.object({
	boardId: z.string().min(1),
	title: z.string().trim().min(1).max(200),
});

export async function createTask(input) {
	const parsed = inputSchema.safeParse(input);

	if (!parsed.success) {
		return { ok: false, error: { code: "INVALID_INPUT", message: "..." } };
	}

	// 1. resolve the current user
	// 2. assert the capability (assertCan) BEFORE touching the database
	// 3. write the change and its Activity row in ONE transaction
	// 4. return { ok: true, data }
}
```

The order matters: authorise, then mutate. The activity row is written in the
same transaction as the change, so the history can never drift from the state.

## Permissions

Effective role resolution, highest precedence first:

1. platform admin → OWNER
2. `BoardMember.role`, if set (a board override wins and may lower a role)
3. `ProjectMember.role`, inherited
4. no access

Ranks: OWNER 3 > EDITOR 2 > VIEWER 1.

The capability matrix lives in `@kanban/config` (`can(role, capability)`,
`CAPABILITIES_BY_ROLE`) and is pure data, so it can be tested on its own. The
database-backed half lives in `@kanban/db` (`member.resolveRole(boardId,
userId)`). Wire the two together in an `assertCan` helper and call it as the
first line of every mutation — hiding a control in the UI is convenience, not
security.

## Testing

- `node --test`, no test framework dependency.
- Co-located tests: `src/foo.test.js` for units, `src/foo.integration-test.js`
  for tests that need the database.
- The root runner is `scripts/run-tests.mjs`. It escapes `[` and `]` so Next.js
  route segments are not silently dropped from the run.
- Integration tests skip themselves when no database is reachable, so
  `pnpm test` still passes on a machine without one.
- `packages/db` tests run under `tsx` because the generated Prisma client is
  TypeScript.

## AI

`@kanban/ai` exposes a provider contract (`src/provider.js`). Only the `null`
provider ships, so every AI action reports that no model is configured. Adding
a provider means adding a file under `packages/ai/src/providers/` and
registering it in `src/index.js` — nothing outside that package changes.

## Before you commit

```bash
pnpm lint
pnpm test
pnpm build
```

Biome formats on commit via nano-staged, but run `pnpm lint` yourself — the
pre-commit hook does not run the test suite.

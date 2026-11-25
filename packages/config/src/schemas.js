/**
 * Validation schemas shared by the server actions.
 *
 * Every server action, API route and form parses its input with one of these
 * before anything reaches the database. They live in @kanban/config so that
 * the client and the server agree on what a valid value looks like, and so
 * that a rule is defined in exactly one place.
 */

import { z } from "zod";
import { isColumnColor } from "./colors.js";

/** The name of the cookie holding the id of the signed-in (simulated) user. */
export const USER_COOKIE_NAME = "kb_user_id";

/** A cuid, or anything close enough to one for our purposes. */
export const idSchema = z.string().trim().min(1).max(64);

/**
 * A human-written name: a board name, a column name, a project name.
 */
export const nameSchema = z.string().trim().min(1).max(120);

/**
 * An optional description.
 */
export const descriptionSchema = z
	.string()
	.trim()
	.max(2000)
	.optional()
	.nullable()
	.transform((value) => (value ? value : null));

/**
 * A column colour: a hex value from the palette, or nothing.
 */
export const columnColorSchema = z
	.string()
	.refine(isColumnColor, { message: "Pick a colour from the palette." })
	.optional()
	.nullable()
	.transform((value) => (value ? value : null));

/**
 * A work-in-progress limit: a positive whole number, or nothing.
 */
export const wipLimitSchema = z
	.number()
	.int()
	.min(1)
	.max(999)
	.optional()
	.nullable()
	.transform((value) => value ?? null);

/** A membership role. */
export const roleSchema = z.enum(["VIEWER", "EDITOR", "OWNER"]);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const createProjectSchema = z.object({
	name: nameSchema,
	description: descriptionSchema,
});

export const updateProjectSchema = z.object({
	projectId: idSchema,
	name: nameSchema.optional(),
	description: descriptionSchema,
});

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

export const createBoardSchema = z.object({
	projectId: idSchema,
	name: nameSchema,
	description: descriptionSchema,
});

export const updateBoardSchema = z.object({
	boardId: idSchema,
	name: nameSchema.optional(),
	description: descriptionSchema,
});

export const setBoardArchivedSchema = z.object({
	boardId: idSchema,
	isArchived: z.boolean(),
});

export const reorderBoardsSchema = z.object({
	projectId: idSchema,
	orderedBoardIds: z.array(idSchema).min(1),
});

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export const createColumnSchema = z.object({
	boardId: idSchema,
	name: nameSchema,
	color: columnColorSchema,
	wipLimit: wipLimitSchema,
	isDone: z.boolean().optional().default(false),
});

export const updateColumnSchema = z.object({
	columnId: idSchema,
	name: nameSchema.optional(),
	color: columnColorSchema,
	wipLimit: wipLimitSchema,
	isDone: z.boolean().optional(),
});

export const moveColumnSchema = z.object({
	columnId: idSchema,
	direction: z.enum(["left", "right"]),
});

/**
 * Deleting a column.
 *
 * The reassignment target is mandatory. The database refuses to delete a
 * column that still holds tasks, and the app must never drop a task on the
 * floor - so the caller has to say where the tasks go.
 */
export const deleteColumnSchema = z.object({
	columnId: idSchema,
	reassignToColumnId: idSchema,
});

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export const addMemberSchema = z.object({
	boardId: idSchema,
	userId: idSchema,
	role: roleSchema,
});

export const changeMemberRoleSchema = z.object({
	boardId: idSchema,
	userId: idSchema,
	role: roleSchema,
});

export const removeMemberSchema = z.object({
	boardId: idSchema,
	userId: idSchema,
});

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const switchUserSchema = z.object({
	userId: idSchema,
});

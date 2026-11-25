"use server";

import {
	createColumnSchema,
	deleteColumnSchema,
	ERROR_CODES,
	fail,
	moveColumnSchema,
	ok,
	updateColumnSchema,
} from "@kanban/config";
import { column } from "@kanban/db";
import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action";
import { getCurrentRole } from "@/lib/session";

/**
 * Column actions.
 *
 * The one that matters most is `deleteColumn`. A column cannot be deleted
 * while it still holds tasks - the database refuses it - and the app must
 * never quietly drop a task. So the reassignment target is mandatory: the
 * caller has to say which column receives the tasks before the delete can
 * happen.
 */

/**
 * Adds a column to a board.
 */
export async function createColumn(input) {
	return runAction(async () => {
		const parsed = createColumnSchema.safeParse(input);

		if (!parsed.success) {
			return fail(
				ERROR_CODES.INVALID_INPUT,
				"Give the column a name of at least one character.",
			);
		}

		const role = await getCurrentRole(parsed.data.boardId);

		if (role !== "OWNER" && role !== "EDITOR") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only an editor or an owner can add a column.",
			);
		}

		const exists = await column.nameExists(
			parsed.data.boardId,
			parsed.data.name,
		);

		if (exists) {
			return fail(
				ERROR_CODES.CONFLICT,
				"This board already has a column with that name.",
			);
		}

		const sortOrder = await column.nextSortOrder(parsed.data.boardId);

		const created = await column.create({
			boardId: parsed.data.boardId,
			name: parsed.data.name,
			color: parsed.data.color,
			wipLimit: parsed.data.wipLimit,
			isDone: parsed.data.isDone,
			sortOrder,
		});

		revalidatePath(`/boards/${parsed.data.boardId}`);

		return ok({ id: created.id, name: created.name });
	}, "createColumn");
}

/**
 * Renames a column, recolours it, sets its WIP limit or flags it as the
 * "done" column.
 */
export async function updateColumn(input) {
	return runAction(async () => {
		const parsed = updateColumnSchema.safeParse(input);

		if (!parsed.success) {
			return fail(
				ERROR_CODES.INVALID_INPUT,
				"Give the column a name of at least one character.",
			);
		}

		const existing = await column.findById(parsed.data.columnId);

		if (!existing) {
			return fail(ERROR_CODES.NOT_FOUND, "That column no longer exists.");
		}

		const role = await getCurrentRole(existing.boardId);

		if (role !== "OWNER" && role !== "EDITOR") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only an editor or an owner can change a column.",
			);
		}

		const data = {};

		if (parsed.data.name !== undefined) {
			const exists = await column.nameExists(
				existing.boardId,
				parsed.data.name,
				parsed.data.columnId,
			);

			if (exists) {
				return fail(
					ERROR_CODES.CONFLICT,
					"This board already has a column with that name.",
				);
			}

			data.name = parsed.data.name;
		}

		if (parsed.data.color !== undefined) {
			data.color = parsed.data.color;
		}

		if (parsed.data.wipLimit !== undefined) {
			data.wipLimit = parsed.data.wipLimit;
		}

		if (parsed.data.isDone !== undefined) {
			data.isDone = parsed.data.isDone;
		}

		if (Object.keys(data).length === 0) {
			return ok({ id: parsed.data.columnId });
		}

		await column.update(parsed.data.columnId, data);

		revalidatePath(`/boards/${existing.boardId}`);

		return ok({ id: parsed.data.columnId });
	}, "updateColumn");
}

/**
 * Moves a column one place left or right.
 *
 * A board with one column cannot move, and the action says so rather than
 * pretending it worked.
 */
export async function moveColumn(input) {
	return runAction(async () => {
		const parsed = moveColumnSchema.safeParse(input);

		if (!parsed.success) {
			return fail(ERROR_CODES.INVALID_INPUT, "That request was not valid.");
		}

		const existing = await column.findById(parsed.data.columnId);

		if (!existing) {
			return fail(ERROR_CODES.NOT_FOUND, "That column no longer exists.");
		}

		const role = await getCurrentRole(existing.boardId);

		if (role !== "OWNER" && role !== "EDITOR") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only an editor or an owner can reorder the columns.",
			);
		}

		const columns = await column.findAllForBoard(existing.boardId);
		const index = columns.findIndex((entry) => entry.id === existing.id);
		const target = parsed.data.direction === "left" ? index - 1 : index + 1;

		if (target < 0 || target >= columns.length) {
			return ok({ id: existing.id, moved: false });
		}

		await column.move(existing.id, parsed.data.direction);

		revalidatePath(`/boards/${existing.boardId}`);

		return ok({ id: existing.id, moved: true });
	}, "moveColumn");
}

/**
 * Deletes a column, moving its tasks to another column first.
 *
 * The reassignment target is mandatory. If it is missing, the delete is
 * refused rather than attempted - a task must never be lost to a column
 * that went away.
 */
export async function deleteColumn(input) {
	return runAction(async () => {
		const parsed = deleteColumnSchema.safeParse(input);

		if (!parsed.success) {
			return fail(
				ERROR_CODES.INVALID_INPUT,
				"Choose the column that should receive the tasks.",
			);
		}

		const existing = await column.findById(parsed.data.columnId);

		if (!existing) {
			return fail(ERROR_CODES.NOT_FOUND, "That column no longer exists.");
		}

		const role = await getCurrentRole(existing.boardId);

		if (role !== "OWNER" && role !== "EDITOR") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only an editor or an owner can delete a column.",
			);
		}

		if (parsed.data.reassignToColumnId === parsed.data.columnId) {
			return fail(
				ERROR_CODES.INVALID_INPUT,
				"Choose a different column to receive the tasks.",
			);
		}

		const target = await column.findById(parsed.data.reassignToColumnId);

		if (!target || target.boardId !== existing.boardId) {
			return fail(
				ERROR_CODES.INVALID_INPUT,
				"Choose a column on the same board to receive the tasks.",
			);
		}

		await column.delete(existing.id, target.id);

		revalidatePath(`/boards/${existing.boardId}`);

		return ok({ id: existing.id });
	}, "deleteColumn");
}

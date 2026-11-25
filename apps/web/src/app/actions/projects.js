"use server";

import {
	createBoardSchema,
	createProjectSchema,
	DEFAULT_COLUMNS,
	ERROR_CODES,
	fail,
	ok,
	projectKey,
	reorderBoardsSchema,
	setBoardArchivedSchema,
	slugify,
	uniqueSlug,
	updateBoardSchema,
	updateProjectSchema,
} from "@kanban/config";
import { board, column, member, project } from "@kanban/db";
import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action";
import { getCurrentRole, getCurrentUserId } from "@/lib/session";

/**
 * Project and board actions.
 *
 * The order in every action is the same: parse the input, resolve the
 * actor, check the capability, then write. The permission check comes
 * before the write, so an unauthorised change never reaches the database.
 */

/**
 * The role the current user holds on a project.
 *
 * A project has no BoardMember rows, so the role is the one the user holds
 * as a project member - or OWNER when they own the project.
 *
 * @param {string} projectId
 * @returns {Promise<"OWNER" | "EDITOR" | "VIEWER" | null>}
 */
async function resolveProjectRole(projectId) {
	const userId = await getCurrentUserId();

	if (!userId) {
		return null;
	}

	const record = await project.findById(projectId, {
		include: { owner: true, members: true },
	});

	if (!record) {
		return null;
	}

	if (record.ownerId === userId) {
		return "OWNER";
	}

	const membership = record.members.find((entry) => entry.userId === userId);

	return membership?.role ?? null;
}

/**
 * Creates a project and makes the current user its owner.
 */
export async function createProject(input) {
	return runAction(async () => {
		const parsed = createProjectSchema.safeParse(input);

		if (!parsed.success) {
			return fail(
				ERROR_CODES.INVALID_INPUT,
				"Give the project a name of at least one character.",
			);
		}

		const userId = await getCurrentUserId();

		if (!userId) {
			return fail(ERROR_CODES.FORBIDDEN, "There is no user to sign in as.");
		}

		const slug = await uniqueSlug(slugify(parsed.data.name), (candidate) =>
			project.slugExists(candidate),
		);

		const created = await project.create({
			name: parsed.data.name,
			slug,
			key: projectKey(parsed.data.name),
			description: parsed.data.description,
			ownerId: userId,
		});

		// The owner is a member of the project as well as its owner, so the
		// member list shows them and the role resolves the same way for
		// everybody else.
		await member.addProjectMember({
			projectId: created.id,
			userId,
			role: "OWNER",
		});

		revalidatePath("/");
		revalidatePath(`/projects/${created.id}`);

		return ok({ id: created.id, slug: created.slug });
	}, "createProject");
}

/**
 * Renames a project or changes its description.
 */
export async function updateProject(input) {
	return runAction(async () => {
		const parsed = updateProjectSchema.safeParse(input);

		if (!parsed.success) {
			return fail(
				ERROR_CODES.INVALID_INPUT,
				"Give the project a name of at least one character.",
			);
		}

		const role = await resolveProjectRole(parsed.data.projectId);

		if (role !== "OWNER") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only a project owner can change a project.",
			);
		}

		const data = {};

		if (parsed.data.name !== undefined) {
			data.name = parsed.data.name;
		}

		if (parsed.data.description !== undefined) {
			data.description = parsed.data.description;
		}

		if (Object.keys(data).length === 0) {
			return ok({ id: parsed.data.projectId });
		}

		await project.update(parsed.data.projectId, data);

		revalidatePath("/");
		revalidatePath(`/projects/${parsed.data.projectId}`);

		return ok({ id: parsed.data.projectId });
	}, "updateProject");
}

/**
 * Creates a board inside a project, with the default columns.
 *
 * A board without columns is not a board, so the default set is created in
 * the same call. The columns are written one at a time because the schema
 * has no create-many for a nested list with per-row defaults.
 */
export async function createBoard(input) {
	return runAction(async () => {
		const parsed = createBoardSchema.safeParse(input);

		if (!parsed.success) {
			return fail(
				ERROR_CODES.INVALID_INPUT,
				"Give the board a name of at least one character.",
			);
		}

		const role = await resolveProjectRole(parsed.data.projectId);

		if (role !== "OWNER" && role !== "EDITOR") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only an editor or an owner can add a board to a project.",
			);
		}

		const exists = await board.nameExists(
			parsed.data.projectId,
			parsed.data.name,
		);

		if (exists) {
			return fail(
				ERROR_CODES.CONFLICT,
				"This project already has a board with that name.",
			);
		}

		const sortOrder = await project.nextBoardSortOrder(parsed.data.projectId);

		const created = await board.create({
			projectId: parsed.data.projectId,
			name: parsed.data.name,
			description: parsed.data.description,
			sortOrder,
		});

		for (const [index, name] of DEFAULT_COLUMNS.entries()) {
			await createColumnDirect(created.id, name, index);
		}

		revalidatePath("/");
		revalidatePath(`/projects/${parsed.data.projectId}`);
		revalidatePath(`/boards/${created.id}`);

		return ok({ id: created.id, name: created.name });
	}, "createBoard");
}

/**
 * Writes one of the default columns.
 *
 * The default "Done" column is flagged as the column that completed work
 * lands in.
 *
 * @param {string} boardId
 * @param {string} name
 * @param {number} sortOrder
 */
async function createColumnDirect(boardId, name, sortOrder) {
	await column.create({
		boardId,
		name,
		sortOrder,
		isDone: name.toLowerCase() === "done",
	});
}

/**
 * Renames a board or changes its description.
 */
export async function updateBoard(input) {
	return runAction(async () => {
		const parsed = updateBoardSchema.safeParse(input);

		if (!parsed.success) {
			return fail(
				ERROR_CODES.INVALID_INPUT,
				"Give the board a name of at least one character.",
			);
		}

		const role = await getCurrentRole(parsed.data.boardId);

		if (role !== "OWNER") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only a board owner can rename a board.",
			);
		}

		const data = {};

		if (parsed.data.name !== undefined) {
			const record = await board.findById(parsed.data.boardId, {
				include: { project: true },
			});

			if (!record) {
				return fail(ERROR_CODES.NOT_FOUND, "That board no longer exists.");
			}

			const exists = await board.nameExists(
				record.projectId,
				parsed.data.name,
				parsed.data.boardId,
			);

			if (exists) {
				return fail(
					ERROR_CODES.CONFLICT,
					"This project already has a board with that name.",
				);
			}

			data.name = parsed.data.name;
		}

		if (parsed.data.description !== undefined) {
			data.description = parsed.data.description;
		}

		if (Object.keys(data).length === 0) {
			return ok({ id: parsed.data.boardId });
		}

		await board.update(parsed.data.boardId, data);

		revalidatePath(`/boards/${parsed.data.boardId}`);

		return ok({ id: parsed.data.boardId });
	}, "updateBoard");
}

/**
 * Archives a board, or brings it back.
 *
 * Archiving hides a board without destroying it: the columns, the tasks and
 * the history all stay.
 */
export async function setBoardArchived(input) {
	return runAction(async () => {
		const parsed = setBoardArchivedSchema.safeParse(input);

		if (!parsed.success) {
			return fail(ERROR_CODES.INVALID_INPUT, "That request was not valid.");
		}

		const role = await getCurrentRole(parsed.data.boardId);

		if (role !== "OWNER") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only a board owner can archive a board.",
			);
		}

		await board.archive(parsed.data.boardId, parsed.data.isArchived);

		revalidatePath("/");
		revalidatePath(`/boards/${parsed.data.boardId}`);

		return ok({ id: parsed.data.boardId, isArchived: parsed.data.isArchived });
	}, "setBoardArchived");
}

/**
 * Reorders the boards of a project.
 */
export async function reorderBoards(input) {
	return runAction(async () => {
		const parsed = reorderBoardsSchema.safeParse(input);

		if (!parsed.success) {
			return fail(ERROR_CODES.INVALID_INPUT, "That request was not valid.");
		}

		const role = await resolveProjectRole(parsed.data.projectId);

		if (role !== "OWNER" && role !== "EDITOR") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only an editor or an owner can reorder the boards.",
			);
		}

		await board.reorder(parsed.data.projectId, parsed.data.orderedBoardIds);

		revalidatePath(`/projects/${parsed.data.projectId}`);

		return ok({ ids: parsed.data.orderedBoardIds });
	}, "reorderBoards");
}

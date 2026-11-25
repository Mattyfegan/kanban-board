"use server";

import {
	addMemberSchema,
	changeMemberRoleSchema,
	ERROR_CODES,
	fail,
	ok,
	removeMemberSchema,
} from "@kanban/config";
import { member, user } from "@kanban/db";
import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action";
import { getCurrentRole } from "@/lib/session";

/**
 * Membership actions.
 *
 * A board member is either inherited from the project or set explicitly on
 * the board. An explicit board role wins over the inherited one, and it may
 * lower a role as well as raise it.
 *
 * Managing members is an owner-only capability. An editor can work on the
 * board but cannot change who can reach it.
 */

/**
 * Adds a member to a board.
 */
export async function addBoardMember(input) {
	return runAction(async () => {
		const parsed = addMemberSchema.safeParse(input);

		if (!parsed.success) {
			return fail(ERROR_CODES.INVALID_INPUT, "Choose a user and a role.");
		}

		const role = await getCurrentRole(parsed.data.boardId);

		if (role !== "OWNER") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only a board owner can manage the members.",
			);
		}

		const target = await user.findById(parsed.data.userId);

		if (!target) {
			return fail(ERROR_CODES.NOT_FOUND, "That user no longer exists.");
		}

		await member.addBoardMember({
			boardId: parsed.data.boardId,
			userId: parsed.data.userId,
			role: parsed.data.role,
		});

		revalidatePath(`/boards/${parsed.data.boardId}`);

		return ok({ id: parsed.data.userId, role: parsed.data.role });
	}, "addBoardMember");
}

/**
 * Changes the role a user holds on a board.
 */
export async function changeBoardMemberRole(input) {
	return runAction(async () => {
		const parsed = changeMemberRoleSchema.safeParse(input);

		if (!parsed.success) {
			return fail(ERROR_CODES.INVALID_INPUT, "Choose a role.");
		}

		const role = await getCurrentRole(parsed.data.boardId);

		if (role !== "OWNER") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only a board owner can manage the members.",
			);
		}

		const existing = await member.listBoardMembers(parsed.data.boardId);
		const found = existing.find((entry) => entry.userId === parsed.data.userId);

		if (!found) {
			return fail(
				ERROR_CODES.NOT_FOUND,
				"That person is not a member of this board.",
			);
		}

		await member.setBoardRole({
			boardId: parsed.data.boardId,
			userId: parsed.data.userId,
			role: parsed.data.role,
		});

		revalidatePath(`/boards/${parsed.data.boardId}`);

		return ok({ id: parsed.data.userId, role: parsed.data.role });
	}, "changeBoardMemberRole");
}

/**
 * Removes a member from a board.
 *
 * Removing a board override does not remove the person from the project -
 * they fall back to the role they hold there. That is the whole point of
 * having two levels of membership.
 */
export async function removeBoardMember(input) {
	return runAction(async () => {
		const parsed = removeMemberSchema.safeParse(input);

		if (!parsed.success) {
			return fail(ERROR_CODES.INVALID_INPUT, "That request was not valid.");
		}

		const role = await getCurrentRole(parsed.data.boardId);

		if (role !== "OWNER") {
			return fail(
				ERROR_CODES.FORBIDDEN,
				"Only a board owner can manage the members.",
			);
		}

		await member.removeBoardMember({
			boardId: parsed.data.boardId,
			userId: parsed.data.userId,
		});

		revalidatePath(`/boards/${parsed.data.boardId}`);

		return ok({ id: parsed.data.userId });
	}, "removeBoardMember");
}

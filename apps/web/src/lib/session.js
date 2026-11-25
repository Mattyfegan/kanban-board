import { USER_COOKIE_NAME } from "@kanban/config";
import { member, user } from "@kanban/db";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * The simulated identity.
 *
 * There is no login. The `kb_user_id` cookie holds the id of the user the
 * app is acting as, and the dev user switcher swaps that cookie. The
 * permission *enforcement* is real and lives on the server - only the
 * identity is a cookie.
 *
 * The cookie is deliberately readable and writable by the client: the
 * switcher needs to change it, and a simulated identity that needed a
 * signature would need a secret that the switcher could not hold.
 */

/**
 * The user the app is currently acting as.
 *
 * The result is memoised per request, so a page that asks for the current
 * user in several places only hits the database once.
 *
 * When the cookie is absent, points at a user that no longer exists, or
 * names a user with no access at all, the first user in the database is
 * used. That keeps a fresh install usable without a manual cookie edit.
 *
 * @returns {Promise<{
 *   id: string,
 *   email: string,
 *   name: string,
 *   avatarColor: string,
 *   isAdmin: boolean,
 *   isFallback: boolean
 * } | null>}
 */
export const getCurrentUser = cache(async () => {
	const cookieStore = await cookies();
	const userId = cookieStore.get(USER_COOKIE_NAME)?.value;

	if (userId) {
		const found = await user.findById(userId);

		if (found) {
			return { ...found, isFallback: false };
		}
	}

	const fallback = await user.findAll().then((users) => users[0] ?? null);

	if (!fallback) {
		return null;
	}

	return { ...fallback, isFallback: true };
});

/**
 * The id of the current user, or null when there is no user at all.
 *
 * @returns {Promise<string | null>}
 */
export async function getCurrentUserId() {
	const current = await getCurrentUser();
	return current?.id ?? null;
}

/**
 * The effective role the current user holds on a board.
 *
 * The resolution - platform admin, then a board override, then the
 * inherited project role - lives in `member.resolveRole` in @kanban/db.
 *
 * @param {string} boardId
 * @returns {Promise<"OWNER" | "EDITOR" | "VIEWER" | null>}
 */
export async function getCurrentRole(boardId) {
	const current = await getCurrentUser();

	if (!current) {
		return null;
	}

	return member.resolveRole(boardId, current.id);
}

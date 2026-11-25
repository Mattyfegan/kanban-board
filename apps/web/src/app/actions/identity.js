"use server";

import {
	ERROR_CODES,
	fail,
	ok,
	switchUserSchema,
	USER_COOKIE_NAME,
} from "@kanban/config";
import { user } from "@kanban/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { runAction } from "@/lib/action";

/**
 * The dev user switcher.
 *
 * There is no login, so the app acts as whoever the `kb_user_id` cookie
 * names. This action swaps that cookie, which is what lets the permission
 * matrix be exercised by hand: switch to a viewer and the board stops
 * offering the controls an editor gets.
 *
 * The cookie is httpOnly - the client never reads it, it only asks for a
 * change - but it is deliberately not signed, because a simulated identity
 * has to be swappable from the UI.
 */
export async function switchUser(input) {
	return runAction(async () => {
		const parsed = switchUserSchema.safeParse(input);

		if (!parsed.success) {
			return fail(ERROR_CODES.INVALID_INPUT, "Pick a user to switch to.");
		}

		const target = await user.findById(parsed.data.userId);

		if (!target) {
			return fail(ERROR_CODES.NOT_FOUND, "That user no longer exists.");
		}

		const cookieStore = await cookies();

		cookieStore.set(USER_COOKIE_NAME, target.id, {
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			// A session cookie is enough: the identity is simulated and
			// resetting it on the next browser session is the honest default.
			maxAge: 60 * 60 * 24 * 30,
		});

		// The whole shell depends on who is signed in, so every route is
		// re-rendered rather than patched in place.
		revalidatePath("/", "layout");

		return ok({ id: target.id, name: target.name });
	}, "switchUser");
}

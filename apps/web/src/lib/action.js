import {
	createLogger,
	ERROR_CODES,
	fail,
	failValidation,
} from "@kanban/config";

const logger = createLogger("action");

/**
 * Helpers shared by the server actions.
 *
 * Every action follows the same shape:
 *
 *   1. parse the input with a Zod schema
 *   2. resolve the actor
 *   3. assert the capability
 *   4. write the change
 *   5. return `{ ok: true, data }`
 *
 * The steps that repeat - parsing, catching the unexpected - live here so
 * that every action in the app behaves the same way.
 */

/**
 * Runs an action body, turning an expected failure into an envelope.
 *
 * A Zod failure becomes INVALID_INPUT, a Prisma unique-constraint failure
 * becomes CONFLICT, and anything else becomes INTERNAL with the error
 * logged. Nothing is thrown at the client, so the client never has to wrap
 * a call in try/catch.
 *
 * @template T
 * @param {() => Promise<{ ok: true, data: T }>} body
 * @param {string} [scope] - Name of the action, used in the log line
 * @returns {Promise<{ ok: true, data: T } | { ok: false, error: { code: string, message: string } }>}
 */
export async function runAction(body, scope = "action") {
	try {
		return await body();
	} catch (error) {
		if (error?.name === "ZodError" || Array.isArray(error?.issues)) {
			return failValidation(error);
		}

		if (error?.code === "P2002") {
			return fail(
				ERROR_CODES.CONFLICT,
				"That name is already taken. Pick a different one.",
			);
		}

		if (error?.code === "P2003") {
			return fail(
				ERROR_CODES.INVALID_STATE,
				"That change would break a relationship. Check the values and try again.",
			);
		}

		logger.error(`${scope} failed`, error);

		return fail(
			ERROR_CODES.INTERNAL,
			"Something went wrong on the server. Try again.",
		);
	}
}

/**
 * Parses input, returning a failed envelope instead of throwing.
 *
 * @template T
 * @param {{ safeParse: (value: unknown) => { success: boolean, data?: T, error?: import("zod").ZodError } }} schema
 * @param {unknown} input
 * @returns {{ ok: true, data: T } | { ok: false, error: { code: string, message: string } }}
 */
export function parseOrFail(schema, input) {
	const parsed = schema.safeParse(input);

	if (!parsed.success) {
		return failValidation(parsed.error);
	}

	return { ok: true, data: parsed.data };
}

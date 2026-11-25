/**
 * The result envelope.
 *
 * Every server action in the app returns one of these two shapes. The client
 * never has to wrap a call in try/catch and never has to guess whether a
 * rejection means "the server is broken" or "the input was rejected".
 *
 * - `{ ok: true, data }` - the call succeeded, `data` holds the result.
 * - `{ ok: false, error }` - the call failed in an expected way. `error` holds
 *   a machine-readable `code` and a human-readable `message`.
 *
 * Throwing is reserved for genuinely exceptional states - a bug, or a
 * dependency that is unreachable. See CLAUDE.md.
 */

/** Machine-readable error codes returned in the envelope. */
export const ERROR_CODES = Object.freeze({
	/** The input did not satisfy the Zod schema. */
	INVALID_INPUT: "INVALID_INPUT",
	/** The referenced record does not exist. */
	NOT_FOUND: "NOT_FOUND",
	/** The record already exists (a unique constraint would be violated). */
	CONFLICT: "CONFLICT",
	/** The caller is not allowed to perform this action. */
	FORBIDDEN: "FORBIDDEN",
	/** The action is valid but the current state does not allow it. */
	INVALID_STATE: "INVALID_STATE",
	/** Something unexpected went wrong. */
	INTERNAL: "INTERNAL",
});

/**
 * Builds a successful envelope.
 *
 * @template T
 * @param {T} data
 * @returns {{ ok: true, data: T }}
 */
export function ok(data) {
	return { ok: true, data };
}

/**
 * Builds a failed envelope.
 *
 * @param {string} code - One of ERROR_CODES
 * @param {string} message - Human-readable explanation
 * @returns {{ ok: false, error: { code: string, message: string } }}
 */
export function fail(code, message) {
	return { ok: false, error: { code, message } };
}

/**
 * A failed envelope for input that did not pass validation.
 *
 * @param {import("zod").ZodError} error
 * @returns {{ ok: false, error: { code: string, message: string } }}
 */
export function failValidation(error) {
	const first = error.issues[0];
	const field = first?.path.length > 0 ? first.path.join(".") : "input";
	const message = first?.message ?? "The input was not valid.";

	return fail(ERROR_CODES.INVALID_INPUT, `${field}: ${message}`);
}

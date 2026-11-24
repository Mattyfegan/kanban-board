import { ROLE_RANK } from "./constants.js";

/**
 * The capability matrix.
 *
 * Capabilities are named `resource:action` and checked against the effective
 * role a user holds on a board. The matrix itself is pure data with no
 * database access, so it can be unit tested on its own and reused by the
 * server, the client and the tests.
 *
 * The effective role is resolved by `member.resolveRole` in @kanban/db, which
 * is where the database access lives.
 */

/** Every capability the app checks. */
export const CAPABILITIES = /** @type {const} */ ([
	"board:read",
	"board:update",
	"board:delete",
	"column:create",
	"column:update",
	"column:move",
	"column:delete",
	"task:create",
	"task:update",
	"task:move",
	"task:delete",
	"task:restore",
	"task:assign",
	"label:manage",
	"member:manage",
	"activity:read",
]);

const VIEWER_CAPABILITIES = ["board:read", "activity:read"];

const EDITOR_CAPABILITIES = [
	...VIEWER_CAPABILITIES,
	"column:create",
	"column:update",
	"column:move",
	"column:delete",
	"task:create",
	"task:update",
	"task:move",
	"task:delete",
	"task:restore",
	"task:assign",
	"label:manage",
];

const OWNER_CAPABILITIES = [
	...EDITOR_CAPABILITIES,
	"board:update",
	"board:delete",
	"member:manage",
];

/** The capabilities granted to each role. */
export const CAPABILITIES_BY_ROLE = Object.freeze({
	VIEWER: Object.freeze([...VIEWER_CAPABILITIES]),
	EDITOR: Object.freeze([...EDITOR_CAPABILITIES]),
	OWNER: Object.freeze([...OWNER_CAPABILITIES]),
});

const CAPABILITY_SETS = Object.freeze(
	Object.fromEntries(
		Object.entries(CAPABILITIES_BY_ROLE).map(([role, capabilities]) => [
			role,
			new Set(capabilities),
		]),
	),
);

/**
 * Whether a role grants a capability.
 *
 * @param {"OWNER" | "EDITOR" | "VIEWER" | null | undefined} role
 * @param {string} capability - One of CAPABILITIES
 * @returns {boolean}
 */
export function can(role, capability) {
	if (!role) {
		return false;
	}

	return CAPABILITY_SETS[role]?.has(capability) ?? false;
}

/**
 * Whether a role is at least as privileged as another.
 *
 * @param {"OWNER" | "EDITOR" | "VIEWER" | null | undefined} role
 * @param {"OWNER" | "EDITOR" | "VIEWER"} minimum
 * @returns {boolean}
 */
export function roleAtLeast(role, minimum) {
	if (!role) {
		return false;
	}

	return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minimum] ?? 0);
}

/**
 * The capabilities a role grants, as a plain array.
 *
 * @param {"OWNER" | "EDITOR" | "VIEWER" | null | undefined} role
 * @returns {string[]}
 */
export function capabilitiesFor(role) {
	if (!role) {
		return [];
	}

	return [...(CAPABILITIES_BY_ROLE[role] ?? [])];
}

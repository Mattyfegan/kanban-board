/**
 * Column colours.
 *
 * A column carries an optional hex colour. The UI offers a fixed palette
 * rather than a free colour picker, so every colour in the app is one of a
 * known set - which keeps the board readable and keeps a colour from being
 * unreadable against the surface.
 */

/**
 * The palette a user can pick for a column.
 *
 * @type {ReadonlyArray<{ value: string, label: string }>}
 */
export const COLUMN_COLORS = Object.freeze([
	{ value: "#64748b", label: "Slate" },
	{ value: "#3b82f6", label: "Blue" },
	{ value: "#0ea5e9", label: "Sky" },
	{ value: "#22c55e", label: "Green" },
	{ value: "#eab308", label: "Yellow" },
	{ value: "#f59e0b", label: "Amber" },
	{ value: "#f97316", label: "Orange" },
	{ value: "#ef4444", label: "Red" },
	{ value: "#ec4899", label: "Pink" },
	{ value: "#a855f7", label: "Purple" },
	{ value: "#8b5cf6", label: "Violet" },
	{ value: "#14b8a6", label: "Teal" },
]);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * Whether a value is a colour the app accepts.
 *
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
export function isColumnColor(value) {
	if (typeof value !== "string") {
		return false;
	}

	if (value === "") {
		return true;
	}

	return HEX_COLOR.test(value);
}

/**
 * The label for a colour, falling back to the raw value for a colour that is
 * not in the palette.
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function columnColorLabel(value) {
	const match = COLUMN_COLORS.find((entry) => entry.value === value);
	return match?.label ?? value ?? "None";
}

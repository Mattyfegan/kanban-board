/**
 * Slug and project-key helpers.
 *
 * A project has two derived identifiers: a `slug`, which is the URL-friendly
 * name used in links, and a `key`, a short uppercase prefix used when
 * building task references like `ATL-42`.
 *
 * Both are derived from the project name, so creating a project from a form
 * needs no extra fields from the user.
 */

/**
 * Turns a name into a URL-friendly slug.
 *
 * Accented characters are folded to their ASCII equivalent, so "Café Plan"
 * becomes "cafe-plan" rather than "caf-plan".
 *
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
}

/**
 * Derives a short uppercase project key from a name.
 *
 * "Atlas Redesign" becomes "AR", "Orbital Platform" becomes "OP". When the
 * name has only one word, the first three letters are used.
 *
 * @param {string} value
 * @returns {string}
 */
export function projectKey(value) {
	const words = value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase()
		.split(/[^A-Z0-9]+/)
		.filter(Boolean);

	if (words.length === 0) {
		return "PRJ";
	}

	if (words.length === 1) {
		return words[0].slice(0, 3).padEnd(3, "X");
	}

	return words
		.slice(0, 2)
		.map((word) => word[0])
		.join("");
}

/**
 * Appends a numeric suffix to a slug until it is unique.
 *
 * "atlas-redesign" becomes "atlas-redesign-2" when that slug is taken.
 *
 * @param {string} slug - The desired slug
 * @param {(candidate: string) => boolean | Promise<boolean>} isTaken
 * @returns {Promise<string>}
 */
export async function uniqueSlug(slug, isTaken) {
	const base = slug || "project";

	if (!(await isTaken(base))) {
		return base;
	}

	for (let suffix = 2; suffix < 100; suffix += 1) {
		const candidate = `${base}-${suffix}`;

		if (!(await isTaken(candidate))) {
			return candidate;
		}
	}

	throw new Error(
		`Could not find a free slug for "${base}" after 99 attempts.`,
	);
}

/**
 * Ordering primitives.
 *
 * Tasks are ordered within a column by a fractional `position` rather than by
 * an integer index. The gap between two tasks is what allows a drag to be a
 * single row update: dropping a card between two others sets its position to
 * the midpoint of theirs.
 *
 * The cost of fractional positions is that repeated insertions into the same
 * gap shrink it. Once the gap between two neighbours drops below
 * MIN_POSITION_GAP the column is renormalised, which rewrites its positions
 * to evenly spaced multiples of POSITION_STEP. That rewrite is rare and is a
 * single transaction, so it is cheaper than maintaining integer positions on
 * every move.
 */

/** Distance between the positions of two adjacent tasks after a renormalise. */
export const POSITION_STEP = 1024;

/**
 * The smallest gap that still keeps a midpoint meaningfully distinct from its
 * neighbours. Below this the column is renormalised.
 */
export const MIN_POSITION_GAP = 1e-6;

/**
 * The position given to the first task in an empty column.
 *
 * @returns {number}
 */
export function firstPosition() {
	return POSITION_STEP;
}

/**
 * The position of a task appended after the current last one.
 *
 * @param {number | null | undefined} lastPositionInColumn
 * @returns {number}
 */
export function positionAfter(lastPositionInColumn) {
	if (lastPositionInColumn === null || lastPositionInColumn === undefined) {
		return firstPosition();
	}

	return lastPositionInColumn + POSITION_STEP;
}

/**
 * The position of a task inserted before the current first one.
 *
 * @param {number | null | undefined} firstPositionInColumn
 * @returns {number}
 */
export function positionBefore(firstPositionInColumn) {
	if (firstPositionInColumn === null || firstPositionInColumn === undefined) {
		return firstPosition();
	}

	return firstPositionInColumn - POSITION_STEP;
}

/**
 * The position of a task inserted between two neighbours.
 *
 * Passing `null` for either neighbour means that side of the column is
 * empty, so the task lands at the outer edge instead of a midpoint.
 *
 * @param {number | null | undefined} before - Position of the task above
 * @param {number | null | undefined} after - Position of the task below
 * @returns {number}
 */
export function positionBetween(before, after) {
	const hasBefore = before !== null && before !== undefined;
	const hasAfter = after !== null && after !== undefined;

	if (!hasBefore && !hasAfter) {
		return firstPosition();
	}

	if (!hasBefore) {
		return positionBefore(after);
	}

	if (!hasAfter) {
		return positionAfter(before);
	}

	return (before + after) / 2;
}

/**
 * Whether the gap between two neighbours has shrunk far enough that the
 * column needs renormalising.
 *
 * @param {number | null | undefined} before
 * @param {number | null | undefined} after
 * @returns {boolean}
 */
export function needsRenormalisation(before, after) {
	if (before === null || before === undefined) {
		return false;
	}

	if (after === null || after === undefined) {
		return false;
	}

	return after - before < MIN_POSITION_GAP;
}

/**
 * Evenly spaced positions for a column holding `count` tasks.
 *
 * @param {number} count
 * @returns {number[]}
 */
export function spreadPositions(count) {
	return Array.from(
		{ length: count },
		(_, index) => (index + 1) * POSITION_STEP,
	);
}

/**
 * Reorders a list of task ids to match a list of positions.
 *
 * @param {string[]} taskIds - Task ids in their current order
 * @param {number[]} positions - The position each task should take
 * @returns {Array<{ id: string, position: number }>}
 */
export function applyPositions(taskIds, positions) {
	return taskIds.map((id, index) => ({ id, position: positions[index] }));
}

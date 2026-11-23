/**
 * Shared constants for the Kanban Board.
 *
 * These mirror the Prisma enums in packages/db/prisma/schema.prisma. The
 * enums are the source of truth in the database; this file exists so that
 * client components and server actions can reason about the same vocabulary
 * without importing the generated Prisma client into the browser bundle.
 *
 * If you change an enum in the schema, change it here too.
 */

/** Board / project membership roles, ordered from least to most privileged. */
export const ROLES = /** @type {const} */ (["VIEWER", "EDITOR", "OWNER"]);

/**
 * Numeric rank for each role. Higher is more privileged. Used by the
 * permission resolver to compare an effective role against a required one.
 */
export const ROLE_RANK = Object.freeze({
	VIEWER: 1,
	EDITOR: 2,
	OWNER: 3,
});

/** Task priorities. */
export const PRIORITIES = /** @type {const} */ ([
	"LOW",
	"MEDIUM",
	"HIGH",
	"URGENT",
]);

/** Rank for each priority. Higher is more urgent. Used for sorting. */
export const PRIORITY_RANK = Object.freeze({
	LOW: 1,
	MEDIUM: 2,
	HIGH: 3,
	URGENT: 4,
});

/** Sort modes available per column. */
export const SORT_MODES = /** @type {const} */ ([
	"MANUAL",
	"PRIORITY",
	"DUE_DATE",
	"CREATED",
]);

/** Every activity action recorded in the Activity table. */
export const ACTIVITY_ACTIONS = /** @type {const} */ ([
	"PROJECT_CREATED",
	"BOARD_CREATED",
	"BOARD_RENAMED",
	"BOARD_ARCHIVED",
	"COLUMN_CREATED",
	"COLUMN_RENAMED",
	"COLUMN_MOVED",
	"COLUMN_DELETED",
	"TASK_CREATED",
	"TASK_UPDATED",
	"TASK_MOVED",
	"TASK_DELETED",
	"TASK_RESTORED",
	"TASK_ASSIGNED",
	"TASK_UNASSIGNED",
	"TASK_PRIORITY_CHANGED",
	"TASK_DUE_CHANGED",
	"TASK_COMPLETED",
	"TASK_REOPENED",
	"SUBTASK_ADDED",
	"SUBTASK_COMPLETED",
	"MEMBER_ADDED",
	"MEMBER_ROLE_CHANGED",
	"MEMBER_REMOVED",
	"AI_SUGGESTED_SUBTASKS",
	"AI_DRAFTED_DESCRIPTION",
	"AI_CATEGORISED_TASK",
]);

/**
 * Human-readable label for each activity action, used by the timeline UI.
 *
 * @param {string} action
 * @returns {string}
 */
export function describeActivity(action) {
	const labels = {
		PROJECT_CREATED: "created the project",
		BOARD_CREATED: "created the board",
		BOARD_RENAMED: "renamed the board",
		BOARD_ARCHIVED: "archived the board",
		COLUMN_CREATED: "added the column",
		COLUMN_RENAMED: "renamed the column",
		COLUMN_MOVED: "reordered the columns",
		COLUMN_DELETED: "deleted the column",
		TASK_CREATED: "created the task",
		TASK_UPDATED: "updated the task",
		TASK_MOVED: "moved the task",
		TASK_DELETED: "deleted the task",
		TASK_RESTORED: "restored the task",
		TASK_ASSIGNED: "assigned the task",
		TASK_UNASSIGNED: "unassigned the task",
		TASK_PRIORITY_CHANGED: "changed the priority",
		TASK_DUE_CHANGED: "changed the due date",
		TASK_COMPLETED: "completed the task",
		TASK_REOPENED: "reopened the task",
		SUBTASK_ADDED: "added a subtask",
		SUBTASK_COMPLETED: "completed a subtask",
		MEMBER_ADDED: "added a member",
		MEMBER_ROLE_CHANGED: "changed a member's role",
		MEMBER_REMOVED: "removed a member",
		AI_SUGGESTED_SUBTASKS: "accepted AI subtask suggestions",
		AI_DRAFTED_DESCRIPTION: "accepted an AI description draft",
		AI_CATEGORISED_TASK: "accepted an AI categorisation",
	};

	return labels[action] ?? "updated the board";
}

/** Default column names given to a freshly created board. */
export const DEFAULT_COLUMNS = /** @type {const} */ ([
	"Backlog",
	"To Do",
	"In Progress",
	"Review",
	"Done",
]);

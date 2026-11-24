import { prisma } from "./client.js";
import {
	needsRenormalisation,
	POSITION_STEP,
	positionBetween,
} from "./ordering.js";

/**
 * The query helper layer.
 *
 * This is the only place application code is allowed to touch Prisma. Pages
 * and server actions import from here, never from the client directly, so
 * every read and every write is shaped the same way and there is exactly one
 * place to look when a query needs to change.
 *
 * The helpers are grouped by entity and named after the thing they do:
 * `task.findAllForBoard`, `member.resolveRole`, and so on.
 */

/** Fields safe to return to a client. Never expose more than a client needs. */
const USER_SAFE_SELECT = {
	id: true,
	email: true,
	name: true,
	avatarColor: true,
	isAdmin: true,
	createdAt: true,
	updatedAt: true,
};

const TASK_INCLUDE = {
	assignee: { select: USER_SAFE_SELECT },
	reporter: { select: USER_SAFE_SELECT },
	labels: { include: { label: true } },
	subtasks: {
		select: {
			id: true,
			title: true,
			completedAt: true,
			position: true,
		},
		orderBy: { position: "asc" },
	},
};

export const user = {
	async findById(id, { select = USER_SAFE_SELECT } = {}) {
		return prisma.user.findUnique({ where: { id }, select });
	},

	async findByEmail(email) {
		return prisma.user.findUnique({ where: { email } });
	},

	async findAll() {
		return prisma.user.findMany({ orderBy: { name: "asc" } });
	},

	async create(data) {
		return prisma.user.create({ data });
	},

	async update(id, data) {
		return prisma.user.update({ where: { id }, data });
	},
};

export const project = {
	async findById(id, { include } = {}) {
		return prisma.project.findUnique({
			where: { id },
			include: include ?? {
				owner: { select: USER_SAFE_SELECT },
				members: { include: { user: { select: USER_SAFE_SELECT } } },
				boards: { orderBy: { sortOrder: "asc" } },
			},
		});
	},

	async findBySlug(slug) {
		return prisma.project.findUnique({ where: { slug } });
	},

	/** Every project the user owns or is a member of. */
	async findAllForUser(userId) {
		return prisma.project.findMany({
			where: {
				OR: [{ ownerId: userId }, { members: { some: { userId } } }],
			},
			orderBy: { name: "asc" },
			include: {
				owner: { select: USER_SAFE_SELECT },
				boards: { orderBy: { sortOrder: "asc" } },
			},
		});
	},

	async create(data) {
		return prisma.project.create({ data });
	},

	async update(id, data) {
		return prisma.project.update({ where: { id }, data });
	},

	async archive(id, archived = true) {
		return prisma.project.update({
			where: { id },
			data: { isArchived: archived },
		});
	},
};

export const board = {
	async findById(id, { include } = {}) {
		return prisma.board.findUnique({
			where: { id },
			include: include ?? {
				project: true,
				columns: { orderBy: { sortOrder: "asc" } },
				labels: { orderBy: { name: "asc" } },
				members: { include: { user: { select: USER_SAFE_SELECT } } },
			},
		});
	},

	async findAllForProject(projectId) {
		return prisma.board.findMany({
			where: { projectId },
			orderBy: { sortOrder: "asc" },
			include: { columns: { orderBy: { sortOrder: "asc" } } },
		});
	},

	async create(data) {
		return prisma.board.create({ data });
	},

	async update(id, data) {
		return prisma.board.update({ where: { id }, data });
	},

	async archive(id, archived = true) {
		return prisma.board.update({
			where: { id },
			data: { isArchived: archived },
		});
	},

	async delete(id) {
		return prisma.board.delete({ where: { id } });
	},
};

export const column = {
	async findById(id) {
		return prisma.column.findUnique({ where: { id } });
	},

	async findAllForBoard(boardId) {
		return prisma.column.findMany({
			where: { boardId },
			orderBy: { sortOrder: "asc" },
			include: { _count: { select: { tasks: true } } },
		});
	},

	async create(data) {
		return prisma.column.create({ data });
	},

	async update(id, data) {
		return prisma.column.update({ where: { id }, data });
	},

	/**
	 * Reorders the columns of a board.
	 *
	 * The update is scoped to `boardId`, so a caller cannot reorder columns
	 * belonging to a different board by passing their ids in.
	 *
	 * @param {string} boardId
	 * @param {string[]} orderedColumnIds - Column ids, left to right
	 */
	async reorder(boardId, orderedColumnIds) {
		await prisma.$transaction(
			orderedColumnIds.map((id, index) =>
				prisma.column.updateMany({
					where: { id, boardId },
					data: { sortOrder: index },
				}),
			),
		);

		return prisma.column.findMany({
			where: { boardId },
			orderBy: { sortOrder: "asc" },
		});
	},

	async countTasks(id) {
		return prisma.task.count({
			where: { columnId: id, isArchived: false, parentId: null },
		});
	},

	/**
	 * Deletes a column, moving its tasks to another column first.
	 *
	 * The database refuses to delete a column that still holds tasks (see the
	 * NO ACTION constraint in the schema), so the reassignment has to happen
	 * before the delete rather than alongside it.
	 *
	 * @param {string} id - Column to delete
	 * @param {string} reassignToColumnId - Column that receives the tasks
	 */
	async delete(id, reassignToColumnId) {
		return prisma.$transaction(async (tx) => {
			const target = await tx.column.findUnique({
				where: { id: reassignToColumnId },
			});

			if (!target) {
				throw new Error(
					`Cannot delete column ${id}: target column ${reassignToColumnId} does not exist.`,
				);
			}

			const tasks = await tx.task.findMany({
				where: { columnId: id },
				orderBy: { position: "asc" },
			});

			const lastTask = await tx.task.findFirst({
				where: { columnId: reassignToColumnId },
				orderBy: { position: "desc" },
			});

			let position = lastTask ? lastTask.position : 0;

			for (const task of tasks) {
				position += POSITION_STEP;
				await tx.task.update({
					where: { id: task.id },
					data: { columnId: reassignToColumnId, position },
				});
			}

			return tx.column.delete({ where: { id } });
		});
	},
};

export const task = {
	async findById(id, { include = TASK_INCLUDE } = {}) {
		return prisma.task.findUnique({ where: { id }, include });
	},

	/**
	 * Every task on a board, grouped by column by the caller.
	 *
	 * Subtasks are excluded by default. They belong on their parent's card,
	 * not in the column list, and leaving them out keeps the ordering space
	 * free of rows the board does not display.
	 *
	 * @param {string} boardId
	 * @param {Object} [options]
	 * @param {boolean} [options.includeArchived]
	 * @param {boolean} [options.includeSubtasks]
	 */
	async findAllForBoard(
		boardId,
		{ includeArchived = false, includeSubtasks = false } = {},
	) {
		return prisma.task.findMany({
			where: {
				boardId,
				isArchived: includeArchived,
				...(includeSubtasks ? {} : { parentId: null }),
			},
			orderBy: [{ columnId: "asc" }, { position: "asc" }],
			include: TASK_INCLUDE,
		});
	},

	async countByColumn(columnId, { includeArchived = false } = {}) {
		return prisma.task.count({
			where: { columnId, isArchived: includeArchived, parentId: null },
		});
	},

	/**
	 * The tasks either side of a position, excluding one task.
	 *
	 * Used to turn a drop index into a fractional position. Subtasks are
	 * excluded: they are not rendered in the column, so they must not
	 * influence where a card lands.
	 *
	 * @param {string} columnId
	 * @param {number} position
	 * @param {string} [excludeTaskId]
	 */
	async findNeighbours(columnId, position, excludeTaskId) {
		const exclude = {
			...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
			parentId: null,
		};

		const [before, after] = await Promise.all([
			prisma.task.findFirst({
				where: {
					columnId,
					isArchived: false,
					position: { lte: position },
					...exclude,
				},
				orderBy: { position: "desc" },
				select: { id: true, position: true },
			}),
			prisma.task.findFirst({
				where: {
					columnId,
					isArchived: false,
					position: { gt: position },
					...exclude,
				},
				orderBy: { position: "asc" },
				select: { id: true, position: true },
			}),
		]);

		return { before, after };
	},

	async create(data) {
		return prisma.task.create({ data, include: TASK_INCLUDE });
	},

	async update(id, data) {
		return prisma.task.update({ where: { id }, data, include: TASK_INCLUDE });
	},

	/**
	 * Moves a task to a column at a given index.
	 *
	 * The client sends an index, never a position. The server reads the
	 * neighbours in the target column and computes the fractional position
	 * itself, so the ordering can never be tampered with and can never drift
	 * from what the column actually contains.
	 *
	 * @param {string} taskId
	 * @param {string} toColumnId
	 * @param {number} toIndex - Zero-based index within the target column
	 */
	async moveToIndex(taskId, toColumnId, toIndex) {
		return prisma.$transaction(async (tx) => {
			const moving = await tx.task.findUnique({ where: { id: taskId } });

			if (!moving) {
				throw new Error(`Cannot move task ${taskId}: it does not exist.`);
			}

			const siblings = await tx.task.findMany({
				where: {
					columnId: toColumnId,
					isArchived: false,
					parentId: null,
					id: { not: taskId },
				},
				orderBy: { position: "asc" },
				select: { id: true, position: true },
			});

			const index = Math.max(0, Math.min(toIndex, siblings.length));
			const before = index > 0 ? siblings[index - 1].position : null;
			const after = index < siblings.length ? siblings[index].position : null;

			let position = positionBetween(before, after);

			// The gap has collapsed. Rewrite the whole column with evenly
			// spaced positions and use the middle of them.
			if (needsRenormalisation(before, after)) {
				const spread = Array.from(
					{ length: siblings.length + 1 },
					(_, i) => (i + 1) * POSITION_STEP,
				);

				for (const [index, sibling] of siblings.entries()) {
					await tx.task.update({
						where: { id: sibling.id },
						data: { position: spread[index] },
					});
				}

				position = spread[index];
			}

			return tx.task.update({
				where: { id: taskId },
				data: { columnId: toColumnId, position },
				include: TASK_INCLUDE,
			});
		});
	},

	async archive(id, archived = true) {
		return prisma.task.update({
			where: { id },
			data: { isArchived: archived },
			include: TASK_INCLUDE,
		});
	},

	async delete(id) {
		return prisma.task.delete({ where: { id } });
	},
};

export const label = {
	async findAllForBoard(boardId) {
		return prisma.label.findMany({
			where: { boardId },
			orderBy: { name: "asc" },
		});
	},

	async findById(id) {
		return prisma.label.findUnique({ where: { id } });
	},

	async findForTask(taskId) {
		return prisma.taskLabel.findMany({
			where: { taskId },
			include: { label: true },
		});
	},

	async create(data) {
		return prisma.label.create({ data });
	},

	async update(id, data) {
		return prisma.label.update({ where: { id }, data });
	},

	async delete(id) {
		return prisma.label.delete({ where: { id } });
	},

	async attach(taskId, labelId) {
		return prisma.taskLabel.upsert({
			where: { taskId_labelId: { taskId, labelId } },
			update: {},
			create: { taskId, labelId },
		});
	},

	async detach(taskId, labelId) {
		return prisma.taskLabel.deleteMany({ where: { taskId, labelId } });
	},
};

export const member = {
	async addProjectMember({ projectId, userId, role }) {
		return prisma.projectMember.upsert({
			where: { projectId_userId: { projectId, userId } },
			update: { role },
			create: { projectId, userId, role },
		});
	},

	async setProjectRole({ projectId, userId, role }) {
		return prisma.projectMember.update({
			where: { projectId_userId: { projectId, userId } },
			data: { role },
		});
	},

	async removeProjectMember({ projectId, userId }) {
		return prisma.projectMember.deleteMany({ where: { projectId, userId } });
	},

	async listProjectMembers(projectId) {
		return prisma.projectMember.findMany({
			where: { projectId },
			include: { user: { select: USER_SAFE_SELECT } },
			orderBy: { createdAt: "asc" },
		});
	},

	async addBoardMember({ boardId, userId, role }) {
		return prisma.boardMember.upsert({
			where: { boardId_userId: { boardId, userId } },
			update: { role },
			create: { boardId, userId, role },
		});
	},

	async setBoardRole({ boardId, userId, role }) {
		return prisma.boardMember.update({
			where: { boardId_userId: { boardId, userId } },
			data: { role },
		});
	},

	async removeBoardMember({ boardId, userId }) {
		return prisma.boardMember.deleteMany({ where: { boardId, userId } });
	},

	async listBoardMembers(boardId) {
		return prisma.boardMember.findMany({
			where: { boardId },
			include: { user: { select: USER_SAFE_SELECT } },
			orderBy: { createdAt: "asc" },
		});
	},

	/**
	 * The effective role a user holds on a board.
	 *
	 * Precedence, highest first:
	 *   1. a platform administrator is an owner everywhere
	 *   2. a BoardMember role, when one is set, wins - it may lower a role
	 *   3. otherwise the ProjectMember role is inherited
	 *   4. otherwise the user has no access
	 *
	 * @param {string} boardId
	 * @param {string} userId
	 * @returns {Promise<"OWNER" | "EDITOR" | "VIEWER" | null>}
	 */
	async resolveRole(boardId, userId) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { isAdmin: true },
		});

		if (!user) {
			return null;
		}

		if (user.isAdmin) {
			return "OWNER";
		}

		const boardMember = await prisma.boardMember.findUnique({
			where: { boardId_userId: { boardId, userId } },
			select: { role: true },
		});

		if (boardMember?.role) {
			return boardMember.role;
		}

		const board = await prisma.board.findUnique({
			where: { id: boardId },
			select: { projectId: true },
		});

		if (!board) {
			return null;
		}

		const projectMember = await prisma.projectMember.findUnique({
			where: { projectId_userId: { projectId: board.projectId, userId } },
			select: { role: true },
		});

		return projectMember?.role ?? null;
	},
};

/**
 * Aggregate counts for the dashboard.
 *
 * Subtasks are counted separately from tasks, because a subtask is not a
 * card on the board - it lives on its parent's card.
 */
export const stats = {
	/**
	 * @returns {Promise<{ users: number, projects: number, boards: number, tasks: number, subtasks: number, open: number, completed: number, overdue: number }>}
	 */
	async overview() {
		const [users, projects, boards, tasks, subtasks, completed, overdue] =
			await Promise.all([
				prisma.user.count(),
				prisma.project.count(),
				prisma.board.count(),
				prisma.task.count({ where: { parentId: null } }),
				prisma.task.count({ where: { parentId: { not: null } } }),
				prisma.task.count({
					where: { parentId: null, completedAt: { not: null } },
				}),
				prisma.task.count({
					where: {
						parentId: null,
						completedAt: null,
						dueDate: { lt: new Date() },
					},
				}),
			]);

		return {
			users,
			projects,
			boards,
			tasks,
			subtasks,
			completed,
			overdue,
			open: tasks - completed,
		};
	},
};

export const activity = {
	/**
	 * Records an event in the board history.
	 *
	 * Call this inside the same transaction as the change it describes, so the
	 * history can never drift from the state.
	 *
	 * @param {Object} entry
	 * @param {string} entry.boardId
	 * @param {string | null} [entry.actorId]
	 * @param {string} entry.action - An ActivityAction
	 * @param {string} entry.entityType
	 * @param {string} entry.entityId
	 * @param {Object} [entry.metadata]
	 */
	async record({
		boardId,
		actorId,
		action,
		entityType,
		entityId,
		metadata = {},
	}) {
		return prisma.activity.create({
			data: { boardId, actorId, action, entityType, entityId, metadata },
		});
	},

	/**
	 * The board timeline, newest first.
	 *
	 * @param {string} boardId
	 * @param {Object} [options]
	 * @param {number} [options.limit]
	 * @param {string} [options.before] - Cursor: the id of the last item seen
	 * @param {string} [options.actorId]
	 * @param {string} [options.action]
	 */
	async findForBoard(boardId, { limit = 25, before, actorId, action } = {}) {
		return prisma.activity.findMany({
			where: {
				boardId,
				...(actorId ? { actorId } : {}),
				...(action ? { action } : {}),
				...(before ? { id: { lt: before } } : {}),
			},
			orderBy: { id: "desc" },
			take: limit,
			include: { actor: { select: USER_SAFE_SELECT } },
		});
	},

	async countForBoard(boardId) {
		return prisma.activity.count({ where: { boardId } });
	},
};

import { prisma } from "./client.js";
import { POSITION_STEP } from "./ordering.js";
import { ACTIVITIES, PROJECTS, USERS } from "./seed-data.js";

/**
 * The seed applier.
 *
 * Every record is written with an upsert, so running the seed twice leaves
 * the database with the same rows and the same values. Re-running it resets
 * the demo data to its seeded state rather than duplicating it.
 *
 * Two kinds of key are in play:
 *
 * - Records with a natural unique key (a user's email, a membership pair) are
 *   upserted on that key, because their ids are owned by the database.
 * - Everything else carries a deterministic `seed-...` id and is upserted on
 *   its primary key. That way a fixture whose name changes is updated in
 *   place instead of colliding with the unique constraint on the old name.
 *
 * Due dates and creation timestamps are anchored to midnight UTC of the
 * current day, so re-running the seed within a day is byte-for-byte
 * identical and the demo always shows a realistic spread of overdue, today
 * and upcoming work.
 */

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * @returns {number} Milliseconds since the epoch for midnight UTC today.
 */
function startOfTodayUtc() {
	const now = new Date();
	return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/**
 * @param {number | null | undefined} days
 * @returns {Date | null}
 */
function dueDateFrom(days) {
	if (days === null || days === undefined) {
		return null;
	}

	return new Date(startOfTodayUtc() + days * DAY_IN_MS);
}

/**
 * @param {number} hours
 * @returns {Date}
 */
function hoursAgo(hours) {
	return new Date(startOfTodayUtc() + 12 * HOUR_IN_MS - hours * HOUR_IN_MS);
}

/**
 * Upserts a seeded record by its deterministic id, translating Prisma's
 * unique-constraint error into something a human can act on.
 *
 * @param {object} model - A Prisma model delegate
 * @param {string} id
 * @param {object} create
 * @param {object} update
 * @param {string} label - Human-readable name for the error message
 */
async function upsertSeed(model, id, create, update, label) {
	try {
		return await model.upsert({
			where: { id },
			update,
			create: { id, ...create },
		});
	} catch (error) {
		if (error?.code === "P2002") {
			throw new Error(
				`Seed conflict on ${label}: a record with the same unique value already exists ` +
					"under a different id. This usually means the demo data was edited by hand. " +
					"Reset the database and run the seed again.",
			);
		}

		throw error;
	}
}

/**
 * Applies the seed fixtures to the database.
 *
 * @param {Object} [options]
 * @param {(message: string) => void} [options.log] - Progress reporter
 * @returns {Promise<{ users: number, projects: number, boards: number, columns: number, labels: number, tasks: number, activities: number }>}
 */
export async function seedDatabase({ log = () => {} } = {}) {
	const today = startOfTodayUtc();
	const userIds = new Map();

	for (const user of USERS) {
		const record = await prisma.user.upsert({
			where: { email: user.email },
			update: {
				name: user.name,
				avatarColor: user.avatarColor,
				isAdmin: user.isAdmin,
			},
			create: {
				email: user.email,
				name: user.name,
				avatarColor: user.avatarColor,
				isAdmin: user.isAdmin,
			},
		});

		userIds.set(user.email, record.id);
	}

	log(`users: ${userIds.size}`);

	const boardIds = new Map();
	const taskIds = new Map();
	let projectCount = 0;
	let columnCount = 0;
	let labelCount = 0;
	let taskCount = 0;

	for (const project of PROJECTS) {
		const projectCreatedAt = new Date(today - 120 * DAY_IN_MS);

		const projectRecord = await upsertSeed(
			prisma.project,
			project.id,
			{
				slug: project.slug,
				name: project.name,
				key: project.key,
				description: project.description,
				ownerId: userIds.get(project.ownerEmail),
				isArchived: false,
				createdAt: projectCreatedAt,
			},
			{
				name: project.name,
				key: project.key,
				description: project.description,
				ownerId: userIds.get(project.ownerEmail),
				isArchived: false,
			},
			`project "${project.name}"`,
		);

		projectCount += 1;

		for (const [index, member] of project.members.entries()) {
			await prisma.projectMember.upsert({
				where: {
					projectId_userId: {
						projectId: projectRecord.id,
						userId: userIds.get(member.email),
					},
				},
				update: { role: member.role },
				create: {
					projectId: projectRecord.id,
					userId: userIds.get(member.email),
					role: member.role,
					createdAt: new Date(projectCreatedAt.getTime() + index * HOUR_IN_MS),
				},
			});
		}

		for (const board of project.boards) {
			const boardCreatedAt = new Date(today - 90 * DAY_IN_MS);

			const boardRecord = await upsertSeed(
				prisma.board,
				board.id,
				{
					projectId: projectRecord.id,
					name: board.name,
					description: board.description,
					sortOrder: board.sortOrder,
					isArchived: false,
					createdAt: boardCreatedAt,
				},
				{
					projectId: projectRecord.id,
					name: board.name,
					description: board.description,
					sortOrder: board.sortOrder,
					isArchived: false,
				},
				`board "${board.name}"`,
			);

			boardIds.set(board.id, boardRecord.id);

			for (const [index, member] of board.members.entries()) {
				await prisma.boardMember.upsert({
					where: {
						boardId_userId: {
							boardId: boardRecord.id,
							userId: userIds.get(member.email),
						},
					},
					update: { role: member.role },
					create: {
						boardId: boardRecord.id,
						userId: userIds.get(member.email),
						role: member.role,
						createdAt: new Date(boardCreatedAt.getTime() + index * HOUR_IN_MS),
					},
				});
			}

			const columnIds = new Map();
			const doneColumns = new Set();

			for (const [index, column] of board.columns.entries()) {
				const columnRecord = await upsertSeed(
					prisma.column,
					column.id,
					{
						boardId: boardRecord.id,
						name: column.name,
						color: column.color,
						sortOrder: column.sortOrder,
						wipLimit: column.wipLimit,
						isDone: column.isDone,
						createdAt: new Date(boardCreatedAt.getTime() + index * HOUR_IN_MS),
					},
					{
						boardId: boardRecord.id,
						name: column.name,
						color: column.color,
						sortOrder: column.sortOrder,
						wipLimit: column.wipLimit,
						isDone: column.isDone,
					},
					`column "${column.name}"`,
				);

				columnIds.set(column.name, columnRecord.id);

				// Only the columns flagged as "done" complete the work in
				// them. Everything else keeps an incomplete task list.
				if (column.isDone) {
					doneColumns.add(column.name);
				}

				columnCount += 1;
			}

			const labelIds = new Map();

			for (const label of board.labels) {
				const labelRecord = await upsertSeed(
					prisma.label,
					label.id,
					{
						boardId: boardRecord.id,
						name: label.name,
						color: label.color,
						createdAt: boardCreatedAt,
					},
					{
						boardId: boardRecord.id,
						name: label.name,
						color: label.color,
					},
					`label "${label.name}"`,
				);

				labelIds.set(label.name, labelRecord.id);
				labelCount += 1;
			}

			// Tasks are grouped by column so each column can be given a
			// contiguous run of positions.
			const tasksByColumn = new Map();

			for (const task of board.tasks) {
				const group = tasksByColumn.get(task.column) ?? [];
				group.push(task);
				tasksByColumn.set(task.column, group);
			}

			let taskIndex = 0;

			for (const [columnName, tasks] of tasksByColumn) {
				const columnId = columnIds.get(columnName);

				if (!columnId) {
					throw new Error(
						`Seed error: task "${tasks[0]?.title}" references unknown column ` +
							`"${columnName}" on board "${board.name}".`,
					);
				}

				const isDoneColumn = doneColumns.has(columnName);
				let position = 0;

				for (const task of tasks) {
					position += POSITION_STEP;
					taskIndex += 1;

					const createdAt = new Date(
						today - 60 * DAY_IN_MS + taskIndex * 12 * HOUR_IN_MS,
					);
					const completedAt = isDoneColumn
						? new Date(today - 3 * DAY_IN_MS)
						: null;

					await upsertSeed(
						prisma.task,
						task.id,
						{
							boardId: boardRecord.id,
							columnId,
							parentId: null,
							title: task.title,
							description: task.description ?? null,
							priority: task.priority,
							dueDate: dueDateFrom(task.dueInDays),
							position,
							assigneeId: task.assigneeEmail
								? userIds.get(task.assigneeEmail)
								: null,
							reporterId: task.reporterEmail
								? userIds.get(task.reporterEmail)
								: null,
							completedAt,
							isArchived: false,
							createdAt,
						},
						{
							boardId: boardRecord.id,
							columnId,
							parentId: null,
							title: task.title,
							description: task.description ?? null,
							priority: task.priority,
							dueDate: dueDateFrom(task.dueInDays),
							position,
							assigneeId: task.assigneeEmail
								? userIds.get(task.assigneeEmail)
								: null,
							reporterId: task.reporterEmail
								? userIds.get(task.reporterEmail)
								: null,
							completedAt,
							isArchived: false,
						},
						`task "${task.title}"`,
					);

					taskIds.set(task.id, task.id);
					taskCount += 1;

					for (const labelName of task.labels ?? []) {
						const labelId = labelIds.get(labelName);

						if (!labelId) {
							throw new Error(
								`Task "${task.title}" references unknown label "${labelName}".`,
							);
						}

						await prisma.taskLabel.upsert({
							where: { taskId_labelId: { taskId: task.id, labelId } },
							update: {},
							create: { taskId: task.id, labelId, createdAt },
						});
					}

					let subtaskPosition = 0;

					for (const subtask of task.subtasks ?? []) {
						subtaskPosition += POSITION_STEP;

						await upsertSeed(
							prisma.task,
							subtask.id,
							{
								boardId: boardRecord.id,
								columnId,
								parentId: task.id,
								title: subtask.title,
								description: null,
								priority: task.priority,
								dueDate: null,
								position: subtaskPosition,
								assigneeId: null,
								reporterId: task.reporterEmail
									? userIds.get(task.reporterEmail)
									: null,
								completedAt: subtask.completed
									? new Date(today - 2 * DAY_IN_MS)
									: null,
								isArchived: false,
								createdAt,
							},
							{
								boardId: boardRecord.id,
								columnId,
								parentId: task.id,
								title: subtask.title,
								description: null,
								priority: task.priority,
								dueDate: null,
								position: subtaskPosition,
								assigneeId: null,
								reporterId: task.reporterEmail
									? userIds.get(task.reporterEmail)
									: null,
								completedAt: subtask.completed
									? new Date(today - 2 * DAY_IN_MS)
									: null,
								isArchived: false,
							},
							`subtask "${subtask.title}"`,
						);

						taskIds.set(subtask.id, subtask.id);
						taskCount += 1;
					}
				}
			}
		}
	}

	for (const activity of ACTIVITIES) {
		const boardId = boardIds.get(activity.board);

		if (!boardId) {
			throw new Error(
				`Activity ${activity.id} references unknown board "${activity.board}".`,
			);
		}

		const actorId = activity.actorEmail
			? userIds.get(activity.actorEmail)
			: null;
		const entityId = taskIds.get(activity.entityRef) ?? activity.entityRef;
		const createdAt = hoursAgo(activity.hoursAgo);

		await upsertSeed(
			prisma.activity,
			activity.id,
			{
				boardId,
				actorId,
				action: activity.action,
				entityType: activity.entityType,
				entityId,
				metadata: activity.metadata,
				createdAt,
			},
			{
				boardId,
				actorId,
				action: activity.action,
				entityType: activity.entityType,
				entityId,
				metadata: activity.metadata,
				createdAt,
			},
			`activity ${activity.id}`,
		);
	}

	return {
		users: userIds.size,
		projects: projectCount,
		boards: boardIds.size,
		columns: columnCount,
		labels: labelCount,
		tasks: taskCount,
		activities: ACTIVITIES.length,
	};
}

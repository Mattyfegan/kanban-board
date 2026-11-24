import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { prisma } from "./client.js";
import { column, member, task } from "./queries.js";
import { seedDatabase } from "./seed.js";

/**
 * Integration tests.
 *
 * These talk to a real PostgreSQL database, so they are skipped when one is
 * not reachable. Run `pnpm docker:up` and `pnpm db:migrate` first.
 */
const databaseAvailable = await (async () => {
	try {
		await prisma.$queryRaw`SELECT 1`;
		return true;
	} catch {
		return false;
	}
})();

const skip = databaseAvailable ? false : "database is not reachable";

/** Scratch boards created by these tests, removed afterwards. */
const scratchBoardIds = [];

/**
 * Creates a throwaway board with two columns, so that the mutating tests
 * never touch the demo data.
 */
async function createScratchBoard() {
	const project = await prisma.project.findFirst({
		orderBy: { createdAt: "asc" },
	});

	assert.ok(
		project,
		"a project is required before the scratch board can exist",
	);

	const board = await prisma.board.create({
		data: {
			projectId: project.id,
			name: `scratch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			sortOrder: 999,
		},
	});

	scratchBoardIds.push(board.id);

	const [first, second] = await Promise.all([
		prisma.column.create({
			data: { boardId: board.id, name: "First", sortOrder: 0 },
		}),
		prisma.column.create({
			data: { boardId: board.id, name: "Second", sortOrder: 1 },
		}),
	]);

	return { board, first, second };
}

async function countEverything() {
	const [
		users,
		projects,
		boards,
		columns,
		labels,
		tasks,
		taskLabels,
		projectMembers,
		boardMembers,
		activities,
	] = await Promise.all([
		prisma.user.count(),
		prisma.project.count(),
		prisma.board.count(),
		prisma.column.count(),
		prisma.label.count(),
		prisma.task.count(),
		prisma.taskLabel.count(),
		prisma.projectMember.count(),
		prisma.boardMember.count(),
		prisma.activity.count(),
	]);

	return {
		users,
		projects,
		boards,
		columns,
		labels,
		tasks,
		taskLabels,
		projectMembers,
		boardMembers,
		activities,
	};
}

after(async () => {
	if (!databaseAvailable) {
		return;
	}

	await prisma.board.deleteMany({ where: { id: { in: scratchBoardIds } } });
	await prisma.$disconnect();
});

describe("seed", { skip }, () => {
	it("leaves the row counts unchanged when it runs twice", async () => {
		await seedDatabase();
		const first = await countEverything();

		await seedDatabase();
		const second = await countEverything();

		assert.deepEqual(second, first);
	});

	it("creates the demo graph the rest of the app reads", async () => {
		await seedDatabase();

		const [projects, boards, tasks, activities] = await Promise.all([
			prisma.project.count(),
			prisma.board.count(),
			prisma.task.count(),
			prisma.activity.count(),
		]);

		assert.ok(projects >= 2, "at least two projects");
		assert.ok(boards >= 3, "at least three boards");
		assert.ok(tasks >= 60, "at least sixty tasks, subtasks included");
		assert.ok(activities >= 20, "a slice of activity history");
	});

	it("gives every task in a column a distinct position", async () => {
		await seedDatabase();

		const columns = await prisma.column.findMany({ select: { id: true } });

		for (const { id } of columns) {
			const positions = await prisma.task.findMany({
				where: { columnId: id, parentId: null },
				select: { position: true },
			});

			const unique = new Set(positions.map((entry) => entry.position));
			assert.equal(
				unique.size,
				positions.length,
				`column ${id} has duplicate positions`,
			);
		}
	});

	it("completes only the top level tasks that sit in a done column", async () => {
		await seedDatabase();

		const doneColumns = await prisma.column.findMany({
			where: { isDone: true },
			select: { id: true },
		});
		const doneColumnIds = new Set(doneColumns.map((entry) => entry.id));

		const tasks = await prisma.task.findMany({
			where: { parentId: null },
			select: { id: true, columnId: true, completedAt: true },
		});

		for (const task of tasks) {
			const inDoneColumn = doneColumnIds.has(task.columnId);

			if (inDoneColumn) {
				assert.ok(task.completedAt, `task ${task.id} is in a done column`);
			} else {
				assert.equal(
					task.completedAt,
					null,
					`task ${task.id} is outside a done column but is marked complete`,
				);
			}
		}
	});

	it("leaves a subtask free to be completed while its parent is still open", async () => {
		await seedDatabase();

		// A subtask is ordinary work: it can be ticked off long before the
		// parent moves into the done column.
		const completedSubtask = await prisma.task.findFirst({
			where: { parentId: { not: null }, completedAt: { not: null } },
			include: { parent: { select: { columnId: true } } },
		});

		assert.ok(completedSubtask, "the demo data should contain one");

		const parentColumn = await prisma.column.findUnique({
			where: { id: completedSubtask.parent.columnId },
			select: { isDone: true },
		});

		assert.equal(parentColumn.isDone, false);
	});

	it("leaves every open task with a due date in the past overdue", async () => {
		await seedDatabase();

		const overdue = await prisma.task.count({
			where: {
				completedAt: null,
				dueDate: { lt: new Date() },
			},
		});

		assert.ok(overdue > 0, "the demo data should show overdue work");
	});
});

describe("member.resolveRole", { skip }, () => {
	it("inherits the project role when there is no board override", async () => {
		await seedDatabase();

		const grace = await prisma.user.findUnique({
			where: { email: "grace@kanban.local" },
		});
		const board = await prisma.board.findFirst({
			where: { name: "Website Redesign" },
		});

		const role = await member.resolveRole(board.id, grace.id);
		assert.equal(role, "EDITOR");
	});

	it("lets a board override lower the inherited project role", async () => {
		await seedDatabase();

		const margaret = await prisma.user.findUnique({
			where: { email: "margaret@kanban.local" },
		});
		const board = await prisma.board.findFirst({
			where: { name: "Website Redesign" },
		});

		// Margaret is an editor on the project but a viewer on this board.
		const role = await member.resolveRole(board.id, margaret.id);
		assert.equal(role, "VIEWER");
	});

	it("lets a board override lower the project owner's role", async () => {
		await seedDatabase();

		const dev = await prisma.user.findUnique({
			where: { email: "dev@kanban.local" },
		});
		const board = await prisma.board.findFirst({
			where: { name: "Mobile App" },
		});

		const role = await member.resolveRole(board.id, dev.id);
		assert.equal(role, "EDITOR");
	});

	it("treats a platform administrator as an owner everywhere", async () => {
		await seedDatabase();

		const admin = await prisma.user.findUnique({
			where: { email: "admin@kanban.local" },
		});
		const board = await prisma.board.findFirst();

		const role = await member.resolveRole(board.id, admin.id);
		assert.equal(role, "OWNER");
	});

	it("reports no access for a user with no membership", async () => {
		await seedDatabase();

		const outsider = await prisma.user.findUnique({
			where: { email: "margaret@kanban.local" },
		});
		const board = await prisma.board.findFirst({
			where: { name: "Launch Plan" },
		});

		const role = await member.resolveRole(board.id, outsider.id);
		assert.equal(role, null);
	});
});

describe("column deletion", { skip }, () => {
	it("refuses to delete a column that still holds tasks", async () => {
		const { first } = await createScratchBoard();

		await prisma.task.create({
			data: {
				boardId: (await prisma.column.findUnique({ where: { id: first.id } }))
					.boardId,
				columnId: first.id,
				title: "A task in the way",
				position: 1024,
			},
		});

		await assert.rejects(
			() => prisma.column.delete({ where: { id: first.id } }),
			/Foreign key constraint/i,
		);
	});

	it("moves the tasks to another column when it does delete", async () => {
		const { board, first, second } = await createScratchBoard();

		await prisma.task.create({
			data: {
				boardId: board.id,
				columnId: first.id,
				title: "Doomed task",
				position: 1024,
			},
		});

		await column.delete(first.id, second.id);

		const remaining = await prisma.task.findMany({
			where: { boardId: board.id },
		});
		assert.equal(remaining.length, 1);
		assert.equal(remaining[0].columnId, second.id);
	});

	it("deletes a whole board that still holds tasks", async () => {
		const { board, first } = await createScratchBoard();

		await prisma.task.create({
			data: {
				boardId: board.id,
				columnId: first.id,
				title: "Doomed with its board",
				position: 1024,
			},
		});

		// The column relation is ON DELETE NO ACTION, so this only succeeds
		// because the board cascade removes the tasks as well.
		await prisma.board.delete({ where: { id: board.id } });

		const remaining = await prisma.task.count({ where: { boardId: board.id } });
		assert.equal(remaining, 0);
	});
});

describe("column reorder", { skip }, () => {
	it("reorders the columns of one board", async () => {
		const { board, first, second } = await createScratchBoard();

		const reordered = await column.reorder(board.id, [second.id, first.id]);

		assert.deepEqual(
			reordered.map((entry) => entry.id),
			[second.id, first.id],
		);
	});

	it("cannot reorder a column that belongs to another board", async () => {
		const { board, first } = await createScratchBoard();
		const other = await createScratchBoard();

		await column.reorder(board.id, [other.second.id, first.id]);

		const untouched = await prisma.column.findUnique({
			where: { id: other.second.id },
		});

		assert.equal(untouched.sortOrder, other.second.sortOrder);
	});
});

describe("task ordering", { skip }, () => {
	it("returns the tasks of a board in column order", async () => {
		await seedDatabase();

		const board = await prisma.board.findFirst({
			where: { name: "Website Redesign" },
		});

		const tasks = await task.findAllForBoard(board.id);
		assert.ok(tasks.length > 0);

		const positions = tasks
			.filter((entry) => entry.columnId === tasks[0].columnId)
			.map((entry) => entry.position);

		const sorted = [...positions].sort((a, b) => a - b);
		assert.deepEqual(positions, sorted);
	});

	it("excludes subtasks from the board task list", async () => {
		const { board, first } = await createScratchBoard();

		const parent = await prisma.task.create({
			data: {
				boardId: board.id,
				columnId: first.id,
				title: "Parent",
				position: 1024,
			},
		});

		await prisma.task.create({
			data: {
				boardId: board.id,
				columnId: first.id,
				parentId: parent.id,
				title: "Subtask",
				position: 2048,
			},
		});

		const visible = await task.findAllForBoard(board.id);
		const withSubtasks = await task.findAllForBoard(board.id, {
			includeSubtasks: true,
		});

		assert.equal(visible.length, 1);
		assert.equal(withSubtasks.length, 2);
	});

	it("places a moved task between its new neighbours", async () => {
		const { board, first } = await createScratchBoard();

		const created = [];
		for (const title of ["One", "Two", "Three"]) {
			created.push(
				await prisma.task.create({
					data: {
						boardId: board.id,
						columnId: first.id,
						title,
						position: (created.length + 1) * 1024,
					},
				}),
			);
		}

		// Move the last task to the top of the column.
		await task.moveToIndex(created[2].id, first.id, 0);

		const ordered = await prisma.task.findMany({
			where: { columnId: first.id },
			orderBy: { position: "asc" },
			select: { title: true },
		});

		assert.deepEqual(
			ordered.map((entry) => entry.title),
			["Three", "One", "Two"],
		);
	});

	it("keeps a moved task out of the visible ordering when it is a subtask", async () => {
		const { board, first } = await createScratchBoard();

		const parent = await prisma.task.create({
			data: {
				boardId: board.id,
				columnId: first.id,
				title: "Parent",
				position: 1024,
			},
		});

		await prisma.task.create({
			data: {
				boardId: board.id,
				columnId: first.id,
				parentId: parent.id,
				title: "Subtask",
				position: 2048,
			},
		});

		const visible = await task.findAllForBoard(board.id);
		assert.equal(visible.length, 1);
		assert.equal(visible[0].title, "Parent");
	});
});

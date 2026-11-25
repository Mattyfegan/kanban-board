import { board, stats } from "@kanban/db";
import { Badge, Button, EmptyState } from "@kanban/ui";
import { Plus, Wrench } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AddColumnButton, ColumnHeader } from "@/components/column-header";
import { getCurrentRole } from "@/lib/session";

/**
 * The board page.
 *
 * The centrepiece of M2: a project → board → custom column flow, all
 * created from the UI. Columns are the stages of work; the header holds
 * every control that changes a column, and `AddColumnButton` offers the
 * place to add a new one.
 *
 * @param {Object} props
 * @param {Promise<{ boardId: string }>} props.params
 */
export default async function BoardPage({ params }) {
	await connection();

	const { boardId } = await params;
	const role = await getCurrentRole(boardId);
	const canEdit = role === "OWNER" || role === "EDITOR";

	const record = await board.findById(boardId, {
		include: {
			columns: { orderBy: { sortOrder: "asc" } },
			_count: { select: { tasks: true } },
		},
	});

	if (!record) {
		notFound();
	}

	const counts = await stats.forBoard(boardId);

	// The header offers everything the board supports. A viewer gets the
	// same board, minus the buttons.
	const siblings = record.columns.map((entry) => ({
		id: entry.id,
		name: entry.name,
	}));

	return (
		<div className="mx-auto w-full max-w-7xl px-6 py-8">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="text-2xl font-bold tracking-tight">{record.name}</h1>
					{record.isArchived ? <Badge tone="warning">Archived</Badge> : null}
					<Badge tone="info">{counts.tasks} tasks</Badge>
				</div>

				<AddColumnButton boardId={boardId} canEdit={canEdit} />
			</header>

			<div className="mt-6">
				{record.columns.length === 0 ? (
					<EmptyState
						title="This board has no columns yet"
						description="Columns are the stages of work. Add one and start building the board."
						action={
							canEdit ? (
								<AddColumnButton boardId={boardId} canEdit />
							) : undefined
						}
					/>
				) : (
					<section
						className="flex gap-4 overflow-x-auto"
						aria-label="Board columns"
					>
						{record.columns.map((entry, index) => (
							<div
								key={entry.id}
								className="flex w-72 shrink-0 flex-col gap-2 rounded-(--radius-lg) border border-(--border) bg-(--surface-raised) p-3"
							>
								<ColumnHeader
									boardId={boardId}
									columnId={entry.id}
									name={entry.name}
									color={entry.color}
									wipLimit={entry.wipLimit}
									isDone={entry.isDone}
									taskCount={entry._count?.tasks ?? 0}
									position={index}
									columnCount={record.columns.length}
									siblings={siblings.filter((entry2) => entry2.id !== entry.id)}
									canEdit={canEdit}
								/>

								<div className="flex flex-1 flex-col gap-2">
									<p className="text-xs text-(--text-muted)">
										{entry._count?.tasks === 0 ? (
											<span className="italic">No tasks</span>
										) : (
											entry._count?.tasks
										)}
									</p>
								</div>

								{canEdit ? (
									<Button
										variant="ghost"
										size="sm"
										className="mt-auto justify-start text-(--text-muted) hover:text-(--text)"
									>
										<Plus className="size-4" aria-hidden="true" />
										Add a task
									</Button>
								) : (
									<p className="mt-auto text-xs text-(--text-muted) italic">
										Tasks are managed by editors.
									</p>
								)}
							</div>
						))}
					</section>
				)}
			</div>

			{record.columns.length === 0 && canEdit ? (
				<div className="mt-4 flex flex-col items-center gap-2 text-(--text-muted)">
					<Wrench className="size-5" aria-hidden="true" />
					<AddColumnButton boardId={boardId} canEdit />
				</div>
			) : null}
		</div>
	);
}

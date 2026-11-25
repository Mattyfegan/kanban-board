import { board, project, stats } from "@kanban/db";
import {
	Badge,
	Button,
	Card,
	CardBody,
	CardHeader,
	CardTitle,
	EmptyState,
} from "@kanban/ui";
import { Archive, FolderKanban } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BoardSettings } from "@/components/board-settings";
import { CreateBoardForm } from "@/components/create-board-form";
import { getCurrentUser } from "@/lib/session";

/**
 * The project detail page.
 *
 * Everything inside one project: the boards, who can reach them, and the
 * counts that summarise the work.
 *
 * @param {Object} props
 * @param {Promise<{ projectId: string }>} props.params
 */
export default async function ProjectPage({ params }) {
	await connection();

	const { projectId } = await params;
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		notFound();
	}

	const record = await project.findById(projectId, {
		include: {
			owner: { select: { id: true, name: true, avatarColor: true } },
			members: {
				include: {
					user: { select: { id: true, name: true, avatarColor: true } },
				},
				orderBy: { createdAt: "asc" },
			},
		},
	});

	if (!record) {
		notFound();
	}

	// A project the current user neither owns nor belongs to is not theirs.
	// The page is not found rather than forbidden, so the existence of
	// someone else's project is not leaked.
	const isMember = record.members.some(
		(entry) => entry.userId === currentUser.id,
	);
	const isOwner = record.ownerId === currentUser.id;

	if (!isMember && !isOwner) {
		notFound();
	}

	const boards = await board.findAllForProjectWithCounts(projectId);
	const counts = await stats.forProject(projectId);

	return (
		<div className="mx-auto w-full max-w-5xl px-6 py-8">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<Badge tone="info">{record.key}</Badge>
						{record.isArchived ? <Badge tone="warning">Archived</Badge> : null}
					</div>
					<h1 className="text-2xl font-bold tracking-tight">{record.name}</h1>
					{record.description ? (
						<p className="max-w-2xl text-sm text-(--text-muted)">
							{record.description}
						</p>
					) : null}
				</div>

				<CreateBoardForm projectId={projectId} />
			</header>

			<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardTitle>Boards</CardTitle>
					</CardHeader>
					<CardBody>
						<p className="text-2xl font-semibold text-(--text)">
							{counts.boards}
						</p>
					</CardBody>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Tasks</CardTitle>
					</CardHeader>
					<CardBody>
						<p className="text-2xl font-semibold text-(--text)">
							{counts.tasks}
						</p>
						<p className="mt-1">{counts.subtasks} subtasks</p>
					</CardBody>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Open</CardTitle>
					</CardHeader>
					<CardBody>
						<p className="text-2xl font-semibold text-(--text)">
							{counts.open}
						</p>
						<p className="mt-1">{counts.completed} completed</p>
					</CardBody>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Members</CardTitle>
					</CardHeader>
					<CardBody>
						<p className="text-2xl font-semibold text-(--text)">
							{counts.members}
						</p>
						<p className="mt-1">on the project</p>
					</CardBody>
				</Card>
			</div>

			<section className="mt-8">
				<h2 className="text-sm font-semibold tracking-wide text-(--text-muted) uppercase">
					Boards
				</h2>

				{boards.length === 0 ? (
					<EmptyState
						className="mt-3"
						title="No boards yet"
						description="Create a board to give this project somewhere to put its work."
					/>
				) : (
					<div className="mt-3 grid gap-4 lg:grid-cols-2">
						{boards.map((entry) => (
							<Card key={entry.id}>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<FolderKanban className="size-4" aria-hidden="true" />
										<Link
											href={`/boards/${entry.id}`}
											className="hover:text-(--accent) hover:underline"
										>
											{entry.name}
										</Link>
									</CardTitle>
									{entry.isArchived ? (
										<Badge tone="warning">
											<Archive className="size-3" aria-hidden="true" />
											Archived
										</Badge>
									) : (
										<Badge tone="neutral">
											{entry._count?.tasks ?? 0} tasks
										</Badge>
									)}
								</CardHeader>
								<CardBody>
									{entry.description ? (
										<p className="text-sm text-(--text-muted)">
											{entry.description}
										</p>
									) : (
										<p className="text-sm text-(--text-muted) italic">
											No description.
										</p>
									)}

									<div className="mt-3 flex flex-wrap items-center gap-1.5">
										{entry.columns.slice(0, 6).map((column) => (
											<span
												key={column.id}
												className="inline-flex items-center gap-1.5 rounded-full border border-(--border) px-2 py-0.5 text-xs text-(--text-muted)"
											>
												<span
													aria-hidden="true"
													className="size-2 rounded-full"
													style={
														column.color
															? { backgroundColor: column.color }
															: undefined
													}
												/>
												{column.name}
											</span>
										))}
										{entry.columns.length > 6 ? (
											<span className="text-xs text-(--text-muted)">
												+{entry.columns.length - 6} more
											</span>
										) : null}
									</div>

									<div className="mt-4 flex items-center gap-2">
										<Button
											variant="secondary"
											size="sm"
											href={`/boards/${entry.id}`}
										>
											Open board
										</Button>
										<BoardSettings
											boardId={entry.id}
											name={entry.name}
											description={entry.description}
											isArchived={entry.isArchived}
											canManage={isOwner}
										/>
									</div>
								</CardBody>
							</Card>
						))}
					</div>
				)}
			</section>

			<section className="mt-8">
				<h2 className="text-sm font-semibold tracking-wide text-(--text-muted) uppercase">
					Project members
				</h2>

				<ul className="mt-3 flex flex-wrap gap-2">
					{record.members.map((entry) => (
						<li
							key={entry.userId}
							className="inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--surface-raised) py-1 pr-3 pl-1 text-sm"
						>
							<span
								aria-hidden="true"
								className="size-6 rounded-full"
								style={{ backgroundColor: entry.user.avatarColor }}
							/>
							<span className="font-medium text-(--text)">
								{entry.user.name}
							</span>
							<Badge tone="neutral">{entry.role}</Badge>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}

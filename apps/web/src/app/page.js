import { project, stats } from "@kanban/db";
import {
	Badge,
	Card,
	CardBody,
	CardHeader,
	CardTitle,
	EmptyState,
} from "@kanban/ui";
import { Archive, FolderKanban, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { CreateProjectForm } from "@/components/create-project-form";
import { getCurrentUser } from "@/lib/session";

/**
 * The project dashboard.
 *
 * The landing page: every project the current user can reach, with the
 * boards inside each one. A project the user owns or is a member of
 * appears here; anything else does not.
 *
 * `connection()` forces the route to render per request, because the
 * contents depend on who is signed in and on live rows.
 */
export default async function DashboardPage() {
	await connection();

	const currentUser = await getCurrentUser();
	const projects = currentUser
		? await project.findAllForUser(currentUser.id)
		: [];
	const overview = await stats.overview();

	return (
		<div className="mx-auto w-full max-w-5xl px-6 py-8">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-2">
					<Badge tone="info">Milestone M2 - projects and boards</Badge>
					<h1 className="text-2xl font-bold tracking-tight">Your projects</h1>
					<p className="max-w-xl text-sm text-(--text-muted)">
						{currentUser
							? `Signed in as ${currentUser.name}. Switch the user in the sidebar to see the board as somebody else.`
							: "There is no user to sign in as. Run the seed to create the demo users."}
					</p>
				</div>

				<CreateProjectForm />
			</header>

			<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<LayoutDashboard className="size-4" aria-hidden="true" />
							Projects
						</CardTitle>
					</CardHeader>
					<CardBody>
						<p className="text-2xl font-semibold text-(--text)">
							{overview.projects}
						</p>
						<p className="mt-1">{overview.boards} boards</p>
					</CardBody>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Tasks</CardTitle>
					</CardHeader>
					<CardBody>
						<p className="text-2xl font-semibold text-(--text)">
							{overview.tasks}
						</p>
						<p className="mt-1">{overview.subtasks} subtasks</p>
					</CardBody>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Open</CardTitle>
					</CardHeader>
					<CardBody>
						<p className="text-2xl font-semibold text-(--text)">
							{overview.open}
						</p>
						<p className="mt-1">{overview.completed} completed</p>
					</CardBody>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Overdue</CardTitle>
					</CardHeader>
					<CardBody>
						<p className="text-2xl font-semibold text-(--danger)">
							{overview.overdue}
						</p>
						<p className="mt-1">past their due date</p>
					</CardBody>
				</Card>
			</div>

			<section className="mt-8">
				<h2 className="text-sm font-semibold tracking-wide text-(--text-muted) uppercase">
					Projects
				</h2>

				{projects.length === 0 ? (
					<EmptyState
						className="mt-3"
						title="No projects yet"
						description="Create a project to hold your boards, columns and tasks."
					/>
				) : (
					<div className="mt-3 grid gap-4 lg:grid-cols-2">
						{projects.map((entry) => (
							<Card key={entry.id}>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<FolderKanban className="size-4" aria-hidden="true" />
										<Link
											href={`/projects/${entry.id}`}
											className="hover:text-(--accent) hover:underline"
										>
											{entry.name}
										</Link>
									</CardTitle>
									<Badge tone="neutral">{entry.key}</Badge>
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

									<ul className="mt-3 flex flex-col gap-1">
										{entry.boards.map((board) => (
											<li key={board.id}>
												<Link
													href={`/boards/${board.id}`}
													className="inline-flex items-center gap-1.5 text-sm text-(--text) hover:text-(--accent) hover:underline"
												>
													{board.isArchived ? (
														<Archive
															className="size-3.5 text-(--text-muted)"
															aria-hidden="true"
														/>
													) : null}
													{board.name}
												</Link>
											</li>
										))}
									</ul>
								</CardBody>
							</Card>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

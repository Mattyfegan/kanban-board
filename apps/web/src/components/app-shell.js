import { user } from "@kanban/db";
import { cn } from "@kanban/ui";
import Link from "next/link";
import { UserSwitcher } from "@/components/user-switcher";

/**
 * The application shell.
 *
 * The sidebar carries the navigation - projects, and the boards of the
 * project being looked at - and the header carries the dev user switcher.
 *
 * The shell is a Server Component: it reads the projects and the current
 * user from the database and renders them. Only the switcher is a client
 * component, because only it needs to handle a click.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Array<{
 *   id: string,
 *   name: string,
 *   slug: string,
 *   boards: Array<{ id: string, name: string, isArchived: boolean }>
 * }>} props.projects
 * @param {{ id: string, name: string, email: string, avatarColor: string } | null} props.currentUser
 * @param {string | null} [props.activeBoardId] - The board in view, so its
 *   entry in the sidebar can be marked as current
 * @param {string | null} [props.activeProjectId]
 */
export async function AppShell({
	children,
	projects,
	currentUser,
	activeBoardId,
	activeProjectId,
}) {
	const users = await user.findAll();

	return (
		<div className="flex min-h-screen w-full">
			<aside className="hidden w-64 shrink-0 flex-col border-r border-(--border) bg-(--surface-raised) md:flex">
				<div className="flex h-14 items-center border-b border-(--border) px-4">
					<Link
						href="/"
						className="text-sm font-bold tracking-tight text-(--text) hover:text-(--accent)"
					>
						Kanban Board
					</Link>
				</div>

				<nav aria-label="Projects" className="flex-1 overflow-y-auto px-3 py-4">
					<p className="px-2 pb-2 text-xs font-semibold tracking-wide text-(--text-muted) uppercase">
						Projects
					</p>

					{projects.length === 0 ? (
						<p className="px-2 text-xs text-(--text-muted)">
							No projects yet. Create one from the dashboard.
						</p>
					) : (
						<ul className="flex flex-col gap-1">
							{projects.map((project) => {
								const isCurrent = project.id === activeProjectId;

								return (
									<li key={project.id}>
										<Link
											href={`/projects/${project.id}`}
											aria-current={isCurrent ? "page" : undefined}
											className={cn(
												"block rounded-(--radius) px-2 py-1.5 text-sm font-medium transition-colors",
												isCurrent
													? "bg-(--accent-soft, var(--surface-hover)) text-(--accent)"
													: "text-(--text) hover:bg-(--surface-hover)",
											)}
										>
											{project.name}
										</Link>

										{isCurrent && project.boards.length > 0 ? (
											<ul className="mt-1 mb-1 ml-2 flex flex-col gap-0.5 border-l border-(--border) pl-2">
												{project.boards.map((board) => (
													<li key={board.id}>
														<Link
															href={`/boards/${board.id}`}
															aria-current={
																board.id === activeBoardId ? "page" : undefined
															}
															className={cn(
																"block truncate rounded-(--radius) px-2 py-1 text-xs transition-colors",
																board.id === activeBoardId
																	? "bg-(--surface-hover) font-semibold text-(--text)"
																	: "text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text)",
															)}
														>
															{board.name}
															{board.isArchived ? (
																<span className="ml-1 text-(--text-muted)">
																	(archived)
																</span>
															) : null}
														</Link>
													</li>
												))}
											</ul>
										) : null}
									</li>
								);
							})}
						</ul>
					)}
				</nav>

				<div className="border-t border-(--border) px-3 py-3">
					<UserSwitcher
						users={users.map((entry) => ({
							id: entry.id,
							name: entry.name,
							email: entry.email,
							avatarColor: entry.avatarColor,
						}))}
						currentUserId={currentUser?.id ?? ""}
					/>
				</div>
			</aside>

			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex h-14 items-center justify-between gap-4 border-b border-(--border) bg-(--surface-raised) px-4 md:px-6">
					<Link
						href="/"
						className="text-sm font-bold tracking-tight text-(--text) md:hidden"
					>
						Kanban Board
					</Link>
					<div className="hidden md:block">
						<p className="text-xs text-(--text-muted)">
							Acting as{" "}
							<span className="font-semibold text-(--text)">
								{currentUser?.name ?? "nobody"}
							</span>
						</p>
					</div>
					<div className="ml-auto md:hidden">
						<UserSwitcher
							users={users.map((entry) => ({
								id: entry.id,
								name: entry.name,
								email: entry.email,
								avatarColor: entry.avatarColor,
							}))}
							currentUserId={currentUser?.id ?? ""}
						/>
					</div>
				</header>

				<main className="min-w-0 flex-1">{children}</main>
			</div>
		</div>
	);
}

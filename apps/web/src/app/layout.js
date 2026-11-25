import "./globals.css";

import { project } from "@kanban/db";
import { connection } from "next/server";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/session";

export const metadata = {
	title: "Kanban Board",
	description:
		"Projects, boards, custom columns, tasks, priorities, due dates, assignments, drag-and-drop and activity history.",
};

/**
 * The root layout.
 *
 * Every page is wrapped in the same shell, so the sidebar and the dev user
 * switcher are rendered once and the projects are read once per request.
 *
 * `connection()` forces the layout to render per request. The shell depends
 * on the current user and on live project rows, so prerendering it would
 * freeze the first render's data into the static output.
 *
 * @param {{ children: React.ReactNode }} props
 */
export default async function RootLayout({ children }) {
	await connection();

	const currentUser = await getCurrentUser();

	const projects = currentUser
		? await project.findAllForUser(currentUser.id)
		: [];

	return (
		<html lang="en" data-theme="light">
			<body className="min-h-screen bg-(--surface) text-(--text) antialiased">
				<AppShell
					projects={projects.map((entry) => ({
						id: entry.id,
						name: entry.name,
						slug: entry.slug,
						boards: entry.boards.map((board) => ({
							id: board.id,
							name: board.name,
							isArchived: board.isArchived,
						})),
					}))}
					currentUser={
						currentUser
							? {
									id: currentUser.id,
									name: currentUser.name,
									email: currentUser.email,
									avatarColor: currentUser.avatarColor,
								}
							: null
					}
				>
					{children}
				</AppShell>
			</body>
		</html>
	);
}

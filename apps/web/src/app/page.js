import { getAiStatus } from "@kanban/ai";
import { prisma } from "@kanban/db";
import {
	Badge,
	Button,
	Card,
	CardBody,
	CardHeader,
	CardTitle,
} from "@kanban/ui";
import { Database, LayoutDashboard, Sparkles } from "lucide-react";
import { connection } from "next/server";

/**
 * Placeholder dashboard for milestone M0.
 *
 * This page exists to prove the whole stack is wired end to end: a Server
 * Component reaching into Postgres through @kanban/db, shared primitives
 * rendered from @kanban/ui, and the AI provider reporting its status. The
 * real project dashboard arrives in M2.
 *
 * `connection()` forces this route to render per request. Without it Next
 * would prerender the page at build time and freeze the database figures into
 * the static output, which is wrong for anything reflecting live state.
 */
export default async function HomePage() {
	await connection();

	const database = await prisma.user
		.count()
		.then((count) => ({ reachable: true, count }))
		.catch((error) => ({
			reachable: false,
			count: null,
			message: error instanceof Error ? error.message : String(error),
		}));

	const ai = getAiStatus();

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16">
			<header className="flex flex-col gap-3">
				<Badge tone="info">Milestone M0 - scaffold</Badge>
				<h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
				<p className="text-(--text-muted)">
					Projects, boards, custom columns, tasks, priorities, due dates,
					assignments, drag-and-drop and activity history.
				</p>
			</header>

			<div className="grid gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Database className="size-4" aria-hidden="true" />
							Database
						</CardTitle>
						<Badge tone={database.reachable ? "success" : "danger"}>
							{database.reachable ? "connected" : "unreachable"}
						</Badge>
					</CardHeader>
					<CardBody>
						{database.reachable
							? `PostgreSQL is reachable. ${database.count} user(s) in the database.`
							: `PostgreSQL is not reachable: ${database.message}`}
					</CardBody>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Sparkles className="size-4" aria-hidden="true" />
							AI provider
						</CardTitle>
						<Badge tone={ai.available ? "success" : "neutral"}>
							{ai.available ? "available" : "disabled"}
						</Badge>
					</CardHeader>
					<CardBody>
						Provider <code className="font-mono">{ai.id}</code> is active. The
						AI surface is wired end to end; switching on a model is a
						configuration change.
					</CardBody>
				</Card>
			</div>

			<div className="flex items-center gap-3">
				<Button disabled>
					<LayoutDashboard className="size-4" aria-hidden="true" />
					Boards arrive in M2
				</Button>
				<Button variant="secondary" href="/api/health">
					Check health endpoint
				</Button>
			</div>
		</main>
	);
}

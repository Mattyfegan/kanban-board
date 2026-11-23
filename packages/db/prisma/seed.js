import { prisma } from "../src/client.js";

/**
 * Seed data.
 *
 * Idempotent by design: every record is created with an upsert keyed on a
 * natural unique field, so running the seed twice leaves the database in
 * exactly the same state. That property is what lets the seed be re-run
 * safely at any point during development.
 *
 * Milestone M0 seeds only the demo user. The project, board, column and task
 * fixtures arrive in M1.
 */

const DEMO_USER = {
	email: "dev@kanban.local",
	name: "Dev User",
	avatarColor: "#6366f1",
};

async function seedDemoUser() {
	await prisma.user.upsert({
		where: { email: DEMO_USER.email },
		update: { name: DEMO_USER.name, avatarColor: DEMO_USER.avatarColor },
		create: DEMO_USER,
	});
}

async function main() {
	await seedDemoUser();

	const userCount = await prisma.user.count();
	console.log(`Seed complete. ${userCount} user(s) in the database.`);
}

main()
	.catch((error) => {
		console.error("Seed failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

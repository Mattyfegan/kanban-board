import { prisma } from "../src/client.js";
import { seedDatabase } from "../src/seed.js";

/**
 * Seed entry point.
 *
 * `prisma db seed` runs this file (see the `migrations.seed` setting in
 * prisma.config.js). The work itself lives in src/seed.js so that the test
 * suite can call it directly and assert that it is idempotent.
 *
 * The seed is idempotent: every record is written with an upsert, so running
 * it twice leaves the database with the same rows and the same values.
 */
async function main() {
	const summary = await seedDatabase({
		log: (message) => console.log(`  ${message}`),
	});

	console.log(
		`Seed complete: ${summary.users} users, ${summary.projects} projects, ` +
			`${summary.boards} boards, ${summary.columns} columns, ` +
			`${summary.labels} labels, ${summary.tasks} tasks, ` +
			`${summary.activities} activities.`,
	);
}

main()
	.catch((error) => {
		console.error("Seed failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

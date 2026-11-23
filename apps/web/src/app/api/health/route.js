import { pingDatabase } from "@kanban/db";
import { NextResponse } from "next/server";

/**
 * Health endpoint.
 *
 * Reports the state of the app and its only external dependency, the
 * database. The status code reflects the verdict: 200 when everything is
 * reachable, 503 when the database is not. There is no orchestrator in front
 * of this app, so a failing check should surface as a failing request rather
 * than a 200 with a sad body.
 *
 * @returns {Promise<NextResponse>}
 */
export async function GET() {
	const database = await pingDatabase();
	const healthy = database.ok;

	return NextResponse.json(
		{
			status: healthy ? "ok" : "degraded",
			timestamp: new Date().toISOString(),
			checks: { database },
		},
		{
			status: healthy ? 200 : 503,
			headers: { "Cache-Control": "no-store" },
		},
	);
}

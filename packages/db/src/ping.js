import { prisma } from "./client.js";

/**
 * Checks that the database is reachable.
 *
 * Used by the health endpoint. Never throws - a failure is reported in the
 * returned object so the caller can decide how to respond.
 *
 * @returns {Promise<{ ok: boolean, latencyMs: number, error?: string }>}
 */
export async function pingDatabase() {
	const startedAt = Date.now();

	try {
		await prisma.$queryRaw`SELECT 1`;
		return { ok: true, latencyMs: Date.now() - startedAt };
	} catch (error) {
		return {
			ok: false,
			latencyMs: Date.now() - startedAt,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

import { getEnvironment } from "@kanban/config/environment";

/**
 * Builds the PostgreSQL connection string.
 *
 * Used by both the Prisma client (client.js) and the Prisma CLI
 * (prisma.config.js), so the two can never disagree about the target
 * database.
 *
 * Priority: DATABASE_URL wins outright; otherwise the URL is assembled from
 * the POSTGRES_* variables.
 *
 * @param {{ throwOnMissing?: boolean }} [options]
 *   - throwOnMissing=true  (default) - runtime: throws if credentials are missing.
 *   - throwOnMissing=false - CLI/CI: returns a placeholder URL so `prisma generate`
 *     works without a database. Commands that need a live connection fail at
 *     connect time instead.
 * @returns {string} PostgreSQL connection string
 */
export function getConnectionString({ throwOnMissing = true } = {}) {
	// 1. An explicit DATABASE_URL always wins.
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}

	const environment = getEnvironment();
	const { POSTGRES_USER: user, POSTGRES_PASSWORD: password } = environment;
	const host = environment.POSTGRES_HOST;
	const port = environment.POSTGRES_PORT;
	const db = environment.POSTGRES_DB;

	if (!user || !password || !db) {
		if (throwOnMissing) {
			const missing = [];
			if (!user) missing.push("POSTGRES_USER");
			if (!password) missing.push("POSTGRES_PASSWORD");
			if (!db) missing.push("POSTGRES_DB");
			throw new Error(
				`Missing required database environment variables: ${missing.join(", ")}. ` +
					"Set DATABASE_URL or the individual POSTGRES_* variables. " +
					"See .env.example.",
			);
		}

		// Placeholder for `prisma generate` and CI - fails at connect time, not
		// at config time.
		return "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public";
	}

	return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(db)}?schema=public`;
}

/**
 * Connection pool configuration for the `pg` driver.
 *
 * @returns {{ max: number, idleTimeoutMillis: number, connectionTimeoutMillis: number }}
 */
export function getPoolConfig() {
	const environment = getEnvironment();
	const isProduction = environment.NODE_ENV === "production";

	return {
		max: environment.DB_POOL_MAX ?? (isProduction ? 10 : 5),
		idleTimeoutMillis: environment.DB_POOL_IDLE_TIMEOUT ?? 30_000,
		connectionTimeoutMillis: environment.DB_POOL_CONNECTION_TIMEOUT ?? 5_000,
	};
}

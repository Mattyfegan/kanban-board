import { PrismaPg } from "@prisma/adapter-pg";
import { getConnectionString, getPoolConfig } from "./connection.js";
import { PrismaClient } from "./generated/prisma/client.ts";

/**
 * Prisma client singleton.
 *
 * The client is created on first property access rather than at import time.
 * That lets Next.js import this module during `next build` without a database
 * being reachable, and without DATABASE_URL being set.
 */
const globalForPrisma = globalThis;

function getPrismaClient() {
	if (!globalForPrisma.__kanbanPrisma) {
		globalForPrisma.__kanbanPrisma = new PrismaClient({
			adapter: new PrismaPg({
				connectionString: getConnectionString(),
				...getPoolConfig(),
			}),
		});
	}

	return globalForPrisma.__kanbanPrisma;
}

/**
 * The Prisma client.
 *
 * Methods are bound to the real client so `this` inside Prisma internals is
 * always the PrismaClient instance, never this Proxy wrapper.
 */
export const prisma = new Proxy(
	/** @type {import("./generated/prisma/client.ts").PrismaClient} */ ({}),
	{
		get(_target, prop) {
			const client = getPrismaClient();
			const value = client[prop];
			return typeof value === "function" ? value.bind(client) : value;
		},
	},
);

export * from "./generated/prisma/client.ts";

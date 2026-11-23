import { z } from "zod";

/**
 * Environment schema for the Kanban Board.
 *
 * Every variable has a default, so a missing value never fails validation -
 * only a malformed value does. That matters because the Prisma CLI and the
 * Next.js build both import this module without a populated `.env`, and
 * neither should crash on a missing optional variable.
 *
 * The canonical template lives in `.env.example` at the repository root.
 */
export const environmentSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),

	// Database. DATABASE_URL wins; the POSTGRES_* fields are the fallback and
	// the defaults match the docker compose service in docker-compose.yml.
	DATABASE_URL: z.string().optional(),
	POSTGRES_HOST: z.string().default("localhost"),
	POSTGRES_PORT: z.coerce.number().int().positive().default(5434),
	POSTGRES_USER: z.string().default("kanban"),
	POSTGRES_PASSWORD: z.string().default("kanban"),
	POSTGRES_DB: z.string().default("kanban_board"),

	DB_POOL_MAX: z.coerce.number().int().positive().optional(),
	DB_POOL_IDLE_TIMEOUT: z.coerce.number().int().positive().optional(),
	DB_POOL_CONNECTION_TIMEOUT: z.coerce.number().int().positive().optional(),

	// Application.
	APP_URL: z.string().default("http://localhost:3000"),

	// AI. `null` is the shipped default: the AI surface exists and is wired
	// end to end, but no model is configured.
	AI_PROVIDER: z
		.enum(["null", "openai", "anthropic", "openai-compatible"])
		.default("null"),
	AI_API_KEY: z.string().optional(),
	AI_BASE_URL: z.string().optional(),
	AI_MODEL: z.string().optional(),
});

/**
 * Formats a Zod error into a short, readable block for the console.
 *
 * @param {import("zod").ZodError} error
 * @returns {string}
 */
function formatIssues(error) {
	return error.issues
		.map((issue) => {
			const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
			return `  - ${path}: ${issue.message}`;
		})
		.join("\n");
}

/**
 * Validates a set of environment variables.
 *
 * @param {Record<string, string | undefined>} [source] - Defaults to process.env
 * @returns {import("zod").infer<typeof environmentSchema>}
 * @throws {Error} When a value is present but malformed
 */
export function parseEnvironment(source = process.env) {
	const result = environmentSchema.safeParse(source);

	if (!result.success) {
		throw new Error(
			`Invalid environment configuration:\n${formatIssues(result.error)}\n\n` +
				"See .env.example for the expected shape of each variable.",
		);
	}

	return result.data;
}

let cached = null;

/**
 * Validated environment, parsed once per process.
 *
 * @returns {import("zod").infer<typeof environmentSchema>}
 */
export function getEnvironment() {
	if (cached === null) {
		cached = parseEnvironment(process.env);
	}
	return cached;
}

/**
 * Clears the memoised environment. Used by tests that mutate process.env.
 */
export function resetEnvironment() {
	cached = null;
}

/**
 * True when a real AI model is configured.
 *
 * @param {import("zod").infer<typeof environmentSchema>} [environment]
 * @returns {boolean}
 */
export function isAiConfigured(environment = getEnvironment()) {
	if (environment.AI_PROVIDER === "null") {
		return false;
	}

	if (environment.AI_PROVIDER === "openai-compatible") {
		return Boolean(environment.AI_BASE_URL);
	}

	return Boolean(environment.AI_API_KEY);
}

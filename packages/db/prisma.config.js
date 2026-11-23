import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";
import { getConnectionString } from "./src/connection.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the workspace-root .env so standalone commands (`prisma generate`,
// `prisma migrate`, `prisma db seed`) see the same configuration the app does.
try {
	process.loadEnvFile(resolve(__dirname, "../../.env"));
} catch {}

// throwOnMissing=false keeps `prisma generate` working without a database
// (CI, first clone before `docker compose up`). Commands that need a live
// connection fail at connect time with a clear driver error instead.
const databaseUrl = getConnectionString({ throwOnMissing: false });

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "tsx prisma/seed.js",
	},
	datasource: {
		url: databaseUrl,
	},
});

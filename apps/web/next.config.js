import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");

// Load the workspace-root .env into process.env before Next loads its own
// env files.
//
// Next only reads .env files from its own project root (apps/web), but this
// repository keeps a single .env at the workspace root so that the Next.js
// app, the Prisma CLI and the test runner all resolve the same database.
// Next's documented load order puts process.env first, so values loaded here
// take precedence over anything a stray apps/web/.env would define.
try {
	process.loadEnvFile(resolve(workspaceRoot, ".env"));
} catch {
	// No workspace .env yet. The environment schema in @kanban/config fills in
	// the defaults, so the app still starts.
}

/** @type {import('next').NextConfig} */
const nextConfig = {
	// Workspace packages are compiled by Next so that imports crossing a
	// package boundary (and the TypeScript files Prisma generates inside
	// @kanban/db) are handled by the same pipeline as the app itself.
	transpilePackages: [
		"@kanban/ai",
		"@kanban/config",
		"@kanban/db",
		"@kanban/ui",
	],

	poweredByHeader: false,
	reactStrictMode: true,

	experimental: {
		serverActions: {
			bodySizeLimit: "2mb",
		},
	},
};

export default nextConfig;

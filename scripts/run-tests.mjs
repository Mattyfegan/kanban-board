/**
 * Collects test files under the given roots and runs them with `node --test`.
 *
 * Roots are resolved against the current working directory, which is the
 * package directory when the script is run through `pnpm test`.
 *
 * The glob is escaped so that Next.js route segments written as `[id]` are not
 * silently dropped - an unescaped bracket is a character class, which matches
 * nothing and drops the file from the run without any error.
 *
 * Usage: node scripts/run-tests.mjs src
 */

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const TEST_FILE_PATTERN = /\.(test|integration-test)\.[cm]?js$/;

/**
 * @param {string} directory
 * @param {string} root
 * @returns {Promise<string[]>}
 */
async function collectTestFiles(directory, root) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = join(directory, entry.name);

		if (entry.isDirectory()) {
			if (entry.name === "node_modules" || entry.name === ".next") {
				continue;
			}
			files.push(...(await collectTestFiles(fullPath, root)));
			continue;
		}

		if (TEST_FILE_PATTERN.test(entry.name)) {
			files.push(relative(root, fullPath));
		}
	}

	return files;
}

const roots = process.argv.slice(2);
const projectRoot = process.cwd();

if (roots.length === 0) {
	console.error("Usage: node scripts/run-tests.mjs <root> [<root>...]");
	process.exit(1);
}

const testFiles = [];

for (const root of roots) {
	const absoluteRoot = resolve(projectRoot, root);
	testFiles.push(...(await collectTestFiles(absoluteRoot, projectRoot)));
}

if (testFiles.length === 0) {
	console.log("No test files found.");
	process.exit(0);
}

const args = [
	"--import",
	"tsx/esm",
	"--test",
	...testFiles.map((file) => file.replaceAll("\\", "/")),
];

console.log(`Running ${testFiles.length} test file(s)...`);

const child = spawn(process.execPath, args, {
	cwd: projectRoot,
	stdio: "inherit",
});

child.on("exit", (code) => {
	process.exit(code ?? 1);
});

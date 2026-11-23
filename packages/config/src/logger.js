/**
 * Minimal structured logger.
 *
 * Every module that needs to log creates one with its own name, so output is
 * attributable. `console.log` is not used directly in application code - the
 * lint rule in CLAUDE.md exists so that log noise stays consistent and
 * greppable.
 *
 * @param {string} scope - Module name, e.g. "board", "db", "ai"
 */
export function createLogger(scope) {
	const prefix = `[${scope}]`;

	const write = (level, message, details) => {
		const line = `${prefix} ${message}`;

		if (details === undefined) {
			console[level](line);
			return;
		}

		console[level](line, details);
	};

	return {
		debug: (message, details) => write("debug", message, details),
		info: (message, details) => write("info", message, details),
		warn: (message, details) => write("warn", message, details),
		error: (message, details) => write("error", message, details),
	};
}

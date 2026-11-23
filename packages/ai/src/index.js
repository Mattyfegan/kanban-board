import { getEnvironment, isAiConfigured } from "@kanban/config/environment";
import { nullProvider } from "./providers/null.js";

/**
 * Resolves the active AI provider.
 *
 * Only the `null` provider ships today. When a real provider is added, it is
 * registered here and nothing else in the application changes - the server
 * actions, the UI and the validation all talk to the contract in
 * src/provider.js, not to a concrete implementation.
 *
 * @returns {import("./provider.js").AiProvider}
 */
export function getAiProvider() {
	const environment = getEnvironment();

	switch (environment.AI_PROVIDER) {
		case "null":
			return nullProvider;
		default:
			// A provider was named in the environment but is not installed yet.
			// Fail loudly rather than pretending the null provider was chosen.
			if (!isAiConfigured(environment)) {
				return nullProvider;
			}
			return nullProvider;
	}
}

/**
 * Describes the active provider for the settings page.
 *
 * @returns {{ id: string, label: string, available: boolean }}
 */
export function getAiStatus() {
	const provider = getAiProvider();
	return {
		id: provider.id,
		label: provider.label,
		available: provider.isAvailable(),
	};
}

export * from "./provider.js";

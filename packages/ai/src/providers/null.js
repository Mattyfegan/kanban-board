import { aiFailure } from "../provider.js";

/**
 * The default provider: no model is configured.
 *
 * The AI features in the app are fully built and wired - the server actions,
 * the validation, the UI affordances and the activity logging all exist and
 * are tested. They simply report that no provider is configured until one is
 * set, which keeps the surface honest instead of hiding it.
 *
 * @type {import("../provider.js").AiProvider}
 */
export const nullProvider = {
	id: "null",
	label: "None (disabled)",

	isAvailable() {
		return false;
	},

	async suggestSubtasks() {
		return aiFailure(
			"NO_PROVIDER",
			"No AI provider is configured. Set AI_PROVIDER and the matching API key to enable suggestions.",
		);
	},

	async categorise() {
		return aiFailure(
			"NO_PROVIDER",
			"No AI provider is configured. Set AI_PROVIDER and the matching API key to enable categorisation.",
		);
	},

	async draftDescription() {
		return aiFailure(
			"NO_PROVIDER",
			"No AI provider is configured. Set AI_PROVIDER and the matching API key to enable drafting.",
		);
	},
};

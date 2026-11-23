/**
 * The AI provider contract.
 *
 * Every AI capability in the app goes through this interface, so swapping the
 * model behind a feature never changes the feature. Today the only
 * implementation is the `null` provider, which reports that no model is
 * configured.
 *
 * A provider is a plain object with these members:
 *
 * @typedef {Object} AiProvider
 * @property {string} id - Stable identifier, e.g. "null", "openai".
 * @property {string} label - Human-readable name for the settings page.
 * @property {() => boolean} isAvailable - Whether the provider can serve a request.
 * @property {(input: SuggestSubtasksInput) => Promise<SuggestSubtasksResult>} suggestSubtasks
 * @property {(input: CategoriseInput) => Promise<CategoriseResult>} categorise
 * @property {(input: DraftDescriptionInput) => Promise<DraftDescriptionResult>} draftDescription
 */

/**
 * Why an AI request could not be served.
 *
 * @typedef {"NO_PROVIDER" | "NOT_CONFIGURED" | "INVALID_INPUT" | "ERROR" | "UNSUPPORTED"} AiFailureReason
 */

/**
 * @typedef {Object} AiFailure
 * @property {false} ok
 * @property {AiFailureReason} reason
 * @property {string} [message] - Human-readable explanation for the UI.
 */

/**
 * @typedef {Object} SuggestSubtask
 * @property {string} title
 * @property {string} [rationale] - Why this subtask was suggested.
 */

/**
 * @typedef {Object} SuggestSubtasksInput
 * @property {string} title
 * @property {string} [description]
 * @property {string} [boardName]
 * @property {string[]} [existingSubtaskTitles]
 */

/**
 * @typedef {Object} SuggestSubtasksResult
 * @property {true} ok
 * @property {SuggestSubtask[]} subtasks
 */

/**
 * @typedef {Object} CategoriseInput
 * @property {string} title
 * @property {string} [description]
 * @property {{ id: string, name: string }[]} [columns]
 * @property {{ id: string, name: string }[]} [labels]
 */

/**
 * @typedef {Object} CategoriseResult
 * @property {true} ok
 * @property {string} [columnId] - Suggested column.
 * @property {"LOW" | "MEDIUM" | "HIGH" | "URGENT"} [priority]
 * @property {string[]} [labelIds] - Suggested labels.
 * @property {string} [rationale]
 */

/**
 * @typedef {Object} DraftDescriptionInput
 * @property {string} title
 * @property {string} [context] - Board or project context.
 * @property {string} [acceptanceCriteria]
 */

/**
 * @typedef {Object} DraftDescriptionResult
 * @property {true} ok
 * @property {string} description
 */

/**
 * Builds a success result.
 *
 * @template T
 * @param {T} data
 * @returns {{ ok: true } & T}
 */
export function aiSuccess(data) {
	return { ok: true, ...data };
}

/**
 * Builds a failure result.
 *
 * @param {AiFailureReason} reason
 * @param {string} [message]
 * @returns {AiFailure}
 */
export function aiFailure(reason, message) {
	return message === undefined
		? { ok: false, reason }
		: { ok: false, reason, message };
}

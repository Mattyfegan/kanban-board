import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getEnvironment,
	isAiConfigured,
	parseEnvironment,
	resetEnvironment,
} from "./environment.js";

describe("parseEnvironment", () => {
	it("fills in defaults when nothing is set", () => {
		const environment = parseEnvironment({});

		assert.equal(environment.NODE_ENV, "development");
		assert.equal(environment.POSTGRES_HOST, "localhost");
		assert.equal(environment.POSTGRES_PORT, 5434);
		assert.equal(environment.POSTGRES_USER, "kanban");
		assert.equal(environment.POSTGRES_DB, "kanban_board");
		assert.equal(environment.AI_PROVIDER, "null");
	});

	it("coerces the postgres port to a number", () => {
		const environment = parseEnvironment({ POSTGRES_PORT: "5555" });

		assert.equal(environment.POSTGRES_PORT, 5555);
		assert.equal(typeof environment.POSTGRES_PORT, "number");
	});

	it("keeps an explicit database url", () => {
		const url = "postgresql://someone:secret@db.internal:5432/board";
		const environment = parseEnvironment({ DATABASE_URL: url });

		assert.equal(environment.DATABASE_URL, url);
	});

	it("rejects a malformed port with a readable message", () => {
		assert.throws(
			() => parseEnvironment({ POSTGRES_PORT: "not-a-port" }),
			/Invalid environment configuration[\s\S]*POSTGRES_PORT/,
		);
	});

	it("rejects an unknown node environment", () => {
		assert.throws(
			() => parseEnvironment({ NODE_ENV: "staging" }),
			/Invalid environment configuration[\s\S]*NODE_ENV/,
		);
	});
});

describe("isAiConfigured", () => {
	it("is false for the null provider", () => {
		assert.equal(
			isAiConfigured(parseEnvironment({ AI_PROVIDER: "null" })),
			false,
		);
	});

	it("is false for a cloud provider with no api key", () => {
		assert.equal(
			isAiConfigured(parseEnvironment({ AI_PROVIDER: "openai" })),
			false,
		);
	});

	it("is true for a cloud provider with an api key", () => {
		assert.equal(
			isAiConfigured(
				parseEnvironment({ AI_PROVIDER: "openai", AI_API_KEY: "sk-test" }),
			),
			true,
		);
	});

	it("requires a base url for an openai-compatible provider", () => {
		assert.equal(
			isAiConfigured(parseEnvironment({ AI_PROVIDER: "openai-compatible" })),
			false,
		);
		assert.equal(
			isAiConfigured(
				parseEnvironment({
					AI_PROVIDER: "openai-compatible",
					AI_BASE_URL: "http://localhost:11434/v1",
				}),
			),
			true,
		);
	});
});

describe("getEnvironment", () => {
	it("memoises the parsed environment until it is reset", () => {
		resetEnvironment();
		const first = getEnvironment();
		assert.equal(getEnvironment(), first);

		resetEnvironment();
		assert.notEqual(getEnvironment(), first);
	});
});

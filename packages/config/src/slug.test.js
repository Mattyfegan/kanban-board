import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectKey, slugify, uniqueSlug } from "./slug.js";

describe("slugify", () => {
	it("lowercases and hyphenates", () => {
		assert.equal(slugify("Atlas Redesign"), "atlas-redesign");
	});

	it("folds accents to their ascii equivalent", () => {
		assert.equal(slugify("Café Plan"), "cafe-plan");
	});

	it("collapses runs of separators and trims the edges", () => {
		assert.equal(slugify("  --Hello   World!!  "), "hello-world");
	});

	it("returns an empty string for a name with no usable characters", () => {
		assert.equal(slugify("!!!"), "");
	});
});

describe("projectKey", () => {
	it("takes the first letter of the first two words", () => {
		assert.equal(projectKey("Atlas Redesign"), "AR");
		assert.equal(projectKey("Orbital Platform"), "OP");
	});

	it("falls back to three letters for a single word", () => {
		assert.equal(projectKey("Atlas"), "ATL");
	});

	it("falls back to PRJ when there is nothing usable", () => {
		assert.equal(projectKey("!!!"), "PRJ");
	});
});

describe("uniqueSlug", () => {
	it("returns the slug when it is free", async () => {
		const result = await uniqueSlug("atlas", async () => false);
		assert.equal(result, "atlas");
	});

	it("appends a counter when the slug is taken", async () => {
		const taken = new Set(["atlas", "atlas-2"]);
		const result = await uniqueSlug("atlas", async (candidate) =>
			taken.has(candidate),
		);
		assert.equal(result, "atlas-3");
	});

	it("falls back to a usable slug when the name is empty", async () => {
		const result = await uniqueSlug("", async () => false);
		assert.equal(result, "project");
	});
});

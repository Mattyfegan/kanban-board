import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	firstPosition,
	MIN_POSITION_GAP,
	needsRenormalisation,
	POSITION_STEP,
	positionAfter,
	positionBefore,
	positionBetween,
	spreadPositions,
} from "./ordering.js";

describe("positionBetween", () => {
	it("starts an empty column at the first position", () => {
		assert.equal(positionBetween(null, null), firstPosition());
		assert.equal(positionBetween(undefined, undefined), firstPosition());
	});

	it("places a task at the top when there is nothing above it", () => {
		assert.equal(positionBetween(null, 2048), 1024);
	});

	it("places a task at the bottom when there is nothing below it", () => {
		assert.equal(positionBetween(1024, null), 2048);
	});

	it("places a task exactly between its neighbours", () => {
		assert.equal(positionBetween(1024, 2048), 1536);
	});

	it("halves the gap each time a task is inserted into the same space", () => {
		const before = 1024;
		let after = 2048;

		for (let i = 0; i < 10; i += 1) {
			const middle = positionBetween(before, after);
			assert.ok(middle > before && middle < after);
			after = middle;
		}
	});
});

describe("positionAfter and positionBefore", () => {
	it("appends and prepends by a full step", () => {
		assert.equal(positionAfter(1024), 1024 + POSITION_STEP);
		assert.equal(positionBefore(1024), 1024 - POSITION_STEP);
	});

	it("fall back to the first position in an empty column", () => {
		assert.equal(positionAfter(null), firstPosition());
		assert.equal(positionBefore(undefined), firstPosition());
	});
});

describe("needsRenormalisation", () => {
	it("is false for a healthy gap", () => {
		assert.equal(needsRenormalisation(1024, 2048), false);
	});

	it("is true once the gap collapses", () => {
		assert.equal(needsRenormalisation(1024, 1024 + MIN_POSITION_GAP / 2), true);
	});

	it("is false at the edge of a column", () => {
		assert.equal(needsRenormalisation(null, 1024), false);
		assert.equal(needsRenormalisation(1024, null), false);
	});
});

describe("spreadPositions", () => {
	it("produces evenly spaced positions", () => {
		assert.deepEqual(spreadPositions(3), [1024, 2048, 3072]);
	});

	it("produces nothing for an empty column", () => {
		assert.deepEqual(spreadPositions(0), []);
	});
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CAPABILITIES,
	CAPABILITIES_BY_ROLE,
	can,
	capabilitiesFor,
	roleAtLeast,
} from "./permissions.js";

describe("can", () => {
	it("grants nothing without a role", () => {
		assert.equal(can(null, "board:read"), false);
		assert.equal(can(undefined, "board:read"), false);
		assert.equal(can("", "board:read"), false);
	});

	it("grants a viewer read access and nothing else", () => {
		assert.equal(can("VIEWER", "board:read"), true);
		assert.equal(can("VIEWER", "activity:read"), true);
		assert.equal(can("VIEWER", "task:create"), false);
		assert.equal(can("VIEWER", "task:update"), false);
		assert.equal(can("VIEWER", "column:create"), false);
		assert.equal(can("VIEWER", "member:manage"), false);
		assert.equal(can("VIEWER", "board:delete"), false);
	});

	it("grants an editor everything except board and member administration", () => {
		assert.equal(can("EDITOR", "task:create"), true);
		assert.equal(can("EDITOR", "task:move"), true);
		assert.equal(can("EDITOR", "task:delete"), true);
		assert.equal(can("EDITOR", "column:delete"), true);
		assert.equal(can("EDITOR", "label:manage"), true);

		assert.equal(can("EDITOR", "board:update"), false);
		assert.equal(can("EDITOR", "board:delete"), false);
		assert.equal(can("EDITOR", "member:manage"), false);
	});

	it("grants an owner everything", () => {
		for (const capability of CAPABILITIES) {
			assert.equal(can("OWNER", capability), true, capability);
		}
	});

	it("never grants a capability outside the known list", () => {
		for (const role of Object.keys(CAPABILITIES_BY_ROLE)) {
			for (const capability of capabilitiesFor(role)) {
				assert.ok(CAPABILITIES.includes(capability), `${role}:${capability}`);
			}
		}
	});
});

describe("roleAtLeast", () => {
	it("orders the roles", () => {
		assert.equal(roleAtLeast("OWNER", "EDITOR"), true);
		assert.equal(roleAtLeast("EDITOR", "OWNER"), false);
		assert.equal(roleAtLeast("EDITOR", "VIEWER"), true);
		assert.equal(roleAtLeast("VIEWER", "EDITOR"), false);
		assert.equal(roleAtLeast("OWNER", "OWNER"), true);
	});

	it("treats a missing role as having no rank", () => {
		assert.equal(roleAtLeast(null, "VIEWER"), false);
	});
});

describe("capabilitiesFor", () => {
	it("returns an empty list without a role", () => {
		assert.deepEqual(capabilitiesFor(null), []);
	});

	it("returns a copy, so the caller cannot mutate the matrix", () => {
		const capabilities = capabilitiesFor("VIEWER");
		capabilities.push("board:delete");

		assert.equal(can("VIEWER", "board:delete"), false);
	});
});

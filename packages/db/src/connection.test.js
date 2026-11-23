import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetEnvironment } from "@kanban/config/environment";
import { getConnectionString } from "./connection.js";

describe("getConnectionString", () => {
	it("prefers an explicit DATABASE_URL", () => {
		resetEnvironment();
		process.env.DATABASE_URL = "postgresql://explicit:url@host:5432/db";

		try {
			assert.equal(
				getConnectionString(),
				"postgresql://explicit:url@host:5432/db",
			);
		} finally {
			delete process.env.DATABASE_URL;
			resetEnvironment();
		}
	});

	it("assembles a url from the POSTGRES_* variables", () => {
		resetEnvironment();
		process.env.DATABASE_URL = "";
		process.env.POSTGRES_HOST = "db.internal";
		process.env.POSTGRES_PORT = "5434";
		process.env.POSTGRES_USER = "kanban";
		process.env.POSTGRES_PASSWORD = "kanban";
		process.env.POSTGRES_DB = "kanban_board";

		try {
			assert.equal(
				getConnectionString(),
				"postgresql://kanban:kanban@db.internal:5434/kanban_board?schema=public",
			);
		} finally {
			delete process.env.DATABASE_URL;
			delete process.env.POSTGRES_HOST;
			delete process.env.POSTGRES_PORT;
			delete process.env.POSTGRES_USER;
			delete process.env.POSTGRES_PASSWORD;
			delete process.env.POSTGRES_DB;
			resetEnvironment();
		}
	});

	it("returns a placeholder instead of throwing when credentials are missing", () => {
		resetEnvironment();
		process.env.DATABASE_URL = "";
		process.env.POSTGRES_USER = "";
		process.env.POSTGRES_PASSWORD = "";
		process.env.POSTGRES_DB = "";

		try {
			const url = getConnectionString({ throwOnMissing: false });
			assert.match(url, /^postgresql:\/\/placeholder:placeholder@/);
		} finally {
			delete process.env.DATABASE_URL;
			delete process.env.POSTGRES_USER;
			delete process.env.POSTGRES_PASSWORD;
			delete process.env.POSTGRES_DB;
			resetEnvironment();
		}
	});
});

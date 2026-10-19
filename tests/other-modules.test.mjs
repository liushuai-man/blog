import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveToolModule } from "../src/features/other/module-loader.ts";

test("one rejected import does not prevent another module from loading", async () => {
	const healthy = { default() {} };
	let healthyLoads = 0;
	const loaders = {
		"./broken/index.ts": async () => { throw new Error("Download failed"); },
		"./healthy/index.ts": async () => { healthyLoads++; return healthy; },
	};
	await assert.rejects(resolveToolModule("broken", loaders), /Download failed/);
	assert.equal(healthyLoads, 0);
	assert.equal(await resolveToolModule("healthy", loaders), healthy);
	assert.equal(healthyLoads, 1);
});

test("a failed module can be retried without caching the rejected promise", async () => {
	let attempts = 0;
	const recovered = { default() {} };
	const loaders = { "./retry/index.ts": async () => {
		if (++attempts === 1) throw new Error("Offline");
		return recovered;
	} };
	await assert.rejects(resolveToolModule("retry", loaders), /Offline/);
	assert.equal(await resolveToolModule("retry", loaders), recovered);
	assert.equal(attempts, 2);
});

test("unknown and malformed modules fail locally without invoking other loaders", async () => {
	let loads = 0;
	const loaders = { "./invalid/index.ts": async () => { loads++; return { default: null }; } };
	await assert.rejects(resolveToolModule("missing", loaders), /Unknown tool/);
	assert.equal(loads, 0);
	await assert.rejects(resolveToolModule("invalid", loaders), /Invalid tool module/);
	assert.equal(loads, 1);
});

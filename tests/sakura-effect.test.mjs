import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { sakuraConfig } from "../src/config/sakuraConfig.ts";

const source = readFileSync(new URL("../src/components/features/SakuraEffect.astro", import.meta.url), "utf8");
const script = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];

function setup(continuous = false) {
	const frames = new Map();
	const canvases = new Set();
	const listeners = new Set();
	let nextFrame = 0;
	const ctx = Object.fromEntries(["save", "translate", "rotate", "drawImage", "restore", "clearRect"].map((key) => [key, () => {}]));
	const context = vm.createContext({
		sakuraConfig: structuredClone(sakuraConfig), sakuraImage: "/blog/assets/images/sakura.png",
		window: { innerWidth: 375, innerHeight: 800, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) },
		document: { createElement: () => ({ setAttribute() {}, getContext: () => ctx }), body: { appendChild: (c) => canvases.add(c), removeChild: (c) => canvases.delete(c) } },
		localStorage: { getItem: (key) => key === "sakuraContinuous" ? String(continuous) : null },
		Image: class { set src(_) { queueMicrotask(() => this.onload()); } },
		requestAnimationFrame: (fn) => { frames.set(++nextFrame, fn); return nextFrame; },
		cancelAnimationFrame: (id) => frames.delete(id),
	});
	// Inline scripts execute in Astro's generated scope; preserve the global owner across navigation.
	const run = () => vm.runInContext(`(() => { ${script} })()`, context);
	run();
	return { context, frames, canvases, listeners, run, tick() { const batch = [...frames.values()]; frames.clear(); for (const fn of batch) fn(); } };
}

const loaded = () => new Promise((resolve) => setImmediate(resolve));

test("one round drains naturally, releases resources and does not replay on navigation", async () => {
	assert.equal(sakuraConfig.limitTimes, 0);
	const env = setup();
	await loaded();
	const manager = env.context.window.__sakuraManager;
	let previousCount = manager.sakuraList.size();
	assert.equal(previousCount, sakuraConfig.sakuraNum);
	for (let frame = 0; frame < 10000 && manager.isRunning; frame++) {
		env.tick();
		const count = manager.sakuraList?.size() ?? 0;
		assert.ok(count <= previousCount);
		previousCount = count;
	}
	assert.equal(manager.isRunning, false);
	assert.equal(env.frames.size, 0);
	assert.equal(env.canvases.size, 0);
	assert.equal(env.listeners.size, 0);
	env.run();
	await loaded();
	assert.equal(env.context.window.__sakuraManager, manager);
	assert.equal(env.frames.size, 0);
});

test("continuous mode restarts after completion and switches off without clearing petals", async () => {
	const env = setup();
	await loaded();
	const manager = env.context.window.__sakuraManager;
	for (let frame = 0; frame < 10000 && manager.isRunning; frame++) env.tick();
	manager.updateConfig({ ...structuredClone(sakuraConfig), limitTimes: -1 });
	await loaded();
	for (let frame = 0; frame < 3000; frame++) env.tick();
	assert.equal(manager.sakuraList.size(), sakuraConfig.sakuraNum);
	const petals = [...manager.sakuraList.list];
	manager.updateConfig(structuredClone(sakuraConfig));
	assert.equal(manager.sakuraList.list[0], petals[0]);
	for (let frame = 0; frame < 10000 && manager.isRunning; frame++) env.tick();
	assert.equal(manager.isRunning, false);
	assert.equal(env.frames.size, 0);
});

test("stored continuous preference starts a looping effect", async () => {
	const env = setup(true);
	await loaded();
	const manager = env.context.window.__sakuraManager;
	assert.equal(manager.config.limitTimes, -1);
	for (let frame = 0; frame < 3000; frame++) env.tick();
	assert.equal(manager.sakuraList.size(), sakuraConfig.sakuraNum);
	manager.stop();
});

test("stopping during image loading prevents late initialization", async () => {
	const env = setup();
	env.context.window.__sakuraManager.stop();
	await loaded();
	assert.equal(env.canvases.size, 0);
	assert.equal(env.frames.size, 0);
	assert.equal(env.listeners.size, 0);
});

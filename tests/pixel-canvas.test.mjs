import assert from "node:assert/strict";
import { test } from "node:test";
import {
	cellAt,
	lineCells,
	PixelDrawing,
	pixelBounds,
	restorePixels,
	restoreView,
	serializePixels,
	zoomView,
} from "../src/features/other/pixel-canvas/model.ts";

test("fast strokes fill crossed cells, including negative coordinates", () => {
	assert.deepEqual(
		lineCells({ x: -2, y: 1 }, { x: 2, y: 1 }),
		[-2, -1, 0, 1, 2].map((x) => ({ x, y: 1 })),
	);
	assert.deepEqual(
		lineCells({ x: 3, y: 3 }, { x: 0, y: 0 }),
		[3, 2, 1, 0].map((x) => ({ x, y: x })),
	);
});
test("undo groups revisited cells and restores erased colors beyond the old matrix", () => {
	const d = new PixelDrawing();
	d.paint({ x: -5, y: 60 }, "#ff0000");
	d.paint({ x: 100, y: 2 }, "#ff0000");
	d.paint({ x: -5, y: 60 }, "#000000");
	d.commit();
	d.undo();
	assert.equal(d.pixels.size, 0);
	assert.equal(d.canUndo, false);
	d.paint({ x: 100, y: 2 }, "#ff0000");
	d.commit();
	d.paint({ x: 100, y: 2 }, null);
	d.commit();
	d.undo();
	assert.equal(d.pixels.get("100,2"), "#ff0000");
	d.paint({ x: 100, y: 2 }, "#ff0000");
	d.commit();
	d.undo();
	assert.equal(d.pixels.size, 0);
});
test("sparse cache roundtrips and migrates v1 drawings", () => {
	const d = new PixelDrawing();
	d.paint({ x: -31, y: 190 }, "#abcdef");
	assert.deepEqual(restorePixels(serializePixels(d.pixels)), d.pixels);
	assert.equal(restorePixels(null).size, 0);
	const old = Array(1024).fill(null);
	old[33] = "#ff8800";
	assert.deepEqual(
		[...restorePixels(JSON.stringify({ version: 1, size: 32, pixels: old }))],
		[["1,1", "#ff8800"]],
	);
	for (const raw of [
		"{",
		"null",
		'{"version":3}',
		'{"version":2,"pixels":[[0,0,"red"]]}',
		'{"version":2,"pixels":[[0.5,0,"#ffffff"]]}',
		'{"version":2,"pixels":[[0,0]]}',
	])
		assert.throws(() => restorePixels(raw));
});
test("undo commits interrupted strokes and retains latest 100 operations", () => {
	const d = new PixelDrawing();
	for (let i = 0; i < 101; i++) {
		d.paint({ x: i, y: 0 }, "#112233");
		d.commit();
	}
	for (let i = 0; i < 100; i++) assert.equal(d.undo(), true);
	assert.equal(d.undo(), false);
	assert.equal(d.pixels.get("0,0"), "#112233");
	d.paint({ x: 200, y: 2 }, "#ffffff");
	d.undo();
	assert.equal(d.pixels.has("200,2"), false);
});
test("zoom reveals more cells without changing drawing coordinates or center", () => {
	const view = { x: 0, y: 0, size: 20 };
	const smaller = zoomView(view, 10, 400, 200);
	assert.deepEqual(cellAt(view, 400, 200), cellAt(smaller, 400, 200));
	assert.equal(800 / smaller.size, 2 * (800 / view.size));
	assert.deepEqual(zoomView(smaller, 20, 400, 200), view);
	assert.deepEqual(cellAt({ x: -0.5, y: -0.5, size: 10 }, 0, 0), {
		x: -1,
		y: -1,
	});
});
test("export bounds include offscreen cells and contract after erasure", () => {
	const d = new PixelDrawing();
	assert.equal(pixelBounds(d.pixels), null);
	d.paint({ x: -4, y: -7 }, "#ffffff");
	d.paint({ x: 100, y: 2 }, "#222222");
	assert.deepEqual(pixelBounds(d.pixels), {
		left: -4,
		top: -7,
		width: 105,
		height: 10,
	});
	d.paint({ x: 100, y: 2 }, null);
	assert.deepEqual(pixelBounds(d.pixels), {
		left: -4,
		top: -7,
		width: 1,
		height: 1,
	});
});

test("cache restores the viewport so offscreen drawings remain reachable after reload", () => {
	const view = { x: -120.5, y: 300.25, size: 16 };
	assert.deepEqual(restoreView(serializePixels(new Map(), view)), view);
	assert.deepEqual(restoreView(null), { x: 0, y: 0, size: 20 });
	assert.deepEqual(restoreView('{"view":{"x":0,"y":0,"size":0}}'), {
		x: 0,
		y: 0,
		size: 20,
	});
});

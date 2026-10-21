import assert from "node:assert/strict";
import { test } from "node:test";
import { createInput, hitPad, keyNotes, midiNote, pads, padPolygon, padPosition, isSharp } from "../src/features/other/stylophone/input.ts";

test("all semitones and octave boundaries map to MIDI notes", () => {
	for (const octave of [-1, 0, 1]) for (let i = 0; i < pads.length; i++) assert.equal(midiNote(i, octave), 57 + octave * 12 + i);
	assert.equal(midiNote(keyNotes.get("w"), 0), 61);
	assert.equal(midiNote(keyNotes.get("k"), 1), 84);
	assert.throws(() => midiNote(20, 0), RangeError);
});
test("metal contact respects short pads, gaps and outside edges", () => {
	const pads = [{ index: 0, left: 0, right: 40, top: 0, bottom: 140 }, { index: 1, left: 44, right: 84, top: 40, bottom: 140 }];
	assert.equal(hitPad(20, 20, pads), 0);
	assert.equal(hitPad(60, 20, pads), null);
	assert.equal(hitPad(60, 50, pads), 1);
	assert.equal(hitPad(42, 60, pads), null);
	assert.equal(hitPad(20, 140, pads), null);
});
test("last keyboard note wins and release restores held note", () => {
	const input = createInput();
	assert.equal(input.press("KeyA", 0), true);
	assert.equal(input.press("KeyA", 0), false);
	input.press("KeyS", 2);
	assert.equal(input.current(), 2);
	input.lift("KeyS"); assert.equal(input.current(), 0);
	input.clear(); assert.equal(input.current(), null);
});
test("pointer takeover rejects competing pointers and stale releases", () => {
	const input = createInput(); input.press("KeyA", 0);
	assert.equal(input.claim(1), true); assert.equal(input.current(), null);
	assert.equal(input.claim(2), false); assert.equal(input.press("KeyS", 2), false);
	assert.equal(input.release(2), false); assert.equal(input.owns(1), true);
	assert.equal(input.release(1), true); input.claim(3);
	assert.equal(input.release(1), false); assert.equal(input.owns(3), true);
	input.clear(); assert.equal(input.owns(3), false);
});

test("S-1 layout interlocks twelve natural and eight upper contact pads", () => {
	assert.equal(pads.length, 20);
	assert.equal(pads.filter((_, i) => !isSharp(i)).length, 12);
	assert.equal(midiNote(0, 0), 57); // A3
	assert.equal(midiNote(19, 0), 76); // E5
	assert.equal(padPosition(0, 0), 0);
	assert.ok(Math.abs(padPosition(1, 0) - .59) < 1e-12);
	assert.equal(padPosition(2, 0), 1);
	const rects = [
		{ index: 0, left: 0, right: 100, top: 0, bottom: 160, polygon: padPolygon(0) },
		{ index: 1, left: 59, right: 141, top: 0, bottom: 68.8, polygon: padPolygon(1) },
		{ index: 2, left: 100, right: 200, top: 0, bottom: 160, polygon: padPolygon(2) },
	];
	assert.equal(hitPad(80, 20, rects), 1); // Not the natural pad's bounding box
	assert.equal(hitPad(80, 110, rects), 0);
	assert.equal(hitPad(120, 20, rects), 1);
	assert.equal(hitPad(120, 110, rects), 2);
	assert.equal(hitPad(59.5, 68, rects), 0); // Rounded corner meets the neighbouring pad
	assert.equal(hitPad(140.5, 68, rects), 2);
	assert.equal(hitPad(100, 68, rects), 1);
	// There must be no exposed triangular holes alongside the upper pad's lower corners.
	for (let x = 55; x < 145; x += .5) {
		for (let y = 60; y < 70; y += .5) assert.notEqual(hitPad(x, y, rects), null);
	}
	assert.equal(hitPad(201, 110, rects), null);
});
test("range reset permits a fresh mouse contact and clears stale keyboard ownership", () => {
	const input = createInput();
	input.press("KeyA", 3);
	input.claim(1);
	input.clear(); // Range change while the mouse was captured
	assert.equal(input.owns(1), false);
	assert.equal(input.current(), null);
	assert.equal(input.claim(1), true); // Browsers reuse the mouse pointer ID
	assert.equal(input.lift("KeyA"), false);
	assert.equal(input.owns(1), true);
	assert.equal(input.release(1), true);
	assert.equal(input.press("KeyA", 3), true);
});

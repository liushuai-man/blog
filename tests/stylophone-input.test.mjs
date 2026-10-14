import assert from "node:assert/strict";
import { test } from "node:test";
import { createInput, hitPad, keyNotes, midiNote } from "../src/features/other/stylophone/input.ts";

test("all semitones and octave boundaries map to MIDI notes", () => {
	for (const octave of [-1, 0, 1]) for (let i = 0; i <= 12; i++) assert.equal(midiNote(i, octave), 60 + octave * 12 + i);
	assert.equal(midiNote(keyNotes.get("w"), 0), 61);
	assert.equal(midiNote(keyNotes.get("k"), 1), 84);
	assert.throws(() => midiNote(13, 0), RangeError);
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

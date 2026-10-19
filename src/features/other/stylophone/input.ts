// S-1 contact layout: A–E, twelve natural pads and eight accidentals.
export const pads = ["A", "A♯", "B", "C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B", "C", "C♯", "D", "D♯", "E"];
export const shortcuts = ["Z", "X", "C", "A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K", "O", "L", "P", ";"];
export const keyNotes = new Map(shortcuts.map((key, index) => [key.toLowerCase(), index]));
export const isSharp = (index: number) => pads[index]?.includes("♯") ?? false;
export function midiNote(index: number, octave: number) {
	if (!Number.isInteger(index) || index < 0 || index >= pads.length || ![-1, 0, 1].includes(octave)) throw new RangeError("Invalid note");
	return 57 + octave * 12 + index;
}
export type PadPoint = readonly [number, number];
export interface PadRect { index: number; left: number; right: number; top: number; bottom: number; polygon?: readonly PadPoint[] }
// The upper contact and its two neighbouring cutouts share one rounded corner.
// Coordinates are mapped into the natural pad's .82-width / .43-height notch.
const contactCorner: readonly PadPoint[] = [[0, .935], [.002, .96], [.012, .98], [.034, .995], [.065, 1]];
export function padPolygon(index: number): readonly PadPoint[] {
	if (isSharp(index)) return [
		[0, 0], [1, 0],
		...contactCorner.map(([x, y]): PadPoint => [1 - x, y]),
		...[...contactCorner].reverse(),
	];
	const left = isSharp(index - 1) ? .41 : 0;
	const right = isSharp(index + 1) ? .59 : 1;
	return [
		[left, 0], [right, 0],
		...(right < 1 ? contactCorner.map(([x, y]): PadPoint => [right + x * .82, y * .43]) : []),
		[1, .43], [1, 1], [0, 1], [0, .43],
		...(left > 0 ? [...contactCorner].reverse().map(([x, y]): PadPoint => [left - x * .82, y * .43]) : []),
	];
}
export function padPosition(index: number, first: number) {
	let column = 0;
	for (let i = first; i < index; i++) if (!isSharp(i)) column++;
	return isSharp(index) ? column - .41 : column;
}
function contains(x: number, y: number, polygon: readonly PadPoint[]) {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j];
		if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}
export function hitPad(x: number, y: number, rects: PadRect[]) {
	return rects.find((rect) => x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom && (!rect.polygon || contains((x - rect.left) / (rect.right - rect.left), (y - rect.top) / (rect.bottom - rect.top), rect.polygon)))?.index ?? null;
}
export function createInput() {
	let pointer: number | null = null;
	const held = new Map<string, number>();
	return {
		claim(id: number) { if (pointer !== null) return false; held.clear(); pointer = id; return true; },
		owns(id: number) { return pointer === id; },
		release(id: number) { if (pointer !== id) return false; pointer = null; return true; },
		press(key: string, note: number) { if (pointer !== null || held.has(key)) return false; held.set(key, note); return true; },
		lift(key: string) { return held.delete(key); },
		current() { return [...held.values()].at(-1) ?? null; },
		clear() { pointer = null; held.clear(); },
	};
}

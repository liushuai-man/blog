export const pads = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B", "C"];
export const shortcuts = ["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K"];
export const keyNotes = new Map(shortcuts.map((key, index) => [key.toLowerCase(), index]));
export const isSharp = (index: number) => [1, 3, 6, 8, 10].includes(index);
export function midiNote(index: number, octave: number) {
	if (!Number.isInteger(index) || index < 0 || index > 12 || ![-1, 0, 1].includes(octave)) throw new RangeError("Invalid note");
	return 60 + octave * 12 + index;
}
export interface PadRect { index: number; left: number; right: number; top: number; bottom: number }
export function hitPad(x: number, y: number, rects: PadRect[]) {
	return rects.find((rect) => x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom)?.index ?? null;
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

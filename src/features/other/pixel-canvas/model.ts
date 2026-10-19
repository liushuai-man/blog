export const STORAGE_KEY = "blog:pixel-canvas:v1";
export type Pixel = string | null;
export type Cell = { x: number; y: number };
export type View = { x: number; y: number; size: number };
type Change = { key: string; before: Pixel; after: Pixel };
const validColor = (value: unknown): value is string =>
	typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
export const cellKey = ({ x, y }: Cell) => `${x},${y}`;

export function restorePixels(raw: string | null): Map<string, string> {
	const pixels = new Map<string, string>();
	if (!raw) return pixels;
	const data = JSON.parse(raw);
	// Preserve drawings from the original fixed matrix.
	if (
		data?.version === 1 &&
		data.size === 32 &&
		Array.isArray(data.pixels) &&
		data.pixels.length === 1024 &&
		data.pixels.every((p: unknown) => p === null || validColor(p))
	) {
		data.pixels.forEach((color: Pixel, i: number) => {
			if (color) pixels.set(`${i % 32},${Math.floor(i / 32)}`, color);
		});
		return pixels;
	}
	if (data?.version !== 2 || !Array.isArray(data.pixels))
		throw new Error("Invalid pixel canvas cache");
	for (const entry of data.pixels) {
		if (
			!Array.isArray(entry) ||
			entry.length !== 3 ||
			!Number.isSafeInteger(entry[0]) ||
			!Number.isSafeInteger(entry[1]) ||
			!validColor(entry[2])
		)
			throw new Error("Invalid pixel canvas cache");
		pixels.set(`${entry[0]},${entry[1]}`, entry[2]);
	}
	return pixels;
}

export function restoreView(raw: string | null): View {
	const view = raw ? JSON.parse(raw)?.view : null;
	return view &&
		Number.isFinite(view.x) &&
		Number.isFinite(view.y) &&
		Math.abs(view.x) < Number.MAX_SAFE_INTEGER &&
		Math.abs(view.y) < Number.MAX_SAFE_INTEGER &&
		Number.isFinite(view.size) &&
		view.size >= 4 &&
		view.size <= 96
		? { x: view.x, y: view.y, size: view.size }
		: { x: 0, y: 0, size: 20 };
}

export function serializePixels(
	pixels: Map<string, string>,
	view?: View,
): string {
	return JSON.stringify({
		version: 2,
		view,
		pixels: [...pixels].map(([key, color]) => [
			...key.split(",").map(Number),
			color,
		]),
	});
}

export function cellAt(view: View, x: number, y: number): Cell {
	return {
		x: Math.floor(view.x + x / view.size),
		y: Math.floor(view.y + y / view.size),
	};
}

export function zoomView(
	view: View,
	size: number,
	anchorX: number,
	anchorY: number,
): View {
	return {
		x: view.x + anchorX / view.size - anchorX / size,
		y: view.y + anchorY / view.size - anchorY / size,
		size,
	};
}

export function pixelBounds(pixels: Map<string, string>) {
	if (!pixels.size) return null;
	let left = Number.POSITIVE_INFINITY;
	let top = Number.POSITIVE_INFINITY;
	let right = Number.NEGATIVE_INFINITY;
	let bottom = Number.NEGATIVE_INFINITY;
	for (const key of pixels.keys()) {
		const [x, y] = key.split(",").map(Number);
		left = Math.min(left, x);
		top = Math.min(top, y);
		right = Math.max(right, x);
		bottom = Math.max(bottom, y);
	}
	return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export function lineCells(from: Cell, to: Cell): Cell[] {
	const cells: Cell[] = [];
	let { x, y } = from;
	const dx = Math.abs(to.x - x);
	const dy = -Math.abs(to.y - y);
	const sx = x < to.x ? 1 : -1;
	const sy = y < to.y ? 1 : -1;
	let error = dx + dy;
	while (true) {
		cells.push({ x, y });
		if (x === to.x && y === to.y) return cells;
		const twice = 2 * error;
		if (twice >= dy) {
			error += dy;
			x += sx;
		}
		if (twice <= dx) {
			error += dx;
			y += sy;
		}
	}
}

export class PixelDrawing {
	pixels: Map<string, string>;
	private stroke = new Map<string, Change>();
	private history: Change[][] = [];
	constructor(pixels = new Map<string, string>()) {
		this.pixels = new Map(pixels);
	}
	get canUndo() {
		return this.history.length > 0;
	}
	paint(cell: Cell, color: Pixel) {
		if (!Number.isSafeInteger(cell.x) || !Number.isSafeInteger(cell.y))
			return false;
		const key = cellKey(cell);
		const current = this.pixels.get(key) ?? null;
		if (current === color) return false;
		const original = this.stroke.get(key);
		this.stroke.set(key, {
			key,
			before: original ? original.before : current,
			after: color,
		});
		if (color) this.pixels.set(key, color);
		else this.pixels.delete(key);
		return true;
	}
	commit() {
		const changes = [...this.stroke.values()].filter(
			({ before, after }) => before !== after,
		);
		if (changes.length) {
			this.history.push(changes);
			if (this.history.length > 100) this.history.shift();
		}
		this.stroke.clear();
	}
	undo() {
		this.commit();
		const changes = this.history.pop();
		if (!changes) return false;
		for (const { key, before } of changes) {
			if (before) this.pixels.set(key, before);
			else this.pixels.delete(key);
		}
		return true;
	}
}

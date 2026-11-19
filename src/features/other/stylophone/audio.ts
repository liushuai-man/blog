export interface StylophoneAudio {
	play(midi: number): void;
	stop(): void;
	volume(value: number): void;
	vibrato(enabled: boolean): void;
	dispose(): void;
}

// Tone's entry point creates a default context on import. This module is its
// only consumer; close that unused context, including when import finishes after unmount.
let defaultContextReleased = false;

export async function createAudio(valid: () => boolean, signal: AbortSignal): Promise<StylophoneAudio | null> {
	const Tone = await import("tone");
	if (!defaultContextReleased) { Tone.getContext().dispose(); defaultContextReleased = true; }
	if (!valid() || signal.aborted) return null;
	const context = new Tone.Context({ latencyHint: "interactive" });
	let synth: InstanceType<typeof Tone.Synth> | undefined;
	let output: InstanceType<typeof Tone.Gain> | undefined;
	let lfo: InstanceType<typeof Tone.LFO> | undefined;
	let disposed = false;
	const dispose = () => {
		if (disposed) return;
		disposed = true;
		lfo?.dispose(); synth?.dispose(); output?.dispose();
		context.dispose();
	};
	let finishAbort: (() => void) | undefined;
	const abort = () => { dispose(); finishAbort?.(); };
	signal.addEventListener("abort", abort, { once: true });
	try {
		await Promise.race([context.resume(), new Promise<void>((resolve) => { finishAbort = resolve; })]);
		if (!valid() || signal.aborted) { dispose(); return null; }
		output = new Tone.Gain({ context, gain: 0 }).toDestination();
		synth = new Tone.Synth({ context, oscillator: { type: "square" }, envelope: { attack: 0.008, decay: 0.04, sustain: 0.65, release: 0.015 } }).connect(output);
		lfo = new Tone.LFO({ context, frequency: 5, min: -12, max: 12 }).connect(synth.detune);
		let level = 0.5;
		let active: number | null = null;
		let wobble = false;
		const gainValue = () => level * 0.18;
		// Keep the output level on its own short ramp. Notes are started and
		// released by the synth envelope, so changing volume, muting or an
		// octave/shared control never cuts the waveform at a non-zero sample.
		const setLevel = (ramp = 0.02) => {
			if (disposed) return;
			const now = context.now();
			output?.gain.rampTo(gainValue(), ramp, now);
		};
		const stop = () => {
			if (disposed) return;
			if (active !== null) synth!.triggerRelease(context.now());
			lfo!.stop(); synth!.detune.value = 0; active = null;
		};
		return {
			play(midi) {
				if (disposed || active === midi) return;
				const frequency = 440 * 2 ** ((midi - 69) / 12);
				if (active === null) synth!.triggerAttack(frequency, context.now());
				else synth!.setNote(frequency, context.now());
				active = midi;
				if (wobble) lfo!.start();
			},
			stop,
			volume(value) { level = Math.min(1, Math.max(0, value)); setLevel(); },
			vibrato(enabled) { wobble = enabled; if (disposed) return; if (enabled && active !== null) lfo!.start(); else { lfo!.stop(); synth!.detune.value = 0; } },
			dispose,
		};
	} catch (error) { dispose(); if (signal.aborted) return null; throw error; }
	finally { signal.removeEventListener("abort", abort); }
}

import { beforeEach, describe, expect, it } from "vitest";
import {
	createEffectPreset,
	loadDefaultPresetSettings,
	loadEffectPresetStore,
	saveEffectPresetStore,
} from "./effectPresets";

const SAMPLE = {
	shadowIntensity: 0.5,
	borderRadius: 12,
	padding: 60,
	motionBlurAmount: 0.2,
	showBlur: true,
	wallpaper: "/wallpapers/wallpaper3.jpg",
};

describe("effect presets", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("ships the Screen Studio builtin as the default when nothing is stored", () => {
		const store = loadEffectPresetStore();
		expect(store.presets.map((p) => p.id)).toContain("builtin-screen-studio");
		expect(store.defaultPresetId).toBe("builtin-screen-studio");
		const settings = loadDefaultPresetSettings();
		expect(settings?.shadowIntensity).toBeGreaterThan(0);
		expect(settings?.borderRadius).toBeGreaterThan(0);
	});

	it("round-trips a user preset and its default selection", () => {
		const preset = createEffectPreset("  My Look  ", SAMPLE);
		expect(preset.name).toBe("My Look");
		const store = loadEffectPresetStore();
		saveEffectPresetStore({ presets: [...store.presets, preset], defaultPresetId: preset.id });

		const reloaded = loadEffectPresetStore();
		expect(reloaded.defaultPresetId).toBe(preset.id);
		expect(loadDefaultPresetSettings()).toEqual(SAMPLE);
	});

	it("clamps out-of-range stored values instead of trusting them", () => {
		const preset = createEffectPreset("Wild", { ...SAMPLE, shadowIntensity: 5, padding: -3 });
		saveEffectPresetStore({ presets: [preset], defaultPresetId: preset.id });
		const settings = loadDefaultPresetSettings();
		expect(settings?.shadowIntensity).toBe(1);
		expect(settings?.padding).toBe(0);
	});

	it("falls back to the builtin default when the stored default was deleted", () => {
		saveEffectPresetStore({ presets: [], defaultPresetId: "preset-missing" });
		expect(loadEffectPresetStore().defaultPresetId).toBe("builtin-screen-studio");
	});
});

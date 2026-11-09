import {
	DEFAULT_EDITOR_APPEARANCE_SETTINGS,
	DEFAULT_EDITOR_LAYOUT_SETTINGS,
} from "@/components/video-editor/editorDefaults";
import { DEFAULT_WALLPAPER } from "@/lib/wallpaper";

/**
 * Named Video Effects presets. A preset captures the framing look of the
 * recording (shadow, roundness, padding, motion blur, background blur and
 * wallpaper) so it can be re-applied in one click. One preset can be marked
 * as the default; it is applied automatically to every new recording.
 * User presets persist in localStorage under a dedicated key.
 */

export interface EffectPresetSettings {
	shadowIntensity: number;
	borderRadius: number;
	padding: number;
	motionBlurAmount: number;
	showBlur: boolean;
	wallpaper: string;
}

export interface EffectPreset {
	id: string;
	name: string;
	builtin: boolean;
	settings: EffectPresetSettings;
}

export interface EffectPresetStore {
	presets: EffectPreset[];
	defaultPresetId: string | null;
}

const PRESETS_KEY = "openscreen_effect_presets_v1";

export const BUILTIN_PRESETS: EffectPreset[] = [
	{
		id: "builtin-screen-studio",
		name: "Screen Studio",
		builtin: true,
		settings: {
			shadowIntensity: DEFAULT_EDITOR_APPEARANCE_SETTINGS.shadowIntensity,
			borderRadius: DEFAULT_EDITOR_APPEARANCE_SETTINGS.borderRadius,
			padding: DEFAULT_EDITOR_LAYOUT_SETTINGS.padding,
			motionBlurAmount: DEFAULT_EDITOR_APPEARANCE_SETTINGS.motionBlurAmount,
			showBlur: DEFAULT_EDITOR_APPEARANCE_SETTINGS.showBlur,
			wallpaper: DEFAULT_WALLPAPER,
		},
	},
	{
		id: "builtin-flat",
		name: "Flat",
		builtin: true,
		settings: {
			shadowIntensity: 0,
			borderRadius: 0,
			padding: DEFAULT_EDITOR_LAYOUT_SETTINGS.padding,
			motionBlurAmount: 0,
			showBlur: false,
			wallpaper: DEFAULT_WALLPAPER,
		},
	},
];

const DEFAULT_STORE: EffectPresetStore = {
	presets: [],
	defaultPresetId: "builtin-screen-studio",
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value)
		? Math.min(max, Math.max(min, value))
		: fallback;
}

function sanitizeSettings(raw: unknown): EffectPresetSettings | null {
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Record<string, unknown>;
	const fallback = BUILTIN_PRESETS[0].settings;
	return {
		shadowIntensity: clamp(r.shadowIntensity, 0, 1, fallback.shadowIntensity),
		borderRadius: clamp(r.borderRadius, 0, 64, fallback.borderRadius),
		padding: clamp(r.padding, 0, 100, fallback.padding),
		motionBlurAmount: clamp(r.motionBlurAmount, 0, 1, fallback.motionBlurAmount),
		showBlur: typeof r.showBlur === "boolean" ? r.showBlur : fallback.showBlur,
		wallpaper:
			typeof r.wallpaper === "string" && r.wallpaper.length > 0 ? r.wallpaper : fallback.wallpaper,
	};
}

function sanitizePreset(raw: unknown): EffectPreset | null {
	if (!raw || typeof raw !== "object") return null;
	const r = raw as Record<string, unknown>;
	if (typeof r.id !== "string" || typeof r.name !== "string" || r.name.trim().length === 0) {
		return null;
	}
	const settings = sanitizeSettings(r.settings);
	if (!settings) return null;
	return { id: r.id, name: r.name, builtin: false, settings };
}

/** All presets (built-ins first, then the user's) plus the default id. */
export function loadEffectPresetStore(): EffectPresetStore {
	let raw: Record<string, unknown> | null = null;
	try {
		const text = localStorage.getItem(PRESETS_KEY);
		raw = text ? (JSON.parse(text) as Record<string, unknown>) : null;
	} catch {
		raw = null;
	}
	if (!raw || typeof raw !== "object") {
		return { presets: [...BUILTIN_PRESETS], defaultPresetId: DEFAULT_STORE.defaultPresetId };
	}
	const userPresets = Array.isArray(raw.presets)
		? (raw.presets.map(sanitizePreset).filter(Boolean) as EffectPreset[])
		: [];
	const presets = [...BUILTIN_PRESETS, ...userPresets];
	const requestedDefault =
		typeof raw.defaultPresetId === "string" ? raw.defaultPresetId : DEFAULT_STORE.defaultPresetId;
	return {
		presets,
		defaultPresetId: presets.some((p) => p.id === requestedDefault)
			? requestedDefault
			: DEFAULT_STORE.defaultPresetId,
	};
}

export function saveEffectPresetStore(store: EffectPresetStore): void {
	try {
		localStorage.setItem(
			PRESETS_KEY,
			JSON.stringify({
				presets: store.presets.filter((p) => !p.builtin),
				defaultPresetId: store.defaultPresetId,
			}),
		);
	} catch {
		// Storage can be unavailable (private mode, quota); presets just won't persist.
	}
}

export function createEffectPreset(name: string, settings: EffectPresetSettings): EffectPreset {
	return {
		id: `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		name: name.trim(),
		builtin: false,
		settings: { ...settings },
	};
}

/** Settings of the preset marked as default, or null when none is set. */
export function loadDefaultPresetSettings(): EffectPresetSettings | null {
	const store = loadEffectPresetStore();
	if (!store.defaultPresetId) return null;
	const preset = store.presets.find((p) => p.id === store.defaultPresetId);
	return preset ? { ...preset.settings } : null;
}

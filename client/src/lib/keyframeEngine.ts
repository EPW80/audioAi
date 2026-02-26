/**
 * Keyframe interpolation engine for smooth transitions between visual states.
 * Supports linear and easing interpolation with color blending.
 */

import type { Keyframe, VisualStyle } from "../types";

export type EasingFunction = "linear" | "easeIn" | "easeOut" | "easeInOut";

export interface InterpolatedState {
  style: VisualStyle;
  nextStyle: VisualStyle | null;
  styleBlend: number; // 0 = current style, 1 = next style (for crossfade)
  particleCount: number;
  colorPalette: string[];
  intensity: number;
}

// Easing functions
const easings: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

/**
 * Parse hex color to RGB components
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")
  );
}

/**
 * Interpolate between two colors
 */
function interpolateColor(color1: string, color2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/**
 * Interpolate between two color palettes
 */
function interpolatePalette(
  palette1: string[],
  palette2: string[],
  t: number,
): string[] {
  const maxLen = Math.max(palette1.length, palette2.length);
  const result: string[] = [];

  for (let i = 0; i < maxLen; i++) {
    const c1 = palette1[i % palette1.length];
    const c2 = palette2[i % palette2.length];
    result.push(interpolateColor(c1, c2, t));
  }

  return result;
}

/**
 * Interpolate a numeric value
 */
function interpolateNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Get sorted keyframes with first keyframe at time 0 if needed
 */
function getSortedKeyframes(keyframes: Keyframe[]): Keyframe[] {
  if (keyframes.length === 0) return [];

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // If no keyframe at time 0, add one based on first keyframe
  if (sorted[0].time > 0) {
    sorted.unshift({
      ...sorted[0],
      time: 0,
    });
  }

  return sorted;
}

/**
 * Find the two keyframes surrounding the given time
 */
function findSurroundingKeyframes(
  keyframes: Keyframe[],
  time: number,
): { prev: Keyframe | null; next: Keyframe | null; t: number } {
  const sorted = getSortedKeyframes(keyframes);

  if (sorted.length === 0) {
    return { prev: null, next: null, t: 0 };
  }

  // Before first keyframe
  if (time <= sorted[0].time) {
    return { prev: sorted[0], next: null, t: 0 };
  }

  // After last keyframe
  if (time >= sorted[sorted.length - 1].time) {
    return { prev: sorted[sorted.length - 1], next: null, t: 0 };
  }

  // Find surrounding keyframes
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time < sorted[i + 1].time) {
      const duration = sorted[i + 1].time - sorted[i].time;
      const elapsed = time - sorted[i].time;
      const t = duration > 0 ? elapsed / duration : 0;
      return { prev: sorted[i], next: sorted[i + 1], t };
    }
  }

  return { prev: sorted[sorted.length - 1], next: null, t: 0 };
}

/**
 * Get interpolated visual state at a given time
 */
export function getInterpolatedState(
  keyframes: Keyframe[],
  time: number,
  easing: EasingFunction = "easeInOut",
  transitionDuration: number = 0.5, // seconds for style crossfade
): InterpolatedState | null {
  if (keyframes.length === 0) {
    return null;
  }

  const { prev, next, t } = findSurroundingKeyframes(keyframes, time);

  if (!prev) {
    return null;
  }

  // No interpolation needed - just return prev state
  if (!next) {
    return {
      style: prev.style as VisualStyle,
      nextStyle: null,
      styleBlend: 0,
      particleCount: prev.settings.particleCount,
      colorPalette: prev.settings.colorPalette,
      intensity: prev.settings.intensity,
    };
  }

  const easedT = easings[easing](t);

  // Check if styles are different (needs crossfade)
  const stylesMatch = prev.style === next.style;

  // Calculate style blend for crossfade
  // Only blend styles within transitionDuration of the next keyframe
  let styleBlend = 0;
  if (!stylesMatch) {
    const timeToNext = next.time - time;
    if (timeToNext <= transitionDuration) {
      styleBlend = 1 - timeToNext / transitionDuration;
    }
  }

  return {
    style: prev.style as VisualStyle,
    nextStyle: stylesMatch ? null : (next.style as VisualStyle),
    styleBlend,
    particleCount: Math.round(
      interpolateNumber(
        prev.settings.particleCount,
        next.settings.particleCount,
        easedT,
      ),
    ),
    colorPalette: interpolatePalette(
      prev.settings.colorPalette,
      next.settings.colorPalette,
      easedT,
    ),
    intensity: interpolateNumber(
      prev.settings.intensity,
      next.settings.intensity,
      easedT,
    ),
  };
}

/**
 * Get the active keyframe index for a given time (for UI highlighting)
 */
export function getActiveKeyframeIndex(
  keyframes: Keyframe[],
  time: number,
): number {
  if (keyframes.length === 0) return -1;

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  let activeIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].time <= time) {
      activeIdx = i;
    }
  }

  return activeIdx;
}

/**
 * Snap time to nearest beat
 */
export function snapToBeat(
  time: number,
  beats: number[],
  threshold: number = 0.1,
): number {
  if (beats.length === 0) return time;

  let nearest = beats[0];
  let minDist = Math.abs(time - nearest);

  for (const beat of beats) {
    const dist = Math.abs(time - beat);
    if (dist < minDist) {
      minDist = dist;
      nearest = beat;
    }
  }

  return minDist <= threshold ? nearest : time;
}

/**
 * Generate keyframes at beat times with alternating styles
 */
export function generateBeatKeyframes(
  beats: number[],
  styles: VisualStyle[],
  baseSettings: {
    particleCount: number;
    colorPalette: string[];
    intensity: number;
  },
): Keyframe[] {
  return beats.map((beat, i) => ({
    time: beat,
    style: styles[i % styles.length],
    settings: { ...baseSettings },
  }));
}

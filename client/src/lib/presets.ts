import type { VisualStyle, ProjectSettings } from "../types";

export interface Preset {
  id: VisualStyle;
  name: string;
  description: string;
  defaultSettings: Omit<ProjectSettings, "resolution">;
}

export const PRESETS: Preset[] = [
  {
    id: "particles",
    name: "Particles",
    description: "Spherical burst of particles that pulse to the bass",
    defaultSettings: {
      style: "particles",
      particleCount: 2000,
      colorPalette: ["#4F46E5", "#7C3AED", "#EC4899"],
      intensity: 1.0,
    },
  },
  {
    id: "waveform",
    name: "Waveform",
    description: "3D equalizer bars that scale with the frequency spectrum",
    defaultSettings: {
      style: "waveform",
      particleCount: 64,
      colorPalette: ["#06B6D4", "#0EA5E9", "#38BDF8"],
      intensity: 1.0,
    },
  },
  {
    id: "nebula",
    name: "Nebula",
    description: "Soft space-cloud glow that breathes with the music",
    defaultSettings: {
      style: "nebula",
      particleCount: 3000,
      colorPalette: ["#8B5CF6", "#A78BFA", "#C4B5FD"],
      intensity: 0.8,
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Neon grid that ripples with mid-frequencies",
    defaultSettings: {
      style: "cyberpunk",
      particleCount: 1000,
      colorPalette: ["#F0ABFC", "#22D3EE", "#4ADE80"],
      intensity: 1.2,
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Flowing color ribbons driven by treble frequencies",
    defaultSettings: {
      style: "aurora",
      particleCount: 2500,
      colorPalette: ["#34D399", "#6EE7B7", "#A7F3D0"],
      intensity: 0.9,
    },
  },
  {
    id: "fractal",
    name: "Fractal",
    description: "Mandelbrot fractals that zoom and morph with the beat",
    defaultSettings: {
      style: "fractal",
      particleCount: 1000,
      colorPalette: ["#F59E0B", "#EF4444", "#8B5CF6"],
      intensity: 1.0,
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Rolling ocean waves driven by bass frequencies",
    defaultSettings: {
      style: "ocean",
      particleCount: 1000,
      colorPalette: ["#0369A1", "#0EA5E9", "#7DD3FC"],
      intensity: 1.0,
    },
  },
];

export function getPreset(id: VisualStyle): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

// Client-side type definitions

export type VisualStyle =
  | "particles"
  | "waveform"
  | "nebula"
  | "cyberpunk"
  | "aurora"
  | "fractal"
  | "ocean";

export interface User {
  id: string;
  email: string;
}

export interface Keyframe {
  time: number;
  style: VisualStyle;
  settings: {
    particleCount: number;
    colorPalette: string[];
    intensity: number;
  };
}

export interface ProjectSettings {
  particleCount: number;
  colorPalette: string[];
  intensity: number;
  style: VisualStyle;
  resolution: "720p" | "1080p";
}

export interface AIStyleSuggestion {
  styleId: VisualStyle;
  score: number;
  explanation: string;
  suggestedPrompt: string;
  suggestedPalette: string[];
}

export interface AISettings {
  mode: 'procedural' | 'ai-hybrid';
  sdPrompt: string;
  sdNegativePrompt: string;
  sdModel: string;
  styleSuggestions?: AIStyleSuggestion[];
  generatedImageIds?: string[];
}

export interface Project {
  _id: string;
  name: string;
  audioPath: string;
  status:
    | "uploaded"
    | "analyzing"
    | "ready"
    | "rendering"
    | "complete"
    | "failed";
  outputPath?: string;
  settings: ProjectSettings;
  keyframes: Keyframe[];
  aiSettings?: AISettings;
  createdAt: string;
  updatedAt: string;
}

export interface AudioAnalysisData {
  bass: number;
  mid: number;
  treble: number;
  volume: number;
  frequencies: Uint8Array | null;
  isBeat: boolean;
}

export interface AudioMetadata {
  duration: number;
  bpm?: number;
  format?: string;
  sampleRate?: number;
  channels?: number;
  beats?: number[];
  onsets?: number[];
  peaks?: number[];
}

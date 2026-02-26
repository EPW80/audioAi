// Shared types between client and server

export interface User {
  id: string;
  email: string;
}

export interface AudioMetadata {
  duration: number;
  bpm?: number;
  format: string;
  sampleRate: number;
  channels: number;
  beats?: number[];
  onsets?: number[];
  peaks?: number[];
}

export interface ProjectSettings {
  particleCount: number;
  colorPalette: string[];
  intensity: number;
}

export interface AIStyleSuggestion {
  styleId: string;
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
  userId: string;
  name: string;
  audioPath: string;
  audioMetadata?: AudioMetadata;
  status:
    | "uploaded"
    | "analyzing"
    | "ready"
    | "rendering"
    | "complete"
    | "failed";
  outputPath?: string;
  settings: ProjectSettings;
  aiSettings?: AISettings;
  createdAt: string;
  updatedAt: string;
}

export interface RenderJob {
  id: string;
  state: "waiting" | "active" | "completed" | "failed" | "delayed";
  progress: number;
  stage: "queued" | "processing" | "ai-generating" | "encoding" | "complete" | "failed";
  failedReason?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}

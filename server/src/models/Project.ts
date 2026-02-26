import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAudioMetadata {
  duration: number;
  bpm?: number;
  format: string;
  sampleRate: number;
  channels: number;
  beats?: number[];
  onsets?: number[];
  peaks?: number[];
}

export interface IKeyframe {
  time: number;
  style: string;
  settings: {
    particleCount: number;
    colorPalette: string[];
    intensity: number;
  };
}

export interface IAIStyleSuggestion {
  styleId: string;
  score: number;
  explanation: string;
  suggestedPrompt: string;
  suggestedPalette: string[];
}

export interface IAISettings {
  mode: 'procedural' | 'ai-hybrid';
  sdPrompt: string;
  sdNegativePrompt: string;
  sdModel: string;
  styleSuggestions?: IAIStyleSuggestion[];
  generatedImageIds?: string[];
}

export interface IProject extends Document {
  userId: Types.ObjectId;
  name: string;
  audioPath: string;
  audioMetadata?: IAudioMetadata;
  status: 'uploaded' | 'analyzing' | 'ready' | 'rendering' | 'complete' | 'failed';
  outputPath?: string;
  settings: {
    particleCount: number;
    colorPalette: string[];
    intensity: number;
    style: string;
    resolution: '720p' | '1080p';
  };
  keyframes: IKeyframe[];
  aiSettings: IAISettings;
  createdAt: Date;
  updatedAt: Date;
}

const keyframeSchema = new Schema<IKeyframe>(
  {
    time: { type: Number, required: true },
    style: { type: String, required: true, default: 'particles' },
    settings: {
      particleCount: { type: Number, default: 2000 },
      colorPalette: { type: [String], default: ['#4F46E5', '#7C3AED', '#EC4899'] },
      intensity: { type: Number, default: 1.0 },
    },
  },
  { _id: false }
);

const projectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    audioPath: {
      type: String,
      required: true,
    },
    audioMetadata: {
      duration: Number,
      bpm: Number,
      format: String,
      sampleRate: Number,
      channels: Number,
      beats: { type: [Number], default: [] },
      onsets: { type: [Number], default: [] },
      peaks: { type: [Number], default: [] },
    },
    status: {
      type: String,
      enum: ['uploaded', 'analyzing', 'ready', 'rendering', 'complete', 'failed'],
      default: 'uploaded',
    },
    outputPath: String,
    settings: {
      particleCount: { type: Number, default: 2000 },
      colorPalette: { type: [String], default: ['#4F46E5', '#7C3AED', '#EC4899'] },
      intensity: { type: Number, default: 1.0 },
      style: { type: String, default: 'particles' },
      resolution: { type: String, enum: ['720p', '1080p'], default: '720p' },
    },
    keyframes: { type: [keyframeSchema], default: [] },
    aiSettings: {
      mode: { type: String, enum: ['procedural', 'ai-hybrid'], default: 'procedural' },
      sdPrompt: { type: String, default: '' },
      sdNegativePrompt: { type: String, default: 'blurry, distorted, low quality, watermark' },
      sdModel: { type: String, default: 'stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750d7579acdf40d2d39bfe9e4d05' },
      styleSuggestions: { type: Array, default: [] },
      generatedImageIds: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ userId: 1, createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);

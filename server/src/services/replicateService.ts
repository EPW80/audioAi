import Replicate from 'replicate';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { env } from '../config/env.js';

let _client: Replicate | null = null;

function getClient(): Replicate {
  if (!_client) {
    _client = new Replicate({ auth: env.REPLICATE_API_TOKEN });
  }
  return _client;
}

export interface SDGenerationParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
}

export interface SVDGenerationParams {
  /** URL of the seed image (produced by SD) to animate */
  image: string;
  /** Number of frames to generate (default from env AI_SVD_NUM_FRAMES) */
  numFrames?: number;
  /** Motion intensity 1-255, higher = more motion (default from env AI_SVD_MOTION_BUCKET) */
  motionBucketId?: number;
  /** Output FPS (default from env AI_SVD_FPS) */
  fps?: number;
  /** Decode chunk size — lower = less VRAM, slower (default 8) */
  decodeChunkSize?: number;
  /** Override SVD model string (owner/model:version) */
  svdModel?: string;
}

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[];
  error?: string;
}

export async function generateImage(params: SDGenerationParams): Promise<ReplicatePrediction> {
  const client = getClient();
  const [owner, modelAndVersion] = env.REPLICATE_SD_MODEL.split('/');
  const [model, version] = modelAndVersion.split(':');

  const prediction = await client.predictions.create({
    version,
    input: {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || 'blurry, distorted, low quality, watermark',
      width: params.width || 768,
      height: params.height || 432,
      num_inference_steps: params.numInferenceSteps || parseInt(env.AI_SD_STEPS),
      guidance_scale: params.guidanceScale || parseFloat(env.AI_SD_GUIDANCE),
      ...(params.seed !== undefined && { seed: params.seed }),
    },
  });

  return {
    id: prediction.id,
    status: prediction.status as ReplicatePrediction['status'],
    output: prediction.output as string[] | undefined,
    error: prediction.error as string | undefined,
  };
}

export async function pollPrediction(predictionId: string): Promise<ReplicatePrediction> {
  const client = getClient();
  const prediction = await client.predictions.get(predictionId);
  return {
    id: prediction.id,
    status: prediction.status as ReplicatePrediction['status'],
    output: prediction.output as string[] | undefined,
    error: prediction.error as string | undefined,
  };
}

export async function waitForPrediction(
  predictionId: string,
  timeoutMs = 120_000
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const prediction = await pollPrediction(predictionId);
    if (prediction.status === 'succeeded') {
      const output = prediction.output?.[0];
      if (!output) throw new Error(`Prediction ${predictionId} succeeded but has no output`);
      return output;
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(`Prediction ${predictionId} ${prediction.status}: ${prediction.error}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Prediction ${predictionId} timed out after ${timeoutMs}ms`);
}

export async function downloadImageToPath(url: string, destPath: string): Promise<void> {
  await mkdir(path.dirname(destPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(destPath);
    protocol.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Download a video file from a URL to a local path.
 * Identical to downloadImageToPath but named distinctly for clarity.
 */
export async function downloadVideoToPath(url: string, destPath: string): Promise<void> {
  await mkdir(path.dirname(destPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(destPath);
    protocol.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Generate a short video clip from a seed image using Stable Video Diffusion (SVD)
 * via the Replicate API.  Returns a prediction that must be polled with waitForPrediction().
 */
export async function generateVideo(params: SVDGenerationParams): Promise<ReplicatePrediction> {
  const client = getClient();

  const modelStr = params.svdModel || env.AI_SVD_MODEL;
  const [_owner, modelAndVersion] = modelStr.split('/');
  const [_model, version] = modelAndVersion.split(':');

  const prediction = await client.predictions.create({
    version,
    input: {
      image: params.image,
      num_frames: params.numFrames ?? parseInt(env.AI_SVD_NUM_FRAMES),
      motion_bucket_id: params.motionBucketId ?? parseInt(env.AI_SVD_MOTION_BUCKET),
      fps: params.fps ?? parseInt(env.AI_SVD_FPS),
      decode_chunk_size: params.decodeChunkSize ?? 8,
    },
  });

  return {
    id: prediction.id,
    status: prediction.status as ReplicatePrediction['status'],
    output: prediction.output as string[] | undefined,
    error: prediction.error as string | undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame Interpolation via FILM model (for 'interpolate' transition mode)
// ─────────────────────────────────────────────────────────────────────────────

export interface FrameInterpolationParams {
  /** URL of the first frame */
  frame1: string;
  /** URL of the second frame */
  frame2: string;
  /** Number of interpolated frames to produce between the two inputs (default 2) */
  numInterpolationSteps?: number;
}

/**
 * Generate interpolated frames between two images using Google's FILM model
 * on Replicate. Returns an array of URLs for the interpolated frames (excludes
 * the original inputs).
 */
export async function generateFrameInterpolation(
  params: FrameInterpolationParams
): Promise<string[]> {
  const client = getClient();

  // FILM model on Replicate
  const filmModel =
    'google-research/frame-interpolation:4f88a16a13673a8b589c18866e540556170a5bcb2ccdc12de556e800e9456d3d';
  const [_owner, modelAndVersion] = filmModel.split('/');
  const [_model, version] = modelAndVersion.split(':');

  const prediction = await client.predictions.create({
    version,
    input: {
      frame1: params.frame1,
      frame2: params.frame2,
      times_to_interpolate: params.numInterpolationSteps ?? 2,
    },
  });

  // Wait for completion (interpolation is fast — 60s timeout)
  const outputUrl = await waitForPrediction(prediction.id, 60_000);

  // FILM returns a single .mp4 video or a list of frame URLs depending on version.
  // We return as an array for consistent handling.
  return [outputUrl];
}

// Run N async tasks with a concurrency cap
export async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

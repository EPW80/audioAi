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

import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';

export interface RenderJobData {
  projectId: string;
  userId: string;
  audioPath: string;
  outputPath: string;
  settings: {
    fps: number;
    width: number;
    height: number;
    // AI-hybrid mode fields (optional — omitted for procedural jobs)
    mode?: 'procedural' | 'ai-hybrid';
    sdPrompt?: string;
    sdNegativePrompt?: string;
    sdModel?: string;
    beatTimestamps?: number[];
    duration?: number;
  };
}

export interface RenderJobProgress {
  stage: 'queued' | 'processing' | 'ai-generating' | 'encoding' | 'complete' | 'failed';
  progress: number;
  message?: string;
}

// Create the render queue
export const renderQueue = new Queue<RenderJobData>('render', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
});

// Export function to add jobs
export async function addRenderJob(data: RenderJobData): Promise<Job<RenderJobData>> {
  return renderQueue.add('render-video', data, {
    priority: 1,
  });
}

// Export function to get job status
export async function getRenderJobStatus(jobId: string) {
  const job = await Job.fromId(renderQueue, jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress as RenderJobProgress | number;

  return {
    id: job.id,
    state,
    progress: typeof progress === 'number' ? progress : progress?.progress || 0,
    stage: typeof progress === 'object' ? progress.stage : 'queued',
    failedReason: job.failedReason,
  };
}

console.log('✅ Render queue initialized');

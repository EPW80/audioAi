import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Project } from '../models/Project.js';
import { addRenderJob, getRenderJobStatus } from '../jobs/queue.js';
import { env } from '../config/env.js';

const router = Router();

router.use(authMiddleware);

// Start a render job
router.post('/:projectId/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.userId,
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.status === 'rendering') {
      res.status(400).json({ error: 'Project is already rendering' });
      return;
    }

    const outputPath = path.join(
      env.OUTPUT_DIR,
      project._id.toString(),
      'video.mp4'
    );

    const resolution = project.settings?.resolution ?? '720p';
    const width = resolution === '1080p' ? 1920 : 1280;
    const height = resolution === '1080p' ? 1080 : 720;

    const isAIHybrid = project.aiSettings?.mode === 'ai-hybrid';

    const job = await addRenderJob({
      projectId: project._id.toString(),
      userId: req.userId!,
      audioPath: project.audioPath,
      outputPath,
      settings: {
        fps: 30,
        width,
        height,
        ...(isAIHybrid && {
          mode: 'ai-hybrid' as const,
          sdPrompt: project.aiSettings.sdPrompt,
          sdNegativePrompt: project.aiSettings.sdNegativePrompt,
          sdModel: project.aiSettings.sdModel,
          beatTimestamps: project.audioMetadata?.beats ?? [],
          duration: project.audioMetadata?.duration ?? 30,
        }),
      },
    });

    await Project.findByIdAndUpdate(projectId, { status: 'rendering' });

    res.json({
      jobId: job.id,
      message: 'Render job started',
    });
  } catch (error) {
    console.error('Start render error:', error);
    res.status(500).json({ error: 'Failed to start render' });
  }
});

// Get render job status
router.get('/:projectId/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { jobId } = req.query;

    const project = await Project.findOne({
      _id: projectId,
      userId: req.userId,
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (jobId && typeof jobId === 'string') {
      const status = await getRenderJobStatus(jobId);
      res.json({ project: { status: project.status }, job: status });
    } else {
      res.json({ project: { status: project.status, outputPath: project.outputPath } });
    }
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Server-Sent Events for real-time status updates
router.get('/:projectId/status/stream', async (req: AuthRequest, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { jobId } = req.query;

  const project = await Project.findOne({
    _id: projectId,
    userId: req.userId,
  });

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendStatus = async () => {
    if (jobId && typeof jobId === 'string') {
      const status = await getRenderJobStatus(jobId);
      res.write(`data: ${JSON.stringify(status)}\n\n`);
      
      if (status?.state === 'completed' || status?.state === 'failed') {
        res.end();
        return false;
      }
    }
    return true;
  };

  // Send initial status
  await sendStatus();

  // Poll for updates
  const interval = setInterval(async () => {
    const shouldContinue = await sendStatus();
    if (!shouldContinue) {
      clearInterval(interval);
    }
  }, 1000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Upload rendered frames from the client
router.post('/:projectId/frames', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { frames } = req.body as { frames: { index: number; data: string }[] };

    if (!Array.isArray(frames) || frames.length === 0) {
      res.status(400).json({ error: 'frames array required' });
      return;
    }

    const project = await Project.findOne({ _id: projectId, userId: req.userId });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const framesDir = path.join(env.OUTPUT_DIR, projectId, 'frames');
    await fs.mkdir(framesDir, { recursive: true });

    await Promise.all(
      frames.map(async ({ index, data }) => {
        const base64 = data.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(base64, 'base64');
        const framePath = path.join(framesDir, `frame-${String(index).padStart(5, '0')}.jpg`);
        await fs.writeFile(framePath, buf);
      })
    );

    res.json({ saved: frames.length });
  } catch (error) {
    console.error('Frame upload error:', error);
    res.status(500).json({ error: 'Failed to save frames' });
  }
});

export default router;

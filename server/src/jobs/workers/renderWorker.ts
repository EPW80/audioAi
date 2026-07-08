import { Worker, Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import { redis } from '../../config/redis.js';
import { Project } from '../../models/Project.js';
import type { RenderJobData, RenderJobProgress } from '../queue.js';
import { generateImage, waitForPrediction, downloadImageToPath, downloadVideoToPath, generateVideo, generateFrameInterpolation, withConcurrency } from '../../services/replicateService.js';
import { compositeAIVideo, compositeAIVideoClips, buildBeatSections } from '../../services/imageCompositor.js';
import { generateSectionPrompts } from '../../services/claudeService.js';
import { env } from '../../config/env.js';

async function captureFramesWithPuppeteer(
  projectId: string,
  framesDir: string,
  fps: number,
  width: number,
  height: number,
  duration: number,
  onProgress: (progress: number) => void
): Promise<boolean> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=egl',
      '--enable-webgl',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const totalFrames = Math.ceil(duration * fps);

    for (let i = 0; i < totalFrames; i++) {
      const time = i / fps;
      const url = `${clientUrl}/render?projectId=${projectId}&time=${time}&width=${width}&height=${height}`;
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
      
      // Wait for render container to be ready
      await page.waitForSelector('#render-container[data-status="ready"]', { timeout: 5000 }).catch(() => {});
      
      // Small delay for WebGL to render
      await new Promise((r) => setTimeout(r, 100));

      const framePath = path.join(framesDir, `frame-${String(i).padStart(5, '0')}.jpg`);
      await page.screenshot({ path: framePath, type: 'jpeg', quality: 90 });

      onProgress(Math.round((i / totalFrames) * 100));
    }

    return true;
  } finally {
    await browser.close();
  }
}

async function processAIRenderJob(job: Job<RenderJobData>): Promise<string> {
  const { projectId, audioPath, outputPath, settings } = job.data;
  const { fps, width, height, sdPrompt, sdNegativePrompt, autoVaryPrompts = true, transitionMode = 'crossfade', beatTimestamps = [], duration = 30 } = settings;

  const updateProgress = async (progress: RenderJobProgress) => {
    await job.updateProgress(progress);
  };

  try {
    await updateProgress({ stage: 'processing', progress: 0 });
    await Project.findByIdAndUpdate(projectId, { status: 'rendering' });

    // Determine beat section boundaries
    const beatsPerImage = parseInt(env.AI_BEATS_PER_IMAGE);
    const sectionBoundaries = buildBeatSections(beatTimestamps, duration, beatsPerImage);
    const numImages = sectionBoundaries.length - 1;

    await updateProgress({ stage: 'ai-generating', progress: 0, message: `Generating ${numImages} AI images...` });

    // Generate per-section prompt variations via Claude (if enabled)
    const defaultPrompt = sdPrompt || 'abstract colorful music visualization, dynamic motion blur';
    let sectionPrompts: string[];
    if (autoVaryPrompts && numImages > 1) {
      await updateProgress({ stage: 'ai-generating', progress: 0, message: 'Generating per-section prompts...' });
      const project = await Project.findById(projectId);
      sectionPrompts = await generateSectionPrompts({
        basePrompt: defaultPrompt,
        numSections: numImages,
        audioContext: {
          bpm: project?.audioMetadata?.bpm,
          duration,
          beats: beatTimestamps,
          peaks: project?.audioMetadata?.peaks,
        },
        sectionBoundaries,
        keyframes: project?.keyframes?.map((kf) => ({
          time: kf.time,
          style: kf.style,
          settings: { colorPalette: kf.settings.colorPalette, intensity: kf.settings.intensity },
        })),
      });
    } else {
      sectionPrompts = Array(numImages).fill(defaultPrompt);
    }

    // Generate one SD image per beat section
    const aiFramesDir = path.join(path.dirname(outputPath), 'ai-frames');
    await fs.mkdir(aiFramesDir, { recursive: true });

    const tasks = Array.from({ length: numImages }, (_, i) => async () => {
      const prediction = await generateImage({
        prompt: sectionPrompts[i],
        negativePrompt: sdNegativePrompt,
        width,
        height,
        seed: i * 137, // varied seeds for visual variety
      });
      const imageUrl = await waitForPrediction(prediction.id);
      const imgPath = path.join(aiFramesDir, `ai-frame-${String(i).padStart(4, '0')}.jpg`);
      await downloadImageToPath(imageUrl, imgPath);
      await updateProgress({
        stage: 'ai-generating',
        progress: Math.round(((i + 1) / numImages) * 70),
        message: `Generated image ${i + 1}/${numImages}`,
      });
      return imgPath;
    });

    const maxConcurrent = parseInt(env.REPLICATE_MAX_CONCURRENT);
    const imagePaths = await withConcurrency(tasks, maxConcurrent);

    await updateProgress({ stage: 'encoding', progress: 70, message: 'Compositing video...' });

    // If interpolate mode, generate transition frames between consecutive images
    let finalImagePaths = imagePaths;
    let finalBeatTimestamps = sectionBoundaries;

    if (transitionMode === 'interpolate' && imagePaths.length > 1) {
      await updateProgress({
        stage: 'interpolating',
        progress: 70,
        message: 'Generating interpolation frames...',
      });

      const interpTasks: (() => Promise<{ index: number; framePath: string }>)[] = [];
      for (let i = 0; i < imagePaths.length - 1; i++) {
        interpTasks.push(async () => {
          // Upload images to get URLs for FILM model (use file:// or serve them)
          // Since FILM on Replicate expects URLs, we generate the interpolation from
          // the prediction output URLs that were already downloaded.
          // For simplicity, we re-use the already-downloaded images and call generateFrameInterpolation
          // with them (the model accepts file URLs).
          const result = await generateFrameInterpolation({
            frame1: imagePaths[i],
            frame2: imagePaths[i + 1],
            numInterpolationSteps: 2,
          });
          // Download the interpolated frame
          const interpPath = path.join(aiFramesDir, `interp-${String(i).padStart(4, '0')}.jpg`);
          if (result.length > 0) {
            await downloadImageToPath(result[0], interpPath);
          }
          await updateProgress({
            stage: 'interpolating',
            progress: 70 + Math.round(((i + 1) / (imagePaths.length - 1)) * 10),
            message: `Interpolating ${i + 1}/${imagePaths.length - 1}`,
          });
          return { index: i, framePath: interpPath };
        });
      }

      const interpResults = await withConcurrency(interpTasks, maxConcurrent);

      // Weave interpolated frames into the image list with adjusted timestamps
      const woven: string[] = [];
      const wovenTimestamps: number[] = [sectionBoundaries[0]];
      for (let i = 0; i < imagePaths.length; i++) {
        woven.push(imagePaths[i]);
        if (i < imagePaths.length - 1) {
          const interp = interpResults.find((r) => r.index === i);
          if (interp) {
            woven.push(interp.framePath);
            // Insert a midpoint timestamp for the interpolated frame
            const mid =
              ((sectionBoundaries[i + 1] ?? duration) + (sectionBoundaries[i] ?? 0)) / 2;
            wovenTimestamps.push(mid);
          }
          wovenTimestamps.push(sectionBoundaries[i + 1] ?? duration);
        }
      }
      // Add final boundary if missing
      if (wovenTimestamps[wovenTimestamps.length - 1] < duration) {
        wovenTimestamps.push(duration);
      }

      finalImagePaths = woven;
      finalBeatTimestamps = wovenTimestamps;
    }

    await updateProgress({ stage: 'encoding', progress: 80, message: 'Encoding final video...' });

    await compositeAIVideo({
      imagePaths: finalImagePaths,
      beatTimestamps: finalBeatTimestamps,
      audioPath,
      outputPath,
      width,
      height,
      fps,
      duration,
      transitionMode: transitionMode === 'interpolate' ? 'crossfade' : transitionMode,
      onProgress: (pct) => updateProgress({ stage: 'encoding', progress: 80 + Math.round(pct * 0.2) }),
    });

    // Cleanup AI frames
    await fs.rm(aiFramesDir, { recursive: true, force: true }).catch(() => {});

    await updateProgress({ stage: 'complete', progress: 100 });
    await Project.findByIdAndUpdate(projectId, { status: 'complete', outputPath });

    return outputPath;
  } catch (error) {
    await Project.findByIdAndUpdate(projectId, { status: 'failed' });
    throw error;
  }
}

/**
 * AI-Video pipeline: generates SD seed images per beat section, then animates
 * each image into a short video clip via Stable Video Diffusion (SVD),
 * then composites all clips with audio into the final video.
 */
async function processAIVideoRenderJob(job: Job<RenderJobData>): Promise<string> {
  const { projectId, audioPath, outputPath, settings } = job.data;
  const {
    fps,
    width,
    height,
    sdPrompt,
    sdNegativePrompt,
    svdModel,
    autoVaryPrompts = true,
    transitionMode = 'crossfade',
    beatTimestamps = [],
    duration = 30,
  } = settings;

  const updateProgress = async (progress: RenderJobProgress) => {
    await job.updateProgress(progress);
  };

  try {
    await updateProgress({ stage: 'processing', progress: 0 });
    await Project.findByIdAndUpdate(projectId, { status: 'rendering' });

    // Determine beat section boundaries
    const beatsPerImage = parseInt(env.AI_BEATS_PER_IMAGE);
    const sectionBoundaries = buildBeatSections(beatTimestamps, duration, beatsPerImage);
    const numSections = sectionBoundaries.length - 1;

    // ── Phase 1: Generate SD seed images (0–40%) ──
    await updateProgress({
      stage: 'ai-generating',
      progress: 0,
      message: `Generating ${numSections} seed images...`,
    });

    // Generate per-section prompt variations via Claude (if enabled)
    const defaultPrompt = sdPrompt || 'abstract colorful music visualization, dynamic motion blur';
    let sectionPrompts: string[];
    if (autoVaryPrompts && numSections > 1) {
      await updateProgress({ stage: 'ai-generating', progress: 0, message: 'Generating per-section prompts...' });
      const project = await Project.findById(projectId);
      sectionPrompts = await generateSectionPrompts({
        basePrompt: defaultPrompt,
        numSections,
        audioContext: {
          bpm: project?.audioMetadata?.bpm,
          duration,
          beats: beatTimestamps,
          peaks: project?.audioMetadata?.peaks,
        },
        sectionBoundaries,
        keyframes: project?.keyframes?.map((kf) => ({
          time: kf.time,
          style: kf.style,
          settings: { colorPalette: kf.settings.colorPalette, intensity: kf.settings.intensity },
        })),
      });
    } else {
      sectionPrompts = Array(numSections).fill(defaultPrompt);
    }

    const aiFramesDir = path.join(path.dirname(outputPath), 'ai-frames');
    const aiClipsDir = path.join(path.dirname(outputPath), 'ai-clips');
    await fs.mkdir(aiFramesDir, { recursive: true });
    await fs.mkdir(aiClipsDir, { recursive: true });

    const imageGenTasks = Array.from({ length: numSections }, (_, i) => async () => {
      const prediction = await generateImage({
        prompt: sectionPrompts[i],
        negativePrompt: sdNegativePrompt,
        width,
        height,
        seed: i * 137,
      });
      const imageUrl = await waitForPrediction(prediction.id);
      const imgPath = path.join(aiFramesDir, `seed-${String(i).padStart(4, '0')}.jpg`);
      await downloadImageToPath(imageUrl, imgPath);
      await updateProgress({
        stage: 'ai-generating',
        progress: Math.round(((i + 1) / numSections) * 40),
        message: `Seed image ${i + 1}/${numSections}`,
      });
      // Also return the URL — SVD img2vid accepts a URL input
      return { path: imgPath, url: imageUrl };
    });

    const maxConcurrent = parseInt(env.REPLICATE_MAX_CONCURRENT);
    const seedImages = await withConcurrency(imageGenTasks, maxConcurrent);

    // ── Phase 2: Generate SVD video clips from seed images (40–85%) ──
    await updateProgress({
      stage: 'svd-generating',
      progress: 40,
      message: `Generating ${numSections} video clips via SVD...`,
    });

    const svdTimeoutMs = parseInt(env.AI_SVD_TIMEOUT_MS);

    const videoGenTasks = Array.from({ length: numSections }, (_, i) => async () => {
      const prediction = await generateVideo({
        image: seedImages[i].url,
        svdModel,
      });
      const videoUrl = await waitForPrediction(prediction.id, svdTimeoutMs);
      const clipPath = path.join(aiClipsDir, `clip-${String(i).padStart(4, '0')}.mp4`);
      await downloadVideoToPath(videoUrl, clipPath);
      await updateProgress({
        stage: 'svd-generating',
        progress: 40 + Math.round(((i + 1) / numSections) * 45),
        message: `Video clip ${i + 1}/${numSections}`,
      });
      return clipPath;
    });

    const clipPaths = await withConcurrency(videoGenTasks, maxConcurrent);

    // ── Phase 3: Composite clips into final video with audio (85–100%) ──
    await updateProgress({ stage: 'encoding', progress: 85, message: 'Compositing video...' });

    await compositeAIVideoClips({
      clipPaths,
      sectionBoundaries,
      audioPath,
      outputPath,
      width,
      height,
      fps,
      duration,
      transitionMode,
      onProgress: (pct) =>
        updateProgress({ stage: 'encoding', progress: 85 + Math.round(pct * 0.15) }),
    });

    // Cleanup temp directories
    await fs.rm(aiFramesDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(aiClipsDir, { recursive: true, force: true }).catch(() => {});

    await updateProgress({ stage: 'complete', progress: 100 });
    await Project.findByIdAndUpdate(projectId, { status: 'complete', outputPath });

    return outputPath;
  } catch (error) {
    await Project.findByIdAndUpdate(projectId, { status: 'failed' });
    throw error;
  }
}

async function processRenderJob(job: Job<RenderJobData>): Promise<string> {
  // Route to AI pipelines based on mode
  if (job.data.settings.mode === 'ai-video') {
    return processAIVideoRenderJob(job);
  }
  if (job.data.settings.mode === 'ai-hybrid') {
    return processAIRenderJob(job);
  }

  const { projectId, audioPath, outputPath, settings } = job.data;
  const { fps, width, height } = settings;

  const updateProgress = async (progress: RenderJobProgress) => {
    await job.updateProgress(progress);
  };

  try {
    await updateProgress({ stage: 'processing', progress: 0 });
    await Project.findByIdAndUpdate(projectId, { status: 'rendering' });

    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    await updateProgress({ stage: 'encoding', progress: 10 });

    // Check if client-uploaded frames exist or generate via Puppeteer
    const framesDir = path.join(outputDir, 'frames');
    await fs.mkdir(framesDir, { recursive: true });
    
    let hasFrames = false;
    try {
      const files = await fs.readdir(framesDir);
      hasFrames = files.some((f) => f.endsWith('.jpg'));
    } catch {
      hasFrames = false;
    }

    // If no pre-uploaded frames, try capturing with Puppeteer
    if (!hasFrames) {
      // Get audio duration for frame calculation
      const project = await Project.findById(projectId);
      const duration = project?.audioMetadata?.duration || 30; // Default 30s if unknown
      
      await updateProgress({ stage: 'processing', progress: 5, message: 'Capturing frames...' });
      
      hasFrames = await captureFramesWithPuppeteer(
        projectId,
        framesDir,
        fps,
        width,
        height,
        duration,
        (pct) => updateProgress({ stage: 'processing', progress: 5 + Math.round(pct * 0.4) })
      );
    }

    return new Promise((resolve, reject) => {
      const cmd = ffmpeg();

      if (hasFrames) {
        // Compose from captured/uploaded frames
        cmd
          .input(path.join(framesDir, 'frame-%05d.jpg'))
          .inputOptions([`-framerate ${fps}`])
          .input(audioPath)
          .outputOptions([
            '-c:v libx264',
            '-c:a aac',
            '-b:a 192k',
            '-pix_fmt yuv420p',
            '-shortest',
            `-s ${width}x${height}`,
          ]);
      } else {
        // Fallback: black screen with audio (Puppeteer unavailable)
        console.warn('Puppeteer frame capture failed, falling back to black screen');
        cmd
          .input(audioPath)
          .inputOptions(['-loop 1'])
          .input(`color=c=black:s=${width}x${height}`)
          .inputFormat('lavfi')
          .outputOptions([
            '-c:v libx264',
            '-tune stillimage',
            '-c:a aac',
            '-b:a 192k',
            '-pix_fmt yuv420p',
            '-shortest',
            `-r ${fps}`,
          ]);
      }

      cmd
        .output(outputPath)
        .on('progress', (progress) => {
          const percent = progress.percent || 0;
          updateProgress({
            stage: 'encoding',
            progress: 10 + Math.round(percent * 0.9),
          });
        })
        .on('end', async () => {
          // Clean up frames directory to save disk space
          if (hasFrames) {
            await fs.rm(framesDir, { recursive: true, force: true }).catch(() => {});
          }
          await updateProgress({ stage: 'complete', progress: 100 });
          await Project.findByIdAndUpdate(projectId, {
            status: 'complete',
            outputPath,
          });
          resolve(outputPath);
        })
        .on('error', async (err) => {
          await Project.findByIdAndUpdate(projectId, { status: 'failed' });
          reject(err);
        })
        .run();
    });
  } catch (error) {
    await Project.findByIdAndUpdate(projectId, { status: 'failed' });
    throw error;
  }
}

export function startRenderWorker() {
  const worker = new Worker<RenderJobData>('render', processRenderJob, {
    connection: redis,
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    console.log(`✅ Render job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Render job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('✅ Render worker started');

  return worker;
}

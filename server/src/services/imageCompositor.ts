import ffmpeg from 'fluent-ffmpeg';
import { writeFile, mkdir, rm } from 'fs/promises';
import path from 'path';

export type TransitionMode = 'cut' | 'crossfade' | 'interpolate';

/** Default crossfade duration in seconds */
const DEFAULT_XFADE_DURATION = 0.5;

export interface CompositeAIVideoParams {
  imagePaths: string[];
  beatTimestamps: number[];
  audioPath: string;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  transitionMode?: TransitionMode;
  /** Crossfade duration in seconds (default 0.5) */
  xfadeDuration?: number;
  onProgress?: (pct: number) => void;
}

export async function compositeAIVideo(params: CompositeAIVideoParams): Promise<string> {
  const {
    imagePaths,
    beatTimestamps,
    audioPath,
    outputPath,
    width,
    height,
    fps,
    duration,
    transitionMode = 'crossfade',
    xfadeDuration = DEFAULT_XFADE_DURATION,
    onProgress,
  } = params;

  if (imagePaths.length === 0) {
    throw new Error('No images provided to compositeAIVideo');
  }

  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // ── 'cut' mode — simple concat demuxer (hard cuts, fastest) ──
  if (transitionMode === 'cut' || imagePaths.length === 1) {
    return compositeWithConcatDemuxer(
      imagePaths, beatTimestamps, audioPath, outputPath, width, height, fps, duration, onProgress
    );
  }

  // ── 'crossfade' mode — xfade filter_complex ──
  if (transitionMode === 'crossfade') {
    return compositeWithXfade(
      imagePaths, beatTimestamps, audioPath, outputPath, width, height, fps, duration, xfadeDuration, onProgress
    );
  }

  // ── 'interpolate' mode — delegates to caller to supply pre-interpolated frames ──
  // The caller (renderWorker) is responsible for generating intermediate frames
  // via generateFrameInterpolation and weaving them into imagePaths before calling
  // this function. We fall back to crossfade as a safety net.
  return compositeWithXfade(
    imagePaths, beatTimestamps, audioPath, outputPath, width, height, fps, duration, xfadeDuration, onProgress
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: concat demuxer (hard cut) compositor
// ─────────────────────────────────────────────────────────────────────────────
async function compositeWithConcatDemuxer(
  imagePaths: string[],
  beatTimestamps: number[],
  audioPath: string,
  outputPath: string,
  width: number,
  height: number,
  fps: number,
  duration: number,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const outputDir = path.dirname(outputPath);
  const concatFilePath = path.join(outputDir, `concat-${Date.now()}.txt`);
  const lines: string[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const start = beatTimestamps[i] ?? 0;
    const end = beatTimestamps[i + 1] ?? duration;
    const sectionDuration = Math.max(end - start, 0.1);
    lines.push(`file '${imagePaths[i]}'`);
    lines.push(`duration ${sectionDuration.toFixed(3)}`);
  }
  // FFmpeg concat demuxer requires the last file to be repeated without duration
  lines.push(`file '${imagePaths[imagePaths.length - 1]}'`);

  await writeFile(concatFilePath, lines.join('\n'), 'utf8');

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f concat', '-safe 0'])
      .input(audioPath)
      .videoFilters(`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`)
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        `-r ${fps}`,
        `-t ${duration}`,
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('progress', (info) => {
        if (onProgress && info.percent != null) {
          onProgress(Math.min(Math.round(info.percent), 100));
        }
      })
      .on('end', async () => {
        await rm(concatFilePath, { force: true }).catch(() => {});
        resolve(outputPath);
      })
      .on('error', async (err) => {
        await rm(concatFilePath, { force: true }).catch(() => {});
        reject(err);
      })
      .run();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: xfade filter_complex compositor (crossfade transitions)
// ─────────────────────────────────────────────────────────────────────────────
async function compositeWithXfade(
  imagePaths: string[],
  beatTimestamps: number[],
  audioPath: string,
  outputPath: string,
  width: number,
  height: number,
  fps: number,
  duration: number,
  xfadeDuration: number,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const n = imagePaths.length;

  // Compute section durations from beat timestamps
  const sectionDurations: number[] = [];
  for (let i = 0; i < n; i++) {
    const start = beatTimestamps[i] ?? 0;
    const end = beatTimestamps[i + 1] ?? duration;
    sectionDurations.push(Math.max(end - start, 0.1));
  }

  // Build a filter_complex that:
  //   1. Loops each image for its section duration
  //   2. Chains xfade filters between consecutive segments
  //
  // For each image: [i:v] → loop + setpts + trim → [vi]
  // Then: [v0][v1] xfade → [xf0]; [xf0][v2] xfade → [xf1]; ...
  const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p`;

  const filterParts: string[] = [];

  // Step 1: Create a video segment for each image (looped for its section duration)
  for (let i = 0; i < n; i++) {
    const dur = sectionDurations[i];
    filterParts.push(
      `[${i}:v]${scaleFilter},loop=loop=${Math.ceil(dur * fps)}:size=1:start=0,setpts=N/FR/TB,trim=duration=${dur.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`
    );
  }

  // Step 2: Chain xfade transitions
  if (n === 1) {
    filterParts.push(`[v0]null[vout]`);
  } else {
    // Calculate cumulative offsets for each xfade point
    let prevLabel = 'v0';
    let cumulativeOffset = 0;

    for (let i = 1; i < n; i++) {
      const outLabel = i < n - 1 ? `xf${i}` : 'vout';
      // The offset is when the crossfade starts relative to the beginning of prevLabel stream
      // For the first xfade: section[0].duration - xfadeDuration
      // For subsequent: previous cumulative + section[i-1].duration - 2*xfadeDuration (accounting for overlap)
      const tDur = Math.min(xfadeDuration, sectionDurations[i - 1] / 2, sectionDurations[i] / 2);
      cumulativeOffset += sectionDurations[i - 1] - tDur;

      filterParts.push(
        `[${prevLabel}][v${i}]xfade=transition=fade:duration=${tDur.toFixed(3)}:offset=${cumulativeOffset.toFixed(3)}[${outLabel}]`
      );
      prevLabel = outLabel;
    }
  }

  const filterComplex = filterParts.join(';');

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    // Add each image as a separate input
    for (const imgPath of imagePaths) {
      cmd.input(imgPath);
    }
    // Audio input (last input index = n)
    cmd.input(audioPath);

    cmd
      .complexFilter(filterComplex, 'vout')
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        `-map [vout]`,
        `-map ${n}:a`,
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        `-r ${fps}`,
        `-t ${duration}`,
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('progress', (info) => {
        if (onProgress && info.percent != null) {
          onProgress(Math.min(Math.round(info.percent), 100));
        }
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

// Split beat timestamps into segment boundary timestamps
// Returns array of N+1 values: [0, beat[beatsPerImage], beat[beatsPerImage*2], ..., duration]
export function buildBeatSections(
  beats: number[],
  duration: number,
  beatsPerImage: number
): number[] {
  const boundaries: number[] = [0];
  for (let i = beatsPerImage; i < beats.length; i += beatsPerImage) {
    boundaries.push(beats[i]);
  }
  if (boundaries[boundaries.length - 1] < duration) {
    boundaries.push(duration);
  }
  return boundaries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite AI video clips (SVD) into a single video with audio
// ─────────────────────────────────────────────────────────────────────────────

export interface CompositeAIVideoClipsParams {
  clipPaths: string[];
  sectionBoundaries: number[];
  audioPath: string;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  transitionMode?: TransitionMode;
  /** Crossfade duration in seconds (default 0.5) */
  xfadeDuration?: number;
  onProgress?: (pct: number) => void;
}

/**
 * Concatenates SVD-generated video clips into a single video with audio.
 * Supports three transition modes:
 *  - 'cut': simple concat (hard cuts)
 *  - 'crossfade': xfade filter between clips
 *  - 'interpolate': same as crossfade (caller should pre-process if needed)
 */
export async function compositeAIVideoClips(
  params: CompositeAIVideoClipsParams
): Promise<string> {
  const {
    clipPaths,
    sectionBoundaries,
    audioPath,
    outputPath,
    width,
    height,
    fps,
    duration,
    transitionMode = 'crossfade',
    xfadeDuration = DEFAULT_XFADE_DURATION,
    onProgress,
  } = params;

  if (clipPaths.length === 0) {
    throw new Error('No video clips provided to compositeAIVideoClips');
  }

  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // ── 'cut' mode or single clip — simple concat demuxer ──
  if (transitionMode === 'cut' || clipPaths.length === 1) {
    return compositeClipsWithConcat(
      clipPaths, audioPath, outputPath, width, height, fps, duration, onProgress
    );
  }

  // ── 'crossfade' or 'interpolate' — xfade between clips ──
  return compositeClipsWithXfade(
    clipPaths, sectionBoundaries, audioPath, outputPath, width, height, fps, duration, xfadeDuration, onProgress
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: simple concat for video clips (hard cut)
// ─────────────────────────────────────────────────────────────────────────────
async function compositeClipsWithConcat(
  clipPaths: string[],
  audioPath: string,
  outputPath: string,
  width: number,
  height: number,
  fps: number,
  duration: number,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const outputDir = path.dirname(outputPath);
  const concatFilePath = path.join(outputDir, `concat-clips-${Date.now()}.txt`);
  const lines: string[] = [];

  for (const cp of clipPaths) {
    lines.push(`file '${cp}'`);
  }

  await writeFile(concatFilePath, lines.join('\n'), 'utf8');

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f concat', '-safe 0'])
      .input(audioPath)
      .videoFilters(
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`
      )
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        `-r ${fps}`,
        `-t ${duration}`,
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('progress', (info) => {
        if (onProgress && info.percent != null) {
          onProgress(Math.min(Math.round(info.percent), 100));
        }
      })
      .on('end', async () => {
        await rm(concatFilePath, { force: true }).catch(() => {});
        resolve(outputPath);
      })
      .on('error', async (err) => {
        await rm(concatFilePath, { force: true }).catch(() => {});
        reject(err);
      })
      .run();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: xfade for video clips (crossfade transitions)
// ─────────────────────────────────────────────────────────────────────────────
async function compositeClipsWithXfade(
  clipPaths: string[],
  sectionBoundaries: number[],
  audioPath: string,
  outputPath: string,
  width: number,
  height: number,
  fps: number,
  duration: number,
  xfadeDuration: number,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const n = clipPaths.length;
  const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p`;

  // Compute section durations from boundaries
  const sectionDurations: number[] = [];
  for (let i = 0; i < n; i++) {
    const start = sectionBoundaries[i] ?? 0;
    const end = sectionBoundaries[i + 1] ?? duration;
    sectionDurations.push(Math.max(end - start, 0.1));
  }

  const filterParts: string[] = [];

  // Scale & trim each clip to its section duration
  for (let i = 0; i < n; i++) {
    const dur = sectionDurations[i];
    filterParts.push(
      `[${i}:v]${scaleFilter},trim=duration=${dur.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`
    );
  }

  // Chain xfade transitions between consecutive clips
  if (n === 1) {
    filterParts.push(`[v0]null[vout]`);
  } else {
    let prevLabel = 'v0';
    let cumulativeOffset = 0;

    for (let i = 1; i < n; i++) {
      const outLabel = i < n - 1 ? `xf${i}` : 'vout';
      const tDur = Math.min(xfadeDuration, sectionDurations[i - 1] / 2, sectionDurations[i] / 2);
      cumulativeOffset += sectionDurations[i - 1] - tDur;

      filterParts.push(
        `[${prevLabel}][v${i}]xfade=transition=fade:duration=${tDur.toFixed(3)}:offset=${cumulativeOffset.toFixed(3)}[${outLabel}]`
      );
      prevLabel = outLabel;
    }
  }

  const filterComplex = filterParts.join(';');

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    // Add each clip as a separate input
    for (const cp of clipPaths) {
      cmd.input(cp);
    }
    // Audio input (last input index = n)
    cmd.input(audioPath);

    cmd
      .complexFilter(filterComplex, 'vout')
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        `-map [vout]`,
        `-map ${n}:a`,
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        `-r ${fps}`,
        `-t ${duration}`,
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('progress', (info) => {
        if (onProgress && info.percent != null) {
          onProgress(Math.min(Math.round(info.percent), 100));
        }
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

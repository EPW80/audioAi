import ffmpeg from 'fluent-ffmpeg';
import { writeFile, mkdir, rm } from 'fs/promises';
import path from 'path';

export interface CompositeAIVideoParams {
  imagePaths: string[];
  beatTimestamps: number[];
  audioPath: string;
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
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
    onProgress,
  } = params;

  if (imagePaths.length === 0) {
    throw new Error('No images provided to compositeAIVideo');
  }

  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // Build a concat demuxer file: each image shown for its beat-section duration
  // beatTimestamps are section boundaries; imagePaths[i] is shown from beatTimestamps[i] to beatTimestamps[i+1]
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
        // Cleanup concat file
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

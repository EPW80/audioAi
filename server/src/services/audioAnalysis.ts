/**
 * Audio analysis service using Python/Librosa for accurate beat detection.
 * Spawns Python child process to analyze audio files.
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, "../../scripts/analyze_audio.py");
const VENV_PYTHON = path.resolve(__dirname, "../../.venv/bin/python");

export interface AudioAnalysisResult {
  success: boolean;
  error?: string;
  duration?: number;
  bpm?: number;
  beats?: number[];
  onsets?: number[];
  peaks?: number[];
  spectral?: {
    times: number[];
    values: number[];
  };
  energy?: {
    times: number[];
    values: number[];
  };
}

/**
 * Analyze audio file using Librosa Python script.
 * @param audioPath - Path to the audio file
 * @returns Analysis results with BPM, beats, onsets, etc.
 */
export async function analyzeAudio(
  audioPath: string,
): Promise<AudioAnalysisResult> {
  return new Promise((resolve) => {
    const absolutePath = path.resolve(audioPath);

    // Use venv python (has librosa installed), fall back to system python
    const pythonCmd = fs.existsSync(VENV_PYTHON)
      ? VENV_PYTHON
      : process.platform === "win32"
        ? "python"
        : "python3";

    const proc = spawn(pythonCmd, [SCRIPT_PATH, absolutePath], {
      timeout: 120000, // 2 minute timeout for long files
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        console.error(`Audio analysis failed with code ${code}: ${stderr}`);
        resolve({
          success: false,
          error: stderr || `Process exited with code ${code}`,
        });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        console.error("Failed to parse analysis output:", stdout);
        resolve({
          success: false,
          error: "Failed to parse analysis output",
        });
      }
    });

    proc.on("error", (err) => {
      console.error("Failed to spawn analysis process:", err);
      resolve({
        success: false,
        error: `Failed to run analysis: ${err.message}. Make sure Python and librosa are installed.`,
      });
    });
  });
}

/**
 * Check if Python and librosa are available.
 */
export async function checkAnalysisDependencies(): Promise<boolean> {
  return new Promise((resolve) => {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const proc = spawn(pythonCmd, ["-c", 'import librosa; print("ok")']);

    proc.on("close", (code) => {
      resolve(code === 0);
    });

    proc.on("error", () => {
      resolve(false);
    });
  });
}

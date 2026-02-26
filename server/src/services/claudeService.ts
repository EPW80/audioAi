import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import type { IAIStyleSuggestion } from '../models/Project.js';
import type { IAudioMetadata } from '../models/Project.js';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const AVAILABLE_STYLES = ['particles', 'waveform', 'nebula', 'cyberpunk', 'aurora', 'fractal', 'ocean'];

export interface AudioMoodContext {
  bpm?: number;
  duration?: number;
  beats?: number[];
  onsets?: number[];
  peaks?: number[];
}

export interface StyleSuggestionResponse {
  suggestions: IAIStyleSuggestion[];
  overallMood: string;
  recommendedMode: 'procedural' | 'ai-hybrid';
}

export async function getStyleSuggestions(
  audioContext: AudioMoodContext
): Promise<StyleSuggestionResponse> {
  const client = getClient();

  // Build a concise summary of audio characteristics
  const beatDensity = audioContext.beats && audioContext.duration
    ? (audioContext.beats.length / audioContext.duration).toFixed(2)
    : 'unknown';
  const peakCount = audioContext.peaks?.length ?? 0;

  const userMessage = `Analyze this audio track's characteristics and suggest the best visual styles for an audio visualization app.

Audio characteristics:
- BPM: ${audioContext.bpm ?? 'unknown'}
- Duration: ${audioContext.duration ? Math.round(audioContext.duration) + 's' : 'unknown'}
- Beat density: ${beatDensity} beats/sec
- Peak moments: ${peakCount}
- Total beats detected: ${audioContext.beats?.length ?? 0}
- Total onsets detected: ${audioContext.onsets?.length ?? 0}

Available visual styles: ${AVAILABLE_STYLES.join(', ')}

Respond ONLY with valid JSON in this exact shape (no markdown, no explanation):
{
  "overallMood": "<2-5 word mood description>",
  "recommendedMode": "procedural" or "ai-hybrid",
  "suggestions": [
    {
      "styleId": "<one of the available styles>",
      "score": <0.0-1.0>,
      "explanation": "<1-2 sentence explanation why this style fits>",
      "suggestedPrompt": "<Stable Diffusion prompt for this style, 10-20 words>",
      "suggestedPalette": ["#hexcolor1", "#hexcolor2", "#hexcolor3"]
    }
  ]
}

Include all ${AVAILABLE_STYLES.length} styles ranked by score descending. Use "ai-hybrid" mode for tracks with BPM > 90 or high energy.`;

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 1024,
    system: 'You are an expert music visualization artist. You analyze audio characteristics and suggest visual styles. Always respond with valid JSON only.',
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const parsed = JSON.parse(text) as StyleSuggestionResponse;
    return parsed;
  } catch {
    throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

export async function refinePrompt(
  basePrompt: string,
  audioContext: AudioMoodContext
): Promise<string> {
  const client = getClient();

  const response = await client.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 256,
    system: 'You are a Stable Diffusion prompt engineer specializing in music visualization. Enhance prompts to create vivid, beat-synchronized visuals. Return only the refined prompt, no explanation.',
    messages: [
      {
        role: 'user',
        content: `Enhance this Stable Diffusion prompt for a ${audioContext.bpm ?? '?'} BPM ${audioContext.duration ? Math.round(audioContext.duration) + 's' : ''} track.

Base prompt: "${basePrompt}"

Return an enhanced prompt (15-30 words) with better artistic detail, lighting, and style descriptors.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text.trim() : basePrompt;
}

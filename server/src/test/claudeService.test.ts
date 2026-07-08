import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock the Anthropic SDK before importing the module under test ─────────────
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

// Also stub env so the module doesn't throw on missing vars
vi.mock('../config/env.js', () => ({
  env: {
    ANTHROPIC_API_KEY: 'test-key',
    CLAUDE_MODEL: 'claude-test',
  },
}));

// Import AFTER mocks are registered
import { generateSectionPrompts, type SectionPromptContext } from '../services/claudeService.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildCtx(overrides: Partial<SectionPromptContext> = {}): SectionPromptContext {
  return {
    basePrompt: 'neon cityscape with rain',
    numSections: 4,
    audioContext: { bpm: 120, duration: 60, beats: Array(30).fill(0), peaks: [10, 30, 50] },
    sectionBoundaries: [0, 15, 30, 45, 60],
    ...overrides,
  };
}

function fakeClaudeResponse(prompts: string[]) {
  return {
    content: [{ type: 'text', text: JSON.stringify(prompts) }],
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('generateSectionPrompts', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('returns base prompt as-is when numSections is 1', async () => {
    const result = await generateSectionPrompts(buildCtx({ numSections: 1 }));
    expect(result).toEqual(['neon cityscape with rain']);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('calls Claude and returns an array of unique prompts', async () => {
    const prompts = [
      'neon city at dawn with soft pink glow',
      'rain-soaked streets reflecting blue neon',
      'cyberpunk rooftop under stormy purple sky',
      'neon cityscape at night full intensity',
    ];
    mockCreate.mockResolvedValueOnce(fakeClaudeResponse(prompts));

    const result = await generateSectionPrompts(buildCtx());

    expect(result).toEqual(prompts);
    expect(mockCreate).toHaveBeenCalledOnce();

    // Verify system prompt and model are passed correctly
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe('claude-test');
    expect(callArgs.system).toContain('Stable Diffusion prompt engineer');
    expect(callArgs.messages[0].content).toContain('neon cityscape with rain');
    expect(callArgs.messages[0].content).toContain('4 unique');
  });

  it('pads result when Claude returns fewer prompts than sections', async () => {
    const prompts = ['prompt A', 'prompt B'];
    mockCreate.mockResolvedValueOnce(fakeClaudeResponse(prompts));

    const result = await generateSectionPrompts(buildCtx({ numSections: 4 }));

    expect(result).toHaveLength(4);
    expect(result[0]).toBe('prompt A');
    expect(result[1]).toBe('prompt B');
    expect(result[2]).toBe('neon cityscape with rain'); // padded with base
    expect(result[3]).toBe('neon cityscape with rain');
  });

  it('trims result when Claude returns more prompts than sections', async () => {
    const prompts = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    mockCreate.mockResolvedValueOnce(fakeClaudeResponse(prompts));

    const result = await generateSectionPrompts(buildCtx({ numSections: 3, sectionBoundaries: [0, 20, 40, 60] }));

    expect(result).toHaveLength(3);
    expect(result).toEqual(['p1', 'p2', 'p3']);
  });

  it('falls back to base prompt array when Claude returns bad JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not valid json at all' }],
    });

    const result = await generateSectionPrompts(buildCtx());

    expect(result).toHaveLength(4);
    result.forEach((p) => expect(p).toBe('neon cityscape with rain'));
  });

  it('falls back to base prompt array when Claude API throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API rate limit'));

    const result = await generateSectionPrompts(buildCtx());

    expect(result).toHaveLength(4);
    result.forEach((p) => expect(p).toBe('neon cityscape with rain'));
  });

  it('falls back when Claude returns a non-array JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"error": "something"}' }],
    });

    const result = await generateSectionPrompts(buildCtx());

    expect(result).toHaveLength(4);
    result.forEach((p) => expect(p).toBe('neon cityscape with rain'));
  });

  it('falls back when Claude returns an empty array', async () => {
    mockCreate.mockResolvedValueOnce(fakeClaudeResponse([]));

    const result = await generateSectionPrompts(buildCtx());

    expect(result).toHaveLength(4);
    result.forEach((p) => expect(p).toBe('neon cityscape with rain'));
  });

  it('includes keyframe hints in the prompt to Claude', async () => {
    const prompts = ['p1', 'p2'];
    mockCreate.mockResolvedValueOnce(fakeClaudeResponse(prompts));

    await generateSectionPrompts(
      buildCtx({
        numSections: 2,
        sectionBoundaries: [0, 30, 60],
        keyframes: [
          { time: 5, style: 'aurora', settings: { colorPalette: ['#00FF00'], intensity: 0.8 } },
          { time: 35, style: 'cyberpunk', settings: { colorPalette: ['#FF0000'], intensity: 1.0 } },
        ],
      })
    );

    const userMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userMsg).toContain('aurora');
    expect(userMsg).toContain('cyberpunk');
    expect(userMsg).toContain('#00FF00');
  });

  it('includes audio context in the prompt to Claude', async () => {
    const prompts = ['p1', 'p2', 'p3', 'p4'];
    mockCreate.mockResolvedValueOnce(fakeClaudeResponse(prompts));

    await generateSectionPrompts(buildCtx());

    const userMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(userMsg).toContain('BPM: 120');
    expect(userMsg).toContain('Duration: 60s');
    expect(userMsg).toContain('Total beats: 30');
    expect(userMsg).toContain('Peak moments: 3');
  });
});

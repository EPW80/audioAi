import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { Project } from '../models/Project.js';
import { getStyleSuggestions, refinePrompt } from '../services/claudeService.js';
import type { IAISettings } from '../models/Project.js';

// POST /api/ai/:projectId/suggest-styles
export async function suggestStyles(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const refresh = req.query.refresh === 'true';

    const project = await Project.findOne({ _id: projectId, userId: req.userId });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!project.audioMetadata) {
      res.status(400).json({ error: 'Audio analysis not complete. Wait for status=ready.' });
      return;
    }

    // Return cached suggestions unless refresh is requested
    if (!refresh && project.aiSettings?.styleSuggestions?.length) {
      res.json({
        suggestions: project.aiSettings.styleSuggestions,
        overallMood: '',
        recommendedMode: project.aiSettings.mode,
      });
      return;
    }

    const audioContext = {
      bpm: project.audioMetadata.bpm,
      duration: project.audioMetadata.duration,
      beats: project.audioMetadata.beats,
      onsets: project.audioMetadata.onsets,
      peaks: project.audioMetadata.peaks,
    };

    const result = await getStyleSuggestions(audioContext);

    // Cache suggestions on project
    await Project.findByIdAndUpdate(projectId, {
      'aiSettings.styleSuggestions': result.suggestions,
    });

    res.json(result);
  } catch (error) {
    console.error('Suggest styles error:', error);
    res.status(500).json({ error: 'Failed to generate style suggestions' });
  }
}

// GET /api/ai/:projectId/suggestions
export async function getSuggestions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ _id: projectId, userId: req.userId });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ suggestions: project.aiSettings?.styleSuggestions ?? [] });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
}

// POST /api/ai/:projectId/refine-prompt
export async function refinePromptHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const { prompt } = req.body as { prompt: string };

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt string required' });
      return;
    }

    const project = await Project.findOne({ _id: projectId, userId: req.userId });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const audioContext = {
      bpm: project.audioMetadata?.bpm,
      duration: project.audioMetadata?.duration,
    };

    const refinedPrompt = await refinePrompt(prompt, audioContext);
    res.json({ refinedPrompt });
  } catch (error) {
    console.error('Refine prompt error:', error);
    res.status(500).json({ error: 'Failed to refine prompt' });
  }
}

// POST /api/ai/:projectId/settings
export async function updateAISettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const updates = req.body as Partial<IAISettings>;

    const project = await Project.findOne({ _id: projectId, userId: req.userId });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const allowedFields: (keyof IAISettings)[] = ['mode', 'sdPrompt', 'sdNegativePrompt', 'sdModel'];
    const patch: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        patch[`aiSettings.${field}`] = updates[field];
      }
    }

    const updated = await Project.findByIdAndUpdate(projectId, patch, { new: true });
    res.json({ aiSettings: updated?.aiSettings });
  } catch (error) {
    console.error('Update AI settings error:', error);
    res.status(500).json({ error: 'Failed to update AI settings' });
  }
}

// GET /api/ai/:projectId/settings
export async function getAISettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ _id: projectId, userId: req.userId });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ aiSettings: project.aiSettings });
  } catch (error) {
    console.error('Get AI settings error:', error);
    res.status(500).json({ error: 'Failed to get AI settings' });
  }
}

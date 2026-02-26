import { Request, Response } from 'express';
import path from 'path';
import { Project } from '../models/Project.js';
import { AuthRequest } from '../middleware/auth.js';
import { analyzeAudio } from '../services/audioAnalysis.js';

export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file uploaded' });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const name = req.body.name || path.parse(req.file.originalname).name;

    const project = await Project.create({
      userId: req.userId,
      name,
      audioPath: req.file.path,
      status: 'analyzing',
    });

    // Trigger async audio analysis
    analyzeAudio(req.file.path)
      .then(async (result) => {
        if (result.success) {
          await Project.findByIdAndUpdate(project._id, {
            status: 'ready',
            'audioMetadata.duration': result.duration,
            'audioMetadata.bpm': result.bpm,
            'audioMetadata.beats': result.beats || [],
            'audioMetadata.onsets': result.onsets || [],
            'audioMetadata.peaks': result.peaks || [],
          });
        } else {
          // Still mark ready even if analysis fails - can visualize without beats
          console.warn('Audio analysis failed:', result.error);
          await Project.findByIdAndUpdate(project._id, { status: 'ready' });
        }
      })
      .catch((err) => {
        console.error('Audio analysis error:', err);
        Project.findByIdAndUpdate(project._id, { status: 'ready' }).catch(() => {});
      });

    res.status(201).json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projects = await Project.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select('-audioPath');

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProjectSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { particleCount, colorPalette, intensity, style, resolution } = req.body;

    const $set: Record<string, unknown> = {};
    if (particleCount !== undefined) $set['settings.particleCount'] = particleCount;
    if (colorPalette !== undefined) $set['settings.colorPalette'] = colorPalette;
    if (intensity !== undefined) $set['settings.intensity'] = intensity;
    if (style !== undefined) $set['settings.style'] = style;
    if (resolution !== undefined) $set['settings.resolution'] = resolution;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProjectKeyframes(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { keyframes } = req.body;

    if (!Array.isArray(keyframes)) {
      res.status(400).json({ error: 'keyframes must be an array' });
      return;
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { keyframes } },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error('Update keyframes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // TODO: Delete audio and output files from filesystem

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  buildTestApp,
  startMongo,
  stopMongo,
  clearCollections,
  signTestToken,
} from './helpers.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';

const app = buildTestApp();

// ─── helpers ─────────────────────────────────────────────────────────────────

async function createUser() {
  const user = await User.create({
    email: `test-${Date.now()}@example.com`,
    passwordHash: 'hashed-not-real',
  });
  return { user, token: signTestToken(user._id.toString()) };
}

async function createProject(userId: mongoose.Types.ObjectId) {
  return Project.create({
    userId,
    name: 'Test Track',
    audioPath: 'uploads/test.mp3',
    status: 'uploaded',
  });
}

// ─── lifecycle ────────────────────────────────────────────────────────────────

beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(clearCollections);

// ─── PATCH /api/projects/:id/settings ────────────────────────────────────────

describe('PATCH /api/projects/:id/settings', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .patch('/api/projects/000000000000000000000001/settings')
      .send({ particleCount: 3000 });
    expect(res.status).toBe(401);
  });

  it('returns 404 for a project that does not belong to the user', async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    const project = await createProject(other._id);

    const res = await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ particleCount: 3000 });

    expect(res.status).toBe(404);
  });

  it('updates particleCount', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    const res = await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ particleCount: 4000 });

    expect(res.status).toBe(200);
    expect(res.body.project.settings.particleCount).toBe(4000);
  });

  it('updates intensity', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    const res = await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ intensity: 1.8 });

    expect(res.status).toBe(200);
    expect(res.body.project.settings.intensity).toBe(1.8);
  });

  it('updates colorPalette', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);
    const palette = ['#FF0000', '#00FF00', '#0000FF'];

    const res = await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ colorPalette: palette });

    expect(res.status).toBe(200);
    expect(res.body.project.settings.colorPalette).toEqual(palette);
  });

  it('updates visual style preset', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    const res = await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ style: 'nebula' });

    expect(res.status).toBe(200);
    expect(res.body.project.settings.style).toBe('nebula');
  });

  it('updates resolution to 1080p', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    const res = await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resolution: '1080p' });

    expect(res.status).toBe(200);
    expect(res.body.project.settings.resolution).toBe('1080p');
  });

  it('updates multiple fields in a single request', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    const res = await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        particleCount: 3500,
        intensity: 1.5,
        style: 'aurora',
        resolution: '1080p',
        colorPalette: ['#34D399', '#6EE7B7', '#A7F3D0'],
      });

    expect(res.status).toBe(200);
    const { settings } = res.body.project;
    expect(settings.particleCount).toBe(3500);
    expect(settings.intensity).toBe(1.5);
    expect(settings.style).toBe('aurora');
    expect(settings.resolution).toBe('1080p');
    expect(settings.colorPalette).toEqual(['#34D399', '#6EE7B7', '#A7F3D0']);
  });

  it('does not overwrite fields that are omitted', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    // Set initial values
    await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ particleCount: 5000, style: 'cyberpunk' });

    // Update only intensity
    const res = await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ intensity: 0.5 });

    expect(res.status).toBe(200);
    expect(res.body.project.settings.particleCount).toBe(5000);
    expect(res.body.project.settings.style).toBe('cyberpunk');
    expect(res.body.project.settings.intensity).toBe(0.5);
  });

  it('persists changes to the database', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ style: 'waveform', particleCount: 64 });

    const saved = await Project.findById(project._id);
    expect(saved?.settings.style).toBe('waveform');
    expect(saved?.settings.particleCount).toBe(64);
  });
});

// ─── PATCH /api/projects/:id/keyframes ───────────────────────────────────────

describe('PATCH /api/projects/:id/keyframes', () => {
  const validKeyframe = {
    time: 10.5,
    style: 'nebula',
    settings: {
      particleCount: 3000,
      colorPalette: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
      intensity: 0.8,
    },
  };

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .patch('/api/projects/000000000000000000000001/keyframes')
      .send({ keyframes: [] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when keyframes is not an array', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    const res = await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes: 'not-an-array' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/array/i);
  });

  it('returns 404 for a project that does not belong to the user', async () => {
    const { token } = await createUser();
    const { user: other } = await createUser();
    const project = await createProject(other._id);

    const res = await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes: [validKeyframe] });

    expect(res.status).toBe(404);
  });

  it('saves a single keyframe', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    const res = await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes: [validKeyframe] });

    expect(res.status).toBe(200);
    expect(res.body.project.keyframes).toHaveLength(1);
    expect(res.body.project.keyframes[0].time).toBe(10.5);
    expect(res.body.project.keyframes[0].style).toBe('nebula');
  });

  it('saves multiple keyframes', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    const keyframes = [
      { time: 5.0, style: 'particles', settings: { particleCount: 2000, colorPalette: ['#4F46E5', '#7C3AED', '#EC4899'], intensity: 1.0 } },
      { time: 30.0, style: 'aurora', settings: { particleCount: 2500, colorPalette: ['#34D399', '#6EE7B7', '#A7F3D0'], intensity: 0.9 } },
      { time: 60.0, style: 'cyberpunk', settings: { particleCount: 1000, colorPalette: ['#F0ABFC', '#22D3EE', '#4ADE80'], intensity: 1.2 } },
    ];

    const res = await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes });

    expect(res.status).toBe(200);
    expect(res.body.project.keyframes).toHaveLength(3);
    expect(res.body.project.keyframes.map((k: { time: number }) => k.time)).toEqual([5.0, 30.0, 60.0]);
  });

  it('replaces existing keyframes on subsequent calls', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes: [validKeyframe, { ...validKeyframe, time: 20.0 }] });

    // Replace with just one keyframe
    const res = await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes: [{ ...validKeyframe, time: 45.0 }] });

    expect(res.status).toBe(200);
    expect(res.body.project.keyframes).toHaveLength(1);
    expect(res.body.project.keyframes[0].time).toBe(45.0);
  });

  it('clears all keyframes when passed an empty array', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes: [validKeyframe] });

    const res = await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes: [] });

    expect(res.status).toBe(200);
    expect(res.body.project.keyframes).toHaveLength(0);
  });

  it('persists keyframes to the database', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes: [validKeyframe] });

    const saved = await Project.findById(project._id);
    expect(saved?.keyframes).toHaveLength(1);
    expect(saved?.keyframes[0].time).toBe(10.5);
    expect(saved?.keyframes[0].style).toBe('nebula');
    expect(saved?.keyframes[0].settings.particleCount).toBe(3000);
  });

  it('preserves settings when updating keyframes', async () => {
    const { user, token } = await createUser();
    const project = await createProject(user._id);

    // Update settings first
    await request(app)
      .patch(`/api/projects/${project._id}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ style: 'waveform', particleCount: 64 });

    // Update keyframes
    await request(app)
      .patch(`/api/projects/${project._id}/keyframes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ keyframes: [validKeyframe] });

    const saved = await Project.findById(project._id);
    // Settings should be unchanged
    expect(saved?.settings.style).toBe('waveform');
    expect(saved?.settings.particleCount).toBe(64);
    // Keyframes should be saved
    expect(saved?.keyframes).toHaveLength(1);
  });
});

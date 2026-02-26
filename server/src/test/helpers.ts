import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import projectRoutes from '../routes/projects.js';

let mongod: MongoMemoryServer;

// Build a minimal Express app wired to in-memory Mongo — no Redis/queues
export function buildTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/projects', projectRoutes);
  return app;
}

export async function startMongo() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function stopMongo() {
  await mongoose.disconnect();
  await mongod.stop();
}

export async function clearCollections() {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

const TEST_JWT_SECRET = 'test-secret-at-least-32-characters-long!!';

export function signTestToken(userId: string): string {
  return jwt.sign({ userId }, TEST_JWT_SECRET, { expiresIn: '1h' });
}


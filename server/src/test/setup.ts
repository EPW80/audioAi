// This file runs before any test modules are imported (via vitest setupFiles).
// Environment variables must be set here so that env.ts evaluates them correctly
// when it is first imported as part of the module graph.

process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long!!';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.UPLOAD_DIR = '/tmp/test-uploads';
process.env.OUTPUT_DIR = '/tmp/test-outputs';

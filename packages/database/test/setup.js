// Test setup for database package
import { expect, vi } from 'vitest';

// Global test utilities
globalThis.expect = expect;
globalThis.vi = vi;

// Mock environment variables
process.env.NODE_ENV = 'test';

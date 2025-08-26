// Test setup for backend package
import { expect, vi } from 'vitest';

// Global test utilities
globalThis.expect = expect;
globalThis.vi = vi;

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.BINANCE_API_KEY = 'test-binance-key';
process.env.BINANCE_API_SECRET = 'test-binance-secret';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';

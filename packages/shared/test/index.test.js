import { describe, it, expect } from 'vitest';
import {
  WEBSOCKET_MESSAGE_TYPES,
  ORDER_TYPES,
  ORDER_SIDES,
  ORDER_STATUSES,
  SIGNAL_TYPES,
  TIMEFRAMES,
  generateRequestId,
  formatPrice,
  formatPercentage,
  formatDate,
  isValidOrderType,
  isValidOrderSide,
  isValidOrderStatus,
  isValidSignalType,
  isValidTimeframe,
  DEFAULT_ORDERS_LIMIT,
  MAX_ORDERS_LIMIT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  WEBSOCKET_STATES
} from '../src/index.js';

describe('Shared Package', () => {
  describe('Constants', () => {
    it('should export WebSocket message types', () => {
      expect(WEBSOCKET_MESSAGE_TYPES).toBeDefined();
      expect(WEBSOCKET_MESSAGE_TYPES.GET_SIGNALS).toBe('get_signals');
      expect(WEBSOCKET_MESSAGE_TYPES.SIGNALS_RESPONSE).toBe('signals_response');
    });

    it('should export order types', () => {
      expect(ORDER_TYPES).toBeDefined();
      expect(ORDER_TYPES.MARKET).toBe('MARKET');
      expect(ORDER_TYPES.LIMIT).toBe('LIMIT');
    });

    it('should export order sides', () => {
      expect(ORDER_SIDES).toBeDefined();
      expect(ORDER_SIDES.BUY).toBe('BUY');
      expect(ORDER_SIDES.SELL).toBe('SELL');
    });

    it('should export order statuses', () => {
      expect(ORDER_STATUSES).toBeDefined();
      expect(ORDER_STATUSES.PENDING).toBe('PENDING');
      expect(ORDER_STATUSES.FILLED).toBe('FILLED');
    });

    it('should export signal types', () => {
      expect(SIGNAL_TYPES).toBeDefined();
      expect(SIGNAL_TYPES.BUY).toBe('BUY');
      expect(SIGNAL_TYPES.SELL).toBe('SELL');
      expect(SIGNAL_TYPES.HOLD).toBe('HOLD');
    });

    it('should export timeframes', () => {
      expect(TIMEFRAMES).toBeDefined();
      expect(TIMEFRAMES['1h']).toBe('1h');
      expect(TIMEFRAMES['1d']).toBe('1d');
    });

    it('should export constants', () => {
      expect(DEFAULT_ORDERS_LIMIT).toBe('all');
      expect(MAX_ORDERS_LIMIT).toBe(1000);
      expect(DEFAULT_PAGE_SIZE).toBe(20);
      expect(MAX_PAGE_SIZE).toBe(100);
    });

    it('should export WebSocket states', () => {
      expect(WEBSOCKET_STATES).toBeDefined();
      expect(WEBSOCKET_STATES.OPEN).toBe(1);
      expect(WEBSOCKET_STATES.CLOSED).toBe(3);
    });
  });

  describe('Utility Functions', () => {
    it('should generate request ID', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).toMatch(/^req_\d+_\d+\.\d+$/);
      expect(id2).toMatch(/^req_\d+_\d+\.\d+$/);
      expect(id1).not.toBe(id2);
    });

    it('should format price', () => {
      expect(formatPrice(123.456)).toBe('123.46');
      expect(formatPrice(123.456, 3)).toBe('123.456');
      expect(formatPrice(0)).toBe('0.00');
    });

    it('should format percentage', () => {
      expect(formatPercentage(0.123)).toBe('12.30%');
      expect(formatPercentage(0.123, 1)).toBe('12.3%');
      expect(formatPercentage(0)).toBe('0.00%');
    });

    it('should format date', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      const formatted = formatDate(date);
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('2023');
    });
  });

  describe('Validation Functions', () => {
    it('should validate order types', () => {
      expect(isValidOrderType('MARKET')).toBe(true);
      expect(isValidOrderType('LIMIT')).toBe(true);
      expect(isValidOrderType('INVALID')).toBe(false);
    });

    it('should validate order sides', () => {
      expect(isValidOrderSide('BUY')).toBe(true);
      expect(isValidOrderSide('SELL')).toBe(true);
      expect(isValidOrderSide('INVALID')).toBe(false);
    });

    it('should validate order statuses', () => {
      expect(isValidOrderStatus('PENDING')).toBe(true);
      expect(isValidOrderStatus('FILLED')).toBe(true);
      expect(isValidOrderStatus('INVALID')).toBe(false);
    });

    it('should validate signal types', () => {
      expect(isValidSignalType('BUY')).toBe(true);
      expect(isValidSignalType('SELL')).toBe(true);
      expect(isValidSignalType('HOLD')).toBe(true);
      expect(isValidSignalType('INVALID')).toBe(false);
    });

    it('should validate timeframes', () => {
      expect(isValidTimeframe('1h')).toBe(true);
      expect(isValidTimeframe('1d')).toBe(true);
      expect(isValidTimeframe('INVALID')).toBe(false);
    });
  });
});

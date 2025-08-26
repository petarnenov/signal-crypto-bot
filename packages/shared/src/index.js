// Shared utilities and types for Signal Crypto Bot

// WebSocket message types
export const WEBSOCKET_MESSAGE_TYPES = {
  // Connection
  CONNECTION_STATUS: 'connection_status',
  PING: 'ping',
  PONG: 'pong',
  
  // Signals
  GET_SIGNALS: 'get_signals',
  SIGNALS_RESPONSE: 'signals_response',
  SIGNAL_GENERATED: 'signal_generated',
  
  // Paper Trading
  GET_PAPER_TRADING_ACCOUNTS: 'get_paper_trading_accounts',
  PAPER_TRADING_ACCOUNTS_RESPONSE: 'paper_trading_accounts_response',
  GET_PAPER_TRADING_POSITIONS: 'get_paper_trading_positions',
  PAPER_TRADING_POSITIONS_RESPONSE: 'paper_trading_positions_response',
  GET_PAPER_TRADING_ORDERS: 'get_paper_trading_orders',
  PAPER_TRADING_ORDERS_RESPONSE: 'paper_trading_orders_response',
  
  // User Settings
  GET_USER_SETTING: 'get_user_setting',
  USER_SETTING_RESPONSE: 'user_setting_response',
  SET_USER_SETTING: 'set_user_setting',
  USER_SETTING_UPDATED_RESPONSE: 'user_setting_updated_response',
  
  // Configuration
  GET_CONFIG: 'get_config',
  CONFIG_RESPONSE: 'config_response',
  UPDATE_CONFIG: 'update_config',
  CONFIG_UPDATED_RESPONSE: 'config_updated_response',
  CONFIG_UPDATED: 'config_updated',
  
  // Signal Generator
  GET_SIGNAL_GENERATOR_STATUS: 'get_signal_generator_status',
  SIGNAL_GENERATOR_STATUS_RESPONSE: 'signal_generator_status_response',
  START_SIGNAL_GENERATOR: 'start_signal_generator',
  STOP_SIGNAL_GENERATOR: 'stop_signal_generator',
  
  // Error
  ERROR: 'error'
};

// Order types
export const ORDER_TYPES = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  STOP: 'STOP',
  STOP_LIMIT: 'STOP_LIMIT'
};

// Order sides
export const ORDER_SIDES = {
  BUY: 'BUY',
  SELL: 'SELL'
};

// Order statuses
export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED'
};

// Signal types
export const SIGNAL_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL',
  HOLD: 'HOLD'
};

// Timeframes
export const TIMEFRAMES = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w'
};

// Utility functions
export const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random()}`;
};

export const formatPrice = (price, decimals = 2) => {
  return parseFloat(price).toFixed(decimals);
};

export const formatPercentage = (value, decimals = 2) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleString();
};

// Validation functions
export const isValidOrderType = (type) => {
  return Object.values(ORDER_TYPES).includes(type);
};

export const isValidOrderSide = (side) => {
  return Object.values(ORDER_SIDES).includes(side);
};

export const isValidOrderStatus = (status) => {
  return Object.values(ORDER_STATUSES).includes(status);
};

export const isValidSignalType = (type) => {
  return Object.values(SIGNAL_TYPES).includes(type);
};

export const isValidTimeframe = (timeframe) => {
  return Object.values(TIMEFRAMES).includes(timeframe);
};

// Constants
export const DEFAULT_ORDERS_LIMIT = 'all';
export const MAX_ORDERS_LIMIT = 1000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// WebSocket connection states
export const WEBSOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

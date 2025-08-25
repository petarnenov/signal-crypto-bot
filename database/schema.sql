-- Crypto Signal Bot Database Schema

-- Signals table - stores all generated signals
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cryptocurrency TEXT NOT NULL,
    signalType TEXT NOT NULL CHECK (signalType IN ('buy', 'sell', 'hold')),
    timeframe TEXT NOT NULL,
    price DECIMAL(20, 8),
    confidence DECIMAL(3, 2),
    aiReasoning TEXT,
    technicalIndicators TEXT, -- JSON string
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    executedAt DATETIME,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled', 'expired'))
);

-- Configuration table - stores bot settings
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Telegram chats table - stores chat configurations
CREATE TABLE IF NOT EXISTS telegram_chats (
    id INTEGER PRIMARY KEY,
    chatId TEXT UNIQUE NOT NULL,
    chatType TEXT NOT NULL, -- 'private', 'group', 'channel'
    chatTitle TEXT,
    isActive BOOLEAN DEFAULT 1,
    notificationTypes TEXT, -- JSON array: ['buy', 'sell', 'hold']
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI analysis history table - stores GPT-5 analysis results
CREATE TABLE IF NOT EXISTS ai_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cryptocurrency TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    marketData TEXT, -- JSON string with OHLCV data
    aiResponse TEXT NOT NULL,
    tokensUsed INTEGER,
    cost DECIMAL(10, 6),
    analysisTimeMs INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics table - tracks signal accuracy
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signalId INTEGER,
    cryptocurrency TEXT NOT NULL,
    entryPrice DECIMAL(20, 8),
    exitPrice DECIMAL(20, 8),
    profitLoss DECIMAL(20, 8),
    profitLossPercent DECIMAL(10, 4),
    durationHours INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (signalId) REFERENCES signals(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_signals_crypto ON signals(cryptocurrency);
CREATE INDEX IF NOT EXISTS idx_signals_created ON signals(createdAt);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_crypto ON ai_analysis(cryptocurrency);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created ON ai_analysis(createdAt);

-- Create backtest_results table
CREATE TABLE IF NOT EXISTS backtest_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cryptocurrency TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    strategy TEXT NOT NULL,
    initialBalance REAL NOT NULL,
    finalBalance REAL NOT NULL,
    totalReturn TEXT NOT NULL,
    totalTrades INTEGER NOT NULL,
    winRate TEXT NOT NULL,
    maxDrawdown TEXT NOT NULL,
    results TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create paper_trading_accounts table
CREATE TABLE IF NOT EXISTS paper_trading_accounts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    balance REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    equity REAL NOT NULL,
    unrealizedPnl REAL DEFAULT 0,
    realizedPnl REAL DEFAULT 0,
    totalTrades INTEGER DEFAULT 0,
    winningTrades INTEGER DEFAULT 0,
    losingTrades INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create paper_trading_orders table
CREATE TABLE IF NOT EXISTS paper_trading_orders (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type TEXT NOT NULL CHECK (type IN ('MARKET', 'LIMIT')),
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    executionPrice REAL,
    amount REAL,
    commission REAL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED')),
    isRealOrder BOOLEAN DEFAULT 0,
    binanceOrderId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    filledAt DATETIME,
    FOREIGN KEY (accountId) REFERENCES paper_trading_accounts (id)
);

-- Create paper_trading_positions table
CREATE TABLE IF NOT EXISTS paper_trading_positions (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
    quantity REAL NOT NULL,
    avgPrice REAL NOT NULL,
    currentPrice REAL,
    unrealizedPnl REAL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES paper_trading_accounts (id)
);

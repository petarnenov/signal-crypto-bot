-- Crypto Signal Bot Database Schema

-- Signals table - stores all generated signals
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cryptocurrency TEXT NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'hold')),
    timeframe TEXT NOT NULL,
    price DECIMAL(20, 8),
    confidence DECIMAL(3, 2),
    ai_reasoning TEXT,
    technical_indicators TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    executed_at DATETIME,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled', 'expired'))
);

-- Configuration table - stores bot settings
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Telegram chats table - stores chat configurations
CREATE TABLE IF NOT EXISTS telegram_chats (
    id INTEGER PRIMARY KEY,
    chat_id TEXT UNIQUE NOT NULL,
    chat_type TEXT NOT NULL, -- 'private', 'group', 'channel'
    chat_title TEXT,
    is_active BOOLEAN DEFAULT 1,
    notification_types TEXT, -- JSON array: ['buy', 'sell', 'hold']
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI analysis history table - stores GPT-5 analysis results
CREATE TABLE IF NOT EXISTS ai_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cryptocurrency TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    market_data TEXT, -- JSON string with OHLCV data
    ai_response TEXT NOT NULL,
    tokens_used INTEGER,
    cost DECIMAL(10, 6),
    analysis_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics table - tracks signal accuracy
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_id INTEGER,
    cryptocurrency TEXT NOT NULL,
    entry_price DECIMAL(20, 8),
    exit_price DECIMAL(20, 8),
    profit_loss DECIMAL(20, 8),
    profit_loss_percent DECIMAL(10, 4),
    duration_hours INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (signal_id) REFERENCES signals(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_signals_crypto ON signals(cryptocurrency);
CREATE INDEX IF NOT EXISTS idx_signals_created ON signals(created_at);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_crypto ON ai_analysis(cryptocurrency);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_created ON ai_analysis(created_at);

-- Create backtest_results table
CREATE TABLE IF NOT EXISTS backtest_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cryptocurrency TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    strategy TEXT NOT NULL,
    initial_balance REAL NOT NULL,
    final_balance REAL NOT NULL,
    total_return TEXT NOT NULL,
    total_trades INTEGER NOT NULL,
    win_rate TEXT NOT NULL,
    max_drawdown TEXT NOT NULL,
    results TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create paper_trading_accounts table
CREATE TABLE IF NOT EXISTS paper_trading_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    balance REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    equity REAL NOT NULL,
    unrealized_pnl REAL DEFAULT 0,
    realized_pnl REAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create paper_trading_orders table
CREATE TABLE IF NOT EXISTS paper_trading_orders (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type TEXT NOT NULL CHECK (type IN ('MARKET', 'LIMIT')),
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    execution_price REAL,
    amount REAL,
    commission REAL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    filled_at DATETIME,
    FOREIGN KEY (account_id) REFERENCES paper_trading_accounts (id)
);

-- Create paper_trading_positions table
CREATE TABLE IF NOT EXISTS paper_trading_positions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
    quantity REAL NOT NULL,
    avg_price REAL NOT NULL,
    unrealized_pnl REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES paper_trading_accounts (id)
);

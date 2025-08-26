# Signal Crypto Bot - Nx Monorepo

A comprehensive crypto trading bot with real-time signals, paper trading, and
WebSocket communication.

## 🏗️ Monorepo Structure

```bash
signal-crypto-bot/
├── packages/
│   ├── shared/          # Shared utilities and constants
│   ├── database/        # Database layer (SQLite)
│   ├── backend/         # Backend server (Node.js/Express)
│   └── frontend/        # Frontend React application
├── nx.json              # Nx workspace configuration
├── tsconfig.base.json   # Base TypeScript configuration
└── package.json         # Root package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Installation

```bash
npm install
```

## 📦 Packages

### Shared (`packages/shared`)

Contains shared utilities, constants, and types used across the monorepo.

**Key exports:**

- WebSocket message types
- Order types and statuses
- Signal types
- Utility functions
- Validation functions

### Database (`packages/database`)

SQLite database layer with schema management and data access methods.

**Features:**

- Configuration management
- Signal storage and retrieval
- Paper trading accounts, positions, and orders
- AI analysis storage
- Performance metrics

### Backend (`packages/backend`)

Node.js/Express server with WebSocket support.

**Features:**

- WebSocket real-time communication
- Signal generation with AI integration
- Paper trading service
- Telegram bot integration
- Binance API integration
- Configuration management

### Frontend (`packages/frontend`)

React application with real-time updates.

**Features:**

- Real-time dashboard
- Paper trading interface
- Signal management
- Configuration panel
- WebSocket connection status
- Responsive design

## 🔧 Available Scripts

### Development

- `npm run dev` - Start all services in development mode
- `npm run dev:backend` - Start backend server
- `npm run dev:frontend` - Start frontend development server

### Testing

- `npm test` - Run all tests
- `npm run test:backend` - Run backend tests
- `npm run test:frontend` - Run frontend tests
- `npm run test:shared` - Run shared package tests
- `npm run test:database` - Run database tests
- `npm run test:integration` - Run integration tests

### Building

- `npm run build` - Build all packages
- `npm run build:backend` - Build backend
- `npm run build:frontend` - Build frontend

### Linting & Code Quality

- `npm run lint` - Run linting on all packages
- `npm run lint:fix` - Fix linting issues
- `npm run lint:md` - Fix markdown linting issues
- `npm run spell:check` - Run spell checking

### Database

- `npm run seed` - Seed the database with initial data
- `npm run clean:db` - Clean database files

### Docker

- `npm run docker:build` - Build Docker containers
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers
- `npm run docker:logs` - View Docker logs

## 🌐 WebSocket Communication

The application uses WebSocket for real-time communication between frontend and backend.

### Message Types

- Connection status updates
- Signal generation and updates
- Paper trading data
- Configuration updates
- User settings management

## 🗄️ Database Schema

The SQLite database includes tables for:

- Configuration settings
- Signals and analysis
- Paper trading accounts
- Positions and orders
- AI analysis results
- Performance metrics

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Backend Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=crypto_bot.db

# Binance API
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
BINANCE_USE_SANDBOX=true

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

## 🧪 Testing

The project uses Vitest for testing with comprehensive test coverage:

- **Unit Tests**: Individual component and function tests
- **Integration Tests**: End-to-end functionality tests
- **WebSocket Tests**: Real-time communication tests
- **Database Tests**: Data persistence and retrieval tests

## 📊 Monitoring

- Real-time connection status
- Signal generation monitoring
- Paper trading performance tracking
- Error logging and reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 👨‍💻 Author

Petar Petrov

---

**Note**: This is a monorepo using Nx for efficient development and testing. All
packages are designed to work together seamlessly while maintaining clear
separation of concerns.

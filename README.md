# Signal Crypto Bot - AI-Powered Trading Bot

A comprehensive cryptocurrency trading bot with real-time AI signals, paper trading,
WebSocket communication, and full Docker containerization.

## 🚀 Features

### 🤖 AI-Powered Signal Generation

- **OpenAI Integration**: Advanced signal analysis using GPT models
- **Real-time Analysis**: Continuous market monitoring and signal generation
- **Technical Indicators**: MACD, Bollinger Bands, Stochastic analysis
- **Multi-timeframe Analysis**: 1m, 5m, 15m, 1h, 4h, 1d timeframes

### 📊 Paper Trading System

- **Virtual Accounts**: Multiple paper trading accounts with configurable balance
- **Order Management**: Market, limit, and stop orders
- **Position Tracking**: Real-time P&L calculation and position management
- **Performance Analytics**: Detailed trading performance metrics

### 🔄 Real-time Communication

- **WebSocket Integration**: Live updates between frontend and backend
- **Connection Status**: Real-time connection monitoring and auto-reconnection
- **Live Dashboard**: Instant updates for signals, positions, and account status

### 🐳 Docker Containerization

- **Multi-service Architecture**: Backend, frontend, database, monitoring
- **Production Ready**: Optimized Docker images with Nginx and monitoring
- **Development Environment**: Hot-reload support for rapid development
- **Monitoring Stack**: Prometheus and Grafana integration

### 📱 Modern Web Interface

- **React Frontend**: Modern, responsive UI with real-time updates
- **Interactive Charts**: Signal visualization and trading charts
- **Configuration Panel**: Easy bot configuration and settings management
- **Mobile Responsive**: Works on desktop and mobile devices

### 🔧 Advanced Configuration

- **Orders Limit**: Configurable maximum number of concurrent orders
- **Risk Management**: Stop-loss and take-profit settings
- **Exchange Integration**: Binance API with sandbox support
- **Telegram Bot**: Signal notifications and bot control

## 🏗️ Architecture

### Monorepo Structure (Nx)

```bash
signal-crypto-bot/
├── packages/
│   ├── shared/          # Shared utilities, types, and constants
│   ├── database/        # SQLite database layer
│   ├── backend/         # Node.js/Express server with WebSocket
│   └── frontend/        # React application with Vite
├── monitoring/          # Prometheus and Grafana configs
├── docker-compose.yml   # Production Docker setup
├── docker-compose.dev.yml # Development Docker setup
├── nx.json              # Nx workspace configuration
└── package.json         # Root package.json
```

### Services Architecture

- **Backend**: Node.js API server with WebSocket support (port 3001)
- **Frontend**: React app served by Nginx (port 3000)
- **Database**: SQLite with persistent storage
- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Monitoring dashboards (port 3002)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker & Docker Compose (for containerized deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/petarnenov/signal-crypto-bot.git
cd signal-crypto-bot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development servers
npm run dev

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Docker Deployment

```bash
# Production deployment
npm run docker:build
npm run docker:up

# Development with hot-reload
npm run docker:dev:build
npm run docker:dev

# View logs
npm run docker:logs
```

## 📦 Package Details

### Shared (`packages/shared`)

**Purpose**: Common utilities and types across the monorepo

**Key Features**:

- WebSocket message types and protocols
- Order types (MARKET, LIMIT, STOP)
- Signal types and analysis results
- Validation functions and constants
- Shared configuration types

### Database (`packages/database`)

**Purpose**: Data persistence and management

**Features**:

- SQLite database with optimized schema
- Configuration management and persistence
- Signal storage with metadata
- Paper trading accounts and positions
- Order history and performance metrics
- AI analysis result storage

### Backend (`packages/backend`)

**Purpose**: Core trading logic and API server

**Features**:

- WebSocket server for real-time communication
- AI signal generation with OpenAI integration
- Paper trading service with order management
- Binance API integration (live and sandbox)
- Telegram bot for notifications
- Configuration management
- Performance monitoring and metrics

### Frontend (`packages/frontend`)

**Purpose**: Modern web interface

**Features**:

- Real-time dashboard with live updates
- Interactive paper trading interface
- Signal management and visualization
- Configuration panel with live updates
- WebSocket connection status monitoring
- Responsive design for all devices
- Error handling and user feedback

## 🔧 Available Scripts

### Development

```bash
npm run dev                    # Start all services
npm run dev:frontend          # Start frontend only
npm run dev:backend           # Start backend only
```

### Testing

```bash
npm run test                  # Run all tests
npm run test:all             # Run all tests with coverage
npm run test:frontend        # Frontend tests only
npm run test:backend         # Backend tests only
npm run test:integration     # Integration tests only
npm run test:shared          # Shared package tests
npm run test:database        # Database tests
```

### Building

```bash
npm run build                # Build all packages
npm run build:frontend       # Build frontend
npm run build:backend        # Build backend
```

### Code Quality

```bash
npm run lint                 # Run ESLint on all packages
npm run lint:fix            # Fix linting issues
npm run lint:md             # Fix markdown issues
npm run spell:check         # Run spell checking
```

### Docker

```bash
# Production
npm run docker:build        # Build production images
npm run docker:up           # Start production services
npm run docker:down         # Stop services
npm run docker:logs         # View logs
npm run docker:restart      # Restart services
npm run docker:clean        # Clean up volumes
npm run docker:rebuild      # Rebuild and restart

# Development
npm run docker:dev:build    # Build development images
npm run docker:dev:up       # Start development services
npm run docker:dev:down     # Stop development services
npm run docker:dev:logs     # View development logs
npm run docker:dev          # Start with hot-reload
```

### Database

```bash
npm run seed                # Seed database with test data
npm run clean:db            # Clean database files
```

## 🌐 WebSocket Communication

The application uses WebSocket for real-time bidirectional communication:

### Message Types

- **Connection Status**: Real-time connection monitoring
- **Signal Updates**: New signals and analysis results
- **Paper Trading**: Account updates, position changes, order status
- **Configuration**: Settings updates and validation
- **Error Handling**: Connection errors and recovery

### Connection Management

- **Auto-reconnection**: Automatic reconnection on connection loss
- **Heartbeat**: Connection health monitoring
- **Error Recovery**: Graceful error handling and recovery

## 🗄️ Database Schema

### Core Tables

- **configurations**: Bot settings and parameters
- **signals**: Generated trading signals with metadata
- **paper_accounts**: Virtual trading accounts
- **positions**: Open and closed trading positions
- **orders**: Order history and status tracking
- **ai_analysis**: AI analysis results and insights
- **performance_metrics**: Trading performance data

### Key Features

- **ACID Compliance**: Full transaction support
- **Performance Optimized**: Indexed queries for fast access
- **Data Integrity**: Foreign key constraints and validation
- **Backup Support**: Easy backup and restore functionality

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

# Logging
LOG_LEVEL=info
```

## 🧪 Testing Strategy

### Test Coverage

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: End-to-end functionality testing
- **WebSocket Tests**: Real-time communication testing
- **Database Tests**: Data persistence and retrieval testing
- **Frontend Tests**: UI component and user interaction testing

### Testing Tools

- **Vitest**: Fast test runner for all packages
- **React Testing Library**: Frontend component testing
- **Supertest**: API endpoint testing
- **WebSocket Testing**: Real-time communication testing

### Test Commands

```bash
npm run test:all           # Run all tests with coverage
npm run test:integration   # Run integration tests
npm run test:frontend      # Frontend tests only
npm run test:backend       # Backend tests only
```

## 📊 Monitoring & Observability

### Prometheus Metrics

- **Application Metrics**: Request rates, response times, error rates
- **Trading Metrics**: Signal generation, order execution, P&L
- **System Metrics**: CPU, memory, disk usage
- **Custom Metrics**: Business-specific trading metrics

### Grafana Dashboards

- **Trading Dashboard**: Real-time trading performance
- **System Dashboard**: Infrastructure and application health
- **Signal Dashboard**: Signal generation and accuracy metrics
- **Custom Dashboards**: Configurable business metrics

### Logging

- **Structured Logging**: JSON format for easy parsing
- **Log Levels**: Debug, info, warn, error levels
- **Log Rotation**: Automatic log file management
- **Error Tracking**: Detailed error reporting and stack traces

## 🐳 Docker Architecture

### Production Setup

- **Multi-stage Builds**: Optimized image sizes
- **Nginx Reverse Proxy**: Frontend serving and API proxying
- **WebSocket Support**: Proper WebSocket proxy configuration
- **Health Checks**: Container health monitoring
- **Security**: Non-root user execution

### Development Setup

- **Hot Reload**: Source code changes trigger automatic restarts
- **Volume Mounts**: Live code editing and database persistence
- **Development Tools**: Debugging and development utilities
- **Fast Iteration**: Quick development cycles

### Services

```yaml
# Production Services
backend:     # Node.js API server
frontend:    # React app with Nginx
database:    # SQLite with persistent storage
prometheus:  # Metrics collection
grafana:     # Monitoring dashboards

# Development Services
backend-dev: # Backend with hot-reload
frontend-dev: # Frontend with Vite dev server
```

## 🔒 Security Features

- **API Key Protection**: Environment variables for sensitive data
- **Input Validation**: Comprehensive input sanitization
- **Error Handling**: Secure error messages without data leakage
- **Container Security**: Non-root user execution
- **Network Isolation**: Service-to-service communication security

## 📈 Performance Optimizations

- **WebSocket Efficiency**: Optimized real-time communication
- **Database Optimization**: Indexed queries and connection pooling
- **Frontend Performance**: Code splitting and lazy loading
- **Docker Optimization**: Multi-stage builds and layer caching
- **Caching Strategy**: Static asset caching and API response caching

## 🚀 Deployment Options

### Local Development Mode

```bash
npm run dev
```

### Docker Development

```bash
npm run docker:dev
```

### Docker Production

```bash
npm run docker:up
```

### Manual Production

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run the test suite (`npm run test:all`)
6. Ensure code quality (`npm run lint`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Add comprehensive tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR
- Follow the monorepo structure and Nx conventions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 👨‍💻 Author

## Petar Petrov

- GitHub: [@petarnenov](https://github.com/petarnenov)
- Project: [Signal Crypto Bot](https://github.com/petarnenov/signal-crypto-bot)

## 🙏 Acknowledgments

- **Nx**: Monorepo tooling and build system
- **React**: Frontend framework
- **Node.js**: Backend runtime
- **SQLite**: Database engine
- **Docker**: Containerization platform
- **OpenAI**: AI signal generation
- **Binance**: Cryptocurrency exchange API
- **Telegram**: Bot platform

## 📞 Support

For support, questions, or feature requests:

- Create an issue on GitHub
- Check the documentation in the `/docs` folder
- Review the troubleshooting section in `DOCKER.md`

---

**Note**: This is a comprehensive trading bot with AI integration, real-time
communication, and full containerization. The project follows modern development
practices with extensive testing, monitoring, and documentation.

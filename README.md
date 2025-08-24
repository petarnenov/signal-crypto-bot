# Signal Crypto Bot

A cryptocurrency signal bot that sends buy/sell signals to Telegram using GPT-5
for analysis and decision making.

## Features

- **AI-Powered Analysis**: Uses OpenAI GPT-5 for market analysis and signal
  generation
- **Telegram Integration**: Sends signals directly to Telegram channels
- **Configurable Timeframes**: Supports multiple time intervals for analysis
- **React Dashboard**: Web interface for monitoring and configuration
- **Docker Deployment**: Easy containerized deployment

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- OpenAI API key
- Telegram Bot token

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd signal-crypto-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Run with Docker:

   ```bash
   docker-compose up -d
   ```

## Development

### Available Scripts

- `npm run lint:md` - Check markdown files for issues
- `npm run lint:md:fix` - Auto-fix markdown issues
- `npm run pre-commit` - Run before commits

### Project Structure

```text
signal-crypto-bot/
├── backend/          # Node.js backend
├── frontend/         # React dashboard
├── docker-compose.yml
├── ROADMAP.md        # Development roadmap
└── README.md
```

## Configuration

See `ROADMAP.md` for detailed configuration options and development phases.

## Contributing

1. Follow the markdown linting rules
2. Run `npm run lint:md:fix` before committing
3. Update documentation as needed

## License

MIT

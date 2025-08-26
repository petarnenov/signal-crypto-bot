# Docker Setup for Signal Crypto Bot

## Overview

This project is containerized using Docker and Docker Compose for easy deployment
and development.

## Services

- **Backend**: Node.js API server (port 3001)
- **Frontend**: React application served by Nginx (port 3000)
- **Database**: SQLite database with persistent storage
- **Prometheus**: Monitoring (port 9090) - optional
- **Grafana**: Dashboard (port 3002) - optional

## Quick Start

### Production

```bash
# Build and start all services
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Development

```bash
# Build and start development services with hot reload
npm run docker:dev:build
npm run docker:dev

# View development logs
npm run docker:dev:logs

# Stop development services
npm run docker:dev:down
```

## Available Scripts

### Production Scripts

- `npm run docker:build` - Build production images
- `npm run docker:up` - Start production services
- `npm run docker:down` - Stop production services
- `npm run docker:logs` - View production logs
- `npm run docker:restart` - Restart production services
- `npm run docker:clean` - Clean up volumes and containers
- `npm run docker:rebuild` - Rebuild and restart services

### Development Scripts

- `npm run docker:dev:build` - Build development images
- `npm run docker:dev:up` - Start development services
- `npm run docker:dev:down` - Stop development services
- `npm run docker:dev:logs` - View development logs
- `npm run docker:dev` - Start development with hot reload

## Ports

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Grafana**: http://localhost:3002 (admin/admin)
- **Prometheus**: http://localhost:9090

## Environment Variables

Create a `.env` file in the root directory:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Binance
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Database
DATABASE_PATH=/app/database/crypto_bot.db

# Logging
LOG_LEVEL=info
```

## Volumes

- `./packages/database` - SQLite database files
- `./logs` - Application logs
- `prometheus_data` - Prometheus metrics storage
- `grafana_data` - Grafana dashboards and settings

## Development Features

### Hot Reload

- Backend: Source code changes trigger automatic restart
- Frontend: Vite hot module replacement for instant updates

### Volume Mounts

- Source code is mounted as volumes for live editing
- Database files persist between container restarts

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 3001, 3002, 9090 are available
2. **Permission issues**: Run `sudo chown -R $USER:$USER ./packages/database`
3. **Build failures**: Clear Docker cache with `docker system prune -a`

### Logs

```bash
# View all logs
npm run docker:logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f backend
```

### Database

```bash
# Access database container
docker-compose exec database sh

# Backup database
docker-compose exec backend cp /app/database/crypto_bot.db /app/database/backup.db

# Restore database
docker-compose exec backend cp /app/database/backup.db /app/database/crypto_bot.db
```

## Monitoring

### Prometheus

- Metrics endpoint: http://localhost:3001/metrics
- Prometheus UI: http://localhost:9090

### Grafana

- URL: http://localhost:3002
- Username: admin
- Password: admin

## Security

- All containers run as non-root users
- Security headers configured in Nginx
- Environment variables for sensitive data
- Network isolation between services

## Performance

- Multi-stage builds for optimized images
- Gzip compression enabled
- Static asset caching
- Database connection pooling

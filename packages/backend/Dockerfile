# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/

# Copy nx configuration
COPY nx.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/backend/src ./packages/backend/src
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/status || exit 1

# Start the application
CMD ["node", "packages/backend/src/server.js"]

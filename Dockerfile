# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production
RUN cd frontend && npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD curl -f http://localhost:5000/api/status || exit 1

# Start the application
CMD ["npm", "start"]

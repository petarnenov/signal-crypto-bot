# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/shared/package*.json ./packages/shared/

# Copy nx configuration
COPY nx.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/frontend/src ./packages/frontend/src
COPY packages/frontend/index.html ./packages/frontend/
COPY packages/frontend/vite.config.js ./packages/frontend/
COPY packages/frontend/tailwind.config.js ./packages/frontend/
COPY packages/frontend/postcss.config.js ./packages/frontend/
COPY packages/shared ./packages/shared

# Build the application
RUN npm run build:frontend

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/frontend/nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Poop Quest - Node.js Application Dockerfile
# Multi-stage build for optimized production deployment

# ===== BUILD STAGE =====
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --only=production \
    && npm cache clean --force

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p data public/images logs

# Set correct permissions
RUN chown -R node:node /app

# ===== PRODUCTION STAGE =====
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    ca-certificates \
    tzdata \
    && update-ca-certificates

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app /app

# Create required directories with proper permissions
RUN mkdir -p /app/data /app/logs /app/public/images \
    && chown -R nodejs:nodejs /app

# Install production dependencies only
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --only=production --no-audit --no-fund \
    && npm cache clean --force

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/posts.db
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
        const options = { host: 'localhost', port: process.env.PORT || 3000, path: '/health', timeout: 5000 }; \
        const req = http.request(options, (res) => { \
            if (res.statusCode === 200) { \
                process.exit(0); \
            } else { \
                process.exit(1); \
            } \
        }); \
        req.on('error', () => process.exit(1)); \
        req.end();"

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Start the application
CMD ["node", "index.js"]

# ===== DEVELOPMENT STAGE =====
FROM node:18-alpine AS development

# Install development dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev \
    git \
    && ln -sf python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci \
    && npm cache clean --force

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p data public/images logs

# Set development environment
ENV NODE_ENV=development
ENV PORT=3000
ENV DATABASE_PATH=/app/data/posts.db
ENV LOG_LEVEL=debug

# Expose port and debug port
EXPOSE 3000 9229

# Start with nodemon for development
CMD ["npm", "run", "dev"]

# ===== TESTING STAGE =====
FROM node:18-alpine AS testing

# Install test dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev \
    && ln -sf python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci \
    && npm cache clean --force

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p data public/images logs

# Set test environment
ENV NODE_ENV=test
ENV DATABASE_PATH=:memory:

# Run tests
CMD ["npm", "test"]

# ===== LABELS =====
LABEL maintainer="Poop Quest Team"
LABEL version="1.0.0"
LABEL description="Poop Quest - Transform HTML into shareable posts"
LABEL org.opencontainers.image.source="https://github.com/poopquest/poop-quest"
LABEL org.opencontainers.image.documentation="https://github.com/poopquest/poop-quest/blob/main/README.md"
LABEL org.opencontainers.image.licenses="MIT"
# MCP Task Bridge - Development Dockerfile
# Use Node 20.17.0+ for better compatibility and security
FROM node:20-alpine AS base

# Create non-root user
RUN addgroup -g 1001 -S nodegroup && adduser -u 1001 -S nodeuser -G nodegroup

WORKDIR /app

# Copy package manifests first for dependency caching
COPY package*.json ./

# Install dependencies with cache optimization
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund && \
    npm cache clean --force

# Copy source (for initial image; in compose we will mount volume)
COPY . .

# Ensure permissions
RUN chown -R nodeuser:nodegroup /app

USER nodeuser

ENV NODE_ENV=development

# Default command: tsx watch (package.json)
CMD ["npm", "run", "dev"]


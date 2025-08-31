# MCP Task Bridge - Development Dockerfile
# Use Node 20.17.0+ for better compatibility and security
# Use standard node image instead of alpine for better compatibility with esbuild
FROM node:20 AS base

# Create non-root user (Debian style for standard node image)
RUN groupadd -g 1001 nodegroup && useradd -u 1001 -g nodegroup -m nodeuser

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


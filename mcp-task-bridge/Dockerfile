# MCP Task Bridge - Development Dockerfile
# Use Node 20.17.0+ for better compatibility and security
# Use standard node image instead of alpine for better compatibility with esbuild
FROM node:20-alpine AS base

# Create non-root user (Debian style for standard node image)
RUN groupadd -g 1001 nodegroup && useradd -u 1001 -g nodegroup -m nodeuser

WORKDIR /app

# Copy package manifests first for dependency caching
COPY package*.json ./

# Copy source first
COPY . .

# Install typescript globally and local dependencies
RUN npm install -g typescript tsx && \
    npm install --include=dev && \
    npm run build

# Ensure permissions
RUN chown -R nodeuser:nodegroup /app

USER nodeuser

ENV NODE_ENV=production

# Use compiled JS instead of tsx
CMD ["npm", "run", "start"]


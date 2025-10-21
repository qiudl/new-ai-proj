# MCP Task Bridge - Development Dockerfile
# Use Node 20.17.0+ for better compatibility and security
# Use standard node image instead of alpine for better compatibility with esbuild
FROM node:20-alpine AS base

# Create non-root user (Alpine style)
RUN addgroup -g 1001 -S nodegroup && adduser -S nodeuser -u 1001 -G nodegroup

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

# Use SSE mode for production (instead of stdio mode)
CMD ["node", "dist/index-sse.js"]


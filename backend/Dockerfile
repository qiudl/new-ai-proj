# Multi-stage Dockerfile for Go Backend
# Supports both development and production builds

# ======================================
# Stage 1: Base Dependencies
# ======================================
FROM golang:1.22-alpine AS base

# Install essential packages
RUN apk --no-cache add \
    git \
    ca-certificates \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=Asia/Shanghai

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download && go mod verify

# ======================================
# Stage 2: Development Environment
# ======================================
FROM base AS development

# Install development tools
RUN go install github.com/cosmtrek/air@latest && \
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest && \
    go install golang.org/x/tools/cmd/goimports@latest

# Copy source code
COPY . .

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Development command with hot reload
CMD ["air", "-c", ".air.toml"]

# ======================================
# Stage 3: Build for Production
# ======================================
FROM base AS builder

# Copy source code
COPY . .

# Build args
ARG VERSION=dev
ARG BUILD_TIME
ARG GIT_COMMIT

# Build optimized binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}" \
    -a -installsuffix cgo \
    -o /app/main .

# ======================================
# Stage 4: Production Runtime
# ======================================
FROM alpine:latest AS production

# Install runtime dependencies
RUN apk --no-cache add \
    ca-certificates \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=Asia/Shanghai

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main .

# Copy configuration files if needed
COPY --from=builder /app/config ./config

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Production command
CMD ["./main"]

# ======================================
# Stage 5: Testing Environment
# ======================================
FROM base AS testing

# Install testing tools
RUN go install github.com/onsi/ginkgo/v2/ginkgo@latest && \
    go install github.com/onsi/gomega/...@latest

# Copy source code
COPY . .

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Run tests
CMD ["go", "test", "-v", "./..."]


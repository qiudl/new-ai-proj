# Multi-stage Dockerfile for Go Backend (Optimized)
# 优化构建速度，解决 go mod download 慢的问题

# Allow overriding base image registry
ARG REGISTRY_PREFIX=

# ======================================
# Stage 1: Base Dependencies (优化版)
# ======================================
FROM ${REGISTRY_PREFIX}golang:1.22-alpine AS base

# Install essential packages in one layer
RUN apk --no-cache add \
    git \
    ca-certificates \
    curl \
    tzdata \
    build-base \
    binutils-gold \
    && rm -rf /var/cache/apk/*

# Set timezone and Go environment
ENV TZ=Asia/Shanghai
ENV GOPROXY=https://goproxy.cn,https://goproxy.io,direct
ENV GOSUMDB=sum.golang.google.cn
ENV GOPATH=/go
ENV GOCACHE=/go/cache
ENV GOTMPDIR=/tmp/go

# Create directories and set permissions in one layer
RUN mkdir -p /go/cache /go/pkg/mod /tmp/go && \
    chmod -R 755 /go /tmp/go

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy go mod files first (for better caching)
COPY go.mod go.sum ./

# Download dependencies with optimizations
# 使用 cache mount 来持久化模块缓存
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/go/cache \
    go mod download && \
    go mod verify

# ======================================
# Stage 2: Development Environment (优化版)
# ======================================
FROM base AS development

# Install development tools in one layer
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/go/cache \
    go install github.com/air-verse/air@latest && \
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest && \
    go install golang.org/x/tools/cmd/goimports@latest

# Copy source code
COPY . .

# Change ownership
RUN chown -R appuser:appgroup /app /go

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
# Stage 3: Build for Production (优化版)
# ======================================
FROM base AS builder

# Copy source code
COPY . .

# Build with cache mount
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/go/cache \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.Version=dev" \
    -a -installsuffix cgo \
    -o /app/main .

# ======================================
# Stage 4: Production Runtime
# ======================================
FROM ${REGISTRY_PREFIX}alpine:latest AS production

# Install runtime dependencies
RUN apk --no-cache add \
    ca-certificates \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

ENV TZ=Asia/Shanghai

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main .

# Copy configuration files if needed
COPY --from=builder /app/config ./config 2>/dev/null || true

# Change ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["./main"]

# ======================================
# Stage 5: Testing Environment
# ======================================
FROM base AS testing

# Install testing tools with cache mount
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/go/cache \
    go install github.com/onsi/ginkgo/v2/ginkgo@latest && \
    go install github.com/onsi/gomega/...@latest

COPY . .
RUN chown -R appuser:appgroup /app
USER appuser

CMD ["go", "test", "-v", "./..."]

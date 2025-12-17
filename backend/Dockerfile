# Multi-stage Dockerfile for Go Backend (Optimized)
# 优化构建速度，解决 go mod download 慢的问题

# Allow overriding base image registry
ARG REGISTRY_PREFIX=

# ======================================
# Stage 1: Base Dependencies (优化版)
# ======================================
FROM ${REGISTRY_PREFIX}golang:1.24-alpine AS base

# Use faster APK mirror for CN networks (fallback to default if sed fails)
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tencent.com/g' /etc/apk/repositories || true

# Install essential packages without problematic ones for now
RUN apk --no-cache add \
    git \
    ca-certificates \
    curl \
    tzdata libstdc++ libgcc \
    build-base || \
    # Fallback: install only essential packages
    apk --no-cache add ca-certificates

# Set Go environment for stable builds
ENV TZ=Asia/Shanghai
ENV GOPROXY=https://goproxy.io,https://goproxy.cn,direct
ENV GOSUMDB=sum.golang.org
ENV GO111MODULE=on
ENV CGO_ENABLED=1
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
RUN go mod download && \
    go mod verify

# ======================================
# Stage 2: Development Environment (优化版)
# ======================================
FROM base AS development

# Install development tools in one layer
RUN go install github.com/air-verse/air@latest && \
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest && \
    go install golang.org/x/tools/cmd/goimports@latest

# Copy source code
COPY . .

# Change ownership
RUN chown -R appuser:appgroup /app /go /go

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

# Build the application
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.Version=dev" \
    -a -installsuffix cgo \
    -o /app/main .

# ======================================
# Stage 4: Production Runtime
# ======================================

FROM ${REGISTRY_PREFIX}alpine:latest AS production

# Use faster APK mirror for CN networks (fallback to default if sed fails)
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tencent.com/g' /etc/apk/repositories || true

# Install runtime dependencies
RUN apk --no-cache add \
    ca-certificates \
    curl \
    tzdata libstdc++ libgcc \
    && rm -rf /var/cache/apk/*

ENV TZ=Asia/Shanghai

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main .

# Copy configuration files
COPY --from=builder /app/config ./config

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

# Install testing tools
RUN go install github.com/onsi/ginkgo/v2/ginkgo@latest && \
    go install github.com/onsi/gomega/...@latest

COPY . .
RUN chown -R appuser:appgroup /app /go
USER appuser

CMD ["go", "test", "-v", "./..."]

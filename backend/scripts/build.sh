#!/bin/bash

# Build script for Go backend
# Supports both development and production builds

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build information
VERSION=${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo "dev")}
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=${GIT_COMMIT:-$(git rev-parse HEAD 2>/dev/null || echo "unknown")}

echo -e "${GREEN}🏗️  Building Go Backend${NC}"
echo "=================================="
echo -e "${YELLOW}Version:${NC} ${VERSION}"
echo -e "${YELLOW}Build Time:${NC} ${BUILD_TIME}"
echo -e "${YELLOW}Git Commit:${NC} ${GIT_COMMIT}"
echo ""

# Function to build Docker image
build_docker() {
    local target=$1
    local tag=$2
    
    echo -e "${YELLOW}🐳 Building Docker image: ${tag} (target: ${target})${NC}"
    
    docker build \
        --target ${target} \
        --build-arg VERSION=${VERSION} \
        --build-arg BUILD_TIME=${BUILD_TIME} \
        --build-arg GIT_COMMIT=${GIT_COMMIT} \
        -t ${tag} \
        .
    
    echo -e "${GREEN}✅ Docker image built successfully: ${tag}${NC}"
}

# Function to build local binary
build_local() {
    echo -e "${YELLOW}🔨 Building local binary${NC}"
    
    # Create build directory
    mkdir -p ./build
    
    # Build binary
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
        -ldflags="-w -s -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}" \
        -a -installsuffix cgo \
        -o ./build/main .
    
    echo -e "${GREEN}✅ Local binary built successfully: ./build/main${NC}"
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running tests${NC}"
    
    # Run unit tests
    go test -v ./...
    
    # Run tests with coverage
    go test -coverprofile=coverage.out ./...
    go tool cover -html=coverage.out -o coverage.html
    
    echo -e "${GREEN}✅ Tests completed successfully${NC}"
}

# Main script
case "$1" in
    "dev")
        echo -e "${YELLOW}Building development image...${NC}"
        build_docker "development" "ai-project-backend:dev"
        ;;
    "prod")
        echo -e "${YELLOW}Building production image...${NC}"
        build_docker "production" "ai-project-backend:latest"
        build_docker "production" "ai-project-backend:${VERSION}"
        ;;
    "local")
        echo -e "${YELLOW}Building local binary...${NC}"
        build_local
        ;;
    "test")
        echo -e "${YELLOW}Running tests...${NC}"
        run_tests
        ;;
    "all")
        echo -e "${YELLOW}Building all targets...${NC}"
        run_tests
        build_local
        build_docker "development" "ai-project-backend:dev"
        build_docker "production" "ai-project-backend:latest"
        build_docker "production" "ai-project-backend:${VERSION}"
        ;;
    *)
        echo "Usage: $0 {dev|prod|local|test|all}"
        echo ""
        echo "Commands:"
        echo "  dev    - Build development Docker image"
        echo "  prod   - Build production Docker image"
        echo "  local  - Build local binary"
        echo "  test   - Run tests"
        echo "  all    - Build everything"
        echo ""
        echo "Environment variables:"
        echo "  VERSION     - Override version (default: git describe)"
        echo "  GIT_COMMIT  - Override git commit (default: git rev-parse HEAD)"
        echo ""
        echo "Examples:"
        echo "  $0 dev"
        echo "  VERSION=v1.0.0 $0 prod"
        echo "  $0 all"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Build completed successfully!${NC}"
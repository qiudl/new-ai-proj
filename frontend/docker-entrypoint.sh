#!/bin/sh

# Docker entrypoint script for React frontend development
set -e

echo "🚀 Starting React Frontend Development Environment..."

# Print environment information
echo "📋 Environment Information:"
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "REACT_APP_ENV: ${REACT_APP_ENV:-development}"
echo "REACT_APP_API_URL: ${REACT_APP_API_URL:-http://localhost:8081/api/v1}"
echo "REACT_APP_API_BASE_URL: ${REACT_APP_API_BASE_URL:-$REACT_APP_API_URL}"
echo "Working directory: $(pwd)"

# Skip node_modules check - already installed in Docker image
echo "📦 Using pre-installed dependencies from Docker image"

# Create .env file for development if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file for development..."
cat > .env << EOF
REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:8081/api/v1}
REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL:-${REACT_APP_API_URL:-http://localhost:8081/api/v1}}
REACT_APP_ENV=${REACT_APP_ENV:-development}
GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP:-false}
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
TSC_COMPILE_ON_ERROR=true
EOF
fi

# Verify CSS files are accessible (important for grid layout components)
if [ -d "node_modules/react-grid-layout/css" ]; then
    echo "✅ React Grid Layout CSS found"
else
    echo "⚠️  React Grid Layout CSS not found"
fi

if [ -d "node_modules/react-resizable/css" ]; then
    echo "✅ React Resizable CSS found"
else
    echo "⚠️  React Resizable CSS not found"
fi

# Set proper permissions for node_modules if needed
if [ -w "node_modules" ]; then
    chmod -R 755 node_modules/react-grid-layout/css/ 2>/dev/null || true
    chmod -R 755 node_modules/react-resizable/css/ 2>/dev/null || true
fi

echo "🎯 Environment ready, starting application..."
echo "📡 Frontend will be available at: http://localhost:3001"
echo "🔗 API endpoint: ${REACT_APP_API_URL:-http://localhost:8081/api/v1}"

# Execute the main command
exec "$@"
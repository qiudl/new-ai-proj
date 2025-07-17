#!/bin/bash

# Development Environment Setup Script
# This script sets up the local development environment

set -e

echo "🚀 Setting up AI Project Management Platform - Development Environment"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists, if not create it from template
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp .env.development .env
    echo -e "${GREEN}✅ .env file created from .env.development${NC}"
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p backend
mkdir -p frontend
mkdir -p nginx
mkdir -p docker/postgres
mkdir -p tests/backend
mkdir -p tests/frontend
mkdir -p logs

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down --remove-orphans

# Remove existing volumes (optional - uncomment if you want to start fresh)
# echo -e "${YELLOW}🗑️  Removing existing volumes...${NC}"
# docker-compose down -v

# Build and start services
echo -e "${YELLOW}🏗️  Building and starting services...${NC}"
docker-compose up -d --build

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check service health
echo -e "${YELLOW}🔍 Checking service health...${NC}"

# Check database
if docker-compose exec -T db pg_isready -U user -d main_db > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database is ready${NC}"
else
    echo -e "${RED}❌ Database is not ready${NC}"
fi

# Check backend (if it exists)
if docker-compose ps | grep -q "go_backend"; then
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend is starting... (this is normal if backend code doesn't exist yet)${NC}"
    fi
fi

# Check frontend (if it exists)
if docker-compose ps | grep -q "react_frontend"; then
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is ready${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend is starting... (this is normal if frontend code doesn't exist yet)${NC}"
    fi
fi

# Check nginx
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx might have issues (check if backend/frontend are running)${NC}"
fi

# Show running services
echo -e "${YELLOW}📋 Current service status:${NC}"
docker-compose ps

# Show logs command
echo ""
echo -e "${GREEN}✅ Development environment is set up!${NC}"
echo ""
echo "📝 Useful commands:"
echo "   View logs:           docker-compose logs -f"
echo "   Stop services:       docker-compose down"
echo "   Restart services:    docker-compose restart"
echo "   Access database:     docker-compose exec db psql -U user -d main_db"
echo "   Access backend:      docker-compose exec backend bash"
echo "   Access frontend:     docker-compose exec frontend sh"
echo ""
echo "🌐 Access points:"
echo "   Frontend:           http://localhost:3000"
echo "   Backend API:        http://localhost:8080"
echo "   Database:           localhost:5432"
echo "   Nginx:              http://localhost:80"
echo ""
echo "💡 Next steps:"
echo "   1. Create backend Go application in ./backend/"
echo "   2. Create frontend React application in ./frontend/"
echo "   3. Run 'docker-compose logs -f' to see real-time logs"
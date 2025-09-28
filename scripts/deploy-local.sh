#!/bin/bash

# Local Deployment Script for AI Project
# Supports both development and production modes with Docker + Nginx

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Usage function
show_usage() {
    cat << EOF
Usage: $0 <command> [options]

Commands:
    dev         Start development environment
    prod        Deploy to production environment  
    build       Build all containers
    test        Run tests before deployment
    clean       Clean up containers and images
    status      Show deployment status
    logs        Show container logs
    backup      Backup current deployment
    rollback    Rollback to previous version

Options:
    --force     Force rebuild of containers
    --no-cache  Build without Docker cache
    --verbose   Enable verbose logging
    --help      Show this help message

Examples:
    $0 dev                 # Start development environment
    $0 prod --force        # Force production deployment
    $0 build --no-cache    # Build without cache
    $0 logs backend        # Show backend logs
EOF
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check available disk space
    AVAILABLE_SPACE=$(df -BG "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        log_warn "Low disk space: ${AVAILABLE_SPACE}GB available"
    fi
    
    log_info "Prerequisites check passed"
}

# Environment setup
setup_environment() {
    local env_type=$1
    log_section "Setting Up $env_type Environment"
    
    cd "$PROJECT_ROOT"
    
    case $env_type in
        "development")
            if [ ! -f .env ]; then
                if [ -f .env.example ]; then
                    cp .env.example .env
                    log_info "Created .env from .env.example"
                else
                    log_warn "No .env.example found, creating minimal .env"
                    cat > .env << 'EOF'
ENV=development
NODE_ENV=development
DB_HOST=postgres-master
DB_PORT=5432
DB_USER=dev_user
DB_PASSWORD=dev_password_2024
DB_NAME=ai_project_db
JWT_SECRET=dev_jwt_secret_change_in_production
EOF
                fi
            fi
            ;;
        "production")
            if [ ! -f .env.prod ]; then
                log_error "Production environment file .env.prod not found"
                exit 1
            fi
            cp .env.prod .env
            log_info "Loaded production environment configuration"
            ;;
    esac
}

# Build containers
build_containers() {
    local force_build=$1
    local no_cache=$2
    
    log_section "Building Containers"
    
    cd "$PROJECT_ROOT"
    
    BUILD_ARGS=""
    if [ "$no_cache" = true ]; then
        BUILD_ARGS="$BUILD_ARGS --no-cache"
    fi
    
    if [ "$force_build" = true ]; then
        BUILD_ARGS="$BUILD_ARGS --force-rm"
    fi
    
    # Build frontend
    log_info "Building frontend container..."
    cd frontend
    docker build $BUILD_ARGS -t ai-project-frontend:latest .
    
    # Build backend
    log_info "Building backend container..."
    cd ../backend
    docker build $BUILD_ARGS -t ai-project-backend:latest .
    
    # Build MCP server
    log_info "Building MCP server container..."
    cd ../mcp-task-bridge
    docker build $BUILD_ARGS -t ai-project-mcp:latest .
    
    cd "$PROJECT_ROOT"
    log_info "Container build completed"
}

# Start development environment
start_dev_environment() {
    log_section "Starting Development Environment"
    
    setup_environment "development"
    
    cd "$PROJECT_ROOT"
    
    # Start services
    log_info "Starting development services..."
    docker-compose -f docker-compose.dev.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 30
    
    # Health check
    check_service_health "development"
    
    # Show status
    show_service_status "development"
}

# Deploy to production
deploy_production() {
    local force_deploy=$1
    
    log_section "Production Deployment"
    
    # Pre-deployment checks
    if [ "$force_deploy" != true ]; then
        log_info "Running pre-deployment checks..."
        
        # Check Git status
        if [ -n "$(git status --porcelain)" ]; then
            log_warn "There are uncommitted changes. Consider committing them first."
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
        
        # Run tests
        run_tests
    fi
    
    setup_environment "production"
    
    cd "$PROJECT_ROOT"
    
    # Create backup
    create_backup
    
    # Update Nginx configuration
    setup_nginx_config
    
    # Start production services
    log_info "Starting production services..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans || true
    docker-compose -f docker-compose.prod.yml up -d --build
    
    # Wait for services
    log_info "Waiting for services to start..."
    sleep 45
    
    # Health check
    check_service_health "production"
    
    # Show deployment info
    show_deployment_info
}

# Setup Nginx configuration
setup_nginx_config() {
    log_info "Setting up Nginx configuration..."
    
    # Copy production Nginx config
    if [ -f nginx/production.conf ]; then
        cp nginx/production.conf nginx/nginx.conf
        log_info "Applied production Nginx configuration"
    else
        log_warn "Production Nginx config not found, using default"
    fi
    
    # Ensure log directory exists
    mkdir -p logs/nginx
}

# Run tests
run_tests() {
    log_section "Running Tests"
    
    cd "$PROJECT_ROOT"
    
    # Frontend tests
    log_info "Running frontend tests..."
    cd frontend
    npm ci --silent
    npm run test -- --coverage --watchAll=false --silent || {
        log_error "Frontend tests failed"
        exit 1
    }
    
    # Backend tests
    log_info "Running backend tests..."
    cd ../backend
    go test -v ./... || {
        log_error "Backend tests failed"
        exit 1
    }
    
    cd "$PROJECT_ROOT"
    log_info "All tests passed"
}

# Health check
check_service_health() {
    local env_type=$1
    log_info "Performing health checks..."
    
    # Determine ports based on environment
    if [ "$env_type" = "development" ]; then
        BACKEND_PORT=8081
        FRONTEND_PORT=3001
    else
        BACKEND_PORT=8080
        FRONTEND_PORT=3000
    fi
    
    # Check backend health
    for i in {1..30}; do
        if curl -f -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
            log_info "✅ Backend health check passed"
            BACKEND_HEALTHY=true
            break
        else
            log_info "⏳ Backend health check attempt $i/30..."
            BACKEND_HEALTHY=false
            sleep 10
        fi
    done
    
    # Check frontend
    if curl -f -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        log_info "✅ Frontend health check passed"
        FRONTEND_HEALTHY=true
    else
        log_warn "❌ Frontend health check failed"
        FRONTEND_HEALTHY=false
    fi
    
    # Overall health status
    if [ "$BACKEND_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ]; then
        log_info "🎉 All services are healthy"
        return 0
    else
        log_error "❌ Some services failed health checks"
        return 1
    fi
}

# Show service status
show_service_status() {
    local env_type=$1
    
    log_section "Service Status"
    
    if [ "$env_type" = "development" ]; then
        docker-compose -f docker-compose.dev.yml ps
        echo
        log_info "Development URLs:"
        log_info "Frontend: http://localhost:3001"
        log_info "Backend API: http://localhost:8081/api/v1"
        log_info "Backend Health: http://localhost:8081/health"
        log_info "MCP Server: http://localhost:3100"
    else
        docker-compose -f docker-compose.prod.yml ps
        echo
        log_info "Production URLs:"
        log_info "Application: http://152.136.104.251"
        log_info "Backend API: http://152.136.104.251/api/v1"
        log_info "Health Check: http://152.136.104.251/health"
    fi
}

# Show deployment info
show_deployment_info() {
    log_section "Deployment Information"
    
    local commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local branch_name=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    
    echo "Deployment Time: $(date)"
    echo "Git Branch: $branch_name"
    echo "Git Commit: $commit_hash"
    echo "Environment: production"
    echo "Server: 152.136.104.251"
    
    # Resource usage
    echo
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    BACKUP_DIR="$PROJECT_ROOT/backups/$TIMESTAMP"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database if running
    if docker ps --format '{{.Names}}' | grep -q postgres; then
        log_info "Backing up database..."
        docker exec -t $(docker ps -qf name=postgres) pg_dump -U ${DB_USER:-dev_user} ${DB_NAME:-ai_project_db} > "$BACKUP_DIR/database_backup.sql" 2>/dev/null || {
            log_warn "Database backup failed or no database found"
        }
    fi
    
    # Backup current environment
    if [ -f .env ]; then
        cp .env "$BACKUP_DIR/env_backup"
    fi
    
    log_info "Backup created at: $BACKUP_DIR"
}

# Show container logs
show_logs() {
    local service=$1
    
    if [ -n "$service" ]; then
        log_section "Logs for $service"
        if docker ps --format '{{.Names}}' | grep -q "$service"; then
            docker logs -f --tail=100 $(docker ps -qf name="$service")
        else
            log_error "Service $service not found"
        fi
    else
        log_section "All Container Logs"
        docker-compose logs -f --tail=50
    fi
}

# Clean up
cleanup() {
    log_section "Cleaning Up"
    
    # Stop and remove containers
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    log_info "Cleanup completed"
}

# Main function
main() {
    local command=$1
    shift
    
    # Parse options
    FORCE_BUILD=false
    NO_CACHE=false
    VERBOSE=false
    FORCE_DEPLOY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_BUILD=true
                FORCE_DEPLOY=true
                shift
                ;;
            --no-cache)
                NO_CACHE=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                SERVICE_NAME=$1
                shift
                ;;
        esac
    done
    
    # Check prerequisites
    check_prerequisites
    
    # Execute command
    case $command in
        "dev")
            start_dev_environment
            ;;
        "prod")
            deploy_production $FORCE_DEPLOY
            ;;
        "build")
            build_containers $FORCE_BUILD $NO_CACHE
            ;;
        "test")
            run_tests
            ;;
        "status")
            show_service_status "current"
            ;;
        "logs")
            show_logs "$SERVICE_NAME"
            ;;
        "backup")
            create_backup
            ;;
        "clean")
            cleanup
            ;;
        "help"|"--help"|"")
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"
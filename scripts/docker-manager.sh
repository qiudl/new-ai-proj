#!/bin/bash

# Docker Manager Script for new-ai-proj
# Handles container lifecycle management and ensures clean shutdowns

set -e

PROJECT_NAME="new-ai-proj"
COMPOSE_FILE="docker-compose.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    log_info "Docker is running"
}

# Function to get project containers
get_project_containers() {
    docker ps -a --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to get all containers defined in compose file
get_compose_services() {
    if [[ -f "$PROJECT_ROOT/$COMPOSE_FILE" ]]; then
        docker-compose -f "$PROJECT_ROOT/$COMPOSE_FILE" config --services
    else
        log_error "Docker compose file not found at $PROJECT_ROOT/$COMPOSE_FILE"
        exit 1
    fi
}

# Function to force stop containers
force_stop_containers() {
    log_info "Checking for running containers..."
    
    # Get containers from compose file
    local services
    services=$(get_compose_services)
    
    for service in $services; do
        local container_name
        case $service in
            "db") container_name="postgres_db" ;;
            "backend") container_name="go_backend" ;;
            "frontend") container_name="react_frontend" ;;
            "jenkins") container_name="jenkins" ;;
            *) container_name="$service" ;;
        esac
        
        if docker ps -q --filter "name=$container_name" | grep -q .; then
            log_warning "Force stopping container: $container_name"
            docker stop "$container_name" >/dev/null 2>&1 || true
            docker rm "$container_name" >/dev/null 2>&1 || true
        fi
    done
}

# Function to clean up orphaned containers
cleanup_orphaned() {
    log_info "Cleaning up orphaned containers..."
    
    # Find containers with project prefix that aren't in compose file
    local all_project_containers
    all_project_containers=$(docker ps -a --filter "name=${PROJECT_NAME}" --format "{{.Names}}" 2>/dev/null || true)
    
    if [[ -n "$all_project_containers" ]]; then
        for container in $all_project_containers; do
            log_warning "Found orphaned container: $container"
            docker stop "$container" >/dev/null 2>&1 || true
            docker rm "$container" >/dev/null 2>&1 || true
        done
    fi
}

# Function to start services
start_services() {
    log_info "Starting services..."
    cd "$PROJECT_ROOT"
    
    # Pull latest images first
    log_info "Pulling latest images..."
    docker-compose pull
    
    # Start services with build
    log_info "Starting containers..."
    docker-compose up -d --build
    
    log_success "Services started successfully"
}

# Function to stop services gracefully
stop_services() {
    log_info "Stopping services gracefully..."
    cd "$PROJECT_ROOT"
    
    # Try graceful shutdown first
    docker-compose down --timeout 30
    
    # Force stop any remaining containers
    force_stop_containers
    
    log_success "All services stopped"
}

# Function to restart services
restart_services() {
    log_info "Restarting services..."
    stop_services
    sleep 2
    start_services
}

# Function to show status
show_status() {
    log_info "Current container status:"
    echo
    get_project_containers
    echo
    
    log_info "Service health status:"
    cd "$PROJECT_ROOT"
    docker-compose ps
}

# Function to show logs
show_logs() {
    local service=$1
    cd "$PROJECT_ROOT"
    
    if [[ -n "$service" ]]; then
        log_info "Showing logs for service: $service"
        docker-compose logs -f "$service"
    else
        log_info "Showing logs for all services"
        docker-compose logs -f
    fi
}

# Function to clean everything
clean_all() {
    log_warning "This will remove all containers, volumes, and images for this project"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$PROJECT_ROOT"
        
        # Stop and remove containers
        docker-compose down --volumes --remove-orphans --timeout 30
        
        # Force cleanup
        force_stop_containers
        cleanup_orphaned
        
        # Remove volumes
        docker volume ls -q --filter "name=${PROJECT_NAME}" | xargs -r docker volume rm
        
        # Remove networks
        docker network ls -q --filter "name=${PROJECT_NAME}" | xargs -r docker network rm
        
        log_success "Complete cleanup finished"
    else
        log_info "Cleanup cancelled"
    fi
}

# Main function
main() {
    check_docker
    
    case "${1:-help}" in
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2"
            ;;
        "clean")
            clean_all
            ;;
        "force-stop")
            force_stop_containers
            log_success "Force stop completed"
            ;;
        "help"|*)
            echo "Docker Manager for $PROJECT_NAME"
            echo
            echo "Usage: $0 {start|stop|restart|status|logs|clean|force-stop}"
            echo
            echo "Commands:"
            echo "  start       Start all services"
            echo "  stop        Stop all services gracefully"
            echo "  restart     Restart all services"
            echo "  status      Show container status"
            echo "  logs [svc]  Show logs (optionally for specific service)"
            echo "  clean       Complete cleanup (containers, volumes, networks)"
            echo "  force-stop  Force stop all project containers"
            echo
            echo "Services: db, backend, frontend, jenkins"
            ;;
    esac
}

main "$@"
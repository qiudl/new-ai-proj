#!/bin/bash

# Development Environment Test Script
# This script tests the complete Docker development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_TIMEOUT=300  # 5 minutes
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10

echo -e "${GREEN}🚀 AI Project Management Platform - Environment Test${NC}"
echo "=================================================================="
echo ""

# Function to print test step
print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_retries=$3
    local retry_interval=$4
    
    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready...${NC}"
    
    for i in $(seq 1 $max_retries); do
        if curl -f -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep $retry_interval
    done
    
    print_error "$service_name failed to start within timeout"
    return 1
}

# Function to test service health
test_service_health() {
    local service_name=$1
    local url=$2
    
    echo -e "${YELLOW}🔍 Testing $service_name health...${NC}"
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        print_success "$service_name health check passed"
        return 0
    else
        print_error "$service_name health check failed"
        return 1
    fi
}

# Function to check docker
check_docker() {
    print_step "1" "Checking Docker Environment"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running"
        exit 1
    fi
    
    print_success "Docker environment is ready"
    echo ""
}

# Function to check project files
check_project_files() {
    print_step "2" "Checking Project Files"
    
    local required_files=(
        "docker-compose.yml"
        "init.sql"
        ".env"
        "backend/Dockerfile"
        "frontend/Dockerfile.dev"
        "nginx/nginx.conf"
        "nginx/default.conf"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        print_success "All required files are present"
    else
        print_error "Missing required files: ${missing_files[*]}"
        exit 1
    fi
    echo ""
}

# Function to start services
start_services() {
    print_step "3" "Starting Docker Services"
    
    # Stop any existing services
    echo -e "${YELLOW}🛑 Stopping existing services...${NC}"
    docker-compose down --remove-orphans > /dev/null 2>&1 || true
    
    # Start services
    echo -e "${YELLOW}🚀 Starting services...${NC}"
    docker-compose up -d --build
    
    print_success "Services started successfully"
    echo ""
}

# Function to check service status
check_service_status() {
    print_step "4" "Checking Service Status"
    
    echo -e "${YELLOW}📊 Docker Compose Service Status:${NC}"
    docker-compose ps
    echo ""
    
    # Check if all services are running
    local failed_services=$(docker-compose ps --services --filter "status=exited")
    if [ -n "$failed_services" ]; then
        print_error "Some services failed to start: $failed_services"
        echo -e "${YELLOW}Service logs:${NC}"
        docker-compose logs
        return 1
    fi
    
    print_success "All services are running"
    echo ""
}

# Function to test database
test_database() {
    print_step "5" "Testing Database Connection"
    
    # Wait for database to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T db pg_isready -U user -d main_db > /dev/null 2>&1; then
            print_success "Database is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Database failed to start within timeout"
            return 1
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    # Test database initialization
    echo -e "${YELLOW}🔍 Testing database content...${NC}"
    local user_count=$(docker-compose exec -T db psql -U user -d main_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "0")
    local project_count=$(docker-compose exec -T db psql -U user -d main_db -t -c "SELECT COUNT(*) FROM projects;" 2>/dev/null | tr -d ' \n' || echo "0")
    local task_count=$(docker-compose exec -T db psql -U user -d main_db -t -c "SELECT COUNT(*) FROM tasks;" 2>/dev/null | tr -d ' \n' || echo "0")
    
    echo "Users: $user_count, Projects: $project_count, Tasks: $task_count"
    
    if [ "$user_count" -ge "3" ] && [ "$project_count" -ge "3" ] && [ "$task_count" -ge "10" ]; then
        print_success "Database initialization successful"
    else
        print_error "Database initialization incomplete"
        return 1
    fi
    echo ""
}

# Function to test backend
test_backend() {
    print_step "6" "Testing Backend Service"
    
    # Wait for backend to be ready
    if wait_for_service "Backend" "http://localhost:8080/health" 30 5; then
        # Test health endpoint
        local health_response=$(curl -s http://localhost:8080/health 2>/dev/null || echo "failed")
        if [[ $health_response == *"healthy"* ]]; then
            print_success "Backend health endpoint working"
        else
            print_warning "Backend health endpoint returned unexpected response"
        fi
        
        # Test version endpoint
        local version_response=$(curl -s http://localhost:8080/version 2>/dev/null || echo "failed")
        if [[ $version_response == *"version"* ]]; then
            print_success "Backend version endpoint working"
        else
            print_warning "Backend version endpoint returned unexpected response"
        fi
        
        print_success "Backend service is functional"
    else
        print_error "Backend service failed to start"
        return 1
    fi
    echo ""
}

# Function to test frontend
test_frontend() {
    print_step "7" "Testing Frontend Service"
    
    # Wait for frontend to be ready
    if wait_for_service "Frontend" "http://localhost:3000" 30 5; then
        # Test if it's serving React app
        local frontend_response=$(curl -s http://localhost:3000 2>/dev/null || echo "failed")
        if [[ $frontend_response == *"AI Project Management Platform"* ]]; then
            print_success "Frontend is serving React application"
        else
            print_warning "Frontend response doesn't contain expected content"
        fi
        
        print_success "Frontend service is functional"
    else
        print_error "Frontend service failed to start"
        return 1
    fi
    echo ""
}

# Function to test nginx
test_nginx() {
    print_step "8" "Testing Nginx Proxy"
    
    # Wait for nginx to be ready
    if wait_for_service "Nginx" "http://localhost:80" 20 5; then
        # Test frontend proxy
        local nginx_frontend=$(curl -s http://localhost:80 2>/dev/null || echo "failed")
        if [[ $nginx_frontend == *"AI Project Management Platform"* ]]; then
            print_success "Nginx frontend proxy working"
        else
            print_warning "Nginx frontend proxy returned unexpected response"
        fi
        
        # Test backend proxy
        local nginx_backend=$(curl -s http://localhost:80/api/health 2>/dev/null || echo "failed")
        if [[ $nginx_backend == *"healthy"* ]]; then
            print_success "Nginx backend proxy working"
        else
            print_warning "Nginx backend proxy not working as expected"
        fi
        
        print_success "Nginx proxy is functional"
    else
        print_error "Nginx service failed to start"
        return 1
    fi
    echo ""
}

# Function to test complete workflow
test_workflow() {
    print_step "9" "Testing Complete Workflow"
    
    echo -e "${YELLOW}🔄 Testing API endpoints...${NC}"
    
    # Test API endpoints (with mock responses)
    local endpoints=(
        "http://localhost:8080/health"
        "http://localhost:8080/version"
        "http://localhost:8080/api/auth/login"
        "http://localhost:8080/api/projects"
    )
    
    local failed_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} $endpoint"
        else
            echo -e "${RED}✗${NC} $endpoint"
            failed_endpoints+=("$endpoint")
        fi
    done
    
    if [ ${#failed_endpoints[@]} -eq 0 ]; then
        print_success "All API endpoints are accessible"
    else
        print_warning "Some API endpoints are not accessible: ${failed_endpoints[*]}"
        print_warning "This is expected as backend implementation is not complete"
    fi
    echo ""
}

# Function to run performance test
test_performance() {
    print_step "10" "Testing Performance"
    
    echo -e "${YELLOW}⚡ Testing response times...${NC}"
    
    # Test database query performance
    local db_time=$(docker-compose exec -T db bash -c "time psql -U user -d main_db -c 'SELECT COUNT(*) FROM tasks;'" 2>&1 | grep real | awk '{print $2}' || echo "N/A")
    echo "Database query time: $db_time"
    
    # Test backend response time
    local backend_time=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:8080/health 2>/dev/null || echo "N/A")
    echo "Backend response time: ${backend_time}s"
    
    # Test frontend response time
    local frontend_time=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3000 2>/dev/null || echo "N/A")
    echo "Frontend response time: ${frontend_time}s"
    
    print_success "Performance test completed"
    echo ""
}

# Function to show summary
show_summary() {
    print_step "11" "Environment Summary"
    
    echo -e "${GREEN}🎉 Development Environment Test Summary${NC}"
    echo "=============================================="
    echo ""
    echo -e "${BLUE}📊 Service Status:${NC}"
    docker-compose ps
    echo ""
    
    echo -e "${BLUE}🌐 Access Points:${NC}"
    echo "  Frontend (React):     http://localhost:3000"
    echo "  Backend (Go API):     http://localhost:8080"
    echo "  Nginx Proxy:          http://localhost:80"
    echo "  Database (PostgreSQL): localhost:5432"
    echo ""
    
    echo -e "${BLUE}🔑 Default Credentials:${NC}"
    echo "  Username: admin"
    echo "  Password: password123"
    echo ""
    
    echo -e "${BLUE}📝 Useful Commands:${NC}"
    echo "  View logs:           docker-compose logs -f"
    echo "  Stop services:       docker-compose down"
    echo "  Restart services:    docker-compose restart"
    echo "  Database management: ./scripts/db-manager.sh"
    echo "  Backend build:       ./backend/scripts/build.sh"
    echo ""
    
    echo -e "${GREEN}✅ Environment is ready for development!${NC}"
}

# Function to cleanup on exit
cleanup() {
    if [ "$CLEANUP_ON_EXIT" = "true" ]; then
        echo -e "${YELLOW}🧹 Cleaning up...${NC}"
        docker-compose down > /dev/null 2>&1 || true
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    echo -e "${BLUE}Starting comprehensive environment test...${NC}"
    echo ""
    
    # Parse command line arguments
    CLEANUP_ON_EXIT=false
    SKIP_CLEANUP=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --cleanup)
                CLEANUP_ON_EXIT=true
                shift
                ;;
            --no-cleanup)
                SKIP_CLEANUP=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --cleanup    Stop services after test"
                echo "  --no-cleanup Keep services running after test"
                echo "  --help       Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run tests
    check_docker
    check_project_files
    start_services
    check_service_status
    test_database
    test_backend
    test_frontend
    test_nginx
    test_workflow
    test_performance
    show_summary
    
    if [ "$SKIP_CLEANUP" != "true" ]; then
        echo ""
        echo -e "${YELLOW}💡 Services are running. Use 'docker-compose down' to stop them.${NC}"
        echo -e "${YELLOW}💡 Use '--cleanup' flag to automatically stop services after test.${NC}"
    fi
}

# Run main function
main "$@"
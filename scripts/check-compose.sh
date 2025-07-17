#!/bin/bash

# Docker Compose Configuration Check Script
# Validates docker-compose.yml configuration before running tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Docker Compose Configuration Check${NC}"
echo "========================================="
echo ""

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

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if docker-compose.yml exists
check_compose_file() {
    echo -e "${BLUE}📄 Checking docker-compose.yml...${NC}"
    
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found"
        exit 1
    fi
    
    print_success "docker-compose.yml found"
}

# Validate compose file syntax
validate_syntax() {
    echo -e "${BLUE}📝 Validating syntax...${NC}"
    
    if docker-compose config > /dev/null 2>&1; then
        print_success "docker-compose.yml syntax is valid"
    else
        print_error "docker-compose.yml syntax error:"
        docker-compose config
        exit 1
    fi
}

# Check required services
check_services() {
    echo -e "${BLUE}🔧 Checking services...${NC}"
    
    local required_services=("db" "backend" "frontend" "nginx")
    local defined_services=$(docker-compose config --services)
    
    for service in "${required_services[@]}"; do
        if echo "$defined_services" | grep -q "^$service$"; then
            print_success "Service '$service' is defined"
        else
            print_error "Required service '$service' is missing"
            exit 1
        fi
    done
}

# Check environment file
check_env_file() {
    echo -e "${BLUE}🌍 Checking environment configuration...${NC}"
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found"
        if [ -f ".env.development" ]; then
            print_info "Found .env.development template"
            print_info "Creating .env from template..."
            cp .env.development .env
            print_success ".env file created"
        else
            print_error "No environment configuration found"
            exit 1
        fi
    else
        print_success ".env file found"
    fi
    
    # Check required environment variables
    local required_vars=("DB_USER" "DB_PASSWORD" "DB_NAME" "BACKEND_PORT" "FRONTEND_PORT")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_success "All required environment variables are present"
    else
        print_warning "Missing environment variables: ${missing_vars[*]}"
    fi
}

# Check required files for services
check_service_files() {
    echo -e "${BLUE}📁 Checking service files...${NC}"
    
    # Check backend files
    if [ -f "backend/Dockerfile" ]; then
        print_success "Backend Dockerfile found"
    else
        print_error "backend/Dockerfile not found"
        exit 1
    fi
    
    # Check frontend files
    if [ -f "frontend/Dockerfile.dev" ]; then
        print_success "Frontend Dockerfile found"
    else
        print_error "frontend/Dockerfile.dev not found"
        exit 1
    fi
    
    # Check nginx files
    if [ -f "nginx/nginx.conf" ] || [ -f "nginx/default.conf" ]; then
        print_success "Nginx configuration found"
    else
        print_error "Nginx configuration files not found"
        exit 1
    fi
    
    # Check database init script
    if [ -f "init.sql" ]; then
        print_success "Database initialization script found"
    else
        print_error "init.sql not found"
        exit 1
    fi
}

# Check port conflicts
check_ports() {
    echo -e "${BLUE}🔌 Checking port availability...${NC}"
    
    local ports=(3000 8080 5432 80)
    local busy_ports=()
    
    for port in "${ports[@]}"; do
        if lsof -i :$port > /dev/null 2>&1; then
            busy_ports+=($port)
        fi
    done
    
    if [ ${#busy_ports[@]} -eq 0 ]; then
        print_success "All required ports are available"
    else
        print_warning "Ports in use: ${busy_ports[*]}"
        print_info "You may need to stop existing services or change port configuration"
    fi
}

# Check Docker system
check_docker_system() {
    echo -e "${BLUE}🐳 Checking Docker system...${NC}"
    
    # Check Docker daemon
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    print_success "Docker daemon is running"
    
    # Check available space
    local available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 5 ]; then
        print_warning "Low disk space: ${available_space}GB available"
        print_info "Docker builds may fail with insufficient space"
    else
        print_success "Sufficient disk space available: ${available_space}GB"
    fi
    
    # Check Docker Compose version
    local compose_version=$(docker-compose version --short 2>/dev/null || echo "unknown")
    print_info "Docker Compose version: $compose_version"
}

# Show configuration summary
show_config_summary() {
    echo -e "${BLUE}📋 Configuration Summary${NC}"
    echo "=========================="
    
    echo -e "${YELLOW}Services:${NC}"
    docker-compose config --services | sed 's/^/  - /'
    
    echo ""
    echo -e "${YELLOW}Volumes:${NC}"
    docker-compose config --volumes | sed 's/^/  - /'
    
    echo ""
    echo -e "${YELLOW}Networks:${NC}"
    docker-compose config | grep -A 10 "networks:" | grep "^  [a-zA-Z]" | sed 's/^/  - /' || echo "  - default"
    
    echo ""
    echo -e "${YELLOW}Environment:${NC}"
    if [ -f ".env" ]; then
        grep -E "^[A-Z_]+=.*" .env | head -10 | sed 's/^/  /'
        local env_count=$(grep -c -E "^[A-Z_]+=.*" .env)
        if [ "$env_count" -gt 10 ]; then
            echo "  ... and $((env_count - 10)) more variables"
        fi
    else
        echo "  No .env file found"
    fi
}

# Main function
main() {
    check_compose_file
    validate_syntax
    check_services
    check_env_file
    check_service_files
    check_ports
    check_docker_system
    
    echo ""
    show_config_summary
    
    echo ""
    print_success "Configuration check completed successfully!"
    echo ""
    print_info "You can now run: ./scripts/test-environment.sh"
    print_info "Or start services with: docker-compose up -d"
}

# Run main function
main "$@"
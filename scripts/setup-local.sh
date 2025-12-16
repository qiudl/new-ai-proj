#!/bin/bash

###############################################################################
# AI Project - Local Development Environment Setup Script
#
# This script automates the setup of a local development environment.
# It can be executed by AI assistants or human developers.
#
# Usage:
#   ./scripts/setup-local.sh [options]
#
# Options:
#   --skip-deps     Skip dependency installation
#   --skip-db       Skip database setup
#   --skip-config   Skip configuration generation
#   --check-only    Only check environment, don't install anything
#   --help          Show this help message
#
# Requirements:
#   - macOS or Linux (Ubuntu/Debian)
#   - Internet connection
#   - sudo access (for some installations)
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DB_USER="ai_dev"
DB_PASSWORD="ai_dev_2024"
DB_NAME="ai_project_local"
BACKEND_PORT=8080
FRONTEND_PORT=3000

# Flags
SKIP_DEPS=false
SKIP_DB=false
SKIP_CONFIG=false
CHECK_ONLY=false

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

###############################################################################
# Utility Functions
###############################################################################

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}>>> $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

get_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*)  echo "linux" ;;
        *)       echo "unknown" ;;
    esac
}

###############################################################################
# Parse Arguments
###############################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --skip-config)
                SKIP_CONFIG=true
                shift
                ;;
            --check-only)
                CHECK_ONLY=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
AI Project - Local Development Environment Setup

Usage:
  ./scripts/setup-local.sh [options]

Options:
  --skip-deps     Skip dependency installation (Go, Node.js, PostgreSQL)
  --skip-db       Skip database setup
  --skip-config   Skip configuration file generation
  --check-only    Only check environment status, don't make changes
  --help, -h      Show this help message

Examples:
  # Full setup
  ./scripts/setup-local.sh

  # Check current environment
  ./scripts/setup-local.sh --check-only

  # Skip dependency installation
  ./scripts/setup-local.sh --skip-deps

EOF
}

###############################################################################
# Environment Check Functions
###############################################################################

check_environment() {
    log_step "Checking Environment"

    local os=$(get_os)
    log "Operating System: $os"

    local all_ok=true

    # Check Git
    if check_command git; then
        log_success "Git: $(git --version)"
    else
        log_error "Git: Not installed"
        all_ok=false
    fi

    # Check Go
    if check_command go; then
        log_success "Go: $(go version | cut -d' ' -f3)"
    else
        log_warning "Go: Not installed"
        all_ok=false
    fi

    # Check Node.js
    if check_command node; then
        log_success "Node.js: $(node --version)"
    else
        log_warning "Node.js: Not installed"
        all_ok=false
    fi

    # Check npm
    if check_command npm; then
        log_success "npm: $(npm --version)"
    else
        log_warning "npm: Not installed"
        all_ok=false
    fi

    # Check PostgreSQL
    if check_command psql; then
        log_success "PostgreSQL: $(psql --version | cut -d' ' -f3)"
    else
        log_warning "PostgreSQL: Not installed"
        all_ok=false
    fi

    # Check pg_isready
    if check_command pg_isready; then
        if pg_isready -q 2>/dev/null; then
            log_success "PostgreSQL server: Running"
        else
            log_warning "PostgreSQL server: Not running"
        fi
    fi

    # Check ports
    if lsof -i ":$BACKEND_PORT" &>/dev/null; then
        log_warning "Port $BACKEND_PORT: In use"
    else
        log_success "Port $BACKEND_PORT: Available"
    fi

    if lsof -i ":$FRONTEND_PORT" &>/dev/null; then
        log_warning "Port $FRONTEND_PORT: In use"
    else
        log_success "Port $FRONTEND_PORT: Available"
    fi

    # Check project files
    if [[ -f "$PROJECT_ROOT/backend/go.mod" ]]; then
        log_success "Backend source: Found"
    else
        log_error "Backend source: Not found"
        all_ok=false
    fi

    if [[ -f "$PROJECT_ROOT/frontend/package.json" ]]; then
        log_success "Frontend source: Found"
    else
        log_error "Frontend source: Not found"
        all_ok=false
    fi

    echo ""
    if $all_ok; then
        log_success "Environment check passed!"
        return 0
    else
        log_warning "Some components are missing or not configured"
        return 1
    fi
}

###############################################################################
# Installation Functions
###############################################################################

install_dependencies_macos() {
    log_step "Installing Dependencies (macOS)"

    # Check/Install Homebrew
    if ! check_command brew; then
        log "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Add to PATH
        if [[ -f /opt/homebrew/bin/brew ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f /usr/local/bin/brew ]]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
    log_success "Homebrew ready"

    # Install Git
    if ! check_command git; then
        log "Installing Git..."
        brew install git
    fi
    log_success "Git ready"

    # Install Go
    if ! check_command go; then
        log "Installing Go..."
        brew install go
    fi
    log_success "Go ready: $(go version | cut -d' ' -f3)"

    # Install Node.js
    if ! check_command node; then
        log "Installing Node.js..."
        brew install node@20
        brew link node@20 --force 2>/dev/null || true
    fi
    log_success "Node.js ready: $(node --version)"

    # Install PostgreSQL
    if ! check_command psql; then
        log "Installing PostgreSQL..."
        brew install postgresql@16

        # Add to PATH
        echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
        export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
    fi

    # Start PostgreSQL
    brew services start postgresql@16 2>/dev/null || true
    sleep 2
    log_success "PostgreSQL ready"
}

install_dependencies_linux() {
    log_step "Installing Dependencies (Linux)"

    # Update package list
    sudo apt-get update

    # Install Git
    if ! check_command git; then
        log "Installing Git..."
        sudo apt-get install -y git
    fi
    log_success "Git ready"

    # Install Go
    if ! check_command go; then
        log "Installing Go..."
        GO_VERSION="1.24.0"
        wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
        sudo rm -rf /usr/local/go
        sudo tar -C /usr/local -xzf /tmp/go.tar.gz
        rm /tmp/go.tar.gz

        # Add to PATH
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        export PATH=$PATH:/usr/local/go/bin
    fi
    log_success "Go ready: $(go version | cut -d' ' -f3)"

    # Install Node.js
    if ! check_command node; then
        log "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    log_success "Node.js ready: $(node --version)"

    # Install PostgreSQL
    if ! check_command psql; then
        log "Installing PostgreSQL..."
        sudo apt-get install -y postgresql postgresql-contrib
    fi

    # Start PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    log_success "PostgreSQL ready"
}

###############################################################################
# Database Setup
###############################################################################

setup_database() {
    log_step "Setting Up Database"

    local os=$(get_os)

    # Wait for PostgreSQL to be ready
    local retries=10
    while ! pg_isready -q 2>/dev/null; do
        retries=$((retries - 1))
        if [[ $retries -le 0 ]]; then
            log_error "PostgreSQL is not ready"
            return 1
        fi
        log "Waiting for PostgreSQL to start..."
        sleep 2
    done

    if [[ "$os" == "macos" ]]; then
        # macOS: Use current user context
        log "Creating database user..."
        createuser -s "$DB_USER" 2>/dev/null || log_warning "User $DB_USER may already exist"

        log "Setting password..."
        psql postgres -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true

        log "Creating database..."
        createdb -O "$DB_USER" "$DB_NAME" 2>/dev/null || log_warning "Database $DB_NAME may already exist"

    elif [[ "$os" == "linux" ]]; then
        # Linux: Use postgres superuser
        log "Creating database user..."
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' CREATEDB;" 2>/dev/null || log_warning "User $DB_USER may already exist"

        log "Creating database..."
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || log_warning "Database $DB_NAME may already exist"

        log "Granting privileges..."
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
    fi

    # Verify connection
    log "Verifying database connection..."
    if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
        log_success "Database connection successful!"
    else
        log_error "Database connection failed!"
        return 1
    fi
}

###############################################################################
# Configuration Setup
###############################################################################

setup_configuration() {
    log_step "Setting Up Configuration"

    # Generate JWT secret
    local jwt_secret
    if check_command openssl; then
        jwt_secret=$(openssl rand -hex 32)
    else
        jwt_secret=$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 32)
    fi

    # Backend .env
    local backend_env="$PROJECT_ROOT/backend/.env"
    if [[ -f "$backend_env" ]]; then
        log_warning "Backend .env already exists, backing up..."
        cp "$backend_env" "${backend_env}.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    log "Creating backend/.env..."
    cat > "$backend_env" << EOF
# Backend Environment Configuration
# Generated by setup-local.sh on $(date)

ENV=development
NODE_ENV=development
APP_ENV=development
GIN_MODE=debug

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_SSL_MODE=disable

DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?sslmode=disable

ENABLE_READ_WRITE_SPLIT=false
DB_MASTER_DSN=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?sslmode=disable
DB_SLAVE_DSN=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?sslmode=disable

# Server Configuration
PORT=$BACKEND_PORT
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=$jwt_secret
JWT_EXPIRATION=24h

# Feature Flags
FEATURE_SUPERADMIN_ENABLE=true
SUPER_ADMIN_USERNAMES=admin

# Development Login
DEV_LOGIN_USERNAME=qiudl

# Logging
LOG_LEVEL=debug

# Encryption Key (32 bytes for AES-256)
ENCRYPTION_KEY=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | base64 | tr -d '/+=' | head -c 32)
EOF
    log_success "Backend .env created"

    # Frontend .env.local
    local frontend_env="$PROJECT_ROOT/frontend/.env.local"
    if [[ -f "$frontend_env" ]]; then
        log_warning "Frontend .env.local already exists, backing up..."
        cp "$frontend_env" "${frontend_env}.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    log "Creating frontend/.env.local..."
    cat > "$frontend_env" << EOF
# Frontend Environment Configuration
# Generated by setup-local.sh on $(date)

REACT_APP_API_URL=http://localhost:$BACKEND_PORT/api/v1
REACT_APP_API_BASE_URL=http://localhost:$BACKEND_PORT/api/v1
REACT_APP_ENV=development
EOF
    log_success "Frontend .env.local created"
}

###############################################################################
# Project Setup
###############################################################################

setup_project() {
    log_step "Setting Up Project Dependencies"

    # Backend dependencies
    log "Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend"
    go mod download
    go mod tidy
    log_success "Backend dependencies installed"

    # Frontend dependencies
    log "Installing frontend dependencies (this may take a few minutes)..."
    cd "$PROJECT_ROOT/frontend"
    npm ci 2>/dev/null || npm install
    log_success "Frontend dependencies installed"

    cd "$PROJECT_ROOT"
}

###############################################################################
# Main
###############################################################################

main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       AI Project - Local Development Setup                 ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    parse_args "$@"

    # Check only mode
    if $CHECK_ONLY; then
        check_environment
        exit $?
    fi

    # Detect OS
    local os=$(get_os)
    if [[ "$os" == "unknown" ]]; then
        log_error "Unsupported operating system"
        exit 1
    fi
    log "Detected OS: $os"

    # Install dependencies
    if ! $SKIP_DEPS; then
        if [[ "$os" == "macos" ]]; then
            install_dependencies_macos
        elif [[ "$os" == "linux" ]]; then
            install_dependencies_linux
        fi
    else
        log "Skipping dependency installation"
    fi

    # Setup database
    if ! $SKIP_DB; then
        setup_database
    else
        log "Skipping database setup"
    fi

    # Setup configuration
    if ! $SKIP_CONFIG; then
        setup_configuration
    else
        log "Skipping configuration setup"
    fi

    # Setup project
    setup_project

    # Final check
    check_environment

    # Show completion message
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Setup Complete!                         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "To start the development servers:"
    echo ""
    echo "  Option 1: Use the dev script (recommended)"
    echo "    ./scripts/dev.sh local"
    echo ""
    echo "  Option 2: Manual start"
    echo "    # Terminal 1 - Backend"
    echo "    cd backend && go run main.go"
    echo ""
    echo "    # Terminal 2 - Frontend"
    echo "    cd frontend && npm start"
    echo ""
    echo "Access the application:"
    echo "  - Frontend: http://localhost:$FRONTEND_PORT"
    echo "  - Backend API: http://localhost:$BACKEND_PORT/api/v1"
    echo "  - API Docs: http://localhost:$BACKEND_PORT/docs"
    echo ""
}

main "$@"

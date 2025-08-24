#!/usr/bin/env bash
set -euo pipefail

# tmux Multi-AI Development Bootstrap
# Usage: bash scripts/bootstrap.sh [session_name]

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly SESSION="${1:-ai-dev}"
readonly LOG_DIR="${PROJECT_ROOT}/logs"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $*${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $*${NC}" >&2
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $*${NC}" >&2
    exit 1
}

check_dependencies() {
    local missing=()
    
    command -v tmux >/dev/null 2>&1 || missing+=("tmux")
    command -v direnv >/dev/null 2>&1 && log "direnv found" || warn "direnv not found (optional)"
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Missing dependencies: ${missing[*]}. Please install them first."
    fi
}

setup_environment() {
    # Load direnv if available and .envrc exists
    if [[ -f "${PROJECT_ROOT}/.envrc" ]] && command -v direnv >/dev/null 2>&1; then
        log "Loading environment variables via direnv..."
        eval "$(direnv export bash 2>/dev/null || true)"
    fi
    
    # Ensure log directory exists
    mkdir -p "${LOG_DIR}"
    
    # Start optional services
    if [[ -f "${PROJECT_ROOT}/docker-compose.yml" ]] && [[ "${ENABLE_POSTGRES:-}" == "true" ]]; then
        log "Starting PostgreSQL via docker-compose..."
        cd "${PROJECT_ROOT}"
        docker-compose up -d db
        cd - >/dev/null
    fi
}

main() {
    log "Starting tmux multi-AI development environment..."
    log "Project root: ${PROJECT_ROOT}"
    log "Session name: ${SESSION}"
    
    check_dependencies
    setup_environment
    
    # Run the tmux session setup
    log "Creating tmux session..."
    bash "${SCRIPT_DIR}/tmux-session.sh" "${SESSION}"
    
    log "Bootstrap complete! Use 'tmux attach -t ${SESSION}' to connect."
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

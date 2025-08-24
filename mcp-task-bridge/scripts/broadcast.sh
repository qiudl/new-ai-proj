#!/usr/bin/env bash
set -euo pipefail

# Multi-AI Broadcast and Routing Script
# Usage: bash scripts/broadcast.sh [options] <command>

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly LOG_DIR="${PROJECT_ROOT}/logs"
readonly BROADCAST_LOG="${LOG_DIR}/broadcast.log"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m'

log() {
    echo -e "${BLUE}[BROADCAST] $*${NC}" >&2
}

error() {
    echo -e "${RED}[BROADCAST ERROR] $*${NC}" >&2
    exit 1
}

usage() {
    cat << EOF
Multi-AI Broadcast and Routing Script

USAGE:
    $0 [OPTIONS] <command>

OPTIONS:
    -s, --session <name>        Target session (default: ai-dev)
    -w, --window <name>         Target window (default: current)
    -p, --pane <index>          Target pane index
    -t, --target <win:pane>     Target window:pane (e.g., coder:1)
    -g, --group <name>          Broadcast to group (A|B|C|planner|coder|tester|runner|observer)
    -a, --all                   Broadcast to all panes in session
    -i, --interactive           Interactive target selection
    -l, --list                  List available targets
    -v, --verbose               Verbose output
    -h, --help                  Show this help

GROUPS:
    A, B, C                     Custom groups (configurable)
    planner                     Planner window (all panes)
    coder                       Coder window (all panes)
    tester                      Tester window (all panes)
    runner                      Runner window (all panes)
    observer                    Observer window (all panes)
    all                         All panes in session

EXAMPLES:
    $0 "echo 'Hello World'"                    # Send to current pane
    $0 -w coder "git status"                   # Send to coder window (all panes)
    $0 -t coder:1 "vim main.py"               # Send to coder window, pane 1
    $0 -g planner "plan new feature"          # Send to planner group
    $0 -a "cd /project && ls -la"             # Broadcast to all panes
    $0 -i                                      # Interactive mode

EOF
}

get_current_session() {
    tmux display-message -p '#{session_name}' 2>/dev/null || echo "ai-dev"
}

get_current_window() {
    tmux display-message -p '#{window_name}' 2>/dev/null || echo ""
}

list_targets() {
    local session="$1"
    
    if ! tmux has-session -t "$session" 2>/dev/null; then
        error "Session '$session' not found"
    fi
    
    echo -e "${GREEN}Available targets in session '$session':${NC}"
    echo
    
    # List windows and panes
    tmux list-windows -t "$session" -F "#{window_index}:#{window_name}" | while read -r window; do
        local window_index="${window%:*}"
        local window_name="${window#*:}"
        
        echo -e "${YELLOW}Window $window_index ($window_name):${NC}"
        
        tmux list-panes -t "$session:$window_name" -F "  Pane #{pane_index}: #{pane_current_command} (#{pane_width}x#{pane_height})"
    done
    
    echo
    echo -e "${PURPLE}Groups:${NC}"
    echo "  planner, coder, tester, runner, observer, all"
    echo "  A, B, C (custom groups - configurable)"
}

resolve_group_targets() {
    local session="$1"
    local group="$2"
    local targets=()
    
    case "$group" in
        "planner")
            if tmux has-session -t "$session" && tmux list-windows -t "$session" -F "#{window_name}" | grep -q "^planner$"; then
                targets+=("$session:planner")
            fi
            ;;
        "coder")
            if tmux has-session -t "$session" && tmux list-windows -t "$session" -F "#{window_name}" | grep -q "^coder$"; then
                targets+=("$session:coder")
            fi
            ;;
        "tester")
            if tmux has-session -t "$session" && tmux list-windows -t "$session" -F "#{window_name}" | grep -q "^tester$"; then
                targets+=("$session:tester")
            fi
            ;;
        "runner")
            if tmux has-session -t "$session" && tmux list-windows -t "$session" -F "#{window_name}" | grep -q "^runner$"; then
                targets+=("$session:runner")
            fi
            ;;
        "observer")
            if tmux has-session -t "$session" && tmux list-windows -t "$session" -F "#{window_name}" | grep -q "^observer$"; then
                targets+=("$session:observer")
            fi
            ;;
        "all")
            # All panes in session
            while IFS= read -r pane; do
                targets+=("$pane")
            done < <(tmux list-panes -a -s -F "#{session_name}:#{window_name}.#{pane_index}" | grep "^$session:")
            ;;
        "A"|"B"|"C")
            # Custom groups - read from config file or environment
            local group_file="${PROJECT_ROOT}/.tmux-groups"
            if [[ -f "$group_file" ]]; then
                while IFS= read -r target; do
                    [[ "$target" =~ ^$group: ]] && targets+=("${target#*:}")
                done < "$group_file"
            else
                error "Custom group '$group' not configured. Create $group_file with group:target format."
            fi
            ;;
        *)
            error "Unknown group: $group"
            ;;
    esac
    
    printf '%s\n' "${targets[@]}"
}

interactive_target_selection() {
    local session="$1"
    
    echo -e "${GREEN}Interactive Target Selection${NC}"
    echo
    
    list_targets "$session"
    echo
    
    while true; do
        echo -e "${YELLOW}Select target:${NC}"
        echo "1. Window name (e.g., 'coder')"
        echo "2. Window:Pane (e.g., 'coder:1')"
        echo "3. Group (e.g., 'planner', 'A', 'all')"
        echo "4. List targets again"
        echo "5. Cancel"
        echo
        read -p "Enter choice or target: " choice
        
        case "$choice" in
            "4")
                echo
                list_targets "$session"
                echo
                ;;
            "5"|"cancel"|"quit"|"exit")
                echo "Cancelled."
                exit 0
                ;;
            *)
                echo "$choice"
                return 0
                ;;
        esac
    done
}

log_broadcast() {
    local target="$1"
    local command="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    mkdir -p "$LOG_DIR"
    echo "[$timestamp] Target: $target | Command: $command" >> "$BROADCAST_LOG"
}

send_to_target() {
    local target="$1"
    local command="$2"
    local verbose="$3"
    
    # Parse target format
    local session_part window_part pane_part
    
    if [[ "$target" =~ ^([^:]+):([^.]+)\.([0-9]+)$ ]]; then
        # Format: session:window.pane
        session_part="${BASH_REMATCH[1]}"
        window_part="${BASH_REMATCH[2]}"
        pane_part="${BASH_REMATCH[3]}"
        target="${session_part}:${window_part}.${pane_part}"
    elif [[ "$target" =~ ^([^:]+):([^:]+)$ ]]; then
        # Format: session:window or window:pane
        local first_part="${BASH_REMATCH[1]}"
        local second_part="${BASH_REMATCH[2]}"
        
        if [[ "$second_part" =~ ^[0-9]+$ ]]; then
            # window:pane format, use current session
            session_part=$(get_current_session)
            window_part="$first_part"
            pane_part="$second_part"
            target="${session_part}:${window_part}.${pane_part}"
        else
            # session:window format
            session_part="$first_part"
            window_part="$second_part"
            target="${session_part}:${window_part}"
        fi
    else
        # Plain window name, use current session
        session_part=$(get_current_session)
        window_part="$target"
        target="${session_part}:${window_part}"
    fi
    
    # Check if target exists
    if ! tmux has-session -t "$session_part" 2>/dev/null; then
        error "Session '$session_part' not found"
    fi
    
    # Send command
    [[ "$verbose" == "true" ]] && log "Sending to $target: $command"
    
    if tmux send-keys -t "$target" "$command" C-m 2>/dev/null; then
        log_broadcast "$target" "$command"
        [[ "$verbose" == "true" ]] && log "Successfully sent to $target"
    else
        error "Failed to send to target: $target"
    fi
}

broadcast_to_group() {
    local session="$1"
    local group="$2"
    local command="$3"
    local verbose="$4"
    
    local targets
    mapfile -t targets < <(resolve_group_targets "$session" "$group")
    
    if [[ ${#targets[@]} -eq 0 ]]; then
        error "No targets found for group '$group'"
    fi
    
    [[ "$verbose" == "true" ]] && log "Broadcasting to group '$group' (${#targets[@]} targets)"
    
    for target in "${targets[@]}"; do
        send_to_target "$target" "$command" "$verbose"
    done
    
    log "Broadcast completed: $group (${#targets[@]} targets)"
}

main() {
    local session=""
    local window=""
    local pane=""
    local target=""
    local group=""
    local all_panes="false"
    local interactive="false"
    local list_only="false"
    local verbose="false"
    local command=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--session)
                session="$2"
                shift 2
                ;;
            -w|--window)
                window="$2"
                shift 2
                ;;
            -p|--pane)
                pane="$2"
                shift 2
                ;;
            -t|--target)
                target="$2"
                shift 2
                ;;
            -g|--group)
                group="$2"
                shift 2
                ;;
            -a|--all)
                all_panes="true"
                shift
                ;;
            -i|--interactive)
                interactive="true"
                shift
                ;;
            -l|--list)
                list_only="true"
                shift
                ;;
            -v|--verbose)
                verbose="true"
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            -*)
                error "Unknown option: $1"
                ;;
            *)
                command="$*"
                break
                ;;
        esac
    done
    
    # Default session
    [[ -z "$session" ]] && session=$(get_current_session)
    
    # List targets if requested
    if [[ "$list_only" == "true" ]]; then
        list_targets "$session"
        exit 0
    fi
    
    # Interactive mode
    if [[ "$interactive" == "true" ]]; then
        target=$(interactive_target_selection "$session")
        echo
        read -p "Enter command to send: " command
    fi
    
    # Validate command
    if [[ -z "$command" ]]; then
        error "No command provided"
    fi
    
    # Determine target and send
    if [[ "$all_panes" == "true" ]]; then
        broadcast_to_group "$session" "all" "$command" "$verbose"
    elif [[ -n "$group" ]]; then
        broadcast_to_group "$session" "$group" "$command" "$verbose"
    elif [[ -n "$target" ]]; then
        send_to_target "$target" "$command" "$verbose"
    elif [[ -n "$window" ]]; then
        local full_target="$session:$window"
        [[ -n "$pane" ]] && full_target="$full_target.$pane"
        send_to_target "$full_target" "$command" "$verbose"
    else
        # Send to current pane
        local current_target
        current_target=$(tmux display-message -p '#{session_name}:#{window_name}.#{pane_index}' 2>/dev/null)
        if [[ -n "$current_target" ]]; then
            send_to_target "$current_target" "$command" "$verbose"
        else
            error "No target specified and could not determine current pane"
        fi
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

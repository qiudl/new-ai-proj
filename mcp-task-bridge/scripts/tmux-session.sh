#!/usr/bin/env bash
set -euo pipefail

# tmux Session Configuration for Multi-AI Development
# Usage: bash scripts/tmux-session.sh [session_name]

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly SESSION="${1:-ai-dev}"

log() {
    echo -e "\033[0;32m[$(date +'%H:%M:%S')] $*\033[0m" >&2
}

create_session() {
    local session="$1"
    
    # Check if session already exists
    if tmux has-session -t "$session" 2>/dev/null; then
        log "Session '$session' already exists. Attaching..."
        tmux attach -t "$session"
        return 0
    fi
    
    log "Creating new tmux session: $session"
    
    # Create session with first window (planner)
    tmux new-session -d -s "$session" -n planner -c "$PROJECT_ROOT"
    tmux send-keys -t "$session":planner 'echo "🤖 AI Planner ready - Strategic planning and task coordination"' C-m
    tmux send-keys -t "$session":planner 'echo "Available commands: plan <goal>, break-down <task>, assign <task> <agent>"' C-m
    
    # Window 2: Coder (split into 2 panes for parallel coding)
    tmux new-window -t "$session" -n coder -c "$PROJECT_ROOT"
    tmux send-keys -t "$session":coder 'echo "💻 AI Coder #1 ready - Implementation and development"' C-m
    tmux split-window -h -t "$session":coder -c "$PROJECT_ROOT"
    tmux send-keys -t "$session":coder.1 'echo "💻 AI Coder #2 ready - Code review and refactoring"' C-m
    tmux select-layout -t "$session":coder even-horizontal
    
    # Window 3: Tester (split for different test types)
    tmux new-window -t "$session" -n tester -c "$PROJECT_ROOT"
    tmux send-keys -t "$session":tester 'echo "🧪 AI Tester #1 ready - Unit tests and validation"' C-m
    tmux split-window -h -t "$session":tester -c "$PROJECT_ROOT"
    tmux send-keys -t "$session":tester.1 'echo "🧪 AI Tester #2 ready - Integration and E2E tests"' C-m
    tmux select-layout -t "$session":tester even-horizontal
    
    # Window 4: Runner (execution and debugging)
    tmux new-window -t "$session" -n runner -c "$PROJECT_ROOT"
    tmux send-keys -t "$session":runner 'echo "🚀 AI Runner ready - Execution, debugging and deployment"' C-m
    tmux split-window -v -t "$session":runner -c "$PROJECT_ROOT" -p 30
    tmux send-keys -t "$session":runner.1 'echo "📊 Status monitor ready"' C-m
    
    # Window 5: Observer (logs, monitoring, task bridge)
    tmux new-window -t "$session" -n observer -c "$PROJECT_ROOT"
    tmux send-keys -t "$session":observer 'echo "👁️  AI Observer ready - Monitoring and task bridge integration"' C-m
    tmux split-window -h -t "$session":observer -c "$PROJECT_ROOT"
    tmux send-keys -t "$session":observer.1 'echo "📋 MCP Task Bridge integration ready"' C-m
    tmux split-window -v -t "$session":observer.1 -c "$PROJECT_ROOT" -p 50
    tmux send-keys -t "$session":observer.2 'echo "📝 Log monitor ready - tail -f logs/*"' C-m
    
    # Window 6: Misc (temporary work, experiments)
    tmux new-window -t "$session" -n misc -c "$PROJECT_ROOT"
    tmux send-keys -t "$session":misc 'echo "🛠️  Misc workspace ready - Experiments and temporary tasks"' C-m
    
    # Select planner window as default
    tmux select-window -t "$session":planner
}

configure_keybindings() {
    local session="$1"
    
    log "Configuring custom keybindings..."
    
    # Set prefix to Ctrl-a
    tmux set -g prefix C-a
    tmux unbind C-b
    tmux bind C-a send-prefix
    
    # Custom keybindings for multi-AI workflow
    tmux bind b set-window-option synchronize-panes \\\; display-message "🔀 Sync-panes: #{?pane_synchronized,✅ ON,❌ OFF}"
    tmux bind p if -F '#{pane_pipe}' \
        'pipe-pane' \
        'pipe-pane -o "cat >> logs/#{session_name}_#{window_name}-#{pane_index}.log"' \\\; \
        display-message "📝 Logging: #{?pane_pipe,✅ ON,❌ OFF}"
    tmux bind R run-shell "bash ${SCRIPT_DIR}/tmux-session.sh rebuild '#{session_name}' '#{window_name}'"
    tmux bind g display-popup -E "bash ${SCRIPT_DIR}/broadcast.sh -i"
    tmux bind L display-message "📊 Last broadcast: \$(tail -1 logs/broadcast.log 2>/dev/null || echo 'None')"
    
    # Quick window switching for AI roles
    tmux bind 1 select-window -t planner
    tmux bind 2 select-window -t coder
    tmux bind 3 select-window -t tester
    tmux bind 4 select-window -t runner
    tmux bind 5 select-window -t observer
    tmux bind 6 select-window -t misc
    
    # Enhanced status bar
    tmux set -g status-left "[#S] "
    tmux set -g status-right "#{?pane_synchronized,🔀,} #{?pane_pipe,📝,} %H:%M"
    tmux set -g status-style "bg=colour235,fg=colour250"
    tmux set -g window-status-current-style "bg=colour39,fg=colour235,bold"
}

enable_logging() {
    local session="$1"
    local log_dir="${PROJECT_ROOT}/logs"
    
    log "Enabling automatic logging for all panes..."
    
    # Enable pipe-pane for all existing panes
    tmux list-panes -a -F "#{session_name}:#{window_index}.#{pane_index}" | while read pane; do
        if [[ "$pane" == "${session}:"* ]]; then
            local logfile="${log_dir}/$(echo "$pane" | tr ':.' '_').log"
            tmux pipe-pane -t "$pane" -o "cat >> $logfile"
        fi
    done
    
    # Create broadcast log
    touch "${log_dir}/broadcast.log"
    chmod 644 "${log_dir}/broadcast.log"
}

rebuild_window() {
    local session="$1"
    local window="${2:-}"
    
    if [[ -z "$window" ]]; then
        log "Rebuilding entire session..."
        tmux kill-session -t "$session"
        create_session "$session"
        configure_keybindings "$session"
        enable_logging "$session"
    else
        log "Rebuilding window: $window"
        # Add window-specific rebuild logic here
        tmux display-message "Window rebuild not implemented yet"
    fi
}

main() {
    local action="${2:-create}"
    
    case "$action" in
        "create")
            create_session "$SESSION"
            configure_keybindings "$SESSION"
            enable_logging "$SESSION"
            ;;
        "rebuild")
            rebuild_window "$SESSION" "${3:-}"
            ;;
        *)
            echo "Usage: $0 <session_name> [create|rebuild] [window_name]"
            exit 1
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

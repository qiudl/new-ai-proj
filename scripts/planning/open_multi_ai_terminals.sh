#!/usr/bin/env bash
# Launch multiple terminal panes for different AI owners and background refresh.
# Supported on MacOS with iTerm2 (tmux alternative). If iTerm2 is not installed,
# the script will fall back to running commands in the current shell with tmux if available.
# Usage: ./scripts/planning/open_multi_ai_terminals.sh

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REFRESH="$ROOT_DIR/scripts/planning/refresh_ai_plan.sh"
WATCH_OWNER="$ROOT_DIR/scripts/planning/watch_owner.sh"
TAIL_PROGRESS="$ROOT_DIR/scripts/planning/tail_ai_progress.sh"

# Detect terminal capabilities
open_iterm=0
if command -v osascript >/dev/null 2>&1; then
  if osascript -e 'application "iTerm" is running' >/dev/null 2>&1 || osascript -e 'id of application "iTerm"' >/dev/null 2>&1; then
    open_iterm=1
  fi
fi

# Ensure scripts are executable
chmod +x "$REFRESH" "$WATCH_OWNER" "$TAIL_PROGRESS" || true

if [ "$open_iterm" -eq 1 ]; then
  # Open iTerm2 windows/tabs and run commands
  osascript <<OSA
  tell application "iTerm"
    activate
    set newWindow to (create window with default profile)
    tell current session of newWindow
      write text "cd $ROOT_DIR && bash $REFRESH 5"
    end tell

    tell newWindow
      create tab with default profile
      tell current session
        write text "cd $ROOT_DIR && bash $WATCH_OWNER ai:infra 3"
      end tell

      create tab with default profile
      tell current session
        write text "cd $ROOT_DIR && bash $WATCH_OWNER ai:backend 3"
      end tell

      create tab with default profile
      tell current session
        write text "cd $ROOT_DIR && bash $WATCH_OWNER ai:planner 3"
      end tell

      create tab with default profile
      tell current session
        write text "cd $ROOT_DIR && bash $TAIL_PROGRESS"
      end tell
    end tell
  end tell
OSA
  echo "Opened iTerm with refresh + owner watchers + progress tail."
  exit 0
fi

# Fallback to tmux if available
if command -v tmux >/dev/null 2>&1; then
  session="ai-multi"
  tmux new-session -d -s "$session" "cd $ROOT_DIR && bash $REFRESH 5"
  tmux split-window -h "cd $ROOT_DIR && bash $WATCH_OWNER ai:infra 3"
  tmux split-window -v "cd $ROOT_DIR && bash $WATCH_OWNER ai:backend 3"
  tmux split-window -v "cd $ROOT_DIR && bash $WATCH_OWNER ai:planner 3"
  tmux select-layout tiled
  tmux new-window -t "$session" "cd $ROOT_DIR && bash $TAIL_PROGRESS"
  tmux attach -t "$session"
  exit 0
fi

# Last resort: run in current shell sequentially
echo "Neither iTerm nor tmux detected. Running refresh + watchers in background; use Ctrl+C to stop."
(bash "$REFRESH" 5 &) && (bash "$WATCH_OWNER" ai:infra 3 &) && (bash "$WATCH_OWNER" ai:backend 3 &) && bash "$TAIL_PROGRESS"


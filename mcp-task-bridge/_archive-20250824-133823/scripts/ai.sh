#!/usr/bin/env bash
set -euo pipefail

# AI Gateway - Unified CLI for multiple AI providers
# Usage: bash scripts/ai.sh [options] <message>

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default configuration (can be overridden via environment variables)
readonly DEFAULT_MODEL="${AI_MODEL:-gpt-4o-mini}"
readonly DEFAULT_BACKEND="${AI_BACKEND:-openai}"
readonly DEFAULT_TEMPERATURE="${AI_TEMPERATURE:-0.7}"
readonly DEFAULT_MAX_TOKENS="${AI_MAX_TOKENS:-2048}"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

log() {
    echo -e "${BLUE}[AI] $*${NC}" >&2
}

error() {
    echo -e "${RED}[AI ERROR] $*${NC}" >&2
    exit 1
}

usage() {
    cat << EOF
AI Gateway - Unified CLI for multiple AI providers

USAGE:
    $0 [OPTIONS] <message>
    $0 [OPTIONS] < input.txt
    echo "Hello" | $0 [OPTIONS]

OPTIONS:
    -m, --model <model>         Model name (default: $DEFAULT_MODEL)
    -b, --backend <backend>     Backend provider (default: $DEFAULT_BACKEND)
    -t, --temperature <temp>    Temperature 0.0-1.0 (default: $DEFAULT_TEMPERATURE)
    -x, --max-tokens <tokens>   Max tokens (default: $DEFAULT_MAX_TOKENS)
    -s, --system <prompt>       System prompt
    -r, --role <role>           AI role preset (planner|coder|tester|runner|observer)
    -i, --interactive           Interactive mode
    -v, --verbose               Verbose output
    -h, --help                  Show this help

BACKENDS:
    openai      OpenAI API (requires OPENAI_API_KEY)
    anthropic   Anthropic Claude API (requires ANTHROPIC_API_KEY)
    ollama      Local Ollama (requires ollama running)
    litellm     LiteLLM proxy (requires LiteLLM setup)

ROLE PRESETS:
    planner     Strategic planning and task breakdown
    coder       Code implementation and development
    tester      Testing and quality assurance
    runner      Execution, debugging, and deployment
    observer    Monitoring and analysis

EXAMPLES:
    $0 "Explain the current project structure"
    $0 -r coder "Implement a function to parse JSON"
    $0 -b anthropic -m claude-3-sonnet "Review this code"
    echo "def hello(): pass" | $0 -r tester "Write tests for this"

EOF
}

get_role_system_prompt() {
    local role="$1"
    
    case "$role" in
        "planner")
            echo "You are an AI Strategic Planner. Your role is to break down complex goals into actionable tasks, coordinate team efforts, and ensure project alignment. Focus on high-level planning, resource allocation, and timeline management."
            ;;
        "coder")
            echo "You are an AI Developer. Your role is to implement features, write clean and maintainable code, perform code reviews, and suggest architectural improvements. Focus on best practices, performance, and code quality."
            ;;
        "tester")
            echo "You are an AI Quality Assurance Engineer. Your role is to design test strategies, write comprehensive tests, identify edge cases, and ensure code quality. Focus on test coverage, validation, and bug prevention."
            ;;
        "runner")
            echo "You are an AI DevOps Engineer. Your role is to manage deployments, debug issues, optimize performance, and ensure system reliability. Focus on execution, monitoring, and troubleshooting."
            ;;
        "observer")
            echo "You are an AI Project Observer. Your role is to monitor progress, analyze patterns, provide insights, and ensure project coordination. Focus on oversight, reporting, and continuous improvement."
            ;;
        *)
            echo "You are a helpful AI assistant focused on software development tasks."
            ;;
    esac
}

call_openai() {
    local model="$1"
    local temperature="$2"
    local max_tokens="$3"
    local system_prompt="$4"
    local user_message="$5"
    local verbose="$6"
    
    [[ -z "${OPENAI_API_KEY:-}" ]] && error "OPENAI_API_KEY environment variable is required for OpenAI backend"
    
    local payload
    payload=$(jq -n \
        --arg model "$model" \
        --arg system_prompt "$system_prompt" \
        --arg user_message "$user_message" \
        --argjson temperature "$temperature" \
        --argjson max_tokens "$max_tokens" \
        '{
            model: $model,
            messages: [
                {role: "system", content: $system_prompt},
                {role: "user", content: $user_message}
            ],
            temperature: $temperature,
            max_tokens: $max_tokens
        }')
    
    [[ "$verbose" == "true" ]] && log "Calling OpenAI API with model: $model"
    
    curl -s -X POST "https://api.openai.com/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${OPENAI_API_KEY}" \
        -d "$payload" \
    | jq -r '.choices[0].message.content // .error.message // "Error: No response"'
}

call_anthropic() {
    local model="$1"
    local temperature="$2"
    local max_tokens="$3"
    local system_prompt="$4"
    local user_message="$5"
    local verbose="$6"
    
    [[ -z "${ANTHROPIC_API_KEY:-}" ]] && error "ANTHROPIC_API_KEY environment variable is required for Anthropic backend"
    
    local payload
    payload=$(jq -n \
        --arg model "$model" \
        --arg system_prompt "$system_prompt" \
        --arg user_message "$user_message" \
        --argjson temperature "$temperature" \
        --argjson max_tokens "$max_tokens" \
        '{
            model: $model,
            system: $system_prompt,
            messages: [
                {role: "user", content: $user_message}
            ],
            temperature: $temperature,
            max_tokens: $max_tokens
        }')
    
    [[ "$verbose" == "true" ]] && log "Calling Anthropic API with model: $model"
    
    curl -s -X POST "https://api.anthropic.com/v1/messages" \
        -H "Content-Type: application/json" \
        -H "x-api-key: ${ANTHROPIC_API_KEY}" \
        -H "anthropic-version: 2023-06-01" \
        -d "$payload" \
    | jq -r '.content[0].text // .error.message // "Error: No response"'
}

call_ollama() {
    local model="$1"
    local temperature="$2"
    local max_tokens="$3"
    local system_prompt="$4"
    local user_message="$5"
    local verbose="$6"
    
    command -v ollama >/dev/null 2>&1 || error "ollama command not found. Please install Ollama first."
    
    [[ "$verbose" == "true" ]] && log "Calling Ollama with model: $model"
    
    local full_prompt="${system_prompt}\n\nUser: ${user_message}\n\nAssistant:"
    
    ollama generate "$model" "$full_prompt" --verbose=false 2>/dev/null
}

call_litellm() {
    local model="$1"
    local temperature="$2"
    local max_tokens="$3"
    local system_prompt="$4"
    local user_message="$5"
    local verbose="$6"
    
    command -v litellm >/dev/null 2>&1 || error "litellm command not found. Please install LiteLLM first."
    
    [[ "$verbose" == "true" ]] && log "Calling LiteLLM with model: $model"
    
    local payload
    payload=$(jq -n \
        --arg model "$model" \
        --arg system_prompt "$system_prompt" \
        --arg user_message "$user_message" \
        --argjson temperature "$temperature" \
        --argjson max_tokens "$max_tokens" \
        '{
            model: $model,
            messages: [
                {role: "system", content: $system_prompt},
                {role: "user", content: $user_message}
            ],
            temperature: $temperature,
            max_tokens: $max_tokens
        }')
    
    echo "$payload" | litellm --model "$model" --input -
}

interactive_mode() {
    local model="$1"
    local backend="$2"
    local temperature="$3"
    local max_tokens="$4"
    local system_prompt="$5"
    local verbose="$6"
    
    log "Starting interactive mode with $backend:$model"
    log "Type 'exit' or 'quit' to end, 'help' for commands"
    echo
    
    while true; do
        printf "${GREEN}You: ${NC}"
        read -r user_input
        
        case "$user_input" in
            "exit"|"quit"|"q")
                log "Goodbye!"
                break
                ;;
            "help"|"h")
                echo "Commands: exit/quit/q (exit), help/h (this help), clear (clear screen)"
                continue
                ;;
            "clear")
                clear
                continue
                ;;
            "")
                continue
                ;;
        esac
        
        printf "${YELLOW}AI: ${NC}"
        case "$backend" in
            "openai") call_openai "$model" "$temperature" "$max_tokens" "$system_prompt" "$user_input" "$verbose" ;;
            "anthropic") call_anthropic "$model" "$temperature" "$max_tokens" "$system_prompt" "$user_input" "$verbose" ;;
            "ollama") call_ollama "$model" "$temperature" "$max_tokens" "$system_prompt" "$user_input" "$verbose" ;;
            "litellm") call_litellm "$model" "$temperature" "$max_tokens" "$system_prompt" "$user_input" "$verbose" ;;
        esac
        echo
        echo
    done
}

main() {
    local model="$DEFAULT_MODEL"
    local backend="$DEFAULT_BACKEND"
    local temperature="$DEFAULT_TEMPERATURE"
    local max_tokens="$DEFAULT_MAX_TOKENS"
    local system_prompt=""
    local role=""
    local interactive="false"
    local verbose="false"
    local message=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -m|--model)
                model="$2"
                shift 2
                ;;
            -b|--backend)
                backend="$2"
                shift 2
                ;;
            -t|--temperature)
                temperature="$2"
                shift 2
                ;;
            -x|--max-tokens)
                max_tokens="$2"
                shift 2
                ;;
            -s|--system)
                system_prompt="$2"
                shift 2
                ;;
            -r|--role)
                role="$2"
                shift 2
                ;;
            -i|--interactive)
                interactive="true"
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
                message="$*"
                break
                ;;
        esac
    done
    
    # Set system prompt based on role if not explicitly provided
    if [[ -n "$role" && -z "$system_prompt" ]]; then
        system_prompt=$(get_role_system_prompt "$role")
    elif [[ -z "$system_prompt" ]]; then
        system_prompt=$(get_role_system_prompt "")
    fi
    
    # Read from stdin if no message provided and not interactive
    if [[ -z "$message" && "$interactive" != "true" ]]; then
        if [[ ! -t 0 ]]; then
            message=$(cat)
        else
            error "No message provided. Use -i for interactive mode or provide a message."
        fi
    fi
    
    # Validate backend
    case "$backend" in
        openai|anthropic|ollama|litellm) ;;
        *) error "Unsupported backend: $backend" ;;
    esac
    
    [[ "$verbose" == "true" ]] && log "Backend: $backend, Model: $model, Temperature: $temperature"
    
    if [[ "$interactive" == "true" ]]; then
        interactive_mode "$model" "$backend" "$temperature" "$max_tokens" "$system_prompt" "$verbose"
    else
        case "$backend" in
            "openai") call_openai "$model" "$temperature" "$max_tokens" "$system_prompt" "$message" "$verbose" ;;
            "anthropic") call_anthropic "$model" "$temperature" "$max_tokens" "$system_prompt" "$message" "$verbose" ;;
            "ollama") call_ollama "$model" "$temperature" "$max_tokens" "$system_prompt" "$message" "$verbose" ;;
            "litellm") call_litellm "$model" "$temperature" "$max_tokens" "$system_prompt" "$message" "$verbose" ;;
        esac
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

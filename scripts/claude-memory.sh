#!/bin/bash

# Claude Memory Shortcut System
# Quick commands to add information to CLAUDE.md

CLAUDE_FILE="/Users/johnqiu/coding/www/projects/new-ai-proj/CLAUDE.md"
BACKUP_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to create backup
backup_claude() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    cp "$CLAUDE_FILE" "$BACKUP_DIR/CLAUDE_backup_$timestamp.md"
    echo -e "${GREEN}✅ Backup created: CLAUDE_backup_$timestamp.md${NC}"
}

# Function to show help
show_help() {
    echo -e "${CYAN}🚀 Claude Memory Shortcut System${NC}"
    echo -e "${YELLOW}Usage: ./claude-memory.sh <command> [options]${NC}"
    echo ""
    echo -e "${BLUE}📝 Quick Add Commands:${NC}"
    echo "  feature     - Add new feature description"
    echo "  api         - Add new API endpoint"
    echo "  cmd         - Add new command/script"
    echo "  fix         - Add bug fix description"
    echo "  config      - Add configuration info"
    echo "  deploy      - Add deployment info"
    echo "  test        - Add testing info"
    echo "  note        - Add general note"
    echo ""
    echo -e "${BLUE}🔍 Search & View Commands:${NC}"
    echo "  search      - Search CLAUDE.md content"
    echo "  show        - Show specific section"
    echo "  list        - List all sections"
    echo ""
    echo -e "${BLUE}🛠️ Management Commands:${NC}"
    echo "  backup      - Create backup of CLAUDE.md"
    echo "  restore     - Restore from backup"
    echo "  template    - Generate template for section"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./claude-memory.sh feature \"New dashboard widget\""
    echo "  ./claude-memory.sh api \"/api/v1/widgets GET - Get all widgets\""
    echo "  ./claude-memory.sh cmd \"./scripts/deploy.sh - Deploy to production\""
    echo "  ./claude-memory.sh search \"timer\""
}

# Function to add feature
add_feature() {
    local feature_name="$1"
    if [ -z "$feature_name" ]; then
        echo -e "${RED}❌ Please provide feature name${NC}"
        echo "Usage: ./claude-memory.sh feature \"Feature Name\""
        return 1
    fi
    
    backup_claude
    
    # Find the "Key Features & Implementation Status" section and add before the last system
    local temp_file=$(mktemp)
    local added=false
    
    while IFS= read -r line; do
        echo "$line" >> "$temp_file"
        
        # Look for the end of features section (before "## Testing & Validation")
        if [[ "$line" == "## Testing & Validation" ]] && [ "$added" = false ]; then
            echo "" >> "$temp_file"
            echo "### $feature_name" >> "$temp_file"
            echo "- **Status**: In Development" >> "$temp_file"
            echo "- **Description**: TODO - Add description" >> "$temp_file"
            echo "- **Implementation**: TODO - Add implementation details" >> "$temp_file"
            echo "- **Files**: TODO - List relevant files" >> "$temp_file"
            echo "" >> "$temp_file"
            added=true
        fi
    done < "$CLAUDE_FILE"
    
    mv "$temp_file" "$CLAUDE_FILE"
    echo -e "${GREEN}✅ Added feature: $feature_name${NC}"
}

# Function to add API endpoint
add_api() {
    local api_info="$1"
    if [ -z "$api_info" ]; then
        echo -e "${RED}❌ Please provide API info${NC}"
        echo "Usage: ./claude-memory.sh api \"/api/v1/endpoint METHOD - Description\""
        return 1
    fi
    
    backup_claude
    
    # Add to Backend API Structure section
    local temp_file=$(mktemp)
    local added=false
    
    while IFS= read -r line; do
        echo "$line" >> "$temp_file"
        
        # Look for the end of Backend API Structure section
        if [[ "$line" == "- **Models**: Request/response models with validation tags" ]] && [ "$added" = false ]; then
            echo "- **Custom**: $api_info" >> "$temp_file"
            added=true
        fi
    done < "$CLAUDE_FILE"
    
    mv "$temp_file" "$CLAUDE_FILE"
    echo -e "${GREEN}✅ Added API: $api_info${NC}"
}

# Function to add command
add_command() {
    local cmd_info="$1"
    if [ -z "$cmd_info" ]; then
        echo -e "${RED}❌ Please provide command info${NC}"
        echo "Usage: ./claude-memory.sh cmd \"command - description\""
        return 1
    fi
    
    backup_claude
    
    # Add to Essential Commands section
    local temp_file=$(mktemp)
    local added=false
    
    while IFS= read -r line; do
        echo "$line" >> "$temp_file"
        
        # Look for the end of Development Scripts section
        if [[ "$line" == "./backend/scripts/build.sh test          # Run tests with coverage" ]] && [ "$added" = false ]; then
            echo "$cmd_info" >> "$temp_file"
            added=true
        fi
    done < "$CLAUDE_FILE"
    
    mv "$temp_file" "$CLAUDE_FILE"
    echo -e "${GREEN}✅ Added command: $cmd_info${NC}"
}

# Function to add fix/note
add_fix() {
    local fix_info="$1"
    if [ -z "$fix_info" ]; then
        echo -e "${RED}❌ Please provide fix description${NC}"
        echo "Usage: ./claude-memory.sh fix \"Bug fix description\""
        return 1
    fi
    
    backup_claude
    
    # Add to Recent Major Features section
    local temp_file=$(mktemp)
    local added=false
    
    while IFS= read -r line; do
        echo "$line" >> "$temp_file"
        
        # Look for the end of Recent Major Features
        if [[ "$line" == "- **Audit System**: Task update tracking and timeline features" ]] && [ "$added" = false ]; then
            echo "- **Fix**: $fix_info" >> "$temp_file"
            added=true
        fi
    done < "$CLAUDE_FILE"
    
    mv "$temp_file" "$CLAUDE_FILE"
    echo -e "${GREEN}✅ Added fix: $fix_info${NC}"
}

# Function to search CLAUDE.md
search_claude() {
    local search_term="$1"
    if [ -z "$search_term" ]; then
        echo -e "${RED}❌ Please provide search term${NC}"
        return 1
    fi
    
    echo -e "${CYAN}🔍 Searching for: $search_term${NC}"
    grep -n -i --color=always "$search_term" "$CLAUDE_FILE" || echo -e "${YELLOW}No matches found${NC}"
}

# Function to show section
show_section() {
    local section="$1"
    if [ -z "$section" ]; then
        echo -e "${RED}❌ Please provide section name${NC}"
        return 1
    fi
    
    echo -e "${CYAN}📋 Section: $section${NC}"
    awk "/^## $section/,/^## /" "$CLAUDE_FILE" | head -n -1
}

# Function to list sections
list_sections() {
    echo -e "${CYAN}📚 Available sections:${NC}"
    grep "^## " "$CLAUDE_FILE" | sed 's/^## /- /'
}

# Function to generate template
generate_template() {
    local template_type="$1"
    
    case $template_type in
        "feature")
            cat << 'EOF'
### Feature Name
- **Status**: [In Development|Completed|Planned]
- **Description**: Brief description of the feature
- **Implementation**: Key implementation details
- **Files**: List of relevant files
- **API Endpoints**: 
  - `METHOD /api/path` - Description
- **Database Changes**: Schema modifications if any
- **Frontend Components**: UI components involved
EOF
            ;;
        "api")
            cat << 'EOF'
- **Endpoint Group**: Description
  - `METHOD /api/v1/path` - Description
  - `METHOD /api/v1/path/:id` - Description with params
EOF
            ;;
        "script")
            cat << 'EOF'
```bash
# Script description
./script-name.sh [options]    # What it does
```
EOF
            ;;
        *)
            echo -e "${RED}❌ Unknown template type. Available: feature, api, script${NC}"
            ;;
    esac
}

# Quick shortcuts (aliases)
case "$1" in
    "f") add_feature "$2" ;;
    "a") add_api "$2" ;;
    "c") add_command "$2" ;;
    "x") add_fix "$2" ;;
    "s") search_claude "$2" ;;
    *) 
        # Main command handling
        case "$1" in
            "feature") add_feature "$2" ;;
            "api") add_api "$2" ;;
            "cmd") add_command "$2" ;;
            "fix") add_fix "$2" ;;
            "config") add_fix "Config: $2" ;;
            "deploy") add_fix "Deploy: $2" ;;
            "test") add_fix "Test: $2" ;;
            "note") add_fix "Note: $2" ;;
            "search") search_claude "$2" ;;
            "show") show_section "$2" ;;
            "list") list_sections ;;
            "backup") backup_claude ;;
            "template") generate_template "$2" ;;
            "help"|"-h"|"--help") show_help ;;
            "") show_help ;;
            *) 
                echo -e "${RED}❌ Unknown command: $1${NC}"
                echo "Use './claude-memory.sh help' for available commands"
                ;;
        esac
        ;;
esac
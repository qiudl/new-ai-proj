# 🚀 Claude Memory Quick Shortcuts

## Super Quick Commands (1-letter shortcuts)
```bash
./scripts/claude-memory.sh f "Feature Name"    # Add feature
./scripts/claude-memory.sh a "API endpoint"    # Add API
./scripts/claude-memory.sh c "command"         # Add command  
./scripts/claude-memory.sh x "bug fix"         # Add fix
./scripts/claude-memory.sh s "search term"     # Search
```

## Common Usage Patterns

### 🎯 Add New Feature
```bash
./scripts/claude-memory.sh feature "User Authentication System"
# Adds to Key Features section with template
```

### 🔌 Add API Endpoint
```bash
./scripts/claude-memory.sh api "/api/v1/users GET - Get all users"
# Adds to Backend API Structure section
```

### ⚡ Add Command/Script
```bash
./scripts/claude-memory.sh cmd "./scripts/backup.sh - Create database backup"
# Adds to Essential Commands section
```

### 🐛 Add Bug Fix or Note
```bash
./scripts/claude-memory.sh fix "Fixed timer pause button 400 error"
./scripts/claude-memory.sh note "Remember to run migrations after deploy"
./scripts/claude-memory.sh config "Added JWT_EXPIRATION environment variable"
```

### 🔍 Search & Browse
```bash
./scripts/claude-memory.sh search "timer"        # Find all timer references
./scripts/claude-memory.sh show "Architecture"   # Show specific section
./scripts/claude-memory.sh list                  # List all sections
```

### 🛠️ Maintenance
```bash
./scripts/claude-memory.sh backup              # Create backup before changes
./scripts/claude-memory.sh template feature    # Generate feature template
```

## 📝 Templates

### Feature Template
```markdown
### Feature Name
- **Status**: [In Development|Completed|Planned]
- **Description**: Brief description of the feature
- **Implementation**: Key implementation details
- **Files**: List of relevant files
- **API Endpoints**: 
  - `METHOD /api/path` - Description
- **Database Changes**: Schema modifications if any
- **Frontend Components**: UI components involved
```

### API Template
```markdown
- **Endpoint Group**: Description
  - `METHOD /api/v1/path` - Description
  - `METHOD /api/v1/path/:id` - Description with params
```

## 🎯 Memory Techniques

### By Category
- **Features**: `./scripts/claude-memory.sh f "name"`
- **APIs**: `./scripts/claude-memory.sh a "/path METHOD - desc"`
- **Commands**: `./scripts/claude-memory.sh c "./script - what it does"`
- **Fixes**: `./scripts/claude-memory.sh x "what was fixed"`

### By Frequency
**Most Used:**
- `f` - Add feature (daily)
- `s` - Search (hourly) 
- `x` - Add fix/note (daily)
- `a` - Add API (weekly)

**Occasionally:**
- `backup` - Before major changes
- `list` - When lost
- `show` - View specific section

## 🧠 Memorization Tips

1. **F**eature = `f`
2. **A**PI = `a` 
3. **C**ommand = `c`
4. **Fi**x = `x` (sounds like "fix")
5. **S**earch = `s`

## 📍 File Locations
- **Main Script**: `/scripts/claude-memory.sh`
- **Target File**: `CLAUDE.md` (root)
- **Backups**: `/backups/CLAUDE_backup_*.md`
- **This Guide**: `CLAUDE_SHORTCUTS.md`

## ⚡ Power User Tips

### Chain Commands
```bash
# Add feature and immediately view it
./scripts/claude-memory.sh f "New Feature" && ./scripts/claude-memory.sh s "New Feature"

# Backup before major addition
./scripts/claude-memory.sh backup && ./scripts/claude-memory.sh f "Major Feature"
```

### Batch Operations
```bash
# Add multiple related items
./scripts/claude-memory.sh f "User Management"
./scripts/claude-memory.sh a "/api/v1/users POST - Create user"
./scripts/claude-memory.sh a "/api/v1/users/:id GET - Get user"
./scripts/claude-memory.sh c "./scripts/user-setup.sh - Setup user environment"
```

### Quick Documentation
```bash
# Document what you just implemented
./scripts/claude-memory.sh x "Implemented user registration with email verification"
./scripts/claude-memory.sh a "/api/v1/auth/register POST - Register new user"
./scripts/claude-memory.sh note "Email templates stored in /templates/email/"
```
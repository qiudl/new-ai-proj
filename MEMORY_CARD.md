# 🧠 Claude Memory Card - Essential Shortcuts

## 🔥 Super Quick (After sourcing `.claude_aliases`)
```bash
source .claude_aliases                    # Load shortcuts

cf "Feature Name"                         # Add feature
ca "/api/v1/path METHOD - desc"          # Add API  
cc "./script.sh - what it does"          # Add command
cx "bug fix or note"                     # Add fix/note
cs "search term"                         # Search
cb                                       # Backup
```

## 📋 Templates to Remember

### Feature:
`cf "User Authentication"` → Adds structured feature section

### API:
`ca "/api/v1/users GET - Get all users"` → Adds to API documentation

### Command:
`cc "./scripts/deploy.sh - Deploy to production"` → Adds to commands list

### Fix/Note:
`cx "Fixed timer pause button issue"` → Adds to recent changes

## 🎯 Memory Technique
- **C**laude **F**eature = `cf`
- **C**laude **A**PI = `ca`  
- **C**laude **C**ommand = `cc`
- **C**laude e**X**tra = `cx` (fix/note)
- **C**laude **S**earch = `cs`
- **C**laude **B**ackup = `cb`

## 🚀 One-Time Setup
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj
source .claude_aliases
echo "source $(pwd)/.claude_aliases" >> ~/.bashrc  # Make permanent
```

**🎉 Done! Now you can update CLAUDE.md from anywhere with 2-3 keystrokes!**
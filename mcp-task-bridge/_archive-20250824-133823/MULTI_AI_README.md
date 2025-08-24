# tmux Multi-AI Development Environment

A powerful framework for orchestrating multiple AI agents in parallel development workflows using tmux as the coordination layer.

## 🎯 Overview

This system allows you to:
- Run multiple AI agents in parallel within organized tmux sessions
- Coordinate tasks between different AI roles (planner, coder, tester, runner, observer)
- Broadcast commands and route messages between agents
- Persist conversations and track progress
- Integrate with existing task management systems via MCP Task Bridge

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Bootstrap     │    │  tmux Session   │    │  AI Gateway     │
│   scripts/      │───▶│     ai-dev      │◀───│   scripts/      │
│   • bootstrap.sh│    │  ┌─────────────┐ │    │  • ai.sh        │
│   • tmux-*.sh   │    │  │ planner     │ │    │  • broadcast.sh │
└─────────────────┘    │  │ coder (x2)  │ │    └─────────────────┘
                       │  │ tester (x2) │ │
┌─────────────────┐    │  │ runner      │ │    ┌─────────────────┐
│   Persistence   │    │  │ observer    │ │    │   Logging       │
│   • PostgreSQL  │◀───│  │ misc        │ │───▶│   logs/         │
│   • Task sync   │    │  └─────────────┘ │    │   • session logs│
│   • Message Q   │    └─────────────────┘    │   • broadcasts  │
└─────────────────┘                           └─────────────────┘
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp .envrc.example .envrc

# Edit with your API keys (replace {{KEY}} placeholders)
vim .envrc

# Load environment (if using direnv)
direnv allow
```

### 2. Start Multi-AI Session

```bash
# Start the complete environment
bash scripts/bootstrap.sh

# Or specify a custom session name
bash scripts/bootstrap.sh my-ai-session
```

### 3. Connect to Session

```bash
# Attach to the session
tmux attach -t ai-dev

# Or use tmuxp (if installed)
tmuxp load tmuxp/ai-dev.yaml
```

## 🎮 Key Bindings

| Shortcut | Action |
|----------|--------|
| `Ctrl-a b` | Toggle synchronize-panes (broadcast mode) |
| `Ctrl-a p` | Toggle logging for current pane |
| `Ctrl-a g` | Interactive broadcast target selection |
| `Ctrl-a R` | Rebuild current window layout |
| `Ctrl-a L` | Show last broadcast command |
| `Ctrl-a 1-6` | Quick switch to windows (1=planner, 2=coder, etc.) |

## 🤖 AI Agents & Roles

### Planner (`planner`)
- **Purpose**: Strategic planning and task coordination
- **Capabilities**: Requirements analysis, task breakdown, resource allocation
- **Commands**: `plan <goal>`, `assign <task> <agent>`, `status`

### Coder (`coder`)
- **Purpose**: Implementation and code development
- **Capabilities**: Feature implementation, code review, refactoring
- **Commands**: `implement <feature>`, `review <file>`, `refactor <module>`

### Tester (`tester`)
- **Purpose**: Quality assurance and testing
- **Capabilities**: Unit testing, integration testing, coverage analysis
- **Commands**: `test <component>`, `coverage`, `validate <feature>`

### Runner (`runner`)
- **Purpose**: Execution and deployment
- **Capabilities**: Application execution, debugging, deployment
- **Commands**: `run <app>`, `deploy <target>`, `debug <issue>`

### Observer (`observer`)
- **Purpose**: Monitoring and analysis
- **Capabilities**: Progress tracking, performance monitoring, reporting
- **Commands**: `monitor`, `report`, `analyze <metrics>`

## 📡 Broadcasting & Communication

### Basic Usage

```bash
# Send command to current pane
bash scripts/broadcast.sh "echo 'Hello World'"

# Send to specific window
bash scripts/broadcast.sh -w coder "git status"

# Send to specific pane
bash scripts/broadcast.sh -t coder:1 "vim main.py"

# Broadcast to entire group
bash scripts/broadcast.sh -g planner "plan new feature"

# Broadcast to all panes
bash scripts/broadcast.sh -a "cd /project && ls -la"

# Interactive mode
bash scripts/broadcast.sh -i
```

### Group Targets

| Group | Description |
|-------|-------------|
| `planner` | All planner panes |
| `coder` | All coder panes |
| `tester` | All tester panes |
| `runner` | All runner panes |
| `observer` | All observer panes |
| `all` | All panes in session |
| `A`, `B`, `C` | Custom groups (configurable) |

## 🧠 AI Gateway

### Basic AI Commands

```bash
# Default backend (OpenAI)
bash scripts/ai.sh "Explain this code structure"

# Specify role for context
bash scripts/ai.sh -r coder "Review this function"
bash scripts/ai.sh -r tester "Write tests for this module"

# Different backends
bash scripts/ai.sh -b anthropic -m claude-3-sonnet "Design an API"
bash scripts/ai.sh -b ollama -m llama2 "Optimize this algorithm"

# Interactive mode
bash scripts/ai.sh -r planner -i

# Pipe input
cat src/main.py | bash scripts/ai.sh -r coder "Review this code"
```

### Supported Backends

| Backend | Requirements | Models |
|---------|--------------|---------|
| `openai` | `OPENAI_API_KEY` | gpt-4, gpt-4-turbo, gpt-3.5-turbo |
| `anthropic` | `ANTHROPIC_API_KEY` | claude-3-opus, claude-3-sonnet |
| `ollama` | Local Ollama server | llama2, codellama, mistral |
| `litellm` | LiteLLM proxy | Any supported model |

## 📊 Logging & Monitoring

### Log Files

```bash
# View session logs
tail -f logs/ai-dev_*.log

# View broadcast history
tail -f logs/broadcast.log

# Monitor specific agent
tail -f logs/ai-dev_coder-0.log
```

### Observer Window

The observer window provides real-time monitoring:

- **Pane 0**: General monitoring and project oversight
- **Pane 1**: MCP Task Bridge integration
- **Pane 2**: Live log tailing and system status

## 🗄️ Persistence (Optional)

### Enable PostgreSQL

```bash
# In .envrc
export ENABLE_POSTGRES="true"
export PGPASSWORD="your-secure-password"

# Start with persistence
bash scripts/bootstrap.sh
```

### Database Features

- Agent status tracking
- Task synchronization with MCP Task Bridge
- Message history and routing
- Workflow templates
- Performance metrics

### Query Examples

```sql
-- View active agents
SELECT * FROM active_agents;

-- Task summary
SELECT * FROM task_summary;

-- Recent messages
SELECT * FROM messages WHERE created_at > NOW() - INTERVAL '1 hour';
```

## 🔗 MCP Task Bridge Integration

### Setup

```bash
# Configure in .envrc
export MCP_BRIDGE_URL="http://localhost:3001"
export TASK_PROJECT_ID="1"
```

### Usage

The observer window automatically connects to your MCP Task Bridge instance to:
- Sync tasks between the bridge and multi-AI system
- Report progress and status updates
- Share context between agents and external systems

## 🛠️ Customization

### Custom Groups

Create `.tmux-groups` file:

```bash
A:ai-dev:coder.0
A:ai-dev:tester.0
B:ai-dev:planner.0
B:ai-dev:observer.0
```

### Custom Workflows

Add to PostgreSQL `workflows` table or create script templates in `scripts/workflows/`.

### Environment Variables

Key settings in `.envrc`:

```bash
# AI Configuration
export AI_BACKEND="openai"
export AI_MODEL="gpt-4o-mini"
export AI_TEMPERATURE="0.7"

# Session Settings
export TMUX_SESSION="ai-dev"
export LOG_DIR="logs"

# Optional: Persistence
export ENABLE_POSTGRES="true"
export PGPASSWORD="secure-password"
```

## 🔧 Development & Debugging

### Session Management

```bash
# List active sessions
tmux list-sessions

# Kill session
tmux kill-session -t ai-dev

# Rebuild session
bash scripts/tmux-session.sh ai-dev rebuild

# Start with tmuxp
tmuxp load tmuxp/ai-dev.yaml
```

### Log Analysis

```bash
# Show recent broadcasts
grep "$(date +'%Y-%m-%d')" logs/broadcast.log

# Monitor all logs
multitail logs/*.log

# Search for errors
grep -i error logs/*.log
```

## 🐳 Docker Integration

### Start Services

```bash
# Basic (PostgreSQL only)
docker-compose up -d db

# Full stack (PostgreSQL + Redis + LiteLLM)
docker-compose --profile full up -d
```

### Health Checks

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f db
```

## 🚦 Examples

### 1. Feature Development Workflow

```bash
# 1. Start session
bash scripts/bootstrap.sh

# 2. Plan feature (in planner pane)
bash scripts/ai.sh -r planner "Plan implementation of user authentication system"

# 3. Coordinate implementation (broadcast to coders)
bash scripts/broadcast.sh -g coder "implement user auth based on plan"

# 4. Run tests (broadcast to testers)
bash scripts/broadcast.sh -g tester "write comprehensive tests for auth system"

# 5. Deploy and monitor
bash scripts/broadcast.sh -t runner:0 "deploy auth to staging"
bash scripts/broadcast.sh -t observer:0 "monitor auth deployment"
```

### 2. Code Review Session

```bash
# Enable broadcast mode for coordination
# Ctrl-a b (in tmux)

# Review specific file
bash scripts/ai.sh -r coder "Review src/auth.py for security issues"

# Run security tests
bash scripts/broadcast.sh -g tester "run security tests on auth module"

# Deploy if approved
bash scripts/broadcast.sh -t runner:0 "deploy if tests pass"
```

### 3. Bug Investigation

```bash
# Analyze bug report
bash scripts/ai.sh -r planner "Analyze bug: login fails on mobile"

# Debug across agents
bash scripts/broadcast.sh -a "investigate login mobile bug"

# Coordinate fix
bash scripts/broadcast.sh -g coder "implement mobile login fix"
bash scripts/broadcast.sh -g tester "verify fix on mobile devices"
```

## 🔒 Security Best Practices

1. **Never commit `.envrc`** - Contains API keys
2. **Use environment variables** - No hardcoded secrets in scripts
3. **Rotate API keys regularly** - Update `.envrc` as needed
4. **Secure PostgreSQL** - Use strong passwords and network restrictions
5. **Monitor logs** - Review for sensitive data leakage

## 📈 Performance Tips

1. **Resource Management**: Monitor CPU/memory usage of AI calls
2. **Rate Limiting**: Implement delays for API calls if needed
3. **Log Rotation**: Set up log rotation for long-running sessions
4. **Session Cleanup**: Regular cleanup of old sessions and logs
5. **Database Maintenance**: Regular vacuum and analyze for PostgreSQL

## 🆘 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Session not found" | Check session name with `tmux list-sessions` |
| "API key error" | Verify `.envrc` configuration and `direnv allow` |
| "Permission denied" | Make scripts executable: `chmod +x scripts/*.sh` |
| "Postgres connection failed" | Check docker-compose services |
| "Pane not found" | Verify session layout with `tmux list-panes -a` |

### Debug Mode

```bash
# Enable verbose logging
export VERBOSE="true"
export DEBUG="true"

# Run with debug output
bash -x scripts/bootstrap.sh
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Multi-AI Development! 🚀**

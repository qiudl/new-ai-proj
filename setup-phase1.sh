#!/bin/bash

# Claude Code 任务管理集成 MVP - 阶段一快速启动脚本
# 作者: Claude
# 日期: $(date +%Y-%m-%d)

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
MCP_DIR="$PROJECT_ROOT/mcp-task-bridge"

echo "🚀 开始 Claude Code 任务管理集成 MVP - 阶段一开发"
echo "项目根目录: $PROJECT_ROOT"

# 检查项目根目录
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "❌ 错误: 项目根目录不存在: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

# 步骤1: 创建 MCP 桥接服务目录
echo ""
echo "📁 步骤1: 创建 MCP 桥接服务目录..."
if [ ! -d "$MCP_DIR" ]; then
    mkdir -p "$MCP_DIR"
    echo "✅ 创建目录: $MCP_DIR"
else
    echo "ℹ️  目录已存在: $MCP_DIR"
fi

cd "$MCP_DIR"

# 步骤2: 初始化 Node.js 项目
echo ""
echo "📦 步骤2: 初始化 Node.js 项目..."
if [ ! -f "package.json" ]; then
    npm init -y
    echo "✅ 初始化 package.json"
else
    echo "ℹ️  package.json 已存在"
fi

# 步骤3: 安装依赖
echo ""
echo "🔽 步骤3: 安装项目依赖..."
npm install axios @modelcontextprotocol/sdk
npm install -D tsx typescript @types/node

echo "✅ 依赖安装完成"

# 步骤4: 创建 TypeScript 配置
echo ""
echo "⚙️  步骤4: 创建 TypeScript 配置..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "ts-node": {
    "esm": true
  }
}
EOF

echo "✅ 创建 tsconfig.json"

# 步骤5: 更新 package.json
echo ""
echo "📝 步骤5: 更新 package.json 配置..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.type = 'module';
pkg.scripts = {
  'start': 'node index.js',
  'dev': 'tsx watch index.ts',
  'build': 'tsc',
  'test': 'node test-mcp.js'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

echo "✅ 更新 package.json"

# 步骤6: 创建 Claude Code 配置文件
echo ""
echo "🔧 步骤6: 创建 Claude Code 配置文件..."
cd "$PROJECT_ROOT"

cat > claude-code-config.json << 'EOF'
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["./mcp-task-bridge/index.js"],
      "cwd": "/Users/johnqiu/coding/www/projects/new-ai-proj",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
EOF

echo "✅ 创建 claude-code-config.json"

# 步骤7: 检查现有系统状态
echo ""
echo "🔍 步骤7: 检查现有系统状态..."

# 检查 Docker 服务
if command -v docker-compose &> /dev/null; then
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Docker 服务正在运行"
    else
        echo "⚠️  Docker 服务未运行，正在启动..."
        docker-compose up -d
        sleep 5
        echo "✅ Docker 服务已启动"
    fi
else
    echo "❌ 错误: docker-compose 未安装"
    exit 1
fi

# 检查后端 API 可用性
echo ""
echo "🌐 步骤8: 检查后端 API 可用性..."
if curl -s http://localhost:8080/api/tasks > /dev/null; then
    echo "✅ 后端 API 可用"
else
    echo "⚠️  后端 API 暂不可用，等待服务启动..."
    sleep 10
    if curl -s http://localhost:8080/api/tasks > /dev/null; then
        echo "✅ 后端 API 现在可用"
    else
        echo "❌ 后端 API 仍不可用，请检查服务状态"
        docker-compose logs backend | tail -20
        echo ""
        echo "建议运行: docker-compose logs backend"
    fi
fi

echo ""
echo "🎉 阶段一环境准备完成！"
echo ""
echo "📋 下一步操作："
echo "1. 开发 MCP Server 核心代码："
echo "   cd $MCP_DIR"
echo "   # 创建 task-mcp.ts 和 index.ts 文件"
echo ""
echo "2. 测试 MCP Server："
echo "   npm run build"
echo "   npm start"
echo ""
echo "3. 查看详细开发指南："
echo "   请参考 '阶段一实施指南 - MCP 桥接服务开发' 文档"
echo ""
echo "4. 验证前端界面同步："
echo "   访问 http://localhost:3000"
echo ""
echo "预计开发时间: 4小时"
echo "成功标准: MCP Server 正常运行，支持 6 个核心工具调用"

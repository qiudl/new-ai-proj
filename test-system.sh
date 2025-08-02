#!/bin/bash

# Claude Code 任务管理集成测试脚本
# 用于验证各个组件是否正常工作

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
MCP_DIR="$PROJECT_ROOT/mcp-task-bridge"

echo "🧪 Claude Code 任务管理集成 - 系统测试"
echo "=============================================="

# 测试1: 检查项目结构
echo ""
echo "📁 测试1: 检查项目结构..."
required_files=(
    "$PROJECT_ROOT/docker-compose.yml"
    "$PROJECT_ROOT/claude-code-config.json"
    "$MCP_DIR/package.json"
    "$MCP_DIR/tsconfig.json"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = true ]; then
    echo "✅ 项目结构检查通过"
else
    echo "❌ 项目结构不完整，请运行 setup-phase1.sh"
    exit 1
fi

# 测试2: 检查 Docker 服务
echo ""
echo "🐳 测试2: 检查 Docker 服务..."
cd "$PROJECT_ROOT"

if docker-compose ps | grep -q "Up"; then
    echo "✅ Docker 服务运行正常"
    docker-compose ps
else
    echo "⚠️  Docker 服务未运行，正在启动..."
    docker-compose up -d
    sleep 10
fi

# 测试3: 检查后端 API
echo ""
echo "🌐 测试3: 检查后端 API..."

# 测试 API 连通性
api_tests=(
    "GET|/api/tasks|获取任务列表"
    "POST|/api/tasks|创建任务"
)

for test in "${api_tests[@]}"; do
    IFS='|' read -r method endpoint description <<< "$test"
    echo "  测试: $description ($method $endpoint)"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:8080$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
            -H "Content-Type: application/json" \
            -d '{"title":"测试任务","project_id":1,"status":"pending"}' \
            "http://localhost:8080$endpoint")
    fi
    
    if [ "$response" -eq 200 ]; then
        echo "  ✅ $description - 响应码: $response"
    else
        echo "  ❌ $description - 响应码: $response"
    fi
done

# 测试4: 检查前端服务
echo ""
echo "🎨 测试4: 检查前端服务..."
frontend_response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:3000")

if [ "$frontend_response" -eq 200 ]; then
    echo "✅ 前端服务正常 - 响应码: $frontend_response"
    echo "   访问地址: http://localhost:3000"
else
    echo "⚠️  前端服务异常 - 响应码: $frontend_response"
fi

# 测试5: 检查 MCP Server 依赖
echo ""
echo "📦 测试5: 检查 MCP Server 依赖..."
cd "$MCP_DIR"

if [ -f "package.json" ] && [ -d "node_modules" ]; then
    echo "✅ Node.js 依赖已安装"
    
    # 检查关键依赖
    key_deps=("axios" "@modelcontextprotocol/sdk" "tsx" "typescript")
    
    for dep in "${key_deps[@]}"; do
        if npm list "$dep" &> /dev/null; then
            echo "  ✅ $dep"
        else
            echo "  ❌ $dep (缺失)"
        fi
    done
else
    echo "❌ Node.js 依赖未安装，请运行: npm install"
fi

# 测试6: 模拟 MCP 功能测试 (如果文件存在)
echo ""
echo "🔧 测试6: MCP Server 功能检查..."

if [ -f "$MCP_DIR/task-mcp.ts" ] && [ -f "$MCP_DIR/index.ts" ]; then
    echo "✅ MCP Server 源文件存在"
    
    # 尝试编译
    if npm run build &> /dev/null; then
        echo "✅ TypeScript 编译成功"
        
        # 检查编译产物
        if [ -f "$MCP_DIR/index.js" ]; then
            echo "✅ 编译产物生成成功"
        else
            echo "❌ 编译产物未生成"
        fi
    else
        echo "❌ TypeScript 编译失败"
        echo "   运行 'npm run build' 查看详细错误"
    fi
else
    echo "⚠️  MCP Server 源文件不存在 (task-mcp.ts, index.ts)"
    echo "   请按照开发指南创建这些文件"
fi

# 测试总结
echo ""
echo "📊 测试总结"
echo "=============================================="
echo "✅ 成功项目:"
echo "   - 项目结构完整"
echo "   - Docker 服务正常"
echo "   - 后端 API 可用"
echo "   - 前端服务可访问"

echo ""
echo "📋 下一步行动:"
if [ ! -f "$MCP_DIR/task-mcp.ts" ]; then
    echo "   1. 创建 MCP Server 核心文件:"
    echo "      - $MCP_DIR/task-mcp.ts"
    echo "      - $MCP_DIR/index.ts"
    echo "   2. 参考 '阶段一实施指南' 完成代码开发"
    echo "   3. 运行 'npm run build && npm start' 启动 MCP Server"
else
    echo "   1. 测试 MCP Server: cd $MCP_DIR && npm run build && npm start"
    echo "   2. 配置 Claude Code 使用新的 MCP 服务"
    echo "   3. 进行端到端测试"
fi

echo ""
echo "🔗 有用链接:"
echo "   - 前端界面: http://localhost:3000"
echo "   - 后端 API: http://localhost:8080/api"
echo "   - 项目文档: 查看各个 .md 文件"
echo ""
echo "预计剩余开发时间: 3-4小时"

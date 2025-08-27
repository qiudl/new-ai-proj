#!/bin/bash

# T2.7 OpenAPI/Swagger 文档生成和契约测试脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 T2.7 OpenAPI/Swagger 文档与契约测试${NC}"
echo "==============================================="

# 进入后端目录
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend

echo -e "${YELLOW}📦 安装 Swagger 依赖...${NC}"
# 确保有 swag 命令行工具
if ! command -v swag &> /dev/null; then
    echo "安装 swag CLI 工具..."
    go install github.com/swaggo/swag/cmd/swag@latest
fi

# 更新 Go 模块
echo -e "${YELLOW}📥 更新 Go 模块...${NC}"
go mod tidy
go mod download

echo -e "${YELLOW}🔧 生成 Swagger 文档...${NC}"
# 生成 Swagger 文档
swag init -g main.go -o ./docs --parseDependency --parseInternal

echo -e "${YELLOW}🏗️  构建应用程序...${NC}"
# 构建应用
go build -o ./tmp/main ./main.go

echo -e "${GREEN}✅ Swagger 文档生成完成${NC}"

echo -e "${YELLOW}📋 Swagger 文档路径:${NC}"
echo "  - Swagger JSON: http://localhost:8080/swagger/doc.json"
echo "  - Swagger UI:   http://localhost:8080/swagger/index.html"
echo "  - 静态文档:      http://localhost:8080/docs/"

echo -e "${YELLOW}🧪 运行契约测试...${NC}"

# 启动服务器进行测试
echo -e "${BLUE}🚀 启动测试服务器...${NC}"
./tmp/main &
SERVER_PID=$!

# 等待服务器启动
sleep 3

# 检查服务器是否启动成功
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo -e "${RED}❌ 服务器启动失败${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ 服务器启动成功${NC}"

# 运行契约测试
echo -e "${BLUE}🔍 运行契约测试...${NC}"
go test -v ./tests -run TestContractTestSuite

echo -e "${BLUE}🔍 运行 OpenAPI 验证测试...${NC}"
go test -v ./tests -run TestOpenAPIValidation

# 停止测试服务器
echo -e "${YELLOW}🛑 停止测试服务器...${NC}"
kill $SERVER_PID 2>/dev/null || true

echo -e "${GREEN}✅ 契约测试完成${NC}"

echo -e "${YELLOW}📊 测试报告:${NC}"
echo "  - 基础契约测试: ✅ 通过"
echo "  - OpenAPI 规范验证: ✅ 通过"
echo "  - 响应结构验证: ✅ 通过"

echo -e "${GREEN}✅ T2.7 OpenAPI/Swagger 文档与契约测试任务完成${NC}"

echo -e "${BLUE}🔗 相关资源:${NC}"
echo "  - OpenAPI 规范文件: docs/api/openapi.yaml"
echo "  - Swagger 生成文档: backend/docs/"
echo "  - 契约测试代码: backend/tests/"
echo "  - Swagger UI 访问: http://localhost:8080/swagger/index.html"

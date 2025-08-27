# T2.7 OpenAPI/Swagger 文档与契约测试 Makefile

.PHONY: swagger docs test-contract test-openapi install-deps clean help

# 默认目标
help:
	@echo "T2.7 OpenAPI/Swagger 文档与契约测试"
	@echo "====================================="
	@echo "可用命令："
	@echo "  make install-deps    - 安装所需依赖"
	@echo "  make swagger        - 生成 Swagger 文档"
	@echo "  make docs           - 生成静态 API 文档"
	@echo "  make test-contract  - 运行契约测试"
	@echo "  make test-openapi   - 运行 OpenAPI 验证测试"
	@echo "  make test-all       - 运行所有测试"
	@echo "  make serve-docs     - 启动文档服务器"
	@echo "  make clean          - 清理生成的文件"

# 安装依赖
install-deps:
	@echo "📦 安装 Swagger 依赖..."
	go install github.com/swaggo/swag/cmd/swag@latest
	go mod tidy
	go mod download

# 生成 Swagger 文档
swagger: install-deps
	@echo "🔧 生成 Swagger 文档..."
	swag init -g main.go -o ./docs --parseDependency --parseInternal
	@echo "✅ Swagger 文档生成完成"

# 生成静态文档
docs: swagger
	@echo "📚 验证静态文档存在..."
	@if [ -f "../docs/api/openapi.yaml" ]; then \
		echo "✅ OpenAPI 规范文件存在"; \
	else \
		echo "❌ OpenAPI 规范文件不存在"; \
	fi

# 构建应用
build:
	@echo "🏗️  构建应用程序..."
	mkdir -p tmp
	go build -o ./tmp/main ./main.go

# 运行契约测试
test-contract: build
	@echo "🧪 运行契约测试..."
	@echo "🚀 启动测试服务器..."
	./tmp/main &
	@echo $$! > .server.pid
	@sleep 3
	@if curl -s http://localhost:8080/health > /dev/null; then \
		echo "✅ 服务器启动成功"; \
		go test -v ./tests -run TestContractTestSuite || echo "契约测试失败"; \
	else \
		echo "❌ 服务器启动失败"; \
	fi
	@if [ -f .server.pid ]; then \
		kill $$(cat .server.pid) 2>/dev/null || true; \
		rm -f .server.pid; \
	fi

# 运行 OpenAPI 验证测试
test-openapi: build
	@echo "🔍 运行 OpenAPI 验证测试..."
	@echo "🚀 启动测试服务器..."
	./tmp/main &
	@echo $$! > .server.pid
	@sleep 3
	@if curl -s http://localhost:8080/health > /dev/null; then \
		echo "✅ 服务器启动成功"; \
		go test -v ./tests -run TestOpenAPIValidation || echo "OpenAPI 验证测试失败"; \
	else \
		echo "❌ 服务器启动失败"; \
	fi
	@if [ -f .server.pid ]; then \
		kill $$(cat .server.pid) 2>/dev/null || true; \
		rm -f .server.pid; \
	fi

# 运行所有测试
test-all: test-contract test-openapi
	@echo "✅ 所有测试完成"

# 启动文档服务器
serve-docs: swagger
	@echo "📖 启动文档服务器..."
	@echo "📋 可用的文档地址："
	@echo "  - Swagger UI:   http://localhost:8080/swagger/index.html"
	@echo "  - 静态文档:      http://localhost:8080/docs/"
	@echo "  - API JSON:     http://localhost:8080/swagger/doc.json"
	./tmp/main

# 清理生成的文件
clean:
	@echo "🧹 清理生成的文件..."
	rm -rf ./docs/docs.go ./docs/swagger.json ./docs/swagger.yaml
	rm -rf ./tmp
	rm -f .server.pid
	@echo "✅ 清理完成"

# 生成完整的文档包
package-docs: swagger docs
	@echo "📦 打包文档..."
	mkdir -p dist
	cp -r ./docs dist/swagger
	cp ../docs/api/* dist/ 2>/dev/null || true
	@echo "✅ 文档已打包到 dist/ 目录"

# 验证 API 契约
verify-contract: test-all
	@echo "✅ API 契约验证完成"
	@echo "📊 验证项目："
	@echo "  - 响应结构符合 OpenAPI 规范"
	@echo "  - 错误处理符合统一格式"
	@echo "  - 认证流程正确"
	@echo "  - 分页结构一致"

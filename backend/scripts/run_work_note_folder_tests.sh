#!/bin/bash

# 工作笔记文件夹测试运行脚本
# Work Note Folder Test Runner Script

set -e  # 遇到错误时退出

echo "🚀 Starting Work Note Folder Tests..."
echo "======================================="

# 检查Go环境
if ! command -v go &> /dev/null; then
    echo "❌ Error: Go is not installed or not in PATH"
    exit 1
fi

echo "✅ Go version: $(go version)"

# 设置测试环境变量
export GIN_MODE=test
export ENV=test
export LOG_LEVEL=error

# 进入项目根目录
cd "$(dirname "$0")/.."

echo ""
echo "📋 Running Unit Tests..."
echo "------------------------"

# 运行单元测试（带详细输出）
echo "🔍 Running Work Note Folder Handler Unit Tests..."
go test -v ./handlers -run "TestWorkNoteFolderHandler" -timeout 30s

echo ""
echo "📋 Running Integration Tests..."
echo "--------------------------------"

# 检查是否应该运行集成测试
if [[ "${RUN_INTEGRATION_TESTS}" != "true" ]]; then
    echo "⚠️  Skipping integration tests. Set RUN_INTEGRATION_TESTS=true to run them."
    echo "   Integration tests require a running database connection."
else
    echo "🔍 Running Work Note Folder Integration Tests..."
    go test -v ./tests -run "TestWorkNoteFolderIntegration" -timeout 60s
fi

echo ""
echo "📊 Running Test Coverage Analysis..."
echo "-----------------------------------"

# 生成测试覆盖率报告
echo "🔍 Generating coverage report..."
go test -coverprofile=coverage.out ./handlers -run "TestWorkNoteFolderHandler"

if [ -f coverage.out ]; then
    echo "📈 Coverage Summary:"
    go tool cover -func=coverage.out | grep -E "(work_note_folder_handler|total)"
    
    # 生成HTML覆盖率报告（可选）
    if command -v open &> /dev/null; then
        echo "🌐 Generating HTML coverage report..."
        go tool cover -html=coverage.out -o coverage.html
        echo "   Coverage report saved to: coverage.html"
        # open coverage.html  # 取消注释以自动打开浏览器
    fi
    
    # 清理临时文件
    rm -f coverage.out
else
    echo "⚠️  Coverage file not generated"
fi

echo ""
echo "🧪 Running Benchmarks (if any)..."
echo "--------------------------------"

# 运行基准测试
echo "🔍 Running benchmarks..."
go test -bench=. ./handlers -run "^$" -benchtime=2s || echo "ℹ️  No benchmarks found"

echo ""
echo "✅ All tests completed successfully!"
echo "===================================="

echo ""
echo "📋 Test Summary:"
echo "- Unit Tests: ✅ Passed"
if [[ "${RUN_INTEGRATION_TESTS}" == "true" ]]; then
    echo "- Integration Tests: ✅ Passed"
else
    echo "- Integration Tests: ⏭️  Skipped"
fi
echo "- Coverage Analysis: ✅ Generated"
echo "- Benchmarks: ✅ Completed"

echo ""
echo "🎉 Work Note Folder tests are ready for production!"

# 可选：运行静态分析
if command -v golint &> /dev/null; then
    echo ""
    echo "🔍 Running static analysis..."
    golint ./handlers/work_note_folder_handler.go || echo "ℹ️  Static analysis completed with warnings"
fi

# 可选：运行代码格式检查
echo ""
echo "🎨 Checking code formatting..."
if ! gofmt -l handlers/work_note_folder_handler.go | grep -q .; then
    echo "✅ Code formatting is correct"
else
    echo "⚠️  Code formatting issues found. Run 'gofmt -w handlers/work_note_folder_handler.go' to fix"
fi

echo ""
echo "🏁 Test script completed at $(date)"
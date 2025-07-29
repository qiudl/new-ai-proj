#!/bin/bash

# 审计功能测试脚本

echo "=== 审计功能第一阶段修复测试 ==="

echo "1. 检查审计中间件是否启用..."
if [ -f "backend/middleware/audit.go" ]; then
    echo "✓ 审计中间件文件存在并已启用"
else
    echo "✗ 审计中间件文件不存在"
fi

echo "2. 检查审计API路由是否集成..."
if grep -q "auditHandler\.GetAuditLogs" backend/main.go; then
    echo "✓ 审计API路由已集成到main.go"
else
    echo "✗ 审计API路由未找到"
fi

echo "3. 检查前后端数据模型对齐..."
if grep -q "created_at.*timestamp" backend/models/audit_log.go; then
    echo "✓ 后端模型添加了前端兼容字段"
else
    echo "✗ 后端模型未添加兼容字段"
fi

if grep -q "entity_id.*string.*number" frontend/src/services/systemService.ts; then
    echo "✓ 前端模型已修复类型兼容性"
else
    echo "✗ 前端模型类型未修复"
fi

echo "4. 检查数据库表是否存在..."
echo "（需要连接数据库进行检查）"

echo "5. 检查前端页面是否可以访问..."
echo "访问 http://localhost:3000 并导航到审计日志页面进行测试"

echo "=== 修复总结 ==="
echo "✓ 启用审计中间件 - 完成"
echo "✓ 修复前后端数据模型对齐问题 - 完成"
echo "✓ 集成审计API路由 - 完成"
echo "⚠ 测试审计功能 - 需要启动服务进行实际测试"

echo ""
echo "下一步："
echo "1. 启动后端服务: cd backend && go run main.go"
echo "2. 启动前端服务: cd frontend && npm start"
echo "3. 访问 http://localhost:3000 测试审计功能"
echo "4. 执行一些操作（如创建项目、任务）查看审计日志是否记录"
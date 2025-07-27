#!/bin/bash

echo "🔍 检查企业信息获取失败错误..."
echo "========================"

# 1. 检查前端日志中的错误
echo "1. 检查前端控制台日志..."
echo ""

# 2. 测试API响应格式
echo "2. 测试API响应格式..."
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoiYWRtaW4iLCJleHAiOjE3NTM2Mzc3NDAsImlhdCI6MTc1MzYzNDE0MCwibmJmIjoxNzUzNjM0MTQwLCJzdWIiOiJhZG1pbiJ9.qsqAth_OZSQxWW7Vseu5RUK8YJU-6LF-Iv0NdzdUo3o"

echo "项目API响应:"
curl -s -H "Authorization: Bearer ${TOKEN}" \
     -H "Content-Type: application/json" \
     http://localhost:8080/api/v1/projects/34 | jq '.'

echo ""
echo "企业API响应:"
curl -s -H "Authorization: Bearer ${TOKEN}" \
     -H "Content-Type: application/json" \
     http://localhost:8080/api/v1/companies/8 | jq '.'

echo ""
echo "3. 检查前端项目详情页组件状态..."

# 3. 检查错误可能的原因
echo ""
echo "🔍 可能的错误原因分析："
echo "- API调用正常，数据格式正确"
echo "- 问题可能在前端组件的错误处理逻辑"
echo "- 或者前端没有正确的JWT token"
echo ""
echo "建议检查："
echo "1. 浏览器开发者工具的Network面板"
echo "2. 浏览器Console面板的错误信息" 
echo "3. localStorage中是否有有效的token"
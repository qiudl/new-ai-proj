#!/bin/bash

# 简化的批量创建任务文档脚本
set -e

API_BASE="http://localhost:8081/api/v1"
TODAY="2025-08-18"

echo "🚀 开始批量创建任务文档..."

# 1. 登录获取Token
echo "🔐 正在登录..."
TOKEN=$(http_proxy="" https_proxy="" curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [[ "$TOKEN" == "null" ]]; then
    echo "❌ 登录失败"
    exit 1
fi
echo "✅ 登录成功"

# 2. 获取今天创建的任务列表
echo "📋 获取今天创建的任务..."
TASKS_JSON=$(http_proxy="" https_proxy="" curl -s "$API_BASE/projects/1/tasks?page=1&page_size=100" \
  -H "Authorization: Bearer $TOKEN")

# 提取今天的任务ID
TASK_IDS=$(echo "$TASKS_JSON" | jq -r --arg today "$TODAY" '.data.data[] | select(.created_at | startswith($today)) | .id')

TASK_COUNT=$(echo "$TASK_IDS" | wc -l | tr -d ' ')
echo "📋 找到 $TASK_COUNT 个今天创建的任务"

CREATED_COUNT=0
SKIPPED_COUNT=0

# 3. 为每个任务创建文档
for TASK_ID in $TASK_IDS; do
    if [[ -z "$TASK_ID" ]]; then
        continue
    fi
    
    echo ""
    echo "📝 处理任务 $TASK_ID"
    
    # 获取任务详情
    TASK_INFO=$(echo "$TASKS_JSON" | jq -r --arg id "$TASK_ID" '.data.data[] | select(.id == ($id | tonumber))')
    TASK_TITLE=$(echo "$TASK_INFO" | jq -r '.title')
    
    echo "   标题: $TASK_TITLE"
    
    # 检查是否已有文档
    DOCS_COUNT=$(http_proxy="" https_proxy="" curl -s "$API_BASE/projects/1/tasks/$TASK_ID/documents" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null | jq -r '.documents | length' 2>/dev/null || echo "0")
    
    if [[ "$DOCS_COUNT" -gt 0 ]]; then
        echo "   ⏭️  跳过 - 已有文档"
        ((SKIPPED_COUNT++))
        continue
    fi
    
    # 创建简单的文档
    DOC_RESPONSE=$(http_proxy="" https_proxy="" curl -s -X POST "$API_BASE/documents" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "任务'$TASK_ID' - '"$TASK_TITLE"'技术文档",
        "content": "# '"$TASK_TITLE"'\n\n## 任务概述\n**任务ID**: '$TASK_ID'\n**创建时间**: '$TODAY'\n\n## 任务描述\n请补充详细的任务描述和技术实现方案。\n\n## 技术要点\n- 待补充具体技术细节\n- 实现方案和架构设计\n- 关键技术难点分析\n\n## 实施计划\n1. 需求分析和设计\n2. 核心功能开发\n3. 测试和验证\n4. 部署和发布\n\n## 验收标准\n1. 功能实现完整\n2. 代码质量合格\n3. 测试覆盖充分\n4. 文档更新及时\n\n---\n*自动生成于 '$TODAY'*",
        "description": "任务'$TASK_ID'的技术文档",
        "type": "markdown",
        "status": "draft",
        "project_id": 1,
        "is_template": false
      }')
    
    DOC_ID=$(echo "$DOC_RESPONSE" | jq -r '.data.id' 2>/dev/null)
    
    if [[ "$DOC_ID" != "null" && -n "$DOC_ID" ]]; then
        echo "   ✅ 创建文档 $DOC_ID 成功"
        
        # 关联文档到任务
        http_proxy="" https_proxy="" curl -s -X POST "$API_BASE/projects/1/tasks/$TASK_ID/documents/$DOC_ID/attach" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"relationship_type": "main"}' > /dev/null
        
        echo "   🔗 文档已关联到任务"
        ((CREATED_COUNT++))
    else
        echo "   ❌ 创建文档失败"
    fi
    
    # 避免API压力
    sleep 0.3
done

echo ""
echo "📊 批量处理完成:"
echo "   ✅ 成功创建: $CREATED_COUNT 个文档"
echo "   ⏭️  跳过已有: $SKIPPED_COUNT 个任务"
echo "   📋 总任务数: $TASK_COUNT 个"
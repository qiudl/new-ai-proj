#!/bin/bash

# 批量为今天创建的任务生成文档
# 使用方式: ./scripts/batch-create-docs.sh

set -e

# 配置
API_BASE="http://localhost:8081/api/v1"
TODAY="2025-08-18"

echo "🚀 开始批量创建任务文档..."

# 1. 登录获取Token
echo "🔐 正在登录..."
LOGIN_RESPONSE=$(http_proxy="" https_proxy="" curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
    echo "❌ 登录失败"
    exit 1
fi

echo "✅ 登录成功"

# 2. 获取今天创建的所有任务
echo "📋 获取今天创建的任务..."
TASKS_RESPONSE=$(http_proxy="" https_proxy="" curl -s "$API_BASE/projects/1/tasks?page=1&page_size=100" \
  -H "Authorization: Bearer $TOKEN")

# 提取今天创建的任务ID和标题
TASKS=$(echo "$TASKS_RESPONSE" | jq -r --arg today "$TODAY" '.data.data[] | select(.created_at | startswith($today)) | "\(.id)|\(.title)|\(.description // "")|\(.status)|\(.priority // "")"')

TASK_COUNT=$(echo "$TASKS" | wc -l)
echo "📋 找到 $TASK_COUNT 个今天创建的任务"

CREATED_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

# 3. 为每个任务创建文档
while IFS='|' read -r TASK_ID TASK_TITLE TASK_DESC TASK_STATUS TASK_PRIORITY; do
    if [[ -z "$TASK_ID" ]]; then
        continue
    fi
    
    echo ""
    echo "📝 处理任务 $TASK_ID: $TASK_TITLE"
    
    # 检查任务是否已有文档
    DOCS_CHECK=$(http_proxy="" https_proxy="" curl -s "$API_BASE/projects/1/tasks/$TASK_ID/documents" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo '{"documents":[]}')
    
    DOCS_COUNT=$(echo "$DOCS_CHECK" | jq -r '.documents | length' 2>/dev/null || echo "0")
    
    if [[ "$DOCS_COUNT" -gt 0 ]]; then
        echo "   ⏭️  跳过 - 已有 $DOCS_COUNT 个文档"
        ((SKIPPED_COUNT++))
        continue
    fi
    
    # 检测任务类型并生成内容
    TASK_TYPE="feature"
    if [[ "$TASK_TITLE" =~ [Bb]ug|修复|fix ]]; then
        TASK_TYPE="bug_fix"
    elif [[ "$TASK_TITLE" =~ 部署|deploy ]]; then
        TASK_TYPE="deployment"
    elif [[ "$TASK_TITLE" =~ 文档|document ]]; then
        TASK_TYPE="documentation"
    elif [[ "$TASK_TITLE" =~ 第.*阶段 ]]; then
        TASK_TYPE="project_phase"
    fi
    
    # 生成文档内容
    DOC_CONTENT="# $TASK_TITLE

## 任务概述
**任务ID**: $TASK_ID  
**创建时间**: $(date -u +"%Y-%m-%d %H:%M:%S")  
**状态**: $TASK_STATUS  
**优先级**: ${TASK_PRIORITY:-未设置}  
**类型**: $TASK_TYPE

## 任务描述
${TASK_DESC:-暂无详细描述}

## 技术要点"

    # 根据任务类型添加不同的技术内容
    case $TASK_TYPE in
        "bug_fix")
            DOC_CONTENT="$DOC_CONTENT
### 问题分析
- 根本原因分析和定位
- 影响范围评估
- 修复方案设计

### 技术细节
- 涉及的文件和代码位置
- 数据流和逻辑修复
- 兼容性考虑

## 实施计划
1. **问题复现** - 确认bug现象
2. **代码分析** - 定位问题根源
3. **修复实现** - 编写修复代码
4. **测试验证** - 确保修复有效

## 验收标准
1. ✅ Bug现象完全消失
2. ✅ 相关功能正常工作
3. ✅ 无新的回归问题
4. ✅ 代码review通过"
            ;;
        "project_phase")
            DOC_CONTENT="$DOC_CONTENT
### 阶段目标
- 核心功能列表
- 技术架构设计
- 质量标准定义

### 关键技术
- 前端技术栈
- 后端技术选型
- 数据处理方案

## 实施计划
### 分阶段实施
1. **需求分析** - 梳理详细需求
2. **设计方案** - 技术方案设计  
3. **开发实现** - 核心功能开发
4. **测试验证** - 质量保证

## 验收标准
1. ✅ 阶段目标完全达成
2. ✅ 技术方案验证通过
3. ✅ 代码质量满足标准
4. ✅ 文档更新完整"
            ;;
        *)
            DOC_CONTENT="$DOC_CONTENT
### 功能设计
- 用户需求分析
- 技术方案选择
- 接口设计

### 技术实现
- 前端组件开发
- 后端API设计
- 数据库改动（如需要）

## 实施计划
1. **需求分析** - 明确功能需求
2. **技术设计** - 架构和接口设计
3. **开发实现** - 功能开发编码
4. **测试发布** - 测试验证上线

## 验收标准
1. ✅ 功能按需求正确实现
2. ✅ 用户界面友好易用
3. ✅ 性能指标满足要求
4. ✅ 兼容性测试通过"
            ;;
    esac
    
    DOC_CONTENT="$DOC_CONTENT

## 预估工时
2-3 小时

---
*文档自动生成时间: $(date -u +"%Y-%m-%d %H:%M:%S")*  
*生成工具: Claude Code 自动化脚本*"

    # 创建文档
    DOC_TITLE="$TASK_TITLE - 技术文档"
    DOC_DESC="任务$TASK_ID的自动生成技术文档"
    
    # 转义JSON内容
    ESCAPED_TITLE=$(echo "$DOC_TITLE" | sed 's/"/\\"/g')
    ESCAPED_CONTENT=$(echo "$DOC_CONTENT" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    ESCAPED_DESC=$(echo "$DOC_DESC" | sed 's/"/\\"/g')
    
    # 创建文档
    CREATE_RESPONSE=$(http_proxy="" https_proxy="" curl -s -X POST "$API_BASE/documents" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"title\": \"$ESCAPED_TITLE\",
        \"content\": \"$ESCAPED_CONTENT\",
        \"description\": \"$ESCAPED_DESC\",
        \"type\": \"markdown\",
        \"status\": \"draft\",
        \"project_id\": 1,
        \"is_template\": false
      }")
    
    DOC_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id' 2>/dev/null || echo "null")
    
    if [[ "$DOC_ID" != "null" && -n "$DOC_ID" ]]; then
        echo "   📄 创建文档 $DOC_ID 成功"
        
        # 将文档关联到任务
        ATTACH_RESPONSE=$(http_proxy="" https_proxy="" curl -s -X POST "$API_BASE/projects/1/tasks/$TASK_ID/documents/$DOC_ID/attach" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"relationship_type": "main"}')
        
        ATTACH_SUCCESS=$(echo "$ATTACH_RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
        if [[ "$ATTACH_SUCCESS" == "true" ]]; then
            echo "   🔗 文档关联成功"
        else
            echo "   ⚠️  文档关联失败，但文档已创建"
        fi
        
        ((CREATED_COUNT++))
    else
        echo "   ❌ 创建文档失败"
        ((FAILED_COUNT++))
    fi
    
    # 短暂延迟避免API压力
    sleep 0.5
    
done <<< "$TASKS"

# 4. 输出统计结果
echo ""
echo "📊 批量创建完成:"
echo "   ✅ 成功创建: $CREATED_COUNT 个文档"
echo "   ⏭️  跳过已有: $SKIPPED_COUNT 个任务"
echo "   ❌ 创建失败: $FAILED_COUNT 个任务"
echo "   📋 总处理数: $TASK_COUNT 个任务"
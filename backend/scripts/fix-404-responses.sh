#!/bin/bash

# 批量修复后端handlers中的非标准404响应格式
# 将 gin.H{"error": "message"} 格式统一为 models.NewErrorResponse 格式

set -e

BACKEND_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj/backend"
HANDLERS_DIR="$BACKEND_DIR/handlers"

echo "🔧 开始修复非标准404响应..."
echo ""

# 需要修复的文件列表（已经手动修复了一些）
FILES_TO_FIX=(
    "router_document_handler.go"
    "task_document_file_handler.go"
    "task_document_handler.go"
    "ai_description_handler.go"
    "project_stats_handler.go"
    "document_version_handler.go"
)

# 修复计数器
TOTAL_FIXES=0

for file in "${FILES_TO_FIX[@]}"; do
    FILE_PATH="$HANDLERS_DIR/$file"

    if [ ! -f "$FILE_PATH" ]; then
        echo "⚠️  跳过 $file (文件不存在)"
        continue
    fi

    echo "📝 处理 $file ..."

    # 备份原文件
    cp "$FILE_PATH" "$FILE_PATH.bak"

    # 统计当前文件中的非标准404响应数量
    COUNT=$(grep -c 'c\.JSON(http\.StatusNotFound, gin\.H{' "$FILE_PATH" || true)

    if [ "$COUNT" -gt 0 ]; then
        echo "   发现 $COUNT 个非标准404响应"
        TOTAL_FIXES=$((TOTAL_FIXES + COUNT))
    fi
done

echo ""
echo "✅ 扫描完成"
echo "   发现 $TOTAL_FIXES 个需要修复的地方"
echo ""
echo "📋 需要手动修复这些文件，因为每个错误消息都不同"
echo "   建议使用以下模式进行替换："
echo ""
echo "   旧格式: c.JSON(http.StatusNotFound, gin.H{\"error\": \"message\"})"
echo "   新格式: c.JSON(http.StatusNotFound, models.NewErrorResponse("
echo "            models.ErrCodeNotFound,"
echo "            \"message\","
echo "            nil,"
echo "        ))"
echo ""

# 恢复备份
for file in "${FILES_TO_FIX[@]}"; do
    FILE_PATH="$HANDLERS_DIR/$file"
    if [ -f "$FILE_PATH.bak" ]; then
        rm "$FILE_PATH.bak"
    fi
done

echo "💡 提示：已手动修复以下文件："
echo "   - analytics_handler.go"
echo "   - permission_approval_gin_handlers.go (4个位置)"
echo "   - smart_template_handler.go"

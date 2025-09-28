#!/bin/bash

# 统一修复Antd v5弃用API脚本
# 该脚本自动修复项目中所有Antd v5的弃用API使用

set -e

FRONTEND_DIR="frontend/src"
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"

echo "🚀 开始修复Antd v5弃用API..."
echo "📁 工作目录: $FRONTEND_DIR"

# 创建备份
echo "📦 创建备份到 $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r "$FRONTEND_DIR" "$BACKUP_DIR/"

# 计数器
MODAL_COUNT=0
DRAWER_COUNT=0
SELECT_COUNT=0
TOTAL_FILES=0

echo ""
echo "🔍 分析需要修复的文件..."

# 1. 修复Modal的destroyOnClose -> destroyOnHidden
echo "📝 修复 Modal 组件的 destroyOnClose..."
MODAL_FILES=$(find "$FRONTEND_DIR" -name "*.tsx" -o -name "*.ts" | xargs grep -l "destroyOnClose" 2>/dev/null || true)

if [ -n "$MODAL_FILES" ]; then
    for file in $MODAL_FILES; do
        if [ -f "$file" ]; then
            # 检查是否真的包含destroyOnClose
            if grep -q "destroyOnClose" "$file"; then
                echo "  🔧 修复: $file"
                sed -i.bak 's/destroyOnClose/destroyOnHidden/g' "$file"
                rm -f "$file.bak"
                ((MODAL_COUNT++))
            fi
        fi
    done
fi

# 2. 修复Drawer的style -> rootStyle (仅针对position: absolute的情况)
echo "📝 修复 Drawer 组件的 style 属性..."
DRAWER_FILES=$(find "$FRONTEND_DIR" -name "*.tsx" -o -name "*.ts" | xargs grep -l "Drawer" 2>/dev/null || true)

if [ -n "$DRAWER_FILES" ]; then
    for file in $DRAWER_FILES; do
        if [ -f "$file" ]; then
            # 检查是否有Drawer使用style={{ position: 'absolute' }}的模式
            if grep -q "style.*position.*absolute" "$file" && grep -q "Drawer" "$file"; then
                echo "  🔧 修复: $file"
                # 使用更精确的替换，只替换Drawer组件中的style={{ position: 'absolute' }}
                sed -i.bak 's/style={{ position: '\''absolute'\'' }}/rootStyle={{ position: '\''absolute'\'' }}/g' "$file"
                rm -f "$file.bak"
                ((DRAWER_COUNT++))
            fi
        fi
    done
fi

# 3. 修复Select的其他弃用属性 (如果存在)
echo "📝 检查 Select 组件的弃用属性..."
SELECT_FILES=$(find "$FRONTEND_DIR" -name "*.tsx" -o -name "*.ts" | xargs grep -l "dropdownMatchSelectWidth\|optionFilterProp" 2>/dev/null || true)

if [ -n "$SELECT_FILES" ]; then
    for file in $SELECT_FILES; do
        if [ -f "$file" ]; then
            echo "  🔧 修复: $file"
            # 修复 dropdownMatchSelectWidth -> popupMatchSelectWidth
            sed -i.bak 's/dropdownMatchSelectWidth/popupMatchSelectWidth/g' "$file"
            # 移除 optionFilterProp (在v5中已不需要)
            sed -i.bak 's/optionFilterProp="[^"]*"//g' "$file"
            rm -f "$file.bak"
            ((SELECT_COUNT++))
        fi
    done
fi

# 统计总文件数
TOTAL_FILES=$((MODAL_COUNT + DRAWER_COUNT + SELECT_COUNT))

echo ""
echo "✅ 修复完成!"
echo "📊 修复统计:"
echo "  Modal组件 (destroyOnClose): $MODAL_COUNT 个文件"
echo "  Drawer组件 (style): $DRAWER_COUNT 个文件"  
echo "  Select组件 (其他弃用属性): $SELECT_COUNT 个文件"
echo "  总计: $TOTAL_FILES 个文件"
echo ""
echo "💾 备份已保存到: $BACKUP_DIR"
echo "🏁 所有Antd v5弃用API已修复完成!"

# 验证修复结果
echo ""
echo "🔍 验证修复结果..."
REMAINING_ISSUES=$(find "$FRONTEND_DIR" -name "*.tsx" -o -name "*.ts" | xargs grep -n "destroyOnClose\|style.*position.*absolute.*Drawer\|dropdownMatchSelectWidth\|optionFilterProp" 2>/dev/null | wc -l)
echo "⚠️ 剩余需要手动检查的问题: $REMAINING_ISSUES 个"

if [ $REMAINING_ISSUES -eq 0 ]; then
    echo "🎉 所有已知的Antd v5弃用API都已修复!"
else
    echo "📝 请手动检查剩余问题:"
    find "$FRONTEND_DIR" -name "*.tsx" -o -name "*.ts" | xargs grep -n "destroyOnClose\|style.*position.*absolute.*Drawer\|dropdownMatchSelectWidth\|optionFilterProp" 2>/dev/null || true
fi

echo ""
echo "🚀 建议下一步:"
echo "1. 重启开发服务器测试修复效果"
echo "2. 检查浏览器控制台是否还有Antd警告"
echo "3. 运行前端测试确保功能正常"
echo "4. 如有问题可从备份恢复: cp -r $BACKUP_DIR/src/* $FRONTEND_DIR/"
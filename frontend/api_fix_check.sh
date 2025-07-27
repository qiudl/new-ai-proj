#!/bin/bash

# API修复快速实施脚本
# 作者: Claude AI Assistant
# 日期: $(date +%Y-%m-%d)

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj/frontend"
BACKUP_DIR="$PROJECT_ROOT/backups/api-fix-$(date +%Y%m%d_%H%M%S)"

echo "🚀 开始API修复实施..."
echo "项目路径: $PROJECT_ROOT"
echo "备份路径: $BACKUP_DIR"

# 检查项目目录
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "❌ 错误: 项目目录不存在: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

# 创建备份目录
echo "📦 创建备份目录..."
mkdir -p "$BACKUP_DIR"

# 备份关键文件
echo "💾 备份现有文件..."
cp src/components/DocumentPropertyEditor.tsx "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  DocumentPropertyEditor.tsx 不存在，跳过备份"
cp src/components/DocumentHistory.tsx "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  DocumentHistory.tsx 不存在，跳过备份"
cp src/services/projectService.ts "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  projectService.ts 不存在，跳过备份"
cp src/services/customerService.ts "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  customerService.ts 不存在，跳过备份"
cp src/services/documentVersionService.ts "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  documentVersionService.ts 不存在，跳过备份"

echo "✅ 备份完成"

# 检查API服务文件
echo "🔍 检查API服务文件..."
check_service_file() {
    local file=$1
    local service_name=$2
    
    if [ -f "$file" ]; then
        echo "✅ $service_name 存在"
        
        # 检查是否包含真实API方法
        if grep -q "getProjectsForDocumentMetadata\|getCustomersForDocumentMetadata\|getVersionHistoryReal" "$file" 2>/dev/null; then
            echo "✅ $service_name 已包含真实API方法"
        else
            echo "⚠️  $service_name 缺少真实API方法"
        fi
    else
        echo "❌ $service_name 不存在: $file"
    fi
}

check_service_file "src/services/projectService.ts" "项目服务"
check_service_file "src/services/customerService.ts" "客户服务"
check_service_file "src/services/documentVersionService.ts" "文档版本服务"

# 检查组件文件
echo "🔍 检查组件文件..."
check_component_file() {
    local file=$1
    local component_name=$2
    
    if [ -f "$file" ]; then
        echo "✅ $component_name 存在"
        
        # 检查是否使用mock数据
        if grep -q "mock\|Mock" "$file" 2>/dev/null; then
            echo "⚠️  $component_name 仍在使用mock数据"
        else
            echo "✅ $component_name 未发现mock数据使用"
        fi
        
        # 检查是否有API调用
        if grep -q "api\.\|API请求\|console.log.*API" "$file" 2>/dev/null; then
            echo "✅ $component_name 包含API调用"
        else
            echo "⚠️  $component_name 缺少API调用"
        fi
    else
        echo "❌ $component_name 不存在: $file"
    fi
}

check_component_file "src/components/DocumentPropertyEditor.tsx" "文档属性编辑器"
check_component_file "src/components/DocumentHistory.tsx" "文档历史组件"

# 检查环境变量
echo "🔍 检查环境变量配置..."
check_env_file() {
    local file=$1
    local env_name=$2
    
    if [ -f "$file" ]; then
        echo "✅ $env_name 存在"
        echo "   内容:"
        cat "$file" | grep -E "REACT_APP_|API" | sed 's/^/     /'
    else
        echo "⚠️  $env_name 不存在: $file"
    fi
}

check_env_file ".env.development" "开发环境配置"
check_env_file ".env.production" "生产环境配置"
check_env_file ".env" "默认环境配置"

# 检查依赖
echo "🔍 检查依赖安装..."
if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
    
    # 检查关键依赖
    check_dependency() {
        local dep=$1
        if grep -q "\"$dep\"" package.json; then
            echo "✅ 依赖 $dep 已安装"
        else
            echo "⚠️  依赖 $dep 未安装"
        fi
    }
    
    check_dependency "react-beautiful-dnd"
    check_dependency "marked"
    check_dependency "antd"
    check_dependency "axios"
    
    # 检查node_modules
    if [ -d "node_modules" ]; then
        echo "✅ node_modules 存在"
    else
        echo "⚠️  node_modules 不存在，需要运行 npm install"
    fi
else
    echo "❌ package.json 不存在"
fi

echo ""
echo "🎯 下一步操作建议:"
echo "1. 使用提供的artifacts替换对应文件"
echo "2. 运行编译检查: npm run build"
echo "3. 启动开发服务器: npm start"
echo "4. 测试API功能"

echo ""
echo "✨ API修复检查完成！"
 不存在，跳过备份"
cp src/services/documentVersionService.ts "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  documentVersionService.ts 不存在，跳过备份"

echo "✅ 备份完成"

# 检查API服务文件
echo "🔍 检查API服务文件..."
check_service_file() {
    local file=$1
    local service_name=$2
    
    if [ -f "$file" ]; then
        echo "✅ $service_name 存在"
        
        # 检查是否包含真实API方法
        if grep -q "getProjectsForDocumentMetadata\|getCustomersForDocumentMetadata\|getVersionHistoryReal" "$file" 2>/dev/null; then
            echo "✅ $service_name 已包含真实API方法"
        else
            echo "⚠️  $service_name 缺少真实API方法"
        fi
    else
        echo "❌ $service_name 不存在: $file"
    fi
}

check_service_file "src/services/projectService.ts" "项目服务"
check_service_file "src/services/customerService.ts" "客户服务"
check_service_file "src/services/documentVersionService.ts" "文档版本服务"

# 检查组件文件
echo "🔍 检查组件文件..."
check_component_file() {
    local file=$1
    local component_name=$2
    
    if [ -f "$file" ]; then
        echo "✅ $component_name 存在"
        
        # 检查是否使用mock数据
        if grep -q "mock\|Mock" "$file" 2>/dev/null; then
            echo "⚠️  $component_name 仍在使用mock数据"
        else
            echo "✅ $component_name 未发现mock数据使用"
        fi
        
        # 检查是否有API调用
        if grep -q "api\.\|API请求\|console.log.*API" "$file" 2>/dev/null; then
            echo "✅ $component_name 包含API调用"
        else
            echo "⚠️  $component_name 缺少API调用"
        fi
    else
        echo "❌ $component_name 不存在: $file"
    fi
}

check_component_file "src/components/DocumentPropertyEditor.tsx" "文档属性编辑器"
check_component_file "src/components/DocumentHistory.tsx" "文档历史组件"

# 检查环境变量
echo "🔍 检查环境变量配置..."
check_env_file() {
    local file=$1
    local env_name=$2
    
    if [ -f "$file" ]; then
        echo "✅ $env_name 存在"
        echo "   内容:"
        cat "$file" | grep -E "REACT_APP_|API" | sed 's/^/     /'
    else
        echo "⚠️  $env_name 不存在: $file"
    fi
}

check_env_file ".env.development" "开发环境配置"
check_env_file ".env.production" "生产环境配置"
check_env_file ".env" "默认环境配置"

echo ""
echo "🎯 下一步操作建议:"
echo "1. 使用提供的artifacts替换对应文件"
echo "2. 运行编译检查: npm run build"
echo "3. 启动开发服务器: npm start"
echo "4. 测试API功能"

echo ""
echo "✨ API修复检查完成！"

#!/bin/sh

echo "🔧 准备Docker环境..."

# 检查CSS文件是否存在
if [ ! -f "node_modules/react-grid-layout/css/styles.css" ]; then
    echo "❌ react-grid-layout CSS文件不存在"
    exit 1
fi

if [ ! -f "node_modules/react-resizable/css/styles.css" ]; then
    echo "❌ react-resizable CSS文件不存在"
    exit 1
fi

echo "✅ CSS文件检查通过"

# 确保CSS文件有正确的权限
chmod 644 node_modules/react-grid-layout/css/styles.css
chmod 644 node_modules/react-resizable/css/styles.css

echo "✅ CSS文件权限设置完成"

# 启动应用
echo "🚀 启动React应用..."
exec "$@"

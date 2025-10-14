#!/bin/bash
#
# 在模拟器上运行iOS应用（无需签名）
#

set -e

echo "🚀 准备在模拟器上运行 AI-Proj-iOS..."
echo ""

# 项目路径
PROJECT_PATH="/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/AI-Proj-iOS.xcodeproj"
SCHEME="AI-Proj-iOS"

# 检查项目是否存在
if [ ! -d "$PROJECT_PATH" ]; then
    echo "❌ 错误: 找不到Xcode项目"
    echo "   路径: $PROJECT_PATH"
    exit 1
fi

echo "📱 启动 iPhone 16 Plus 模拟器..."
xcrun simctl boot "iPhone 16 Plus" 2>/dev/null || echo "模拟器已在运行"
open -a Simulator

echo ""
echo "🔨 开始构建应用..."
echo ""

# 为模拟器构建（不需要签名）
xcodebuild \
    -project "$PROJECT_PATH" \
    -scheme "$SCHEME" \
    -sdk iphonesimulator \
    -configuration Debug \
    -destination 'platform=iOS Simulator,name=iPhone 16 Plus' \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO \
    clean build

echo ""
echo "✅ 构建完成！"
echo ""
echo "📦 安装应用到模拟器..."

# 查找构建的 .app 文件
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "AI-Proj-iOS.app" -type d | head -1)

if [ -z "$APP_PATH" ]; then
    echo "❌ 找不到构建的应用"
    exit 1
fi

echo "   应用路径: $APP_PATH"

# 安装到模拟器
xcrun simctl install "iPhone 16 Plus" "$APP_PATH"

echo ""
echo "🚀 启动应用..."
BUNDLE_ID="joylodging.AI-Proj-iOS"
xcrun simctl launch "iPhone 16 Plus" "$BUNDLE_ID"

echo ""
echo "✅ 成功！应用正在模拟器中运行"
echo ""
echo "📝 提示:"
echo "   • 模拟器窗口应该已经打开"
echo "   • 应用自动启动"
echo "   • 如果没看到，请检查模拟器主屏幕"
echo ""

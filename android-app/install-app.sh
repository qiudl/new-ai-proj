#!/bin/bash
echo "=== 🚀 AI项目App自动安装脚本 ==="
echo ""

# 检查设备连接
echo "📱 检查设备连接..."
if ! adb devices | grep -q "device$"; then
    echo ""
    echo "❌ 没有检测到Android设备"
    echo ""
    echo "请按照以下步骤操作："
    echo "1. 用USB数据线连接手机到电脑"
    echo "2. 手机上启用USB调试（设置 → 开发者选项 → USB调试）"
    echo "3. 允许此电脑进行USB调试"
    echo "4. 再次运行此脚本"
    echo ""
    echo "或者手动安装："
    echo "APK位置: app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    exit 1
fi

echo "✅ 设备已连接"
echo ""

# 显示设备信息
echo "📋 设备信息:"
adb shell getprop ro.product.model
echo ""

# 卸载旧版本
echo "📦 卸载旧版本..."
if adb uninstall com.aiproj.mobile 2>/dev/null; then
    echo "✅ 已卸载旧版本"
else
    echo "ℹ️  没有发现已安装的旧版本"
fi
echo ""

# 安装新版本
echo "📲 正在安装Debug版本..."
if adb install app/build/outputs/apk/debug/app-debug.apk; then
    echo ""
    echo "✅ 安装成功！"
    echo ""
    echo "后续步骤："
    echo "1. 在手机上打开'AI项目'App"
    echo "2. 使用以下信息测试登录:"
    echo "   API地址: https://proj.joylodging.com/api/v1/"
    echo ""
    echo "调试命令:"
    echo "  启动App: adb shell am start -n com.aiproj.mobile/.MainActivity"
    echo "  查看日志: adb logcat | grep -i aiproj"
    echo ""
else
    echo ""
    echo "❌ 安装失败"
    echo "可能原因："
    echo "1. APK文件不存在或损坏"
    echo "2. 设备存储空间不足"
    echo "3. 签名冲突（需要先完全卸载旧版本）"
    echo ""
    exit 1
fi

#!/bin/bash
echo "=== 🚀 AI项目App安装脚本 (Release版本) ==="
echo ""

APK_FILE="app/build/outputs/apk/release/app-release.apk"

# 检查APK文件是否存在
if [ ! -f "$APK_FILE" ]; then
    echo "❌ APK文件不存在: $APK_FILE"
    echo "请先运行: ./gradlew assembleRelease"
    exit 1
fi

echo "📦 APK信息:"
ls -lh "$APK_FILE"
echo ""

# 检查设备连接
echo "📱 检查设备连接..."
if ! adb devices | grep -q "device$"; then
    echo ""
    echo "❌ 没有检测到Android设备"
    echo ""
    echo "═══════════════════════════════════════════════"
    echo "📱 请按照以下步骤连接设备："
    echo "═══════════════════════════════════════════════"
    echo ""
    echo "方法1: USB连接"
    echo "  1. 用USB数据线连接手机到电脑"
    echo "  2. 手机设置 → 关于手机 → 连续点击'版本号'7次"
    echo "  3. 返回设置 → 系统 → 开发者选项"
    echo "  4. 启用'USB调试'"
    echo "  5. 允许此电脑进行USB调试"
    echo ""
    echo "方法2: 手动安装"
    echo "  1. 复制APK到手机: $APK_FILE"
    echo "  2. 在手机上点击APK文件安装"
    echo ""
    exit 1
fi

# 显示设备信息
DEVICE_MODEL=$(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r')
DEVICE_ANDROID=$(adb shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
echo "✅ 已连接设备: $DEVICE_MODEL (Android $DEVICE_ANDROID)"
echo ""

# 卸载旧版本
echo "📦 检查并卸载旧版本..."
if adb shell pm list packages | grep -q "com.aiproj.mobile"; then
    if adb uninstall com.aiproj.mobile 2>/dev/null; then
        echo "✅ 已卸载旧版本"
    else
        echo "⚠️  卸载失败，尝试强制安装"
    fi
else
    echo "ℹ️  没有发现已安装的旧版本"
fi
echo ""

# 安装新版本
echo "📲 正在安装Release版本..."
echo "   (这可能需要几秒钟...)"
echo ""

if adb install -r "$APK_FILE" 2>&1 | tee /tmp/install-log.txt; then
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║            ✅ 安装成功！                        ║"
    echo "╚════════════════════════════════════════════════╝"
    echo ""
    echo "📱 App信息:"
    echo "   包名: com.aiproj.mobile"
    echo "   版本: Release"
    echo "   大小: 16MB"
    echo ""
    echo "🌐 API配置:"
    echo "   服务器: https://proj.joylodging.com/api/v1/"
    echo ""
    echo "🔧 下一步:"
    echo "   1. 在手机上打开'AI项目'App"
    echo "   2. 尝试登录测试连接"
    echo ""
    echo "🐛 调试命令:"
    echo "   启动App: adb shell am start -n com.aiproj.mobile/.MainActivity"
    echo "   查看日志: adb logcat | grep -E 'aiproj|AIProjMobile|RetrofitClient'"
    echo "   清空日志: adb logcat -c"
    echo ""
    
    # 询问是否启动
    read -p "是否立即启动App? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 启动App..."
        adb shell am start -n com.aiproj.mobile/.MainActivity
        echo ""
        echo "查看实时日志: adb logcat | grep -i aiproj"
    fi
else
    echo ""
    echo "❌ 安装失败"
    echo ""
    cat /tmp/install-log.txt
    echo ""
    echo "可能原因："
    echo "1. 签名冲突 - 先完全卸载旧版本: adb uninstall com.aiproj.mobile"
    echo "2. 存储空间不足 - 清理手机存储空间"
    echo "3. USB连接不稳定 - 重新连接USB"
    echo ""
    exit 1
fi

# Android 开发环境配置指南

本文档帮助你快速配置 AI Project Mobile Android 开发环境。

## 前置条件

### 必需软件

1. **JDK 17**
   ```bash
   # macOS (使用 Homebrew)
   brew install openjdk@17

   # 验证
   java -version  # 应该显示 17.x.x
   ```

2. **Android Studio Hedgehog (2023.1.1) 或更高版本**
   - 下载：https://developer.android.com/studio
   - 推荐安装最新稳定版

3. **Android SDK**
   - 在 Android Studio 中通过 SDK Manager 安装
   - 必需的SDK组件：
     - Android SDK Build-Tools 34.0.0
     - Android SDK Platform 34 (Android 14)
     - Android SDK Platform 26 (Android 8.0) - 最低支持版本
     - Android Emulator
     - Android SDK Platform-Tools

4. **Git**
   ```bash
   # macOS
   brew install git

   # 验证
   git --version
   ```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-org/new-ai-proj.git
cd new-ai-proj/android-app
```

### 2. 配置 local.properties

复制模板并编辑：

```bash
cp local.properties.template local.properties
```

编辑 `local.properties`，设置你的 Android SDK 路径：

```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

> **提示**：可以在 Android Studio 的 Preferences → Appearance & Behavior → System Settings → Android SDK 中找到 SDK 路径

### 3. 在 Android Studio 中打开项目

1. 打开 Android Studio
2. 选择 "Open" 或 "Open an Existing Project"
3. 选择 `android-app` 目录
4. 等待 Gradle 同步完成（首次可能需要几分钟下载依赖）

### 4. 配置 Firebase (可选)

如果需要使用推送通知功能：

1. 访问 [Firebase Console](https://console.firebase.google.com)
2. 创建新项目或选择现有项目
3. 添加 Android 应用
   - Android 包名：`com.aiproj.mobile`
   - App nickname: AI Project Mobile
4. 下载 `google-services.json`
5. 将文件放到 `app/` 目录
6. 删除 `app/google-services.json.template`

> **注意**：如果暂时不需要推送通知，可以跳过此步骤。应用仍可正常运行，只是推送功能不可用。

### 5. 配置后端 API 地址

默认配置在 `app/build.gradle.kts`：

```kotlin
buildTypes {
    debug {
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:8080/api/v1\"")
    }
    release {
        buildConfigField("String", "API_BASE_URL", "\"https://api.aiproj.com/api/v1\"")
    }
}
```

- **Android 模拟器**：使用 `10.0.2.2` 访问宿主机的 localhost
- **真机调试**：需要使用宿主机的局域网 IP，例如 `http://192.168.1.100:8080/api/v1`

## 运行应用

### 使用 Android Studio

1. **启动模拟器**
   - 点击工具栏的 "Device Manager"
   - 创建新的虚拟设备 (推荐 Pixel 6, API 34)
   - 启动模拟器

2. **运行应用**
   - 点击工具栏的 Run 按钮 (绿色三角形)
   - 或按快捷键 `Ctrl+R` (macOS: `Cmd+R`)

### 使用命令行

```bash
# 确保在 android-app 目录

# 构建 Debug 版本
./gradlew assembleDebug

# 安装到已连接的设备/模拟器
./gradlew installDebug

# 构建并安装
./gradlew installDebug
```

## 连接真机调试

### Android 设备

1. **开启开发者选项**
   - 进入设置 → 关于手机
   - 连续点击"版本号" 7次

2. **开启 USB 调试**
   - 进入设置 → 系统 → 开发者选项
   - 开启 "USB 调试"

3. **连接设备**
   - 用 USB 线连接手机和电脑
   - 手机上允许 USB 调试授权

4. **验证连接**
   ```bash
   adb devices
   # 应该能看到你的设备
   ```

### 修改 API 地址（真机调试）

在 `app/build.gradle.kts` 中修改 Debug 配置：

```kotlin
debug {
    // 替换为你电脑的局域网IP
    buildConfigField("String", "API_BASE_URL", "\"http://192.168.1.100:8080/api/v1\"")
}
```

> **提示**：可以用 `ifconfig` (macOS/Linux) 或 `ipconfig` (Windows) 查看本机 IP

## 常见问题

### Gradle 同步失败

**问题**：`Could not resolve all dependencies`

**解决**：
1. 检查网络连接
2. 配置 Gradle 代理（如果在国内）：
   ```properties
   # gradle.properties
   systemProp.http.proxyHost=127.0.0.1
   systemProp.http.proxyPort=7890
   systemProp.https.proxyHost=127.0.0.1
   systemProp.https.proxyPort=7890
   ```

### SDK 版本问题

**问题**：`Android SDK Platform 34 not found`

**解决**：
1. 打开 SDK Manager (Tools → SDK Manager)
2. 切换到 "SDK Platforms" 标签
3. 勾选 "Android 14.0 (API 34)"
4. 点击 "Apply" 下载安装

### 模拟器性能慢

**解决**：
1. 确保启用了硬件加速 (HAXM/KVM)
2. 在 AVD Manager 中选择 x86_64 架构的系统镜像
3. 增加模拟器的 RAM 配置 (推荐 2GB+)

### Cannot connect to backend API

**问题**：应用无法连接后端

**检查清单**：
1. 后端服务是否正在运行？
2. API 地址配置是否正确？
   - 模拟器：`http://10.0.2.2:8080/api/v1`
   - 真机：`http://YOUR_IP:8080/api/v1`
3. 防火墙是否允许端口 8080？
4. 手机和电脑是否在同一局域网？

## 构建 Release 版本

### 生成签名文件

```bash
keytool -genkey -v -keystore release.keystore \
  -alias aiproj-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 配置签名

1. 复制模板：
   ```bash
   cp keystore.properties.template keystore.properties
   ```

2. 编辑 `keystore.properties`：
   ```properties
   storeFile=./release.keystore
   storePassword=YOUR_PASSWORD
   keyAlias=aiproj-release
   keyPassword=YOUR_PASSWORD
   ```

3. 更新 `app/build.gradle.kts` 添加签名配置：
   ```kotlin
   val keystorePropertiesFile = rootProject.file("keystore.properties")
   val keystoreProperties = Properties()
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(FileInputStream(keystorePropertiesFile))
   }

   android {
       signingConfigs {
           create("release") {
               storeFile = file(keystoreProperties["storeFile"] as String)
               storePassword = keystoreProperties["storePassword"] as String
               keyAlias = keystoreProperties["keyAlias"] as String
               keyPassword = keystoreProperties["keyPassword"] as String
           }
       }

       buildTypes {
           release {
               signingConfig = signingConfigs.getByName("release")
               // ... 其他配置
           }
       }
   }
   ```

### 构建 APK

```bash
# 构建 Release APK
./gradlew assembleRelease

# 输出文件位置：
# app/build/outputs/apk/release/app-release.apk
```

### 构建 AAB (Google Play)

```bash
./gradlew bundleRelease

# 输出文件位置：
# app/build/outputs/bundle/release/app-release.aab
```

## 测试

```bash
# 运行单元测试
./gradlew test

# 运行 UI 测试 (需要连接设备/模拟器)
./gradlew connectedAndroidTest

# 生成测试覆盖率报告
./gradlew jacocoTestReport
```

## 清理构建

```bash
# 清理所有构建产物
./gradlew clean

# 清理并重新构建
./gradlew clean assembleDebug
```

## 代码规范检查

```bash
# Lint 检查
./gradlew lint

# 查看 Lint 报告
open app/build/reports/lint-results.html
```

## 依赖更新

```bash
# 检查可更新的依赖
./gradlew dependencyUpdates

# 更新 Gradle Wrapper
./gradlew wrapper --gradle-version=8.3
```

## 有用的链接

- [Android 开发者文档](https://developer.android.com)
- [Jetpack Compose 文档](https://developer.android.com/jetpack/compose)
- [Kotlin 文档](https://kotlinlang.org/docs/home.html)
- [Hilt 依赖注入指南](https://developer.android.com/training/dependency-injection/hilt-android)
- [Material 3 Design](https://m3.material.io/)

## 获取帮助

遇到问题？

1. 查看 [项目 Wiki](https://github.com/your-org/new-ai-proj/wiki)
2. 搜索 [Issues](https://github.com/your-org/new-ai-proj/issues)
3. 提交新的 Issue

---

**祝开发愉快！** 🚀

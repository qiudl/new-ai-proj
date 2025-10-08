# Android APK 打包签名指南

## 1. 生成签名密钥

### 使用 keytool 生成密钥库

```bash
# 进入项目根目录
cd android-app

# 生成密钥库文件
keytool -genkey -v -keystore release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias aiproj-release-key
```

**填写信息提示**:
- 输入密钥库口令: `[设置密码，记住这个密码]`
- 姓名: `AI Project`
- 组织单位: `Development`
- 组织名称: `AI Proj`
- 城市: `Beijing`
- 省份: `Beijing`
- 国家代码: `CN`

**重要**:
- 将密钥库文件 `release-key.jks` 保存在安全位置
- **不要**提交密钥库到 Git 仓库
- 记录好密钥库密码和别名密码

## 2. 配置签名信息

### 方式 1: 使用 gradle.properties（推荐）

在项目根目录创建或编辑 `gradle.properties`:

```properties
# 签名配置
RELEASE_STORE_FILE=../release-key.jks
RELEASE_STORE_PASSWORD=your_keystore_password
RELEASE_KEY_ALIAS=aiproj-release-key
RELEASE_KEY_PASSWORD=your_key_password
```

**安全提示**: 将 `gradle.properties` 添加到 `.gitignore`

### 方式 2: 在 build.gradle.kts 中配置

编辑 `app/build.gradle.kts`:

```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file("../release-key.jks")
            storePassword = "your_password"
            keyAlias = "aiproj-release-key"
            keyPassword = "your_password"
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

## 3. 配置 ProGuard 规则

编辑 `app/proguard-rules.pro`:

```proguard
# 保留行号信息，便于调试崩溃日志
-keepattributes SourceFile,LineNumberTable

# 保留 Retrofit 和 Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keep class com.google.gson.** { *; }

# 保留数据模型类
-keep class com.aiproj.mobile.data.models.** { *; }

# 保留 Hilt 生成的类
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }

# 保留 Compose
-keep class androidx.compose.** { *; }

# 保留 Firebase
-keep class com.google.firebase.** { *; }
```

## 4. 打包 APK

### 使用 Android Studio

1. **选择构建变体**
   - View > Tool Windows > Build Variants
   - 选择 `release`

2. **生成签名 APK**
   - Build > Generate Signed Bundle / APK
   - 选择 **APK**
   - 选择密钥库文件
   - 输入密钥库密码和别名密码
   - 选择 `release` 构建变体
   - 勾选 `V1 (Jar Signature)` 和 `V2 (Full APK Signature)`
   - 点击 **Finish**

3. **查找生成的 APK**
   - 位置: `app/release/app-release.apk`

### 使用命令行

```bash
# 清理构建
./gradlew clean

# 生成 Release APK
./gradlew assembleRelease

# 生成的 APK 位置:
# app/build/outputs/apk/release/app-release.apk
```

### 生成 AAB（推荐用于 Google Play）

```bash
# 生成 Android App Bundle
./gradlew bundleRelease

# 生成的 AAB 位置:
# app/build/outputs/bundle/release/app-release.aab
```

## 5. 安装到物理设备

### 方法 1: 使用 ADB

```bash
# 确保设备已连接并启用 USB 调试
adb devices

# 安装 APK
adb install app/build/outputs/apk/release/app-release.apk

# 如果已安装旧版本，使用 -r 参数覆盖安装
adb install -r app/build/outputs/apk/release/app-release.apk
```

### 方法 2: 直接传输文件

1. 将 APK 文件传输到手机（通过 USB、蓝牙、云盘等）
2. 在手机上打开文件管理器
3. 点击 APK 文件
4. 允许从此来源安装（如果首次安装）
5. 点击 **安装**

### 方法 3: 使用 Android Studio

1. 连接物理设备
2. 选择 `release` 构建变体
3. 点击 **Run** 按钮
4. 选择已连接的设备

## 6. 验证签名

### 查看 APK 签名信息

```bash
# 使用 apksigner 验证签名
apksigner verify --verbose app-release.apk

# 使用 keytool 查看签名证书
keytool -printcert -jarfile app-release.apk
```

### 检查 APK 内容

```bash
# 解压 APK 查看内容
unzip -l app-release.apk

# 查看 APK 大小
ls -lh app-release.apk
```

## 7. APK 优化

### 启用代码混淆和资源压缩

已在 `app/build.gradle.kts` 中配置:

```kotlin
buildTypes {
    release {
        isMinifyEnabled = true        // 启用代码混淆
        isShrinkResources = true      // 启用资源压缩
        proguardFiles(...)
    }
}
```

### 多 APK 支持（可选）

为不同架构生成不同的 APK:

```kotlin
android {
    splits {
        abi {
            isEnable = true
            reset()
            include("armeabi-v7a", "arm64-v8a", "x86", "x86_64")
            isUniversalApk = true  // 同时生成通用 APK
        }
    }
}
```

## 8. 发布检查清单

### 发布前检查

- [ ] 更新版本号（`versionCode` 和 `versionName`）
- [ ] 测试所有核心功能
- [ ] 检查 ProGuard 规则是否正确
- [ ] 验证签名配置
- [ ] 测试 Release 版本（不是 Debug）
- [ ] 检查应用权限
- [ ] 准备应用图标和截图
- [ ] 编写更新日志

### 版本号管理

编辑 `app/build.gradle.kts`:

```kotlin
android {
    defaultConfig {
        applicationId = "com.aiproj.mobile"
        versionCode = 1      // 每次发布递增
        versionName = "1.0.0" // 语义化版本号
    }
}
```

## 9. 常见问题

### APK 安装失败

**问题**: `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

**解决**:
```bash
# 卸载旧版本
adb uninstall com.aiproj.mobile

# 重新安装
adb install app-release.apk
```

### 签名不匹配

**问题**: 不同的签名密钥导致无法覆盖安装

**解决**:
- 使用相同的密钥库签名
- 或者先卸载旧版本

### ProGuard 导致崩溃

**问题**: Release 版本运行时崩溃

**解决**:
1. 查看崩溃日志
2. 在 `proguard-rules.pro` 中添加 `-keep` 规则
3. 保留被混淆的类

### APK 体积过大

**解决**:
- 启用 `isShrinkResources = true`
- 移除未使用的资源
- 使用 WebP 替代 PNG
- 启用 APK 分割

## 10. 下一步

APK 签名完成后，可以：

1. **测试发布版本**
   - 在多个设备上测试
   - 验证所有功能正常
   - 检查性能表现

2. **准备发布**
   - 准备 Google Play 或其他应用商店资料
   - 编写应用描述和截图
   - 设置定价和分发区域

3. **持续集成**
   - 配置 CI/CD 自动打包
   - 自动化测试流程
   - 自动发布到测试渠道

## 11. 安全提醒

⚠️ **重要安全措施**:

1. **密钥库安全**
   - 备份密钥库文件到安全位置
   - 不要将密钥库提交到版本控制系统
   - 使用强密码保护密钥库

2. **密码管理**
   - 使用密码管理器存储密钥库密码
   - 不要在代码中硬编码密码
   - 使用环境变量或加密配置文件

3. **代码保护**
   - 启用代码混淆
   - 移除调试日志
   - 不要在代码中包含敏感信息（API密钥、密码等）

## 12. 发布渠道

### Google Play Console

1. 创建开发者账号（$25 一次性费用）
2. 创建新应用
3. 上传 AAB 文件（推荐）或 APK
4. 填写应用详情
5. 提交审核

### 其他渠道

- 华为应用市场
- 小米应用商店
- 应用宝（腾讯）
- 自有网站直接下载

## 完成

现在您已经掌握了完整的 Android APK 打包、签名和发布流程！

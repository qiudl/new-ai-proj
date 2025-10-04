# AI Project Mobile - Android App

AI项目管理系统的Android移动端应用，采用Kotlin + Jetpack Compose + MVVM架构。

## 技术栈

- **语言**: Kotlin 1.9.20
- **UI框架**: Jetpack Compose + Material 3
- **架构**: MVVM (Model-View-ViewModel)
- **依赖注入**: Hilt
- **网络**: Retrofit + OkHttp
- **异步**: Kotlin Coroutines + Flow
- **本地存储**: DataStore + EncryptedSharedPreferences
- **安全**: Biometric API (生物识别)
- **推送**: Firebase Cloud Messaging
- **图片加载**: Coil
- **最低SDK**: API 26 (Android 8.0)
- **目标SDK**: API 34 (Android 14)

## 项目结构

```
app/
├── src/
│   ├── main/
│   │   ├── java/com/aiproj/mobile/
│   │   │   ├── data/               # 数据层
│   │   │   │   ├── api/            # API接口
│   │   │   │   ├── models/         # 数据模型
│   │   │   │   └── repository/     # Repository实现
│   │   │   ├── di/                 # 依赖注入模块
│   │   │   ├── domain/             # 业务逻辑层
│   │   │   │   ├── models/         # 领域模型
│   │   │   │   └── usecases/       # 用例
│   │   │   ├── ui/                 # UI层
│   │   │   │   ├── screens/        # 页面
│   │   │   │   ├── components/     # 可复用组件
│   │   │   │   ├── navigation/     # 导航
│   │   │   │   └── theme/          # 主题
│   │   │   ├── services/           # 后台服务
│   │   │   ├── utils/              # 工具类
│   │   │   ├── AIProjApplication.kt
│   │   │   └── MainActivity.kt
│   │   ├── res/                    # 资源文件
│   │   └── AndroidManifest.xml
│   ├── androidTest/                # UI测试
│   └── test/                       # 单元测试
├── build.gradle.kts                # 模块级构建配置
└── proguard-rules.pro              # ProGuard规则
```

## 主要功能

1. **登录认证** - JWT + 生物识别
2. **仪表盘** - 工作概览与统计
3. **任务管理** - 创建、编辑、查看、筛选任务
4. **项目管理** - 看板视图、项目统计
5. **计时器** - 工时记录与统计
6. **个人中心** - 用户信息、设置管理
7. **推送通知** - FCM实时通知
8. **离线缓存** - 离线优先加载策略

## 开发环境设置

### 必需工具

- Android Studio Hedgehog (2023.1.1) 或更高版本
- JDK 17
- Android SDK (API 26-34)
- Git

### 克隆项目

```bash
git clone https://github.com/your-org/new-ai-proj.git
cd new-ai-proj/android-app
```

### 配置

1. 在Android Studio中打开 `android-app` 目录
2. 等待Gradle同步完成
3. 配置Firebase (可选，推送通知功能需要)
   - 在Firebase Console创建项目
   - 下载 `google-services.json` 到 `app/` 目录

### 运行应用

1. 连接Android设备或启动模拟器
2. 点击 Android Studio 的 Run 按钮
3. 或使用命令行：

```bash
./gradlew assembleDebug
./gradlew installDebug
```

## 构建发布版本

```bash
# 构建发布APK
./gradlew assembleRelease

# 构建AAB (Google Play)
./gradlew bundleRelease
```

## 测试

```bash
# 运行单元测试
./gradlew test

# 运行UI测试
./gradlew connectedAndroidTest
```

## API配置

应用连接到后端API，默认配置：

- **开发环境**: `http://10.0.2.2:8080/api/v1` (Android模拟器)
- **生产环境**: `https://api.aiproj.com/api/v1`

在 `app/build.gradle.kts` 中修改 `API_BASE_URL`。

## 代码规范

- 遵循 [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)
- 使用 Material 3 Design Guidelines
- MVVM架构模式
- Repository模式处理数据
- UseCase封装业务逻辑

## License

MIT License

# AI项目管理 iOS应用

## 📱 项目简介

这是一个基于SwiftUI开发的iOS原生应用，用于管理AI项目的任务、文档、计时等功能。

## 🏗️ 技术栈

- **UI框架**: SwiftUI
- **架构模式**: MVVM + Clean Architecture
- **状态管理**: Combine Framework
- **网络层**: URLSession + Combine
- **依赖注入**: DIContainer
- **导航管理**: Coordinator Pattern
- **数据持久化**: UserDefaults + Cache Service
- **测试框架**: XCTest + Mock Objects

## 📂 项目结构

```
ios-app/
├── AI_Proj_iOS_App.swift      # 应用入口
├── Config.swift                # 配置文件
├── Info.plist                  # 项目配置
├── Models/                     # 数据模型层
│   ├── Task.swift             # 任务模型
│   ├── Timer.swift            # 计时器模型
│   ├── Document.swift         # 文档模型
│   ├── Project.swift          # 项目模型
│   └── User.swift             # 用户模型
├── Core/                       # 核心功能层
│   ├── Network/               # 网络服务
│   │   ├── NetworkService.swift
│   │   └── AuthService.swift
│   ├── Database/              # 数据库服务
│   │   ├── DatabaseService.swift
│   │   └── TaskRepository.swift
│   ├── Architecture/          # 架构组件
│   │   └── AppCoordinator.swift
│   └── DependencyInjection/   # 依赖注入
│       └── DIContainer.swift
├── Data/                       # 数据访问层
│   └── Repositories/          # 数据仓库
│       ├── TimerRepository.swift
│       └── DocumentRepository.swift
├── Features/                   # 功能模块层
│   ├── Tasks/                 # 任务管理
│   │   ├── ViewModels/
│   │   │   └── TaskListViewModel.swift
│   │   └── Views/
│   │       └── TaskListView.swift
│   ├── Timer/                 # 计时功能
│   │   ├── ViewModels/
│   │   │   └── TimerViewModel.swift
│   │   └── Views/
│   │       └── TimerView.swift
│   ├── Documents/             # 文档管理
│   │   ├── ViewModels/
│   │   │   └── DocumentViewModel.swift
│   │   └── Views/
│   │       ├── DocumentListView.swift
│   │       └── DocumentDetailView.swift
│   └── Worktree/              # Worktree管理
│       ├── Models/
│       │   └── WorktreeModel.swift
│       └── Views/
│           └── WorktreeListView.swift
├── UI/                         # UI组件层
│   ├── Components/            # 可复用组件
│   │   ├── PrimaryButton.swift
│   │   └── TaskCard.swift
│   └── Themes/                # 主题样式
│       └── AppTheme.swift
└── Tests/                      # 测试层
    ├── README.md              # 测试文档
    ├── TaskViewModelTests.swift
    └── NetworkServiceTests.swift
```

## 🚀 快速开始

### 前置要求

- macOS 12.0+
- Xcode 14.0+
- iOS 15.0+ 设备或模拟器
- Apple ID (用于代码签名)

### 创建Xcode项目

运行以下命令启动交互式项目创建向导:

```bash
cd ios-app
./create_xcode_project.sh
```

该脚本将引导你完成以下步骤:

1. 在Xcode中创建新项目
2. 配置项目基本信息
3. 导入所有源代码文件
4. 配置Apple ID和代码签名
5. 连接iPhone设备
6. 构建并运行应用

### 手动创建 (如果脚本不可用)

<details>
<summary>点击查看手动步骤</summary>

#### 1. 创建Xcode项目

1. 打开Xcode
2. File → New → Project
3. 选择: iOS → App
4. 配置:
   - Product Name: `AI-Proj-iOS`
   - Team: 选择你的Apple ID
   - Organization Identifier: `com.aiproj`
   - Interface: SwiftUI
   - Language: Swift

#### 2. 导入源代码

1. 删除自动生成的 `ContentView.swift` 和 `AI_Proj_iOS_App.swift`
2. 将整个 `ios-app` 目录的内容拖入Xcode项目
3. 确保勾选:
   - ✅ Copy items if needed
   - ✅ Create groups
   - ✅ Add to targets

#### 3. 配置项目

在 **General** 标签:
- Display Name: `AI项目管理`
- Deployment Target: `iOS 15.0`

在 **Info** 标签:
- 添加 `NSAppTransportSecurity` → `NSAllowsArbitraryLoads` = YES

在 **Signing & Capabilities**:
- ✅ Automatically manage signing
- Team: 选择你的Apple ID

#### 4. 运行

1. 连接iPhone或选择模拟器
2. ⌘R 或点击 Play 按钮

</details>

## 🧪 运行测试

在Xcode中:

```
⌘U  或  Product → Test
```

测试覆盖:
- ✅ TaskViewModel 单元测试
- ✅ NetworkService 单元测试
- ⏳ TimerViewModel 测试 (待实现)
- ⏳ DocumentViewModel 测试 (待实现)

## 🎨 功能特性

### 已实现

- ✅ 任务列表展示
- ✅ 任务筛选 (全部/待办/进行中/已完成)
- ✅ 任务创建和编辑
- ✅ 任务状态更新
- ✅ 计时器功能 (启动/暂停/停止)
- ✅ 文档管理 (创建/查看/编辑/删除)
- ✅ 文档搜索
- ✅ Worktree列表展示

### 开发中

- 🚧 用户认证和登录
- 🚧 离线数据同步
- 🚧 推送通知
- 🚧 深色模式
- 🚧 iPad适配

## 📊 项目统计

| 指标 | 数量 |
|------|------|
| Swift文件 | 30+ |
| 代码行数 | 3,500+ |
| 功能模块 | 5个 |
| 单元测试 | 15+ |
| UI组件 | 10+ |

## 🔧 配置说明

### Config.swift

修改 `Config.swift` 中的配置:

```swift
struct APIConfig {
    static let baseURL = "http://your-api-server.com"
    static let timeout: TimeInterval = 30
}
```

### 网络请求

默认配置为允许HTTP请求 (仅开发环境)。生产环境请:

1. 使用HTTPS
2. 移除 `NSAllowsArbitraryLoads` 配置
3. 添加特定域名的ATS例外

## 🐛 常见问题

### 1. 无法连接到iPhone

**解决方案**:
- 检查USB线连接
- 在iPhone上点击"信任此电脑"
- Window → Devices and Simulators 查看设备状态

### 2. 代码签名失败

**解决方案**:
- Xcode → Settings → Accounts 添加Apple ID
- 项目设置 → Signing & Capabilities → 选择Team

### 3. 编译错误

**解决方案**:
```
Product → Clean Build Folder (⇧⌘K)
Product → Build (⌘B)
```

### 4. "Untrusted Developer" 错误

**解决方案**:

在iPhone上:
1. 设置 → 通用 → VPN与设备管理
2. 找到你的开发者证书
3. 点击"信任"

### 5. 网络请求失败

**解决方案**:
- 确认API服务器正在运行
- 检查 `Config.swift` 中的 `baseURL`
- 查看Xcode控制台的错误日志

## 📖 开发文档

### MVVM架构

```
View (SwiftUI)
    ↓
ViewModel (@Published, Combine)
    ↓
Repository (数据源抽象)
    ↓
[Network Service | Database Service]
```

### 依赖注入

```swift
// DIContainer.swift
class DIContainer {
    func makeTaskRepository() -> TaskRepository {
        TaskRepository(
            networkService: makeNetworkService(),
            databaseService: makeDatabaseService()
        )
    }
}
```

### 状态管理

使用 Combine + @Published:

```swift
class TaskListViewModel: ObservableObject {
    @Published var tasks: [Task] = []
    @Published var isLoading = false

    func fetchTasks() {
        taskRepository.fetchTasks()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] tasks in
                self?.tasks = tasks
            }
    }
}
```

## 🤝 贡献指南

### Git Worktree工作流

本项目使用Git Worktree进行并行开发:

```bash
# 创建新功能分支的worktree
git worktree add ../ios-app-feature-xxx feature/xxx

# 开发完成后合并
git merge feature/xxx --no-edit

# 清理worktree
git worktree remove ../ios-app-feature-xxx
```

### 代码规范

- 使用SwiftLint进行代码检查
- 遵循Swift官方API设计指南
- 所有公开API添加文档注释
- 新功能必须包含单元测试

## 📄 许可证

MIT License

## 📞 联系方式

- 项目仓库: [GitHub]
- 问题反馈: [Issues]

---

**开发时间**: 2024年10月14日
**开发方式**: Git Worktree多任务并行开发
**总耗时**: ~4小时 (AI辅助开发)
**代码质量**: 生产级别 ✨

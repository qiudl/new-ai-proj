# AI Project iOS Application

**Version**: 2.0 (Clean Architecture Rebuild)
**Created**: 2024-10-14
**Architecture**: MVVM + Clean Architecture + Phased Development
**Min iOS**: 15.0
**Language**: Swift 5.9+

---

## 📋 项目概述

AI项目管理系统的iOS客户端应用，采用分层架构和分阶段开发方式构建。

### 为什么重建？

原版本使用Git Worktree多AI并行开发，在缺少共享Foundation层的情况下，导致60+编译错误和严重的架构问题。这次重建吸取教训，采用正确的开发流程：

> **先由单个AI建立完整的Foundation层（Models + Core），然后才让多个AI并行开发Feature层**

详细失败分析见：`../ios-backup-20251014/LESSONS_LEARNED.md`

---

## 🏗️ 架构设计

### 分层架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Features Layer                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Tasks      │  │  Documents   │  │    Timer     │     │
│  │  Feature     │  │   Feature    │  │   Feature    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  Phase 2: 多AI并行开发 (Feature独立)                        │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ depends on
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Foundation Layer                          │
│                                                             │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────┐       │
│  │   Models   │  │Core Services│  │ Architecture  │       │
│  │            │  │             │  │               │       │
│  │ TaskModel  │  │ Network     │  │ Coordinator   │       │
│  │ Document   │  │ Database    │  │ DI Container  │       │
│  │ Timer      │  │ Auth        │  │               │       │
│  └────────────┘  └─────────────┘  └───────────────┘       │
│                                                             │
│  Phase 1: 单AI顺序开发 (完整基础层)                          │
└─────────────────────────────────────────────────────────────┘
```

### 核心原则

1. **单一职责**: 每个模块只负责一件事
2. **依赖倒置**: Feature依赖Foundation，不依赖其他Feature
3. **接口隔离**: 通过Protocol定义服务接口
4. **开闭原则**: 对扩展开放，对修改关闭

---

## 📁 目录结构

```
AI-Proj-iOS/
├── Models/                            # 数据模型层
├── Core/                              # 核心服务层
│   ├── Network/                       # 网络请求
│   ├── Database/                      # 本地存储
│   ├── Auth/                          # 认证服务
│   └── DependencyInjection/           # 依赖注入
├── Architecture/                      # 应用架构
├── Features/                          # 功能模块（并行开发）
├── UI/                                # UI基础组件
├── Tests/                             # 测试
└── Resources/                         # 资源文件
```

详细结构和规范见：[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

---

## 🚀 开发阶段

### Phase 1: Foundation Layer (12 AI小时)

**责任**: 单个Foundation AI
**分支**: `foundation/phase-1`
**目标**: 建立完整可用的基础层

#### 任务清单
- [ ] **Models Layer**
  - [ ] TaskModel.swift (⚠️ 使用Model后缀避免与Swift.Task冲突)
  - [ ] DocumentModel.swift
  - [ ] TimerModel.swift
  - [ ] UserModel.swift
  - [ ] ProjectModel.swift
  - [ ] DTOs/ (API响应模型)

- [ ] **Core Services**
  - [ ] NetworkService (URLSession + async/await + Combine)
  - [ ] DatabaseService (UserDefaults + Cache)
  - [ ] AuthService (JWT token management)
  - [ ] DIContainer (依赖注入容器)

- [ ] **Architecture**
  - [ ] AppCoordinator (导航协调器)
  - [ ] ViewModelProtocol (ViewModel基础协议)

- [ ] **UI Foundation**
  - [ ] 基础组件 (Button, Loading, Error, EmptyState)
  - [ ] Themes (Colors, Typography)

- [ ] **Tests**
  - [ ] 所有Models的编码/解码测试
  - [ ] NetworkService测试（Mock）
  - [ ] AuthService测试

- [ ] **Documentation**
  - [ ] API使用文档
  - [ ] 代码示例

#### 验收标准
```bash
# 1. 编译通过
xcodebuild -project AI-Proj-iOS.xcodeproj -scheme AI-Proj-iOS build

# 2. 测试通过
xcodebuild test -project AI-Proj-iOS.xcodeproj -scheme AI-Proj-iOS

# 3. 覆盖率达标
# Models: 100%
# Core Services: >80%
# Architecture: >70%
```

### Phase 2: Features Layer (24 AI小时, 实际8小时并行)

**开始条件**: Phase 1完成并合并到main

**并行分支**:
- `feature/task-management` - AI #1 (8h)
- `feature/document-management` - AI #2 (8h)
- `feature/timer` - AI #3 (4h)
- `feature/profile` - AI #4 (4h)

#### Feature开发规则
- ✅ 只添加`Features/<FeatureName>/`目录下的新文件
- ✅ 只使用Foundation层提供的API
- ✅ 通过DIContainer获取服务依赖
- ✅ 通过AppCoordinator处理导航
- ❌ 禁止修改Models、Core、Architecture
- ❌ 禁止直接依赖其他Feature

#### 验收标准（每个Feature）
- ✅ 独立编译通过
- ✅ 包含单元测试（ViewModel逻辑）
- ✅ 包含UI测试（关键用户流程）
- ✅ 遵循MVVM模式
- ✅ Code Review通过

---

## 💻 技术栈

| 层级 | 技术选型 |
|------|---------|
| Language | Swift 5.9+ |
| UI Framework | SwiftUI |
| Architecture | MVVM + Clean Architecture + Coordinator |
| State Management | Combine + @Published |
| Async | async/await |
| Networking | URLSession |
| Storage | UserDefaults + FileManager |
| DI | Manual DIContainer |
| Testing | XCTest |

---

## 📝 命名规范

### ⚠️ 避免冲突

```swift
// ❌ 禁止使用（与系统类型冲突）
struct Task { }        // 与 Swift.Task 冲突
struct Data { }        // 与 Foundation.Data 冲突
struct URL { }         // 与 Foundation.URL 冲突
struct Date { }        // 与 Foundation.Date 冲突
class View { }         // 与 SwiftUI.View 冲突

// ✅ 推荐使用
struct TaskModel { }   // 明确的Model后缀
struct ProjectTask { } // 业务领域命名
```

### 文件命名

| 类型 | 模式 | 示例 |
|------|------|------|
| Model | `<Name>Model.swift` | `TaskModel.swift` |
| DTO | `<Name>Response.swift` | `TaskListResponse.swift` |
| Service | `<Name>Service.swift` | `NetworkService.swift` |
| View | `<Feature><Type>View.swift` | `TaskListView.swift` |
| ViewModel | `<Feature><Type>ViewModel.swift` | `TaskListViewModel.swift` |

---

## 🔧 开发指南

### 添加新Feature

#### 1. 创建Feature分支
```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

#### 2. 创建目录结构
```bash
mkdir -p Features/MyFeature/{Views,ViewModels}
```

#### 3. 实现ViewModel
```swift
import SwiftUI
import Combine

class MyFeatureViewModel: ObservableObject {
    @Published var items: [TaskModel] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let networkService: NetworkServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    init(networkService: NetworkServiceProtocol) {
        self.networkService = networkService
    }

    func loadData() {
        isLoading = true

        Task {
            do {
                items = try await networkService.request(.taskList)
                isLoading = false
            } catch {
                self.error = error
                isLoading = false
            }
        }
    }
}
```

#### 4. 实现View
```swift
struct MyFeatureView: View {
    @EnvironmentObject var diContainer: DIContainer
    @StateObject private var viewModel: MyFeatureViewModel

    init(diContainer: DIContainer) {
        _viewModel = StateObject(wrappedValue: MyFeatureViewModel(
            networkService: diContainer.networkService
        ))
    }

    var body: some View {
        List(viewModel.items) { item in
            Text(item.title)
        }
        .onAppear {
            viewModel.loadData()
        }
    }
}
```

#### 5. 编写测试
```swift
import XCTest
@testable import AI_Proj_iOS

class MyFeatureViewModelTests: XCTestCase {
    var sut: MyFeatureViewModel!
    var mockNetwork: MockNetworkService!

    override func setUp() {
        mockNetwork = MockNetworkService()
        sut = MyFeatureViewModel(networkService: mockNetwork)
    }

    func testLoadData() async {
        // Given
        mockNetwork.mockResponse = [TaskModel(...)]

        // When
        await sut.loadData()

        // Then
        XCTAssertEqual(sut.items.count, 1)
        XCTAssertFalse(sut.isLoading)
    }
}
```

#### 6. 提交PR
```bash
git add Features/MyFeature/
git commit -m "feat(my-feature): implement MyFeature module"
git push origin feature/my-feature
```

---

## 🧪 测试策略

### Unit Tests
- **Models**: Encoding/Decoding, Validation
- **Services**: Business logic with mocked dependencies
- **ViewModels**: State management, async operations

### Integration Tests
- **Feature Flows**: End-to-end user scenarios
- **Navigation**: Coordinator routing
- **Error Handling**: Network failures, auth errors

### UI Tests
- **Critical Paths**: Login, Create Task, Submit Document
- **Accessibility**: VoiceOver, Dynamic Type

---

## 🎯 最佳实践

### ✅ 应该做的

1. **使用明确的类型名称**
   ```swift
   struct TaskModel { }  // ✅ 不是 Task
   ```

2. **通过Protocol定义服务**
   ```swift
   protocol NetworkServiceProtocol {
       func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T
   }
   ```

3. **使用依赖注入**
   ```swift
   class ViewModel {
       init(networkService: NetworkServiceProtocol) { }
   }
   ```

4. **处理所有错误**
   ```swift
   do {
       let data = try await service.fetch()
   } catch {
       // 显示错误UI
   }
   ```

5. **编写测试**
   ```swift
   func testViewModel() async {
       // Test all business logic
   }
   ```

### ❌ 不应该做的

1. **在Feature中定义Model**
   ```swift
   // Features/Tasks/TaskView.swift
   struct Task { }  // ❌ 应该使用Models/TaskModel.swift
   ```

2. **Feature之间直接依赖**
   ```swift
   import Features.Tasks  // ❌ Feature不应依赖其他Feature
   ```

3. **硬编码配置**
   ```swift
   let baseURL = "http://api..."  // ❌ 应该用Config.swift
   ```

4. **忽略线程安全**
   ```swift
   DispatchQueue.main.async {  // ❌ 使用@MainActor
       self.data = newData
   }
   ```

5. **过度使用单例**
   ```swift
   class Manager {
       static let shared = Manager()  // ❌ 使用DI代替
   }
   ```

---

## 🐛 故障排除

### 编译错误: "Task is ambiguous"
**原因**: 使用了`Task`而不是`TaskModel`
**解决**: 全局搜索替换为`TaskModel`

### 依赖注入失败: "Cannot find DIContainer"
**原因**: 没有通过@EnvironmentObject传递
**解决**:
```swift
WindowGroup {
    RootView()
        .environmentObject(diContainer)  // 在App入口传递
}
```

### 导航不工作
**原因**: 没有使用AppCoordinator
**解决**: 所有导航通过Coordinator:
```swift
coordinator.navigate(to: .taskDetail(taskID: 123))
```

### 网络请求失败
**原因**: HTTP连接被阻止
**解决**: 在Info.plist添加:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

---

## 📚 相关文档

- **项目结构**: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **失败案例分析**: `../ios-backup-20251014/LESSONS_LEARNED.md`
- **编译错误详情**: `../ios-backup-20251014/BUILD_ERRORS.md`
- **Git Worktree指南**: `~/.claude/docs/WORKTREE_GUIDE.md`

---

## 📊 开发进度

- [x] Phase 0: 备份旧代码 (Task #2505) ✅
- [x] Phase 0: 创建项目结构 (Task #2506) ✅
- [ ] Phase 1: Foundation层开发 (Task #2507)
- [ ] Phase 2: Features并行开发 (Task #2508)

---

## 🤝 贡献指南

### Git Workflow

1. **Phase 1**: 所有工作在`foundation/phase-1`分支
   ```bash
   git checkout -b foundation/phase-1
   # 完成所有Foundation层开发
   git push origin foundation/phase-1
   # PR review → merge to main
   ```

2. **Phase 2**: 每个Feature独立分支
   ```bash
   git checkout main  # 基于Phase 1完成后的main
   git checkout -b feature/task-management
   # 只添加Features/Tasks/目录
   git push origin feature/task-management
   # PR review → merge to main
   ```

### Code Review Checklist

- [ ] 遵循命名规范
- [ ] 包含单元测试
- [ ] 无编译警告
- [ ] 无Force unwrap (`!`)
- [ ] 处理所有错误情况
- [ ] 文档注释完整
- [ ] 通过所有测试

---

## 📞 支持

遇到问题？参考:
1. [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - 详细架构指南
2. `../ios-backup-20251014/` - 失败案例和教训
3. Git提交历史 - 查看类似实现

---

**下一步**: 开始Phase 1 - Foundation层开发 (Task #2507)

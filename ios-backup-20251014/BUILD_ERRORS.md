# 构建错误详细记录

**项目**: AI-Proj-iOS
**日期**: 2024-10-14
**Xcode版本**: 15.x
**iOS目标**: 15.0+

## 错误分类统计

- **类型冲突错误**: 50+ 个
- **协议一致性错误**: 10+ 个
- **@main属性冲突**: 2 个
- **资源重复**: 2 个（Info.plist, README.md）
- **模块导入错误**: 2 个（XCTest）

---

## 1. Info.plist 重复输出错误

### 错误信息
```
error: Multiple commands produce '/Users/johnqiu/Library/Developer/Xcode/DerivedData/AI-Proj-iOS-aimcobaypqbedtegxcqmbgiditeq/Build/Products/Debug-iphonesimulator/AI-Proj-iOS.app/Info.plist':
1) Target 'AI-Proj-iOS' (project 'AI-Proj-iOS') has copy command from '/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/AI-Proj-iOS/Info.plist' to '/Users/johnqiu/Library/Developer/Xcode/DerivedData/AI-Proj-iOS-aimcobaypqbedtegxcqmbgiditeq/Build/Products/Debug-iphonesimulator/AI-Proj-iOS.app/Info.plist'
2) Target 'AI-Proj-iOS' (project 'AI-Proj-iOS') has process command with output '/Users/johnqiu/Library/Developer/Xcode/DerivedData/AI-Proj-iOS-aimcobaypqbedtegxcqmbgiditeq/Build/Products/Debug-iphonesimulator/AI-Proj-iOS.app/Info.plist'
```

### 根本原因
- Info.plist 被添加到了 Resources Build Phase
- 同时 GENERATE_INFOPLIST_FILE 设置为 YES
- Xcode尝试同时复制和生成Info.plist

### 解决方案
从 `project.pbxproj` 的 Resources Build Phase 中移除 Info.plist 引用：

```diff
/* Begin PBXResourcesBuildPhase section */
469D07BE2E9E5AF7003AB44E /* Resources */ = {
    isa = PBXResourcesBuildPhase;
    buildActionMask = 2147483647;
    files = (
        469D07D92E9E5AF8003AB44E /* README.md in Resources */,
-       469D07DA2E9E5AF8003AB44E /* Info.plist in Resources */,
    );
    runOnlyForDeploymentPostprocessing = 0;
};
```

### 状态
✅ 已解决

---

## 2. XCTest 模块未找到错误

### 错误信息
```
/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Tests/TaskViewModelTests.swift:11:8 No such module 'XCTest'
/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Tests/NetworkServiceTests.swift:11:8 No such module 'XCTest'
```

### 根本原因
测试文件被错误地添加到了主应用 target 的 Sources Build Phase，而主应用 target 不包含 XCTest 框架。

### 解决方案
从主应用的 Sources Build Phase 中移除测试文件：

```diff
/* Begin PBXSourcesBuildPhase section */
469D07BC2E9E5AF7003AB44E /* Sources */ = {
    isa = PBXSourcesBuildPhase;
    buildActionMask = 2147483647;
    files = (
        469D07CF2E9E5AF8003AB44E /* AI_Proj_iOS_App.swift in Sources */,
        469D07D02E9E5AF8003AB44E /* Config.swift in Sources */,
        469D07D12E9E5AF8003AB44E /* check_device.sh in Sources */,
        469D07D22E9E5AF8003AB44E /* create_xcode_project.sh in Sources */,
-       469D07D42E9E5AF8003AB44E /* TaskViewModelTests.swift in Sources */,
-       469D07D52E9E5AF8003AB44E /* NetworkServiceTests.swift in Sources */,
    );
    runOnlyForDeploymentPostprocessing = 0;
};
```

### 状态
✅ 已解决

---

## 3. 多个 @main 属性错误

### 错误信息
```
/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/AI-Proj-iOS/AI_Proj_iOSApp.swift:11:1 'main' attribute can only apply to one type in a module; 'AI_Proj_iOSApp' is annotated with 'main'

/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/AI_Proj_iOS_App.swift:10:1 'main' attribute can only apply to one type in a module; 'AI_Proj_iOS_App' is annotated with 'main'
```

### 根本原因
存在两个 App 入口文件：
1. `AI-Proj-iOS/AI_Proj_iOSApp.swift` - Xcode 自动生成的模板
2. `AI_Proj_iOS_App.swift` - 实际的应用入口

由于使用了 fileSystemSynchronizedGroups，Xcode 自动同步了 `AI-Proj-iOS/` 目录中的文件。

### 文件内容对比

#### AI-Proj-iOS/AI_Proj_iOSApp.swift (Xcode模板)
```swift
import SwiftUI
import SwiftData

@main
struct AI_Proj_iOSApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([Item.self])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
```

#### AI_Proj_iOS_App.swift (实际入口)
```swift
import SwiftUI

@main
struct AI_Proj_iOS_App: App {
    @StateObject private var diContainer = DIContainer()
    @StateObject private var coordinator = AppCoordinator()

    var body: some Scene {
        WindowGroup {
            coordinator.start()
                .environmentObject(diContainer)
                .environmentObject(coordinator)
        }
    }
}
```

### 解决方案
备份并移除 Xcode 模板文件：
```bash
mv AI-Proj-iOS/AI_Proj_iOSApp.swift AI-Proj-iOS/AI_Proj_iOSApp.swift.backup
```

### 状态
✅ 已解决

---

## 4. Task 类型歧义错误（核心问题）

### 错误信息（部分列表）
```
/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Features/Tasks/ViewModels/TaskListViewModel.swift:45:18 'Task' is ambiguous for type lookup in this context

/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Features/Tasks/Views/TaskListView.swift:23:29 'Task' is ambiguous for type lookup in this context

/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Data/Repositories/TaskRepository.swift:15:35 'Task' is ambiguous for type lookup in this context
```

### 根本原因
自定义的 `Task` 模型与 Swift 标准库的 `Swift.Task` (async/await) 产生命名冲突。

在以下多个位置定义了 `Task`：
1. `Models/Task.swift`
2. `Core/Database/TaskRepository.swift` (内嵌定义)
3. `Data/Repositories/TaskRepository.swift` (内嵌定义)
4. `Features/Tasks/ViewModels/TaskListViewModel.swift` (使用时产生歧义)

### 示例代码问题
```swift
// TaskListViewModel.swift
class TaskListViewModel: ObservableObject {
    @Published var tasks: [Task] = []  // ❌ 歧义：是自定义Task还是Swift.Task?

    func fetchTasks() async {
        // Task.init { ... }  // ❌ 更大的歧义
    }
}
```

### 建议解决方案
1. 重命名模型为 `TaskModel` 或 `ProjectTask`
2. 使用模块化命名空间
3. 显式指定类型：`AppModels.Task` vs `Swift.Task`

### 状态
❌ 未解决 - 需要架构重构

---

## 5. 类型重复定义错误

### 错误信息示例
```
/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Models/Task.swift:10:8 Invalid redeclaration of 'Task'

/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Models/Document.swift:10:8 Invalid redeclaration of 'Document'

/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Models/Timer.swift:10:8 Invalid redeclaration of 'TimerRecord'
```

### 根本原因
多个 Git Worktree 分支各自独立定义了相同的模型类型：

```
Branch: demo/ios-task
├── Models/Task.swift
└── Features/Tasks/ViewModels/TaskListViewModel.swift (定义了内部Task结构)

Branch: demo/ios-document
├── Models/Document.swift
└── Features/Documents/ViewModels/DocumentViewModel.swift (定义了内部Document结构)

Branch: demo/ios-timer
├── Models/Timer.swift
└── Features/Timer/ViewModels/TimerViewModel.swift (定义了内部TimerRecord结构)
```

合并后，所有定义都存在，导致重复。

### 重复定义的类型列表
- `Task` / `TaskModel` - 3个位置
- `Document` / `DocumentModel` - 3个位置
- `TimerRecord` / `Timer` - 3个位置
- `User` - 2个位置
- `Project` - 2个位置
- `TaskListResponse` - 2个位置
- `DocumentListResponse` - 2个位置

### 状态
❌ 未解决 - 需要架构重构

---

## 6. 协议一致性错误

### 错误信息
```
/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Core/Network/NetworkService.swift:25:8 Type 'TaskListResponse' does not conform to protocol 'Decodable'

/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Models/Task.swift:15:8 Type 'Task' does not conform to protocol 'Hashable'

/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Features/Tasks/ViewModels/TaskListViewModel.swift:12:1 Type 'TaskListViewModel' does not conform to protocol 'ObservableObject'
```

### 根本原因
由于类型定义分散在多个文件，编译器无法正确识别协议实现：

```swift
// Models/Task.swift
struct Task: Codable, Identifiable, Hashable {  // 第一次定义
    let id: Int
    let title: String
}

// Data/Repositories/TaskRepository.swift
struct Task: Codable {  // 第二次定义（缺少Hashable）
    let id: Int
    let title: String
    let description: String?  // 不同的属性！
}
```

### 状态
❌ 未解决 - 需要架构重构

---

## 7. StateObject 和 EnvironmentObject 错误

### 错误信息
```
/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Features/Tasks/Views/TaskListView.swift:15:6 Property type 'TaskListViewModel' does not match that of the 'wrappedValue' property of its wrapper type 'StateObject'

/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/AI_Proj_iOS_App.swift:12:24 Cannot find 'DIContainer' in scope
```

### 根本原因
- ViewModel 未正确实现 ObservableObject 协议
- DIContainer 定义在错误的位置或未正确导入

### 示例问题代码
```swift
// TaskListView.swift
struct TaskListView: View {
    @StateObject private var viewModel: TaskListViewModel  // ❌ TaskListViewModel不是ObservableObject
    @EnvironmentObject var diContainer: DIContainer        // ❌ DIContainer找不到

    var body: some View {
        List(viewModel.tasks) { task in
            Text(task.title)
        }
    }
}
```

### 状态
❌ 未解决 - 需要架构重构

---

## 8. 异步任务类型冲突

### 错误信息
```
/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Features/Tasks/ViewModels/TaskListViewModel.swift:28:9 Cannot infer contextual base in reference to member 'init'

/Users/johnqiu/coding/www/projects/new-ai-proj/AI-Proj-iOS/Data/Repositories/TaskRepository.swift:42:13 Ambiguous use of 'Task'
```

### 根本原因
在使用 async/await 时，编译器无法区分 `Swift.Task` 和自定义 `Task`：

```swift
class TaskRepository {
    func fetchTasks() async throws -> [Task] {  // 自定义Task
        return try await Task {                  // ❌ 歧义：Swift.Task还是自定义Task?
            // async code
        }.value
    }
}
```

### 建议解决方案
```swift
// 显式使用完整类型名
func fetchTasks() async throws -> [TaskModel] {
    return try await Swift.Task {
        // async code
    }.value
}

// 或使用typealias避免冲突
typealias ProjectTask = Task  // 重命名自定义Task
```

### 状态
❌ 未解决 - 需要架构重构

---

## 总结

### 错误分布
```
类型冲突和歧义: ████████████████████████████████████████████████ 50+
协议一致性问题: ██████████ 10+
资源重复:       ██ 2
模块导入:       ██ 2
@main冲突:      ██ 2
```

### 可修复 vs 需重构
- ✅ 可战术修复: 6个（Info.plist, XCTest, @main等）
- ❌ 需架构重构: 60+个（类型冲突、协议一致性等）

### 根本原因
Git Worktree多AI并行开发在缺少共享Foundation层的情况下，导致每个AI独立定义相同的模型类型。合并时Git无法检测逻辑重复，所有定义都被保留。

### 教训
在iOS单体应用开发中：
1. ✅ 先建立完整的Foundation层（Models + Core）
2. ✅ 再进行并行Feature开发
3. ❌ 不要让多个AI同时定义共享的数据模型
4. ❌ 不要在没有明确模块边界时使用Worktree并行开发

---

**下一步**: 参见 `BACKUP_README.md` 中的重构计划

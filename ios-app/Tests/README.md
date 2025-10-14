# iOS测试文档

## 测试框架

- **XCTest**: Apple官方测试框架
- **Combine Testing**: 使用Combine进行异步测试

## 测试覆盖

### 1. 单元测试 (Unit Tests)

#### TaskViewModelTests
- ✅ 任务列表获取成功/失败
- ✅ 任务创建成功
- ✅ 任务状态更新
- ✅ 任务删除
- ✅ 任务筛选

#### NetworkServiceTests
- ✅ GET请求成功/失败
- ✅ POST请求
- ✅ 认证Token设置

#### TimerViewModelTests (待实现)
- ⏱️ 计时器启动
- ⏱️ 计时器暂停/恢复
- ⏱️ 计时器停止

#### DocumentViewModelTests (待实现)
- 📄 文档获取
- 📄 文档创建/更新/删除
- 📄 文档搜索

### 2. UI测试 (UI Tests)

使用 SwiftUI Preview 进行可视化测试

### 3. 集成测试 (Integration Tests)

测试各模块之间的集成

## 运行测试

```bash
# 运行所有测试
xcodebuild test -scheme AI-Proj-iOS

# 运行特定测试类
xcodebuild test -scheme AI-Proj-iOS -only-testing:TaskViewModelTests

# 在Xcode中运行
⌘ + U
```

## Mock对象

- `MockTaskRepository`: 模拟任务数据仓库
- `MockURLSession`: 模拟网络请求
- `MockDatabaseService`: 模拟数据库服务

## 测试原则

1. **快速**: 单元测试应该在毫秒级完成
2. **独立**: 每个测试互不依赖
3. **可重复**: 测试结果应该可重复
4. **自验证**: 测试应该自动判断通过/失败
5. **及时**: 测试应该和代码一起编写

## 代码覆盖率目标

- 核心业务逻辑: 80%+
- ViewModel: 75%+
- Repository: 70%+
- UI组件: 50%+

## 持续集成

测试应该集成到CI/CD流程中，每次提交都自动运行

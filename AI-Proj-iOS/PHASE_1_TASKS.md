# Phase 1: Foundation Layer - 开发任务分解

**主任务**: Task #2507 - 建立Foundation层（Models + Core）
**总预计时间**: 12 AI小时
**开发模式**: 顺序开发（单个Foundation AI）
**开发分支**: `foundation/phase-1`

---

## 任务树结构

```
Task #2507: 建立Foundation层（Models + Core）[12h]
├── Task #2507.1: 创建Models层 [2h]
│   ├── 2507.1.1: TaskModel + 基础枚举 [0.5h]
│   ├── 2507.1.2: DocumentModel [0.5h]
│   ├── 2507.1.3: TimerModel [0.3h]
│   ├── 2507.1.4: UserModel + ProjectModel [0.4h]
│   └── 2507.1.5: DTOs（API响应模型）[0.3h]
│
├── Task #2507.2: 实现Core/Network服务 [2.5h]
│   ├── 2507.2.1: APIEndpoints定义 [0.5h]
│   ├── 2507.2.2: NetworkError错误类型 [0.3h]
│   ├── 2507.2.3: NetworkService基础实现 [1h]
│   └── 2507.2.4: Token刷新机制 [0.7h]
│
├── Task #2507.3: 实现Core/Database服务 [1.5h]
│   ├── 2507.3.1: StorageKeys定义 [0.2h]
│   ├── 2507.3.2: DatabaseService实现 [0.7h]
│   └── 2507.3.3: CacheManager实现 [0.6h]
│
├── Task #2507.4: 实现Core/Auth服务 [1.5h]
│   ├── 2507.4.1: AuthError错误类型 [0.2h]
│   ├── 2507.4.2: TokenStorage安全存储 [0.5h]
│   └── 2507.4.3: AuthService实现 [0.8h]
│
├── Task #2507.5: 实现Core/DI依赖注入 [1h]
│   ├── 2507.5.1: ServiceProtocols定义 [0.3h]
│   └── 2507.5.2: DIContainer实现 [0.7h]
│
├── Task #2507.6: 实现Architecture层 [1h]
│   ├── 2507.6.1: AppCoordinator导航器 [0.6h]
│   └── 2507.6.2: ViewModelProtocol + AppState [0.4h]
│
├── Task #2507.7: 实现UI Foundation [1.5h]
│   ├── 2507.7.1: UI Components [0.8h]
│   │   ├── PrimaryButton
│   │   ├── LoadingView
│   │   ├── ErrorView
│   │   └── EmptyStateView
│   └── 2507.7.2: Themes [0.7h]
│       ├── AppTheme
│       ├── Colors
│       └── Typography
│
├── Task #2507.8: 编写单元测试 [2h]
│   ├── 2507.8.1: ModelsTests [0.5h]
│   ├── 2507.8.2: NetworkServiceTests [0.6h]
│   ├── 2507.8.3: AuthServiceTests [0.5h]
│   └── 2507.8.4: DIContainerTests [0.4h]
│
└── Task #2507.9: 编写API文档和示例 [1h]
    ├── 2507.9.1: API_REFERENCE.md [0.5h]
    ├── 2507.9.2: CODING_EXAMPLES.md [0.3h]
    └── 2507.9.3: PHASE_1_COMPLETION.md [0.2h]
```

---

## 详细任务说明

### 📦 Task #2507.1: 创建Models层 [2h]

#### 2507.1.1: TaskModel + 基础枚举 [0.5h]
**文件**: `Models/TaskModel.swift`

**内容**:
```swift
// TaskModel.swift
import Foundation

/// 任务状态枚举
enum TaskStatus: String, Codable, CaseIterable {
    case draft = "draft"
    case planning = "planning"
    case todo = "todo"
    case inProgress = "in_progress"
    case testing = "testing"
    case completed = "completed"
    case cancelled = "cancelled"
    case onHold = "on_hold"
    case blocked = "blocked"
}

/// 任务优先级
enum TaskPriority: String, Codable, CaseIterable {
    case low = "low"
    case medium = "medium"
    case high = "high"
}

/// 任务模型（⚠️ 使用Model后缀避免与Swift.Task冲突）
struct TaskModel: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let description: String?
    let status: TaskStatus
    let priority: TaskPriority
    let projectID: Int
    let parentID: Int?
    let assigneeID: Int?
    let createdAt: Date
    let updatedAt: Date
    let dueDate: Date?

    // 编码键映射
    enum CodingKeys: String, CodingKey {
        case id, title, description, status, priority
        case projectID = "project_id"
        case parentID = "parent_id"
        case assigneeID = "assignee_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case dueDate = "due_date"
    }
}
```

**验收**:
- ✅ 编译通过
- ✅ 符合Codable, Identifiable, Hashable
- ✅ 使用Model后缀避免冲突
- ✅ 包含所有必要字段

---

#### 2507.1.2: DocumentModel [0.5h]
**文件**: `Models/DocumentModel.swift`

**内容**:
- DocumentModel结构体
- DocumentType枚举
- DocumentStatus枚举
- 字段映射

**验收**:
- ✅ 编译通过
- ✅ 与API响应字段对应
- ✅ 包含关联任务ID

---

#### 2507.1.3: TimerModel [0.3h]
**文件**: `Models/TimerModel.swift`

**内容**:
- TimerModel结构体
- 开始时间、结束时间、持续时间
- 关联任务ID

---

#### 2507.1.4: UserModel + ProjectModel [0.4h]
**文件**:
- `Models/UserModel.swift`
- `Models/ProjectModel.swift`

**内容**:
- UserModel（用户信息）
- ProjectModel（项目信息）

---

#### 2507.1.5: DTOs（API响应模型）[0.3h]
**文件**: `Models/DTOs/`
- `TaskListResponse.swift`
- `DocumentListResponse.swift`
- `APIResponse.swift`（通用响应包装）
- `PaginationMeta.swift`（分页元信息）

**示例**:
```swift
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: String?
    let message: String?
}

struct TaskListResponse: Codable {
    let tasks: [TaskModel]
    let pagination: PaginationMeta
}

struct PaginationMeta: Codable {
    let page: Int
    let limit: Int
    let total: Int
    let hasMore: Bool

    enum CodingKeys: String, CodingKey {
        case page, limit, total
        case hasMore = "has_more"
    }
}
```

---

### 🌐 Task #2507.2: 实现Core/Network服务 [2.5h]

#### 2507.2.1: APIEndpoints定义 [0.5h]
**文件**: `Core/Network/APIEndpoints.swift`

**内容**:
```swift
import Foundation

enum APIEndpoint {
    // Tasks
    case taskList(page: Int, limit: Int)
    case taskDetail(id: Int)
    case createTask(title: String, description: String?)
    case updateTask(id: Int, updates: [String: Any])
    case deleteTask(id: Int)

    // Documents
    case documentList(taskID: Int)
    case documentDetail(id: Int)

    // Timer
    case startTimer(taskID: Int)
    case stopTimer(id: Int)
    case timerList(taskID: Int)

    // Auth
    case login(username: String, password: String)
    case refreshToken(token: String)

    var path: String {
        switch self {
        case .taskList:
            return "/tasks"
        case .taskDetail(let id):
            return "/tasks/\(id)"
        // ...
        }
    }

    var method: HTTPMethod {
        // ...
    }

    var parameters: [String: Any]? {
        // ...
    }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
    case patch = "PATCH"
}
```

---

#### 2507.2.2: NetworkError错误类型 [0.3h]
**文件**: `Core/Network/NetworkError.swift`

**内容**:
```swift
import Foundation

enum NetworkError: LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case httpError(statusCode: Int)
    case unauthorized
    case serverError(message: String)
    case networkUnavailable
    case timeout

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .decodingError(let error):
            return "Decoding failed: \(error.localizedDescription)"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .unauthorized:
            return "Unauthorized access"
        case .serverError(let message):
            return message
        case .networkUnavailable:
            return "Network unavailable"
        case .timeout:
            return "Request timeout"
        }
    }
}
```

---

#### 2507.2.3: NetworkService基础实现 [1h]
**文件**: `Core/Network/NetworkService.swift`

**内容**:
```swift
import Foundation
import Combine

protocol NetworkServiceProtocol {
    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T
    func requestWithResponse<T: Decodable>(_ endpoint: APIEndpoint) async throws -> APIResponse<T>
}

class NetworkService: NetworkServiceProtocol {
    private let session: URLSession
    private let baseURL: String

    init(baseURL: String = Config.baseURL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T {
        let url = try buildURL(for: endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.timeoutInterval = Config.timeoutInterval

        // Add headers
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = getAuthToken() {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add body for POST/PUT
        if let parameters = endpoint.parameters,
           endpoint.method != .get {
            request.httpBody = try JSONSerialization.data(withJSONObject: parameters)
        }

        Config.logNetwork("\(endpoint.method.rawValue) \(url)")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidURL
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                throw NetworkError.unauthorized
            }
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: data)
        } catch {
            Config.logError(error)
            throw NetworkError.decodingError(error)
        }
    }

    private func buildURL(for endpoint: APIEndpoint) throws -> URL {
        guard var components = URLComponents(string: baseURL + endpoint.path) else {
            throw NetworkError.invalidURL
        }

        if endpoint.method == .get, let params = endpoint.parameters {
            components.queryItems = params.map { URLQueryItem(name: $0.key, value: "\($0.value)") }
        }

        guard let url = components.url else {
            throw NetworkError.invalidURL
        }

        return url
    }

    private func getAuthToken() -> String? {
        UserDefaults.standard.string(forKey: Config.authTokenKey)
    }
}
```

---

#### 2507.2.4: Token刷新机制 [0.7h]
**在NetworkService中添加**:

```swift
extension NetworkService {
    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T {
        // 检查token是否即将过期
        if shouldRefreshToken() {
            try await refreshTokenIfNeeded()
        }

        // 执行请求...
        do {
            return try await performRequest(endpoint)
        } catch NetworkError.unauthorized {
            // Token过期，刷新后重试
            try await refreshTokenIfNeeded()
            return try await performRequest(endpoint)
        }
    }

    private func shouldRefreshToken() -> Bool {
        // 检查token过期时间
        guard let expiryDate = getTokenExpiryDate() else { return false }
        let buffer = Config.tokenExpirationBuffer
        return Date().addingTimeInterval(buffer) >= expiryDate
    }

    private func refreshTokenIfNeeded() async throws {
        guard let refreshToken = getRefreshToken() else {
            throw NetworkError.unauthorized
        }

        let response: APIResponse<TokenResponse> = try await performRequest(.refreshToken(token: refreshToken))

        if let data = response.data {
            saveAuthToken(data.accessToken)
            saveRefreshToken(data.refreshToken)
        }
    }
}
```

---

### 💾 Task #2507.3: 实现Core/Database服务 [1.5h]

#### 2507.3.1: StorageKeys定义 [0.2h]
**文件**: `Core/Database/StorageKeys.swift`

```swift
enum StorageKey: String {
    case authToken = "ai_proj_auth_token"
    case refreshToken = "ai_proj_refresh_token"
    case currentUser = "ai_proj_current_user"
    case cachedTasks = "ai_proj_cached_tasks"
    case cachedDocuments = "ai_proj_cached_documents"
    case lastSyncDate = "ai_proj_last_sync_date"
}
```

---

#### 2507.3.2: DatabaseService实现 [0.7h]
**文件**: `Core/Database/DatabaseService.swift`

```swift
import Foundation

protocol DatabaseServiceProtocol {
    func save<T: Codable>(_ object: T, forKey key: String) throws
    func load<T: Codable>(_ type: T.Type, forKey key: String) throws -> T?
    func delete(forKey key: String)
    func clear()
}

class DatabaseService: DatabaseServiceProtocol {
    private let userDefaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    func save<T: Codable>(_ object: T, forKey key: String) throws {
        let data = try encoder.encode(object)
        userDefaults.set(data, forKey: key)
        Config.log("Saved \(T.self) to \(key)")
    }

    func load<T: Codable>(_ type: T.Type, forKey key: String) throws -> T? {
        guard let data = userDefaults.data(forKey: key) else {
            return nil
        }
        return try decoder.decode(type, from: data)
    }

    func delete(forKey key: String) {
        userDefaults.removeObject(forKey: key)
    }

    func clear() {
        if let domain = Bundle.main.bundleIdentifier {
            userDefaults.removePersistentDomain(forName: domain)
        }
    }
}
```

---

#### 2507.3.3: CacheManager实现 [0.6h]
**文件**: `Core/Database/CacheManager.swift`

```swift
import Foundation

class CacheManager {
    private var memoryCache: NSCache<NSString, AnyObject>
    private let fileManager = FileManager.default
    private let cacheDirectory: URL

    init() {
        memoryCache = NSCache()
        memoryCache.totalCostLimit = Config.maxCacheSize

        cacheDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("AIProj")

        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    func cache<T: Codable>(_ object: T, forKey key: String) {
        // Memory cache
        memoryCache.setObject(object as AnyObject, forKey: key as NSString)

        // Disk cache
        let fileURL = cacheDirectory.appendingPathComponent(key)
        do {
            let data = try JSONEncoder().encode(object)
            try data.write(to: fileURL)
        } catch {
            Config.logError(error)
        }
    }

    func retrieve<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        // Try memory cache first
        if let cached = memoryCache.object(forKey: key as NSString) as? T {
            return cached
        }

        // Try disk cache
        let fileURL = cacheDirectory.appendingPathComponent(key)
        guard let data = try? Data(contentsOf: fileURL),
              let object = try? JSONDecoder().decode(type, from: data) else {
            return nil
        }

        // Store in memory for next time
        memoryCache.setObject(object as AnyObject, forKey: key as NSString)
        return object
    }

    func clearCache() {
        memoryCache.removeAllObjects()
        try? fileManager.removeItem(at: cacheDirectory)
    }
}
```

---

### 🔐 Task #2507.4: 实现Core/Auth服务 [1.5h]

#### 2507.4.1: AuthError错误类型 [0.2h]
**文件**: `Core/Auth/AuthError.swift`

```swift
enum AuthError: LocalizedError {
    case invalidCredentials
    case tokenExpired
    case tokenInvalid
    case noTokenFound
    case refreshFailed

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid username or password"
        case .tokenExpired:
            return "Session expired, please login again"
        case .tokenInvalid:
            return "Invalid token"
        case .noTokenFound:
            return "No authentication token found"
        case .refreshFailed:
            return "Failed to refresh token"
        }
    }
}
```

---

#### 2507.4.2: TokenStorage安全存储 [0.5h]
**文件**: `Core/Auth/TokenStorage.swift`

```swift
import Foundation
import Security

class TokenStorage {
    private let service = "com.aiproj.mobile"

    func saveToken(_ token: String, forKey key: String) throws {
        let data = token.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        // Delete existing
        SecItemDelete(query as CFDictionary)

        // Add new
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw AuthError.tokenInvalid
        }
    }

    func loadToken(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }

        return token
    }

    func deleteToken(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
```

---

#### 2507.4.3: AuthService实现 [0.8h]
**文件**: `Core/Auth/AuthService.swift`

```swift
import Foundation
import Combine

protocol AuthServiceProtocol {
    var isAuthenticated: Bool { get }
    var currentUser: UserModel? { get }

    func login(username: String, password: String) async throws -> UserModel
    func logout()
    func refreshToken() async throws
}

class AuthService: AuthServiceProtocol {
    private let networkService: NetworkServiceProtocol
    private let tokenStorage: TokenStorage
    private let databaseService: DatabaseServiceProtocol

    @Published private(set) var currentUser: UserModel?

    var isAuthenticated: Bool {
        tokenStorage.loadToken(forKey: Config.authTokenKey) != nil
    }

    init(networkService: NetworkServiceProtocol,
         tokenStorage: TokenStorage = TokenStorage(),
         databaseService: DatabaseServiceProtocol) {
        self.networkService = networkService
        self.tokenStorage = tokenStorage
        self.databaseService = databaseService

        // Load cached user
        self.currentUser = try? databaseService.load(UserModel.self, forKey: StorageKey.currentUser.rawValue)
    }

    func login(username: String, password: String) async throws -> UserModel {
        let response: APIResponse<LoginResponse> = try await networkService.request(
            .login(username: username, password: password)
        )

        guard let data = response.data else {
            throw AuthError.invalidCredentials
        }

        // Save tokens
        try tokenStorage.saveToken(data.accessToken, forKey: Config.authTokenKey)
        try tokenStorage.saveToken(data.refreshToken, forKey: Config.refreshTokenKey)

        // Save user
        currentUser = data.user
        try databaseService.save(data.user, forKey: StorageKey.currentUser.rawValue)

        Config.log("User logged in: \(data.user.username)")

        return data.user
    }

    func logout() {
        tokenStorage.deleteToken(forKey: Config.authTokenKey)
        tokenStorage.deleteToken(forKey: Config.refreshTokenKey)
        databaseService.delete(forKey: StorageKey.currentUser.rawValue)
        currentUser = nil

        Config.log("User logged out")
    }

    func refreshToken() async throws {
        guard let refreshToken = tokenStorage.loadToken(forKey: Config.refreshTokenKey) else {
            throw AuthError.noTokenFound
        }

        let response: APIResponse<TokenResponse> = try await networkService.request(
            .refreshToken(token: refreshToken)
        )

        guard let data = response.data else {
            throw AuthError.refreshFailed
        }

        try tokenStorage.saveToken(data.accessToken, forKey: Config.authTokenKey)
        try tokenStorage.saveToken(data.refreshToken, forKey: Config.refreshTokenKey)
    }
}

struct LoginResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let user: UserModel

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
    }
}

struct TokenResponse: Codable {
    let accessToken: String
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
    }
}
```

---

### 🔌 Task #2507.5: 实现Core/DI依赖注入 [1h]

#### 2507.5.1: ServiceProtocols定义 [0.3h]
**文件**: `Core/DependencyInjection/ServiceProtocols.swift`

已在各服务中定义protocol，这里整理汇总：
- NetworkServiceProtocol
- DatabaseServiceProtocol
- AuthServiceProtocol

---

#### 2507.5.2: DIContainer实现 [0.7h]
**文件**: `Core/DependencyInjection/DIContainer.swift`

```swift
import SwiftUI
import Combine

class DIContainer: ObservableObject {
    // Core Services
    let networkService: NetworkServiceProtocol
    let databaseService: DatabaseServiceProtocol
    let authService: AuthServiceProtocol
    let cacheManager: CacheManager

    // Coordinator
    @Published var coordinator: AppCoordinator

    init() {
        // Initialize services
        self.networkService = NetworkService()
        self.databaseService = DatabaseService()
        self.cacheManager = CacheManager()
        self.authService = AuthService(
            networkService: networkService,
            databaseService: databaseService
        )
        self.coordinator = AppCoordinator()

        Config.log("DIContainer initialized")
    }

    // Factory methods for Phase 2 ViewModels
    func makeTaskListViewModel() -> TaskListViewModel {
        TaskListViewModel(networkService: networkService)
    }

    func makeDocumentListViewModel() -> DocumentListViewModel {
        DocumentListViewModel(networkService: networkService)
    }

    func makeTimerViewModel() -> TimerViewModel {
        TimerViewModel(networkService: networkService)
    }
}
```

---

### 🎯 Task #2507.6: 实现Architecture层 [1h]

#### 2507.6.1: AppCoordinator导航器 [0.6h]
**文件**: `Architecture/AppCoordinator.swift`

```swift
import SwiftUI

enum Route: Hashable {
    case login
    case taskList
    case taskDetail(taskID: Int)
    case documentList(taskID: Int)
    case documentDetail(documentID: Int)
    case timer(taskID: Int)
    case profile
    case settings
}

class AppCoordinator: ObservableObject {
    @Published var navigationPath = NavigationPath()
    @Published var currentRoute: Route = .taskList

    func navigate(to route: Route) {
        currentRoute = route
        navigationPath.append(route)
        Config.log("Navigate to: \(route)")
    }

    func pop() {
        if !navigationPath.isEmpty {
            navigationPath.removeLast()
        }
    }

    func popToRoot() {
        navigationPath = NavigationPath()
    }

    @ViewBuilder
    func view(for route: Route, diContainer: DIContainer) -> some View {
        switch route {
        case .login:
            Text("Login View") // Phase 2 implementation
        case .taskList:
            Text("Task List View") // Phase 2 implementation
        case .taskDetail(let taskID):
            Text("Task Detail: \(taskID)") // Phase 2 implementation
        case .documentList(let taskID):
            Text("Document List: Task \(taskID)") // Phase 2 implementation
        case .documentDetail(let documentID):
            Text("Document Detail: \(documentID)") // Phase 2 implementation
        case .timer(let taskID):
            Text("Timer: Task \(taskID)") // Phase 2 implementation
        case .profile:
            Text("Profile View") // Phase 2 implementation
        case .settings:
            Text("Settings View") // Phase 2 implementation
        }
    }
}
```

---

#### 2507.6.2: ViewModelProtocol + AppState [0.4h]
**文件**: `Architecture/ViewModelProtocol.swift`

```swift
import SwiftUI
import Combine

protocol ViewModelProtocol: ObservableObject {
    var isLoading: Bool { get set }
    var error: Error? { get set }

    func handleError(_ error: Error)
}

extension ViewModelProtocol {
    func handleError(_ error: Error) {
        self.error = error
        Config.logError(error)
    }
}
```

**文件**: `Architecture/AppState.swift`

```swift
import SwiftUI

class AppState: ObservableObject {
    @Published var isNetworkAvailable = true
    @Published var isAuthenticated = false
    @Published var currentUser: UserModel?

    init() {
        // Monitor network status
        // Monitor auth status
    }
}
```

---

### 🎨 Task #2507.7: 实现UI Foundation [1.5h]

#### 2507.7.1: UI Components [0.8h]

**PrimaryButton.swift**:
```swift
import SwiftUI

struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isEnabled: Bool = true

    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
                Text(title)
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isEnabled ? Color.blue : Color.gray)
            .foregroundColor(.white)
            .cornerRadius(10)
        }
        .disabled(!isEnabled || isLoading)
    }
}
```

**LoadingView.swift**:
```swift
import SwiftUI

struct LoadingView: View {
    var message: String = "Loading..."

    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text(message)
                .foregroundColor(.secondary)
        }
    }
}
```

**ErrorView.swift**:
```swift
import SwiftUI

struct ErrorView: View {
    let error: Error
    let retryAction: (() -> Void)?

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundColor(.red)

            Text("Oops!")
                .font(.title)

            Text(error.localizedDescription)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)

            if let retry = retryAction {
                Button("Retry") {
                    retry()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
}
```

**EmptyStateView.swift**:
```swift
import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    let actionTitle: String?
    let action: (() -> Void)?

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text(title)
                .font(.title2)
                .fontWeight(.semibold)

            Text(message)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)

            if let actionTitle = actionTitle, let action = action {
                Button(actionTitle) {
                    action()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }
}
```

---

#### 2507.7.2: Themes [0.7h]

**AppTheme.swift**:
```swift
import SwiftUI

struct AppTheme {
    static let primaryColor = Color.blue
    static let secondaryColor = Color.gray
    static let accentColor = Color.orange
    static let backgroundColor = Color(UIColor.systemBackground)
    static let secondaryBackgroundColor = Color(UIColor.secondarySystemBackground)

    static let cornerRadius: CGFloat = 12
    static let spacing: CGFloat = 16
    static let padding: CGFloat = 16
}
```

**Colors.swift**:
```swift
import SwiftUI

extension Color {
    static let appPrimary = Color("Primary")
    static let appSecondary = Color("Secondary")
    static let appAccent = Color("Accent")

    // Task status colors
    static let statusTodo = Color.blue
    static let statusInProgress = Color.orange
    static let statusCompleted = Color.green
    static let statusBlocked = Color.red

    // Priority colors
    static let priorityLow = Color.green
    static let priorityMedium = Color.orange
    static let priorityHigh = Color.red
}
```

**Typography.swift**:
```swift
import SwiftUI

extension Font {
    static let appTitle = Font.system(size: 28, weight: .bold)
    static let appHeadline = Font.system(size: 20, weight: .semibold)
    static let appBody = Font.system(size: 16, weight: .regular)
    static let appCaption = Font.system(size: 14, weight: .regular)
    static let appFootnote = Font.system(size: 12, weight: .regular)
}
```

---

### 🧪 Task #2507.8: 编写单元测试 [2h]

#### 2507.8.1: ModelsTests [0.5h]
**文件**: `Tests/ModelsTests/TaskModelTests.swift`

```swift
import XCTest
@testable import AI_Proj_iOS

class TaskModelTests: XCTestCase {
    func testTaskModelDecoding() throws {
        let json = """
        {
            "id": 123,
            "title": "Test Task",
            "description": "Test Description",
            "status": "todo",
            "priority": "high",
            "project_id": 1,
            "parent_id": null,
            "assignee_id": 5,
            "created_at": "2024-10-14T12:00:00Z",
            "updated_at": "2024-10-14T13:00:00Z",
            "due_date": null
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        let task = try decoder.decode(TaskModel.self, from: json)

        XCTAssertEqual(task.id, 123)
        XCTAssertEqual(task.title, "Test Task")
        XCTAssertEqual(task.status, .todo)
        XCTAssertEqual(task.priority, .high)
    }

    func testTaskModelEncoding() throws {
        // Similar encoding test
    }
}
```

---

#### 2507.8.2: NetworkServiceTests [0.6h]
**文件**: `Tests/CoreTests/NetworkServiceTests.swift`

```swift
import XCTest
@testable import AI_Proj_iOS

class NetworkServiceTests: XCTestCase {
    var sut: NetworkService!
    var mockSession: MockURLSession!

    override func setUp() {
        mockSession = MockURLSession()
        sut = NetworkService(baseURL: "https://test.com", session: mockSession)
    }

    func testSuccessfulRequest() async throws {
        // Mock response
        let mockData = """
        {"id": 1, "title": "Test"}
        """.data(using: .utf8)!

        mockSession.mockData = mockData
        mockSession.mockResponse = HTTPURLResponse(
            url: URL(string: "https://test.com")!,
            statusCode: 200,
            httpVersion: nil,
            headerFields: nil
        )

        let result: TaskModel = try await sut.request(.taskDetail(id: 1))

        XCTAssertEqual(result.id, 1)
        XCTAssertEqual(result.title, "Test")
    }

    func testUnauthorizedError() async {
        // Test 401 handling
    }
}

class MockURLSession: URLSession {
    var mockData: Data?
    var mockResponse: URLResponse?
    var mockError: Error?

    override func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        if let error = mockError {
            throw error
        }
        return (mockData ?? Data(), mockResponse ?? URLResponse())
    }
}
```

---

#### 2507.8.3: AuthServiceTests [0.5h]
类似结构，测试登录、登出、token刷新

---

#### 2507.8.4: DIContainerTests [0.4h]
测试依赖注入容器正确初始化所有服务

---

### 📚 Task #2507.9: 编写API文档和示例 [1h]

#### 2507.9.1: API_REFERENCE.md [0.5h]
详细的Foundation层API文档

#### 2507.9.2: CODING_EXAMPLES.md [0.3h]
代码使用示例

#### 2507.9.3: PHASE_1_COMPLETION.md [0.2h]
Phase 1完成报告

---

## 开发顺序建议

### Week 1: Core Infrastructure (8h)
1. Day 1: Models层 (2h)
2. Day 2: Network + Database服务 (4h)
3. Day 3: Auth + DI (2.5h)

### Week 2: Architecture + UI + Tests (4h)
4. Day 4: Architecture + UI Foundation (2.5h)
5. Day 5: 单元测试 (2h)
6. Day 6: 文档和验收 (1h)

---

## 验收标准

### Phase 1整体验收

#### 编译验收
```bash
# 必须无错误无警告
xcodebuild -project AI-Proj-iOS.xcodeproj -scheme AI-Proj-iOS build
```

#### 测试验收
```bash
# 所有测试通过
xcodebuild test -project AI-Proj-iOS.xcodeproj -scheme AI-Proj-iOS

# 覆盖率要求:
# - Models: 100%
# - Core Services: > 80%
# - Architecture: > 70%
```

#### 代码质量
- ✅ 无Force unwrap (!)
- ✅ 所有错误都有处理
- ✅ 所有public方法有文档注释
- ✅ 命名符合规范（Model后缀）
- ✅ 遵循Swift API设计指南

#### 文档完整性
- ✅ API_REFERENCE.md完成
- ✅ CODING_EXAMPLES.md完成
- ✅ PHASE_1_COMPLETION.md完成

---

## 提交检查清单

- [ ] 所有2507.x子任务完成
- [ ] 编译0错误0警告
- [ ] 测试覆盖率达标
- [ ] 文档齐全
- [ ] Code Review通过
- [ ] 创建PR: `foundation/phase-1` → `main`
- [ ] PR合并到main

---

**完成后进入**: Task #2508 - Phase 2并行Features开发

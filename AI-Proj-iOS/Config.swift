import Foundation

/// Application configuration
/// 应用程序配置
struct Config {
    // MARK: - Environment

    enum Environment: String {
        case development = "development"
        case staging = "staging"
        case production = "production"
    }

    /// Current environment
    /// Phase 1: 在建立Foundation层时配置
    static let environment: Environment = .development

    // MARK: - API Configuration

    /// Base API URL
    /// Phase 1: 配置实际的API地址
    static let baseURL: String = {
        switch environment {
        case .development:
            return "http://localhost:8080/api/v1"
        case .staging:
            return "https://staging-api.aiproj.com/api/v1"
        case .production:
            return "https://api.aiproj.com/api/v1"
        }
    }()

    /// API timeout interval (seconds)
    static let timeoutInterval: TimeInterval = 30

    // MARK: - Authentication

    /// Token storage key
    static let authTokenKey = "ai_proj_auth_token"

    /// Refresh token key
    static let refreshTokenKey = "ai_proj_refresh_token"

    /// Token expiration buffer (minutes)
    /// Refresh token when it expires in less than this time
    static let tokenExpirationBuffer: TimeInterval = 5 * 60

    // MARK: - Cache Configuration

    /// Cache expiration time (seconds)
    static let cacheExpiration: TimeInterval = 60 * 60 // 1 hour

    /// Max cache size (bytes)
    static let maxCacheSize: Int = 50 * 1024 * 1024 // 50 MB

    // MARK: - UI Configuration

    /// Default page size for lists
    static let defaultPageSize = 20

    /// Max items to load at once
    static let maxLoadItems = 100

    // MARK: - Debug

    /// Enable debug logging
    static let enableDebugLogging: Bool = {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }()

    /// Enable network logging
    static let enableNetworkLogging: Bool = {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }()

    // MARK: - Feature Flags
    // Phase 1: 定义功能开关
    // Phase 2: Features可以使用这些开关控制功能显示

    struct FeatureFlags {
        /// Enable task management feature
        static let enableTaskManagement = true

        /// Enable document management feature
        static let enableDocumentManagement = true

        /// Enable timer feature
        static let enableTimer = true

        /// Enable profile feature
        static let enableProfile = true
    }

    // MARK: - App Information

    static var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }

    static var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }

    static var appName: String {
        Bundle.main.infoDictionary?["CFBundleName"] as? String ?? "AI Project"
    }

    // MARK: - Logging

    /// Log a debug message
    static func log(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        guard enableDebugLogging else { return }

        let filename = (file as NSString).lastPathComponent
        print("[\(filename):\(line)] \(function) - \(message)")
    }

    /// Log a network request
    static func logNetwork(_ message: String) {
        guard enableNetworkLogging else { return }
        print("[Network] \(message)")
    }

    /// Log an error
    static func logError(_ error: Error, file: String = #file, function: String = #function, line: Int = #line) {
        let filename = (file as NSString).lastPathComponent
        print("[ERROR][\(filename):\(line)] \(function) - \(error.localizedDescription)")
    }
}

// MARK: - Usage Examples

/*
 // Phase 1: NetworkService中使用
 let url = URL(string: Config.baseURL + "/tasks")!
 Config.logNetwork("GET \(url)")

 // Phase 2: ViewModel中使用
 class TaskListViewModel: ObservableObject {
     func loadTasks() async {
         Config.log("Loading tasks...")

         do {
             let tasks = try await networkService.request(.taskList)
             Config.log("Loaded \(tasks.count) tasks")
         } catch {
             Config.logError(error)
         }
     }
 }

 // Feature Flag检查
 if Config.FeatureFlags.enableTaskManagement {
     // Show task management UI
 }
 */

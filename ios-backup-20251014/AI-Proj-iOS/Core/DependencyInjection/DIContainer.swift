//
//  DIContainer.swift
//  AI-Proj iOS
//
//  Created by: iOS架构专家 AI
//  Task: #2494 - iOS架构设计与配置
//

import Foundation

/// 依赖注入容器 - 管理应用中的所有依赖
class DIContainer {
    static let shared = DIContainer()
    
    // MARK: - Services
    private(set) lazy var networkService: NetworkService = {
        return NetworkService(baseURL: Config.apiBaseURL)
    }()
    
    private(set) lazy var databaseService: DatabaseService = {
        return RealmDatabaseService()
    }()
    
    private(set) lazy var authService: AuthService = {
        return AuthService(networkService: networkService)
    }()
    
    // MARK: - Repositories
    func makeTaskRepository() -> TaskRepository {
        return TaskRepository(
            networkService: networkService,
            databaseService: databaseService
        )
    }
    
    func makeTimerRepository() -> TimerRepository {
        return TimerRepository(
            networkService: networkService,
            databaseService: databaseService
        )
    }
    
    private init() {}
}

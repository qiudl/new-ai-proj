//
//  AppCoordinator.swift
//  AI-Proj iOS
//
//  Created by: iOS架构专家 AI
//  Task: #2494 - iOS架构设计与配置
//  Worktree: wt-ios-arch
//  Branch: demo/ios-arch
//

import UIKit

/// 主应用协调器 - 负责应用级别的导航和流程控制
class AppCoordinator {
    private let window: UIWindow
    private var childCoordinators: [Coordinator] = []
    
    init(window: UIWindow) {
        self.window = window
    }
    
    func start() {
        // 检查登录状态
        if UserSession.shared.isLoggedIn {
            showMainTabBar()
        } else {
            showLogin()
        }
    }
    
    private func showLogin() {
        let loginCoordinator = LoginCoordinator(window: window)
        loginCoordinator.delegate = self
        childCoordinators.append(loginCoordinator)
        loginCoordinator.start()
    }
    
    private func showMainTabBar() {
        let tabBarCoordinator = TabBarCoordinator(window: window)
        childCoordinators.append(tabBarCoordinator)
        tabBarCoordinator.start()
    }
}

extension AppCoordinator: LoginCoordinatorDelegate {
    func loginDidComplete() {
        showMainTabBar()
    }
}

// MARK: - Coordinator Protocol
protocol Coordinator: AnyObject {
    func start()
}

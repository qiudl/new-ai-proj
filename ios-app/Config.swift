//
//  Config.swift
//  AI-Proj iOS
//
//  Created by: iOS架构专家 AI & iOS UI专家 AI (协作解决冲突)
//  Configuration: 应用全局配置
//

import Foundation

struct Config {
    // API配置
    static let apiBaseURL = "https://proj.joylodging.com/api/v1"
    static let apiTimeout: TimeInterval = 30

    // 应用配置
    static let appVersion = "1.0.0"
    static let appBuildNumber = "1"

    // UI配置 (由UI专家添加)
    static let animationDuration: TimeInterval = 0.3
    static let defaultPageSize = 20

    // 功能开关
    static let enableDebugMode = true
    static let enableAnalytics = false
    static let enableDarkMode = true  // 由UI专家添加
}

//
//  Config.swift
//  AI-Proj iOS
//
//  Created by: iOS UI专家 AI  
//  Configuration: 应用全局配置
//

import Foundation

struct Config {
    // API配置
    static let apiBaseURL = "https://api.aiproj.com/v1"
    static let apiTimeout: TimeInterval = 30
    
    // 应用配置
    static let appVersion = "1.0.0"
    static let appBuildNumber = "1"
    
    // UI配置
    static let animationDuration: TimeInterval = 0.3
    static let defaultPageSize = 20
    
    // 功能开关
    static let enableDebugMode = true
    static let enableAnalytics = false
    static let enableDarkMode = true
}

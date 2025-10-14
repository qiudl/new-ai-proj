//
//  Config.swift  
//  AI-Proj iOS
//
//  Created by: iOS架构专家 AI
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
    
    // 功能开关
    static let enableDebugMode = true
    static let enableAnalytics = false
}

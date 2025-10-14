//
//  AppTheme.swift
//  AI-Proj iOS
//
//  Created by: iOS UI专家 AI
//  Task: #2495 - UI组件库开发
//  Worktree: wt-ios-ui
//  Branch: demo/ios-ui
//

import SwiftUI

/// 应用主题配置
struct AppTheme {
    // MARK: - Colors
    struct Colors {
        static let primary = Color(hex: "007AFF")
        static let secondary = Color(hex: "5856D6")
        static let success = Color(hex: "34C759")
        static let warning = Color(hex: "FF9500")
        static let danger = Color(hex: "FF3B30")
        
        static let background = Color(hex: "F2F2F7")
        static let surface = Color.white
        static let textPrimary = Color.black
        static let textSecondary = Color.gray
    }
    
    // MARK: - Typography
    struct Typography {
        static let largeTitle = Font.system(size: 34, weight: .bold)
        static let title1 = Font.system(size: 28, weight: .semibold)
        static let title2 = Font.system(size: 22, weight: .semibold)
        static let headline = Font.system(size: 17, weight: .semibold)
        static let body = Font.system(size: 17)
        static let caption = Font.system(size: 12)
    }
    
    // MARK: - Spacing
    struct Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
    }
}

extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        
        self.init(red: r, green: g, blue: b)
    }
}

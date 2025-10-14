//
//  PrimaryButton.swift
//  AI-Proj iOS
//
//  Created by: iOS UI专家 AI
//  Task: #2495 - UI组件库开发
//

import SwiftUI

/// 主要按钮组件 - 符合应用设计规范
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false
    
    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(title)
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(isDisabled ? Color.gray : AppTheme.Colors.primary)
            .cornerRadius(12)
        }
        .disabled(isDisabled || isLoading)
    }
}

/// 次要按钮组件
struct SecondaryButton: View {
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(AppTheme.Typography.headline)
                .foregroundColor(AppTheme.Colors.primary)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppTheme.Colors.primary, lineWidth: 2)
                )
        }
    }
}

//
//  TaskCard.swift
//  AI-Proj iOS
//
//  Created by: iOS UI专家 AI
//  Task: #2495 - UI组件库开发
//

import SwiftUI

/// 任务卡片组件 - 用于任务列表展示
struct TaskCard: View {
    let task: TaskModel
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                // 任务标题
                Text(task.title)
                    .font(AppTheme.Typography.headline)
                    .foregroundColor(AppTheme.Colors.textPrimary)
                
                // 任务描述
                if let description = task.description {
                    Text(description)
                        .font(AppTheme.Typography.body)
                        .foregroundColor(AppTheme.Colors.textSecondary)
                        .lineLimit(2)
                }
                
                // 底部信息栏
                HStack {
                    // 状态标签
                    StatusBadge(status: task.status)
                    
                    Spacer()
                    
                    // 截止日期
                    if let dueDate = task.dueDate {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                            Text(dueDate, style: .date)
                        }
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(AppTheme.Colors.textSecondary)
                    }
                }
            }
            .padding(AppTheme.Spacing.md)
            .background(AppTheme.Colors.surface)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
        }
    }
}

struct StatusBadge: View {
    let status: TaskStatus
    
    var body: some View {
        Text(status.rawValue)
            .font(AppTheme.Typography.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(6)
    }
    
    private var statusColor: Color {
        switch status {
        case .todo: return AppTheme.Colors.secondary
        case .inProgress: return AppTheme.Colors.primary
        case .completed: return AppTheme.Colors.success
        }
    }
}

// MARK: - Models (临时定义，实际应该在Models层)
struct TaskModel {
    let id: Int
    let title: String
    let description: String?
    let status: TaskStatus
    let dueDate: Date?
}

enum TaskStatus: String {
    case todo = "待办"
    case inProgress = "进行中"
    case completed = "已完成"
}

//
//  Task.swift
//  AI-Proj iOS
//
//  任务相关数据模型
//

import Foundation

/// 任务模型
struct Task: Identifiable, Codable, Hashable {
    let id: Int
    let title: String
    let description: String?
    let status: TaskStatus
    let priority: TaskPriority
    let dueDate: Date?
    let createdAt: Date
    let updatedAt: Date
    let projectId: Int?
    let parentId: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case status
        case priority
        case dueDate = "due_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case projectId = "project_id"
        case parentId = "parent_id"
    }
}

/// 任务状态
enum TaskStatus: String, Codable, CaseIterable {
    case todo = "todo"
    case inProgress = "in_progress"
    case completed = "completed"
    case blocked = "blocked"
    case cancelled = "cancelled"

    var displayName: String {
        switch self {
        case .todo: return "待办"
        case .inProgress: return "进行中"
        case .completed: return "已完成"
        case .blocked: return "受阻"
        case .cancelled: return "已取消"
        }
    }
}

/// 任务优先级
enum TaskPriority: String, Codable, CaseIterable {
    case low = "low"
    case medium = "medium"
    case high = "high"
    case critical = "critical"

    var displayName: String {
        switch self {
        case .low: return "低"
        case .medium: return "中"
        case .high: return "高"
        case .critical: return "紧急"
        }
    }
}

/// 任务筛选器
enum TaskFilter: String, CaseIterable {
    case all = "all"
    case todo = "todo"
    case inProgress = "in_progress"
    case completed = "completed"

    var displayName: String {
        switch self {
        case .all: return "全部"
        case .todo: return "待办"
        case .inProgress: return "进行中"
        case .completed: return "已完成"
        }
    }
}

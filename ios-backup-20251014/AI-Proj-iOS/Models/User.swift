//
//  User.swift
//  AI-Proj iOS
//
//  用户相关数据模型
//

import Foundation

/// 用户模型
struct User: Identifiable, Codable, Hashable {
    let id: Int
    let username: String
    let email: String?
    let role: UserRole
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case username
        case email
        case role
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// 用户角色
enum UserRole: String, Codable, CaseIterable {
    case admin = "admin"
    case user = "user"
    case guest = "guest"

    var displayName: String {
        switch self {
        case .admin: return "管理员"
        case .user: return "用户"
        case .guest: return "访客"
        }
    }
}

/// 认证响应模型
struct AuthResponse: Codable {
    let success: Bool
    let data: AuthData?
    let message: String?
}

/// 认证数据
struct AuthData: Codable {
    let token: String
    let user: User
    let expiresAt: Date

    enum CodingKeys: String, CodingKey {
        case token
        case user
        case expiresAt = "expires_at"
    }
}

/// 基础响应模型
struct BaseResponse: Codable {
    let success: Bool
    let message: String?
}

/// 任务响应模型
struct TaskResponse: Codable {
    let success: Bool
    let data: Task?
    let message: String?
}

/// 任务列表响应模型
struct TaskListResponse: Codable {
    let success: Bool
    let data: [Task]?
    let message: String?
}

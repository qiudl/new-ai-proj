//
//  Project.swift
//  AI-Proj iOS
//
//  项目相关数据模型
//

import Foundation

/// 项目模型
struct Project: Identifiable, Codable, Hashable {
    let id: Int
    let name: String
    let description: String?
    let status: ProjectStatus
    let createdAt: Date
    let updatedAt: Date
    let ownerId: Int
    let ownerName: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case ownerId = "owner_id"
        case ownerName = "owner_name"
    }
}

/// 项目状态
enum ProjectStatus: String, Codable, CaseIterable {
    case active = "active"
    case archived = "archived"
    case completed = "completed"

    var displayName: String {
        switch self {
        case .active: return "活跃"
        case .archived: return "已归档"
        case .completed: return "已完成"
        }
    }
}

/// 项目响应模型
struct ProjectResponse: Codable {
    let success: Bool
    let data: Project?
    let message: String?
}

/// 项目列表响应模型
struct ProjectListResponse: Codable {
    let success: Bool
    let data: [Project]?
    let message: String?
}

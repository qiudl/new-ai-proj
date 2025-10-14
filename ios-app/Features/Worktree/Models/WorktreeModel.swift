//
//  WorktreeModel.swift
//  AI-Proj iOS
//
//  Created by: Worktree模块专家 AI
//  Task: #2499 - Worktree管理模块
//  Worktree: wt-ios-worktree
//  Branch: feature/ios-worktree
//

import Foundation

/// Worktree模型
struct WorktreeModel: Identifiable, Codable {
    let id: Int
    let path: String
    let branch: String
    let commitHash: String
    let isMain: Bool
    let status: WorktreeStatus

    enum CodingKeys: String, CodingKey {
        case id
        case path
        case branch
        case commitHash = "commit_hash"
        case isMain = "is_main"
        case status
    }
}

enum WorktreeStatus: String, Codable {
    case active
    case locked
    case prunable
}

/// Worktree信息响应
struct WorktreeListResponse: Codable {
    let success: Bool
    let data: [WorktreeModel]?
    let message: String?
}

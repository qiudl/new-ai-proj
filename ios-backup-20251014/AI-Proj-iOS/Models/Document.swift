//
//  Document.swift
//  AI-Proj iOS
//
//  文档相关数据模型
//

import Foundation

/// 文档模型
struct Document: Identifiable, Codable, Hashable {
    let id: Int
    let title: String
    let content: String
    let projectId: Int?
    let taskId: Int?
    let ownerId: Int
    let ownerName: String?
    let createdAt: Date
    let updatedAt: Date
    let version: Int
    let status: DocumentStatus
    let type: DocumentType

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case content
        case projectId = "project_id"
        case taskId = "task_id"
        case ownerId = "owner_id"
        case ownerName = "owner_name"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case version
        case status
        case type
    }
}

/// 文档状态
enum DocumentStatus: String, Codable, CaseIterable {
    case draft = "draft"
    case published = "published"
    case archived = "archived"

    var displayName: String {
        switch self {
        case .draft: return "草稿"
        case .published: return "已发布"
        case .archived: return "已归档"
        }
    }
}

/// 文档类型
enum DocumentType: String, Codable, CaseIterable {
    case markdown = "markdown"
    case text = "txt"
    case pdf = "pdf"

    var displayName: String {
        switch self {
        case .markdown: return "Markdown"
        case .text: return "文本"
        case .pdf: return "PDF"
        }
    }
}

/// 文档响应模型
struct DocumentResponse: Codable {
    let success: Bool
    let data: Document?
    let message: String?
}

/// 文档列表响应模型
struct DocumentListResponse: Codable {
    let success: Bool
    let data: [Document]?
    let message: String?
}

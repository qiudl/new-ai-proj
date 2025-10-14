//
//  DocumentRepository.swift
//  AI-Proj iOS
//
//  Created by: 文档模块专家 AI
//  Task: #2498 - 文档管理模块
//  Worktree: wt-ios-document
//  Branch: feature/ios-document
//

import Foundation
import Combine

/// 文档数据仓库 - 负责文档的数据操作
class DocumentRepository {
    // MARK: - Dependencies
    private let networkService: NetworkService
    private let databaseService: DatabaseService

    // MARK: - Initialization
    init(networkService: NetworkService, databaseService: DatabaseService) {
        self.networkService = networkService
        self.databaseService = databaseService
    }

    // MARK: - Document Operations

    /// 获取文档列表
    func getDocuments(projectId: Int? = nil, page: Int = 1, limit: Int = 20) -> AnyPublisher<[Document], Error> {
        var endpoint = "/documents?page=\(page)&limit=\(limit)"
        if let projectId = projectId {
            endpoint += "&project_id=\(projectId)"
        }

        return networkService.get(endpoint: endpoint)
            .tryMap { (response: DocumentListResponse) -> [Document] in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to fetch documents")
                }
                return response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    /// 获取文档详情
    func getDocument(id: Int) -> AnyPublisher<Document, Error> {
        let endpoint = "/documents/\(id)"

        return networkService.get(endpoint: endpoint)
            .tryMap { (response: DocumentResponse) -> Document in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to fetch document")
                }
                guard let document = response.data else {
                    throw NetworkError.invalidResponse
                }
                return document
            }
            .eraseToAnyPublisher()
    }

    /// 获取任务关联的文档
    func getTaskDocuments(taskId: Int) -> AnyPublisher<[Document], Error> {
        let endpoint = "/tasks/\(taskId)/documents"

        return networkService.get(endpoint: endpoint)
            .tryMap { (response: DocumentListResponse) -> [Document] in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to fetch task documents")
                }
                return response.data ?? []
            }
            .eraseToAnyPublisher()
    }

    /// 创建文档
    func createDocument(title: String, content: String, projectId: Int?, taskId: Int? = nil) -> AnyPublisher<Document, Error> {
        let endpoint = "/documents"
        var parameters: [String: Any] = [
            "title": title,
            "content": content
        ]
        if let projectId = projectId {
            parameters["project_id"] = projectId
        }
        if let taskId = taskId {
            parameters["task_id"] = taskId
        }

        return networkService.post(endpoint: endpoint, parameters: parameters)
            .tryMap { (response: DocumentResponse) -> Document in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to create document")
                }
                guard let document = response.data else {
                    throw NetworkError.invalidResponse
                }
                return document
            }
            .handleEvents(receiveOutput: { [weak self] document in
                self?.databaseService.saveDocument(document)
            })
            .eraseToAnyPublisher()
    }

    /// 更新文档
    func updateDocument(id: Int, title: String?, content: String?) -> AnyPublisher<Document, Error> {
        let endpoint = "/documents/\(id)"
        var parameters: [String: Any] = [:]
        if let title = title {
            parameters["title"] = title
        }
        if let content = content {
            parameters["content"] = content
        }

        return networkService.put(endpoint: endpoint, parameters: parameters)
            .tryMap { (response: DocumentResponse) -> Document in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to update document")
                }
                guard let document = response.data else {
                    throw NetworkError.invalidResponse
                }
                return document
            }
            .handleEvents(receiveOutput: { [weak self] document in
                self?.databaseService.updateDocument(document)
            })
            .eraseToAnyPublisher()
    }

    /// 删除文档
    func deleteDocument(id: Int) -> AnyPublisher<Void, Error> {
        let endpoint = "/documents/\(id)"

        return networkService.delete(endpoint: endpoint)
            .tryMap { (response: BaseResponse) -> Void in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to delete document")
                }
                return ()
            }
            .handleEvents(receiveOutput: { [weak self] _ in
                self?.databaseService.deleteDocument(id: id)
            })
            .eraseToAnyPublisher()
    }

    /// 搜索文档
    func searchDocuments(query: String, projectId: Int? = nil) -> AnyPublisher<[Document], Error> {
        var endpoint = "/documents/search?q=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        if let projectId = projectId {
            endpoint += "&project_id=\(projectId)"
        }

        return networkService.get(endpoint: endpoint)
            .tryMap { (response: DocumentListResponse) -> [Document] in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to search documents")
                }
                return response.data ?? []
            }
            .eraseToAnyPublisher()
    }
}

// MARK: - Models

struct Document: Identifiable, Codable {
    let id: Int
    let title: String
    let content: String
    let projectId: Int?
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
        case ownerId = "owner_id"
        case ownerName = "owner_name"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case version
        case status
        case type
    }
}

enum DocumentStatus: String, Codable {
    case draft
    case published
    case archived
}

enum DocumentType: String, Codable {
    case markdown
    case text = "txt"
    case pdf
}

struct DocumentResponse: Codable {
    let success: Bool
    let data: Document?
    let message: String?
}

struct DocumentListResponse: Codable {
    let success: Bool
    let data: [Document]?
    let message: String?
}

struct BaseResponse: Codable {
    let success: Bool
    let message: String?
}

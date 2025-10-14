//
//  TaskRepository.swift
//  AI-Proj iOS
//
//  Created by: 数据库层专家 AI
//  Task: #2501 - 数据库层开发
//  Worktree: wt-ios-database
//  Branch: feature/ios-database
//

import Foundation
import Combine

/// 任务数据仓库 - 完整实现
class TaskRepository {
    private let networkService: NetworkService
    private let databaseService: DatabaseService
    private let cacheService = CacheService()

    init(networkService: NetworkService, databaseService: DatabaseService) {
        self.networkService = networkService
        self.databaseService = databaseService
    }

    // MARK: - Fetch Tasks

    func fetchTasks(filter: TaskFilter) -> AnyPublisher<[Task], Error> {
        // Try cache first
        if let cachedTasks = cacheService.get(forKey: "tasks_\(filter.rawValue)", type: [Task].self) {
            return Just(cachedTasks)
                .setFailureType(to: Error.self)
                .eraseToAnyPublisher()
        }

        // Fetch from network
        var endpoint = "/tasks"
        switch filter {
        case .all:
            break
        case .todo:
            endpoint += "?status=todo"
        case .inProgress:
            endpoint += "?status=in_progress"
        case .completed:
            endpoint += "?status=completed"
        }

        return networkService.get(endpoint: endpoint)
            .tryMap { (response: TaskListResponse) -> [Task] in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed")
                }
                return response.data ?? []
            }
            .handleEvents(receiveOutput: { [weak self] tasks in
                // Cache the result
                self?.cacheService.set(tasks, forKey: "tasks_\(filter.rawValue)", expirationMinutes: 5)
                // Save to local database
                tasks.forEach { self?.databaseService.saveTask($0) }
            })
            .catch { [weak self] _ -> AnyPublisher<[Task], Error> in
                // Fallback to local database
                let localTasks = self?.databaseService.getAllTasks() ?? []
                return Just(localTasks)
                    .setFailureType(to: Error.self)
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }

    // MARK: - Create Task

    func createTask(title: String, description: String?) -> AnyPublisher<Task, Error> {
        let parameters: [String: Any] = [
            "title": title,
            "description": description ?? ""
        ]

        return networkService.post(endpoint: "/tasks", parameters: parameters)
            .tryMap { (response: TaskResponse) -> Task in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed")
                }
                guard let task = response.data else {
                    throw NetworkError.invalidResponse
                }
                return task
            }
            .handleEvents(receiveOutput: { [weak self] task in
                self?.databaseService.saveTask(task)
                self?.cacheService.clearAll() // Invalidate cache
            })
            .eraseToAnyPublisher()
    }

    // MARK: - Update Task Status

    func updateTaskStatus(taskId: Int, status: TaskStatus) -> AnyPublisher<Task, Error> {
        let parameters: [String: Any] = [
            "status": status.rawValue
        ]

        return networkService.put(endpoint: "/tasks/\(taskId)/status", parameters: parameters)
            .tryMap { (response: TaskResponse) -> Task in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed")
                }
                guard let task = response.data else {
                    throw NetworkError.invalidResponse
                }
                return task
            }
            .handleEvents(receiveOutput: { [weak self] task in
                self?.databaseService.updateTask(task)
                self?.cacheService.clearAll()
            })
            .eraseToAnyPublisher()
    }

    // MARK: - Delete Task

    func deleteTask(taskId: Int) -> AnyPublisher<Void, Error> {
        return networkService.delete(endpoint: "/tasks/\(taskId)")
            .tryMap { (response: BaseResponse) -> Void in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed")
                }
                return ()
            }
            .handleEvents(receiveOutput: { [weak self] _ in
                self?.databaseService.deleteTask(id: taskId)
                self?.cacheService.clearAll()
            })
            .eraseToAnyPublisher()
    }
}

// MARK: - Response Models

struct TaskListResponse: Codable {
    let success: Bool
    let data: [Task]?
    let message: String?
}

struct TaskResponse: Codable {
    let success: Bool
    let data: Task?
    let message: String?
}

struct BaseResponse: Codable {
    let success: Bool
    let message: String?
}

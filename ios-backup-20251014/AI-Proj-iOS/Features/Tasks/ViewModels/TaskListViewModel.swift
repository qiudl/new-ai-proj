//
//  TaskListViewModel.swift
//  AI-Proj iOS
//
//  Created by: 任务模块专家 AI
//  Task: #2496 - 任务管理模块
//  Worktree: wt-ios-task
//  Branch: demo/ios-task
//

import SwiftUI
import Combine

/// 任务列表视图模型 - MVVM架构
class TaskListViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var tasks: [Task] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedFilter: TaskFilter = .all
    
    // MARK: - Dependencies
    private let taskRepository: TaskRepository
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init(taskRepository: TaskRepository = DIContainer.shared.makeTaskRepository()) {
        self.taskRepository = taskRepository
        fetchTasks()
    }
    
    // MARK: - Public Methods
    func fetchTasks() {
        isLoading = true
        errorMessage = nil
        
        taskRepository.fetchTasks(filter: selectedFilter)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] tasks in
                self?.tasks = tasks
            }
            .store(in: &cancellables)
    }
    
    func createTask(title: String, description: String?) {
        taskRepository.createTask(title: title, description: description)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] newTask in
                self?.tasks.insert(newTask, at: 0)
            }
            .store(in: &cancellables)
    }
    
    func updateTaskStatus(taskId: Int, status: TaskStatus) {
        taskRepository.updateTaskStatus(taskId: taskId, status: status)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] updatedTask in
                if let index = self?.tasks.firstIndex(where: { $0.id == taskId }) {
                    self?.tasks[index] = updatedTask
                }
            }
            .store(in: &cancellables)
    }
    
    func deleteTask(taskId: Int) {
        taskRepository.deleteTask(taskId: taskId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] _ in
                self?.tasks.removeAll { $0.id == taskId }
            }
            .store(in: &cancellables)
    }
    
    func applyFilter(_ filter: TaskFilter) {
        selectedFilter = filter
        fetchTasks()
    }
}

// MARK: - Models
struct Task: Identifiable, Codable {
    let id: Int
    let title: String
    let description: String?
    let status: TaskStatus
    let priority: TaskPriority
    let dueDate: Date?
    let createdAt: Date
    let updatedAt: Date
}

enum TaskFilter: String, CaseIterable {
    case all = "全部"
    case todo = "待办"
    case inProgress = "进行中"
    case completed = "已完成"
}

enum TaskPriority: String, Codable {
    case low = "低"
    case medium = "中"
    case high = "高"
}

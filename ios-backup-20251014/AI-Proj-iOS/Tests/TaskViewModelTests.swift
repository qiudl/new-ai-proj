//
//  TaskViewModelTests.swift
//  AI-Proj iOS Tests
//
//  Created by: 测试专家 AI
//  Task: #2502 - 测试开发
//  Worktree: wt-ios-test
//  Branch: feature/ios-test
//

import XCTest
import Combine
@testable import AI_Proj_iOS

/// 任务ViewModel单元测试
class TaskViewModelTests: XCTestCase {
    var viewModel: TaskListViewModel!
    var mockRepository: MockTaskRepository!
    var cancellables: Set<AnyCancellable>!

    override func setUp() {
        super.setUp()
        mockRepository = MockTaskRepository()
        viewModel = TaskListViewModel(taskRepository: mockRepository)
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() {
        viewModel = nil
        mockRepository = nil
        cancellables = nil
        super.tearDown()
    }

    // MARK: - Fetch Tasks Tests

    func testFetchTasksSuccess() {
        // Given
        let expectedTasks = [
            Task(id: 1, title: "Task 1", description: "Desc 1", status: .todo, priority: .high, dueDate: nil, createdAt: Date(), updatedAt: Date()),
            Task(id: 2, title: "Task 2", description: "Desc 2", status: .inProgress, priority: .medium, dueDate: nil, createdAt: Date(), updatedAt: Date())
        ]
        mockRepository.tasksToReturn = expectedTasks

        // When
        viewModel.fetchTasks()

        // Then
        XCTAssertEqual(viewModel.tasks.count, 2)
        XCTAssertEqual(viewModel.tasks[0].title, "Task 1")
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
    }

    func testFetchTasksFailure() {
        // Given
        mockRepository.shouldFail = true

        // When
        viewModel.fetchTasks()

        // Then
        XCTAssertTrue(viewModel.tasks.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    // MARK: - Create Task Tests

    func testCreateTaskSuccess() {
        // Given
        let newTask = Task(id: 3, title: "New Task", description: "New Desc", status: .todo, priority: .low, dueDate: nil, createdAt: Date(), updatedAt: Date())
        mockRepository.taskToCreate = newTask

        // When
        viewModel.createTask(title: "New Task", description: "New Desc")

        // Then
        XCTAssertEqual(viewModel.tasks.count, 1)
        XCTAssertEqual(viewModel.tasks[0].title, "New Task")
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Update Task Tests

    func testUpdateTaskStatusSuccess() {
        // Given
        let task = Task(id: 1, title: "Task 1", description: "Desc", status: .todo, priority: .high, dueDate: nil, createdAt: Date(), updatedAt: Date())
        viewModel.tasks = [task]

        let updatedTask = Task(id: 1, title: "Task 1", description: "Desc", status: .completed, priority: .high, dueDate: nil, createdAt: Date(), updatedAt: Date())
        mockRepository.taskToUpdate = updatedTask

        // When
        viewModel.updateTaskStatus(taskId: 1, status: .completed)

        // Then
        XCTAssertEqual(viewModel.tasks[0].status, .completed)
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Delete Task Tests

    func testDeleteTaskSuccess() {
        // Given
        let task = Task(id: 1, title: "Task 1", description: "Desc", status: .todo, priority: .high, dueDate: nil, createdAt: Date(), updatedAt: Date())
        viewModel.tasks = [task]

        // When
        viewModel.deleteTask(taskId: 1)

        // Then
        XCTAssertTrue(viewModel.tasks.isEmpty)
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Filter Tests

    func testApplyFilter() {
        // Given
        XCTAssertEqual(viewModel.selectedFilter, .all)

        // When
        viewModel.applyFilter(.inProgress)

        // Then
        XCTAssertEqual(viewModel.selectedFilter, .inProgress)
    }
}

// MARK: - Mock Repository

class MockTaskRepository: TaskRepository {
    var tasksToReturn: [Task] = []
    var taskToCreate: Task?
    var taskToUpdate: Task?
    var shouldFail = false

    override func fetchTasks(filter: TaskFilter) -> AnyPublisher<[Task], Error> {
        if shouldFail {
            return Fail(error: NetworkError.serverError("Mock error"))
                .eraseToAnyPublisher()
        }
        return Just(tasksToReturn)
            .setFailureType(to: Error.self)
            .eraseToAnyPublisher()
    }

    override func createTask(title: String, description: String?) -> AnyPublisher<Task, Error> {
        if let task = taskToCreate {
            return Just(task)
                .setFailureType(to: Error.self)
                .eraseToAnyPublisher()
        }
        return Fail(error: NetworkError.serverError("Mock error"))
            .eraseToAnyPublisher()
    }

    override func updateTaskStatus(taskId: Int, status: TaskStatus) -> AnyPublisher<Task, Error> {
        if let task = taskToUpdate {
            return Just(task)
                .setFailureType(to: Error.self)
                .eraseToAnyPublisher()
        }
        return Fail(error: NetworkError.serverError("Mock error"))
            .eraseToAnyPublisher()
    }

    override func deleteTask(taskId: Int) -> AnyPublisher<Void, Error> {
        return Just(())
            .setFailureType(to: Error.self)
            .eraseToAnyPublisher()
    }
}

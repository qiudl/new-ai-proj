//
//  TimerRepository.swift
//  AI-Proj iOS
//
//  Created by: 计时模块专家 AI
//  Task: #2497 - 计时功能模块
//  Worktree: wt-ios-timer
//  Branch: feature/ios-timer
//

import Foundation
import Combine

/// 计时器数据仓库 - 负责计时器的数据操作
class TimerRepository {
    // MARK: - Dependencies
    private let networkService: NetworkService
    private let databaseService: DatabaseService

    // MARK: - Initialization
    init(networkService: NetworkService, databaseService: DatabaseService) {
        self.networkService = networkService
        self.databaseService = databaseService
    }

    // MARK: - Timer Operations

    /// 启动计时器
    func startTimer(taskId: Int, description: String?) -> AnyPublisher<TimerRecord, Error> {
        let endpoint = "/timers/start"
        let parameters: [String: Any] = [
            "task_id": taskId,
            "description": description ?? ""
        ]

        return networkService.post(endpoint: endpoint, parameters: parameters)
            .tryMap { (response: TimerResponse) -> TimerRecord in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to start timer")
                }
                guard let timer = response.data else {
                    throw NetworkError.invalidResponse
                }
                return timer
            }
            .handleEvents(receiveOutput: { [weak self] timer in
                // 缓存到本地
                self?.databaseService.saveTimer(timer)
            })
            .eraseToAnyPublisher()
    }

    /// 停止计时器
    func stopTimer(timerId: Int? = nil) -> AnyPublisher<TimerRecord, Error> {
        let endpoint = timerId != nil ? "/timers/\(timerId!)/stop" : "/timers/stop"

        return networkService.post(endpoint: endpoint, parameters: [:])
            .tryMap { (response: TimerResponse) -> TimerRecord in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to stop timer")
                }
                guard let timer = response.data else {
                    throw NetworkError.invalidResponse
                }
                return timer
            }
            .handleEvents(receiveOutput: { [weak self] timer in
                self?.databaseService.updateTimer(timer)
            })
            .eraseToAnyPublisher()
    }

    /// 暂停计时器
    func pauseTimer(timerId: Int) -> AnyPublisher<TimerRecord, Error> {
        let endpoint = "/timers/\(timerId)/pause"

        return networkService.post(endpoint: endpoint, parameters: [:])
            .tryMap { (response: TimerResponse) -> TimerRecord in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to pause timer")
                }
                guard let timer = response.data else {
                    throw NetworkError.invalidResponse
                }
                return timer
            }
            .handleEvents(receiveOutput: { [weak self] timer in
                self?.databaseService.updateTimer(timer)
            })
            .eraseToAnyPublisher()
    }

    /// 恢复计时器
    func resumeTimer(timerId: Int) -> AnyPublisher<TimerRecord, Error> {
        let endpoint = "/timers/\(timerId)/resume"

        return networkService.post(endpoint: endpoint, parameters: [:])
            .tryMap { (response: TimerResponse) -> TimerRecord in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to resume timer")
                }
                guard let timer = response.data else {
                    throw NetworkError.invalidResponse
                }
                return timer
            }
            .handleEvents(receiveOutput: { [weak self] timer in
                self?.databaseService.updateTimer(timer)
            })
            .eraseToAnyPublisher()
    }

    /// 获取当前活跃的计时器
    func getCurrentTimer() -> AnyPublisher<TimerRecord?, Error> {
        let endpoint = "/timers/current"

        return networkService.get(endpoint: endpoint)
            .tryMap { (response: TimerResponse) -> TimerRecord? in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to get current timer")
                }
                return response.data
            }
            .catch { _ -> AnyPublisher<TimerRecord?, Error> in
                // 从本地缓存获取
                return Just(self.databaseService.getCurrentTimer())
                    .setFailureType(to: Error.self)
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }

    /// 获取任务的计时历史
    func getTimerHistory(taskId: Int) -> AnyPublisher<[TimerRecord], Error> {
        let endpoint = "/tasks/\(taskId)/timers"

        return networkService.get(endpoint: endpoint)
            .tryMap { (response: TimerListResponse) -> [TimerRecord] in
                guard response.success else {
                    throw NetworkError.serverError(response.message ?? "Failed to get timer history")
                }
                return response.data ?? []
            }
            .eraseToAnyPublisher()
    }
}

// MARK: - Models

struct TimerRecord: Identifiable, Codable {
    let id: Int
    let taskId: Int
    let startedAt: Date
    let endedAt: Date?
    let pausedAt: Date?
    let totalSeconds: Int
    let description: String?
    let status: TimerStatus

    enum CodingKeys: String, CodingKey {
        case id
        case taskId = "task_id"
        case startedAt = "started_at"
        case endedAt = "ended_at"
        case pausedAt = "paused_at"
        case totalSeconds = "total_seconds"
        case description
        case status
    }
}

enum TimerStatus: String, Codable {
    case running
    case paused
    case stopped
}

struct TimerResponse: Codable {
    let success: Bool
    let data: TimerRecord?
    let message: String?
}

struct TimerListResponse: Codable {
    let success: Bool
    let data: [TimerRecord]?
    let message: String?
}

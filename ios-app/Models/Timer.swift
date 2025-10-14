//
//  Timer.swift
//  AI-Proj iOS
//
//  计时器相关数据模型
//

import Foundation

/// 计时记录模型
struct TimerRecord: Identifiable, Codable, Hashable {
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

/// 计时器状态
enum TimerStatus: String, Codable, CaseIterable {
    case running = "running"
    case paused = "paused"
    case stopped = "stopped"

    var displayName: String {
        switch self {
        case .running: return "运行中"
        case .paused: return "已暂停"
        case .stopped: return "已停止"
        }
    }
}

/// 计时器响应模型
struct TimerResponse: Codable {
    let success: Bool
    let data: TimerRecord?
    let message: String?
}

/// 计时器列表响应模型
struct TimerListResponse: Codable {
    let success: Bool
    let data: [TimerRecord]?
    let message: String?
}

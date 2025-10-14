//
//  DatabaseService.swift
//  AI-Proj iOS
//
//  Created by: 数据库层专家 AI
//  Task: #2501 - 数据库层开发
//  Worktree: wt-ios-database
//  Branch: feature/ios-database
//

import Foundation

/// 数据库服务协议
protocol DatabaseService {
    // Task operations
    func saveTask(_ task: Task)
    func updateTask(_ task: Task)
    func deleteTask(id: Int)
    func getTask(id: Int) -> Task?
    func getAllTasks() -> [Task]

    // Timer operations
    func saveTimer(_ timer: TimerRecord)
    func updateTimer(_ timer: TimerRecord)
    func deleteTimer(id: Int)
    func getCurrentTimer() -> TimerRecord?
    func getTimerHistory(taskId: Int) -> [TimerRecord]

    // Document operations
    func saveDocument(_ document: Document)
    func updateDocument(_ document: Document)
    func deleteDocument(id: Int)
    func getDocument(id: Int) -> Document?
    func getAllDocuments() -> [Document]

    // Cache operations
    func clearCache()
}

/// Realm数据库实现
class RealmDatabaseService: DatabaseService {
    // MARK: - Task Operations

    func saveTask(_ task: Task) {
        // TODO: Implement Realm save
        print("📝 Saving task: \(task.title)")
    }

    func updateTask(_ task: Task) {
        print("✏️ Updating task: \(task.title)")
    }

    func deleteTask(id: Int) {
        print("🗑️ Deleting task: \(id)")
    }

    func getTask(id: Int) -> Task? {
        print("🔍 Getting task: \(id)")
        return nil
    }

    func getAllTasks() -> [Task] {
        print("📋 Getting all tasks")
        return []
    }

    // MARK: - Timer Operations

    func saveTimer(_ timer: TimerRecord) {
        print("⏱️ Saving timer for task: \(timer.taskId)")
    }

    func updateTimer(_ timer: TimerRecord) {
        print("⏱️ Updating timer: \(timer.id)")
    }

    func deleteTimer(id: Int) {
        print("🗑️ Deleting timer: \(id)")
    }

    func getCurrentTimer() -> TimerRecord? {
        print("⏱️ Getting current timer")
        return nil
    }

    func getTimerHistory(taskId: Int) -> [TimerRecord] {
        print("📊 Getting timer history for task: \(taskId)")
        return []
    }

    // MARK: - Document Operations

    func saveDocument(_ document: Document) {
        print("📄 Saving document: \(document.title)")
    }

    func updateDocument(_ document: Document) {
        print("✏️ Updating document: \(document.title)")
    }

    func deleteDocument(id: Int) {
        print("🗑️ Deleting document: \(id)")
    }

    func getDocument(id: Int) -> Document? {
        print("🔍 Getting document: \(id)")
        return nil
    }

    func getAllDocuments() -> [Document] {
        print("📚 Getting all documents")
        return []
    }

    // MARK: - Cache Operations

    func clearCache() {
        print("🧹 Clearing cache")
    }
}

/// UserDefaults缓存服务
class CacheService {
    private let defaults = UserDefaults.standard
    private let cacheKeyPrefix = "cache_"

    func set<T: Codable>(_ value: T, forKey key: String, expirationMinutes: Int = 30) {
        let cacheKey = cacheKeyPrefix + key
        let expirationDate = Date().addingTimeInterval(TimeInterval(expirationMinutes * 60))

        let cacheData = CacheData(value: value, expirationDate: expirationDate)

        if let encoded = try? JSONEncoder().encode(cacheData) {
            defaults.set(encoded, forKey: cacheKey)
        }
    }

    func get<T: Codable>(forKey key: String, type: T.Type) -> T? {
        let cacheKey = cacheKeyPrefix + key

        guard let data = defaults.data(forKey: cacheKey) else {
            return nil
        }

        guard let cacheData = try? JSONDecoder().decode(CacheData<T>.self, from: data) else {
            return nil
        }

        // Check if expired
        if Date() > cacheData.expirationDate {
            remove(forKey: key)
            return nil
        }

        return cacheData.value
    }

    func remove(forKey key: String) {
        let cacheKey = cacheKeyPrefix + key
        defaults.removeObject(forKey: cacheKey)
    }

    func clearAll() {
        let keys = defaults.dictionaryRepresentation().keys
        keys.filter { $0.hasPrefix(cacheKeyPrefix) }
            .forEach { defaults.removeObject(forKey: $0) }
    }
}

// MARK: - Cache Data Model

struct CacheData<T: Codable>: Codable {
    let value: T
    let expirationDate: Date
}

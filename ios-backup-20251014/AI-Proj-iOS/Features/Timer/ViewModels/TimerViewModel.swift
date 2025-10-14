//
//  TimerViewModel.swift
//  AI-Proj iOS
//
//  Created by: 计时模块专家 AI
//  Task: #2497 - 计时功能模块
//  Worktree: wt-ios-timer
//  Branch: feature/ios-timer
//

import SwiftUI
import Combine

/// 计时器视图模型 - MVVM架构
class TimerViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var currentTimer: TimerRecord?
    @Published var elapsedTime: TimeInterval = 0
    @Published var isRunning = false
    @Published var isPaused = false
    @Published var errorMessage: String?
    @Published var timerHistory: [TimerRecord] = []

    // MARK: - Dependencies
    private let timerRepository: TimerRepository
    private var cancellables = Set<AnyCancellable>()
    private var updateTimer: Timer?

    // MARK: - Initialization
    init(timerRepository: TimerRepository = DIContainer.shared.makeTimerRepository()) {
        self.timerRepository = timerRepository
        loadCurrentTimer()
    }

    deinit {
        stopUpdateTimer()
    }

    // MARK: - Public Methods

    /// 加载当前活跃的计时器
    func loadCurrentTimer() {
        timerRepository.getCurrentTimer()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] timer in
                self?.currentTimer = timer
                if let timer = timer {
                    self?.updateTimerState(timer)
                }
            }
            .store(in: &cancellables)
    }

    /// 启动计时器
    func startTimer(taskId: Int, description: String? = nil) {
        timerRepository.startTimer(taskId: taskId, description: description)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] timer in
                self?.currentTimer = timer
                self?.updateTimerState(timer)
            }
            .store(in: &cancellables)
    }

    /// 停止计时器
    func stopTimer() {
        guard let timer = currentTimer else { return }

        timerRepository.stopTimer(timerId: timer.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] stoppedTimer in
                self?.currentTimer = nil
                self?.isRunning = false
                self?.isPaused = false
                self?.elapsedTime = 0
                self?.stopUpdateTimer()
            }
            .store(in: &cancellables)
    }

    /// 暂停计时器
    func pauseTimer() {
        guard let timer = currentTimer else { return }

        timerRepository.pauseTimer(timerId: timer.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] pausedTimer in
                self?.currentTimer = pausedTimer
                self?.isPaused = true
                self?.isRunning = false
                self?.stopUpdateTimer()
            }
            .store(in: &cancellables)
    }

    /// 恢复计时器
    func resumeTimer() {
        guard let timer = currentTimer else { return }

        timerRepository.resumeTimer(timerId: timer.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] resumedTimer in
                self?.currentTimer = resumedTimer
                self?.isPaused = false
                self?.isRunning = true
                self?.startUpdateTimer()
            }
            .store(in: &cancellables)
    }

    /// 加载计时历史
    func loadTimerHistory(taskId: Int) {
        timerRepository.getTimerHistory(taskId: taskId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] history in
                self?.timerHistory = history
            }
            .store(in: &cancellables)
    }

    // MARK: - Private Methods

    private func updateTimerState(_ timer: TimerRecord) {
        switch timer.status {
        case .running:
            isRunning = true
            isPaused = false
            elapsedTime = TimeInterval(timer.totalSeconds)
            startUpdateTimer()
        case .paused:
            isRunning = false
            isPaused = true
            elapsedTime = TimeInterval(timer.totalSeconds)
            stopUpdateTimer()
        case .stopped:
            isRunning = false
            isPaused = false
            elapsedTime = 0
            stopUpdateTimer()
        }
    }

    private func startUpdateTimer() {
        stopUpdateTimer()
        updateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            if self?.isRunning == true {
                self?.elapsedTime += 1
            }
        }
    }

    private func stopUpdateTimer() {
        updateTimer?.invalidate()
        updateTimer = nil
    }
}

// MARK: - Helper Extensions

extension TimeInterval {
    var formattedTime: String {
        let hours = Int(self) / 3600
        let minutes = (Int(self) % 3600) / 60
        let seconds = Int(self) % 60

        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
}

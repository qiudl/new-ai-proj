//
//  TimerView.swift
//  AI-Proj iOS
//
//  Created by: 计时模块专家 AI
//  Task: #2497 - 计时功能模块
//  Worktree: wt-ios-timer
//  Branch: feature/ios-timer
//

import SwiftUI

/// 计时器视图 - 用于任务计时
struct TimerView: View {
    @StateObject private var viewModel = TimerViewModel()
    let taskId: Int
    let taskTitle: String

    var body: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            // 任务标题
            Text(taskTitle)
                .font(AppTheme.Typography.title2)
                .foregroundColor(AppTheme.Colors.textPrimary)
                .multilineTextAlignment(.center)
                .padding(.top, AppTheme.Spacing.lg)

            // 计时显示
            timerDisplay

            // 控制按钮
            timerControls

            // 计时历史
            if !viewModel.timerHistory.isEmpty {
                timerHistorySection
            }

            Spacer()
        }
        .padding()
        .navigationTitle("计时器")
        .onAppear {
            viewModel.loadTimerHistory(taskId: taskId)
        }
    }

    // MARK: - Timer Display

    private var timerDisplay: some View {
        ZStack {
            Circle()
                .stroke(Color.gray.opacity(0.2), lineWidth: 12)
                .frame(width: 250, height: 250)

            Circle()
                .trim(from: 0, to: progressValue)
                .stroke(
                    viewModel.isRunning ? AppTheme.Colors.primary :
                    viewModel.isPaused ? AppTheme.Colors.warning : AppTheme.Colors.secondary,
                    style: StrokeStyle(lineWidth: 12, lineCap: .round)
                )
                .frame(width: 250, height: 250)
                .rotationEffect(.degrees(-90))
                .animation(.linear(duration: 1.0), value: progressValue)

            VStack(spacing: 8) {
                Text(viewModel.elapsedTime.formattedTime)
                    .font(.system(size: 48, weight: .bold, design: .monospaced))
                    .foregroundColor(AppTheme.Colors.textPrimary)

                Text(statusText)
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(AppTheme.Colors.textSecondary)
            }
        }
        .padding(AppTheme.Spacing.xl)
    }

    // MARK: - Timer Controls

    private var timerControls: some View {
        HStack(spacing: AppTheme.Spacing.md) {
            if !viewModel.isRunning && !viewModel.isPaused {
                // 开始按钮
                Button(action: {
                    viewModel.startTimer(taskId: taskId)
                }) {
                    Label("开始", systemImage: "play.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(AppTheme.Colors.primary)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
            } else {
                // 暂停/恢复按钮
                Button(action: {
                    if viewModel.isPaused {
                        viewModel.resumeTimer()
                    } else {
                        viewModel.pauseTimer()
                    }
                }) {
                    Label(
                        viewModel.isPaused ? "恢复" : "暂停",
                        systemImage: viewModel.isPaused ? "play.fill" : "pause.fill"
                    )
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(viewModel.isPaused ? AppTheme.Colors.success : AppTheme.Colors.warning)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }

                // 停止按钮
                Button(action: {
                    viewModel.stopTimer()
                }) {
                    Label("停止", systemImage: "stop.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(AppTheme.Colors.danger)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Timer History

    private var timerHistorySection: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            Text("计时历史")
                .font(AppTheme.Typography.headline)
                .padding(.horizontal)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(viewModel.timerHistory) { record in
                        TimerHistoryCard(record: record)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Computed Properties

    private var progressValue: CGFloat {
        let maxSeconds: TimeInterval = 3600 // 1小时为一圈
        return min(viewModel.elapsedTime / maxSeconds, 1.0)
    }

    private var statusText: String {
        if viewModel.isRunning {
            return "运行中"
        } else if viewModel.isPaused {
            return "已暂停"
        } else {
            return "未开始"
        }
    }
}

// MARK: - Timer History Card

struct TimerHistoryCard: View {
    let record: TimerRecord

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(record.description ?? "计时记录")
                    .font(AppTheme.Typography.body)
                    .foregroundColor(AppTheme.Colors.textPrimary)

                Text(formatDate(record.startedAt))
                    .font(AppTheme.Typography.caption)
                    .foregroundColor(AppTheme.Colors.textSecondary)
            }

            Spacer()

            Text(TimeInterval(record.totalSeconds).formattedTime)
                .font(AppTheme.Typography.headline)
                .foregroundColor(AppTheme.Colors.primary)
        }
        .padding()
        .background(AppTheme.Colors.surface)
        .cornerRadius(8)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.string(from: date)
    }
}

// MARK: - Preview

struct TimerView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            TimerView(taskId: 1, taskTitle: "开发计时功能模块")
        }
    }
}

//
//  TaskListView.swift
//  AI-Proj iOS
//
//  Created by: 任务模块专家 AI
//  Task: #2496 - 任务管理模块
//

import SwiftUI

/// 任务列表视图 - 主界面
struct TaskListView: View {
    @StateObject private var viewModel = TaskListViewModel()
    @State private var showingAddTask = false
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading && viewModel.tasks.isEmpty {
                    ProgressView("加载中...")
                } else {
                    taskListContent
                }
            }
            .navigationTitle("我的任务")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddTask = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddTask) {
                AddTaskView(viewModel: viewModel)
            }
        }
    }
    
    private var taskListContent: some View {
        VStack(spacing: 0) {
            // 筛选器
            filterBar
            
            // 任务列表
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.tasks) { task in
                        TaskCard(task: convertTask(task)) {
                            // 导航到任务详情
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .refreshable {
                viewModel.fetchTasks()
            }
        }
    }
    
    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(TaskFilter.allCases, id: \.self) { filter in
                    FilterChip(
                        title: filter.rawValue,
                        isSelected: viewModel.selectedFilter == filter
                    ) {
                        viewModel.applyFilter(filter)
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
        .background(Color.gray.opacity(0.1))
    }
    
    private func convertTask(_ task: Task) -> TaskModel {
        TaskModel(
            id: task.id,
            title: task.title,
            description: task.description,
            status: convertStatus(task.status),
            dueDate: task.dueDate
        )
    }
    
    private func convertStatus(_ status: TaskStatus) -> TaskModel.TaskStatus {
        switch status {
        case .todo: return .todo
        case .inProgress: return .inProgress
        case .completed: return .completed
        }
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

//
//  WorktreeListView.swift
//  AI-Proj iOS
//
//  Created by: Worktree模块专家 AI
//  Task: #2499 - Worktree管理模块
//

import SwiftUI

/// Worktree列表视图
struct WorktreeListView: View {
    @State private var worktrees: [WorktreeModel] = []

    var body: some View {
        NavigationView {
            List(worktrees) { worktree in
                WorktreeRow(worktree: worktree)
            }
            .navigationTitle("Worktree管理")
        }
    }
}

struct WorktreeRow: View {
    let worktree: WorktreeModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "folder.badge.gearshape")
                    .foregroundColor(AppTheme.Colors.primary)
                Text(worktree.branch)
                    .font(AppTheme.Typography.headline)
                if worktree.isMain {
                    Text("Main")
                        .font(AppTheme.Typography.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppTheme.Colors.success.opacity(0.2))
                        .cornerRadius(4)
                }
            }

            Text(worktree.path)
                .font(AppTheme.Typography.caption)
                .foregroundColor(AppTheme.Colors.textSecondary)

            Text("Commit: \(worktree.commitHash.prefix(7))")
                .font(AppTheme.Typography.caption)
                .foregroundColor(AppTheme.Colors.textSecondary)
        }
        .padding(.vertical, 4)
    }
}

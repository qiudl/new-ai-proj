//
//  DocumentListView.swift
//  AI-Proj iOS
//
//  Created by: 文档模块专家 AI
//  Task: #2498 - 文档管理模块
//  Worktree: wt-ios-document
//  Branch: feature/ios-document
//

import SwiftUI

/// 文档列表视图
struct DocumentListView: View {
    @StateObject private var viewModel = DocumentViewModel()
    @State private var showingAddDocument = false
    @State private var selectedDocument: Document?

    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading && viewModel.documents.isEmpty {
                    ProgressView("加载中...")
                } else {
                    documentListContent
                }
            }
            .navigationTitle("我的文档")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddDocument = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .searchable(text: $viewModel.searchQuery, prompt: "搜索文档")
            .sheet(isPresented: $showingAddDocument) {
                DocumentEditorView(viewModel: viewModel, mode: .create)
            }
            .sheet(item: $selectedDocument) { document in
                DocumentDetailView(document: document, viewModel: viewModel)
            }
        }
    }

    private var documentListContent: some View {
        VStack(spacing: 0) {
            if viewModel.filteredDocuments.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.filteredDocuments) { document in
                            DocumentCard(document: document) {
                                selectedDocument = document
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                }
                .refreshable {
                    viewModel.fetchDocuments()
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: AppTheme.Spacing.md) {
            Image(systemName: "doc.text")
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text("暂无文档")
                .font(AppTheme.Typography.title2)
                .foregroundColor(AppTheme.Colors.textSecondary)

            if !viewModel.searchQuery.isEmpty {
                Text("没有找到与\"\(viewModel.searchQuery)\"相关的文档")
                    .font(AppTheme.Typography.body)
                    .foregroundColor(AppTheme.Colors.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Document Card

struct DocumentCard: View {
    let document: Document
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
                // 文档标题
                HStack {
                    Image(systemName: iconName)
                        .foregroundColor(AppTheme.Colors.primary)

                    Text(document.title)
                        .font(AppTheme.Typography.headline)
                        .foregroundColor(AppTheme.Colors.textPrimary)
                        .lineLimit(1)

                    Spacer()

                    statusBadge
                }

                // 文档预览
                Text(document.content)
                    .font(AppTheme.Typography.body)
                    .foregroundColor(AppTheme.Colors.textSecondary)
                    .lineLimit(2)

                // 底部信息
                HStack {
                    if let ownerName = document.ownerName {
                        Label(ownerName, systemImage: "person.circle")
                            .font(AppTheme.Typography.caption)
                            .foregroundColor(AppTheme.Colors.textSecondary)
                    }

                    Spacer()

                    Text(formatDate(document.updatedAt))
                        .font(AppTheme.Typography.caption)
                        .foregroundColor(AppTheme.Colors.textSecondary)
                }
            }
            .padding(AppTheme.Spacing.md)
            .background(AppTheme.Colors.surface)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
        }
    }

    private var iconName: String {
        switch document.type {
        case .markdown:
            return "doc.richtext"
        case .text:
            return "doc.text"
        case .pdf:
            return "doc.fill"
        }
    }

    private var statusBadge: some View {
        Text(statusText)
            .font(AppTheme.Typography.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(6)
    }

    private var statusText: String {
        switch document.status {
        case .draft: return "草稿"
        case .published: return "已发布"
        case .archived: return "已归档"
        }
    }

    private var statusColor: Color {
        switch document.status {
        case .draft: return AppTheme.Colors.warning
        case .published: return AppTheme.Colors.success
        case .archived: return AppTheme.Colors.secondary
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

// MARK: - Preview

struct DocumentListView_Previews: PreviewProvider {
    static var previews: some View {
        DocumentListView()
    }
}

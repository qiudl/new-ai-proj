//
//  DocumentDetailView.swift
//  AI-Proj iOS
//
//  Created by: 文档模块专家 AI
//  Task: #2498 - 文档管理模块
//  Worktree: wt-ios-document
//  Branch: feature/ios-document
//

import SwiftUI

/// 文档详情视图
struct DocumentDetailView: View {
    let document: Document
    @ObservedObject var viewModel: DocumentViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var isEditing = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: AppTheme.Spacing.lg) {
                    // 文档头部信息
                    documentHeader

                    Divider()

                    // 文档内容
                    documentContent

                    Spacer(minLength: AppTheme.Spacing.xl)
                }
                .padding()
            }
            .navigationTitle("文档详情")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("关闭") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("编辑") {
                        isEditing = true
                    }
                }
            }
            .sheet(isPresented: $isEditing) {
                DocumentEditorView(
                    viewModel: viewModel,
                    mode: .edit(document)
                )
            }
        }
    }

    private var documentHeader: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            // 标题
            Text(document.title)
                .font(AppTheme.Typography.title1)
                .foregroundColor(AppTheme.Colors.textPrimary)

            // 元数据
            HStack {
                if let ownerName = document.ownerName {
                    Label(ownerName, systemImage: "person.circle")
                        .font(AppTheme.Typography.caption)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("版本 v\(document.version)")
                        .font(AppTheme.Typography.caption)

                    Text("更新于 \(formatDate(document.updatedAt))")
                        .font(AppTheme.Typography.caption)
                }
            }
            .foregroundColor(AppTheme.Colors.textSecondary)

            // 状态标签
            HStack {
                statusBadge
                typeBadge
            }
        }
    }

    private var documentContent: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            Text("内容")
                .font(AppTheme.Typography.headline)
                .foregroundColor(AppTheme.Colors.textPrimary)

            Text(document.content)
                .font(AppTheme.Typography.body)
                .foregroundColor(AppTheme.Colors.textPrimary)
                .textSelection(.enabled)
        }
    }

    private var statusBadge: some View {
        HStack {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            Text(statusText)
                .font(AppTheme.Typography.caption)
                .foregroundColor(AppTheme.Colors.textPrimary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(statusColor.opacity(0.1))
        .cornerRadius(16)
    }

    private var typeBadge: some View {
        Text(typeText)
            .font(AppTheme.Typography.caption)
            .foregroundColor(AppTheme.Colors.textSecondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.gray.opacity(0.1))
            .cornerRadius(16)
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

    private var typeText: String {
        switch document.type {
        case .markdown: return "Markdown"
        case .text: return "Text"
        case .pdf: return "PDF"
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Document Editor View

struct DocumentEditorView: View {
    @ObservedObject var viewModel: DocumentViewModel
    let mode: EditorMode
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var content = ""

    enum EditorMode {
        case create
        case edit(Document)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("标题") {
                    TextField("输入文档标题", text: $title)
                }

                Section("内容") {
                    TextEditor(text: $content)
                        .frame(minHeight: 300)
                }
            }
            .navigationTitle(mode.isEdit ? "编辑文档" : "新建文档")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("保存") {
                        saveDocument()
                    }
                    .disabled(title.isEmpty || content.isEmpty)
                }
            }
            .onAppear {
                if case .edit(let document) = mode {
                    title = document.title
                    content = document.content
                }
            }
        }
    }

    private func saveDocument() {
        switch mode {
        case .create:
            viewModel.createDocument(title: title, content: content, projectId: 1)
        case .edit(let document):
            viewModel.updateDocument(id: document.id, title: title, content: content)
        }
        dismiss()
    }
}

extension DocumentEditorView.EditorMode {
    var isEdit: Bool {
        if case .edit = self {
            return true
        }
        return false
    }
}

//
//  DocumentViewModel.swift
//  AI-Proj iOS
//
//  Created by: 文档模块专家 AI
//  Task: #2498 - 文档管理模块
//  Worktree: wt-ios-document
//  Branch: feature/ios-document
//

import SwiftUI
import Combine

/// 文档视图模型 - MVVM架构
class DocumentViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var documents: [Document] = []
    @Published var currentDocument: Document?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var searchQuery = ""
    @Published var filteredDocuments: [Document] = []

    // MARK: - Dependencies
    private let documentRepository: DocumentRepository
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init(documentRepository: DocumentRepository = DIContainer.shared.makeDocumentRepository()) {
        self.documentRepository = documentRepository
        setupSearch()
        fetchDocuments()
    }

    // MARK: - Public Methods

    /// 获取文档列表
    func fetchDocuments(projectId: Int? = nil) {
        isLoading = true
        errorMessage = nil

        documentRepository.getDocuments(projectId: projectId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] documents in
                self?.documents = documents
                self?.filteredDocuments = documents
            }
            .store(in: &cancellables)
    }

    /// 获取文档详情
    func loadDocument(id: Int) {
        isLoading = true
        errorMessage = nil

        documentRepository.getDocument(id: id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] document in
                self?.currentDocument = document
            }
            .store(in: &cancellables)
    }

    /// 获取任务关联的文档
    func fetchTaskDocuments(taskId: Int) {
        isLoading = true
        errorMessage = nil

        documentRepository.getTaskDocuments(taskId: taskId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] documents in
                self?.documents = documents
                self?.filteredDocuments = documents
            }
            .store(in: &cancellables)
    }

    /// 创建文档
    func createDocument(title: String, content: String, projectId: Int?, taskId: Int? = nil) {
        documentRepository.createDocument(title: title, content: content, projectId: projectId, taskId: taskId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] newDocument in
                self?.documents.insert(newDocument, at: 0)
                self?.filteredDocuments = self?.documents ?? []
            }
            .store(in: &cancellables)
    }

    /// 更新文档
    func updateDocument(id: Int, title: String?, content: String?) {
        documentRepository.updateDocument(id: id, title: title, content: content)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] updatedDocument in
                if let index = self?.documents.firstIndex(where: { $0.id == id }) {
                    self?.documents[index] = updatedDocument
                    self?.filteredDocuments = self?.documents ?? []
                }
                self?.currentDocument = updatedDocument
            }
            .store(in: &cancellables)
    }

    /// 删除文档
    func deleteDocument(id: Int) {
        documentRepository.deleteDocument(id: id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] _ in
                self?.documents.removeAll { $0.id == id }
                self?.filteredDocuments = self?.documents ?? []
            }
            .store(in: &cancellables)
    }

    /// 搜索文档
    func searchDocuments(projectId: Int? = nil) {
        guard !searchQuery.isEmpty else {
            filteredDocuments = documents
            return
        }

        documentRepository.searchDocuments(query: searchQuery, projectId: projectId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.errorMessage = error.localizedDescription
                }
            } receiveValue: { [weak self] results in
                self?.filteredDocuments = results
            }
            .store(in: &cancellables)
    }

    // MARK: - Private Methods

    private func setupSearch() {
        $searchQuery
            .debounce(for: .milliseconds(500), scheduler: DispatchQueue.main)
            .sink { [weak self] query in
                if query.isEmpty {
                    self?.filteredDocuments = self?.documents ?? []
                } else {
                    self?.searchDocuments()
                }
            }
            .store(in: &cancellables)
    }
}

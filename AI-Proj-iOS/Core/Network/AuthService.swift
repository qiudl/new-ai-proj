//
//  AuthService.swift
//  AI-Proj iOS
//
//  Created by: 网络层专家 AI
//  Task: #2500 - 网络层开发
//  Worktree: wt-ios-network
//  Branch: feature/ios-network
//

import Foundation
import Combine

/// 认证服务
class AuthService {
    private let networkService: NetworkService
    private let tokenKey = "auth_token"

    init(networkService: NetworkService) {
        self.networkService = networkService
        loadSavedToken()
    }

    // MARK: - Authentication

    /// 登录
    func login(username: String, password: String) -> AnyPublisher<AuthResponse, Error> {
        let parameters: [String: Any] = [
            "username": username,
            "password": password
        ]

        return networkService.post(endpoint: "/auth/login", parameters: parameters)
            .handleEvents(receiveOutput: { [weak self] response in
                self?.saveToken(response.token)
                self?.networkService.setAuthToken(response.token)
            })
            .eraseToAnyPublisher()
    }

    /// 登出
    func logout() {
        clearToken()
        networkService.setAuthToken(nil)
    }

    /// 刷新Token
    func refreshToken() -> AnyPublisher<AuthResponse, Error> {
        return networkService.post(endpoint: "/auth/refresh", parameters: [:])
            .handleEvents(receiveOutput: { [weak self] response in
                self?.saveToken(response.token)
                self?.networkService.setAuthToken(response.token)
            })
            .eraseToAnyPublisher()
    }

    // MARK: - Token Management

    private func saveToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: tokenKey)
    }

    private func loadSavedToken() {
        if let token = UserDefaults.standard.string(forKey: tokenKey) {
            networkService.setAuthToken(token)
        }
    }

    private func clearToken() {
        UserDefaults.standard.removeObject(forKey: tokenKey)
    }

    func isAuthenticated() -> Bool {
        return UserDefaults.standard.string(forKey: tokenKey) != nil
    }
}

// MARK: - Models

struct AuthResponse: Codable {
    let token: String
    let userId: Int
    let username: String
    let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case token
        case userId = "user_id"
        case username
        case expiresIn = "expires_in"
    }
}

/// 用户会话
class UserSession {
    static let shared = UserSession()

    private(set) var isLoggedIn = false
    private(set) var currentUserId: Int?
    private(set) var currentUsername: String?

    private init() {}

    func login(userId: Int, username: String) {
        self.isLoggedIn = true
        self.currentUserId = userId
        self.currentUsername = username
    }

    func logout() {
        self.isLoggedIn = false
        self.currentUserId = nil
        self.currentUsername = nil
    }
}

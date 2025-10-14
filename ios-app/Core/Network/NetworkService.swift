//
//  NetworkService.swift
//  AI-Proj iOS
//
//  Created by: 网络层专家 AI
//  Task: #2500 - 网络层开发
//  Worktree: wt-ios-network
//  Branch: feature/ios-network
//

import Foundation
import Combine

/// 网络服务 - 封装所有网络请求
class NetworkService {
    private let baseURL: String
    private let session: URLSession
    private var authToken: String?

    init(baseURL: String, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    // MARK: - Authentication

    func setAuthToken(_ token: String?) {
        self.authToken = token
    }

    // MARK: - HTTP Methods

    /// GET请求
    func get<T: Decodable>(endpoint: String, parameters: [String: Any]? = nil) -> AnyPublisher<T, Error> {
        guard let url = buildURL(endpoint: endpoint, parameters: parameters) else {
            return Fail(error: NetworkError.invalidURL).eraseToAnyPublisher()
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        addHeaders(to: &request)

        return performRequest(request)
    }

    /// POST请求
    func post<T: Decodable>(endpoint: String, parameters: [String: Any]) -> AnyPublisher<T, Error> {
        guard let url = buildURL(endpoint: endpoint) else {
            return Fail(error: NetworkError.invalidURL).eraseToAnyPublisher()
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        addHeaders(to: &request)

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: parameters)
        } catch {
            return Fail(error: NetworkError.encodingFailed).eraseToAnyPublisher()
        }

        return performRequest(request)
    }

    /// PUT请求
    func put<T: Decodable>(endpoint: String, parameters: [String: Any]) -> AnyPublisher<T, Error> {
        guard let url = buildURL(endpoint: endpoint) else {
            return Fail(error: NetworkError.invalidURL).eraseToAnyPublisher()
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        addHeaders(to: &request)

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: parameters)
        } catch {
            return Fail(error: NetworkError.encodingFailed).eraseToAnyPublisher()
        }

        return performRequest(request)
    }

    /// DELETE请求
    func delete<T: Decodable>(endpoint: String) -> AnyPublisher<T, Error> {
        guard let url = buildURL(endpoint: endpoint) else {
            return Fail(error: NetworkError.invalidURL).eraseToAnyPublisher()
        }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addHeaders(to: &request)

        return performRequest(request)
    }

    // MARK: - Private Methods

    private func buildURL(endpoint: String, parameters: [String: Any]? = nil) -> URL? {
        var urlString = baseURL + endpoint

        if let parameters = parameters, !parameters.isEmpty {
            let queryItems = parameters.map { key, value in
                URLQueryItem(name: key, value: "\(value)")
            }
            var components = URLComponents(string: urlString)
            components?.queryItems = queryItems
            urlString = components?.url?.absoluteString ?? urlString
        }

        return URL(string: urlString)
    }

    private func addHeaders(to request: inout URLRequest) {
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    private func performRequest<T: Decodable>(_ request: URLRequest) -> AnyPublisher<T, Error> {
        return session.dataTaskPublisher(for: request)
            .tryMap { output in
                guard let httpResponse = output.response as? HTTPURLResponse else {
                    throw NetworkError.invalidResponse
                }

                guard (200...299).contains(httpResponse.statusCode) else {
                    throw NetworkError.httpError(httpResponse.statusCode)
                }

                return output.data
            }
            .decode(type: T.self, decoder: JSONDecoder.apiDecoder)
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
}

// MARK: - Network Error

enum NetworkError: LocalizedError {
    case invalidURL
    case invalidResponse
    case encodingFailed
    case decodingFailed
    case httpError(Int)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "无效的URL"
        case .invalidResponse:
            return "无效的响应"
        case .encodingFailed:
            return "编码失败"
        case .decodingFailed:
            return "解码失败"
        case .httpError(let code):
            return "HTTP错误: \(code)"
        case .serverError(let message):
            return "服务器错误: \(message)"
        }
    }
}

// MARK: - JSONDecoder Extension

extension JSONDecoder {
    static var apiDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }
}

//
//  AI_Proj_iOS_App.swift
//  AI-Proj iOS
//
//  App Entry Point
//

import SwiftUI

@main
struct AI_Proj_iOS_App: App {
    // Dependency Injection Container
    @StateObject private var diContainer = DIContainer()

    // App Coordinator
    @StateObject private var coordinator = AppCoordinator()

    var body: some Scene {
        WindowGroup {
            coordinator.start()
                .environmentObject(diContainer)
                .environmentObject(coordinator)
        }
    }
}

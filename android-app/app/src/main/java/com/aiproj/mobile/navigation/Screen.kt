package com.aiproj.mobile.navigation

/**
 * 应用路由定义
 */
sealed class Screen(val route: String) {
    // 登录
    object Login : Screen("login")

    // 主页面（带底部导航栏）
    object Main : Screen("main")

    // Dashboard
    object Dashboard : Screen("dashboard")

    // 任务列表
    object TaskList : Screen("task_list")

    // 任务详情
    object TaskDetail : Screen("task_detail/{taskId}") {
        fun createRoute(taskId: Int) = "task_detail/$taskId"
    }

    // 任务创建/编辑
    object TaskEdit : Screen("task_edit?taskId={taskId}") {
        fun createRoute(taskId: Int? = null) = if (taskId != null) {
            "task_edit?taskId=$taskId"
        } else {
            "task_edit"
        }
    }

    // 项目列表
    object ProjectList : Screen("project_list")

    // 项目详情
    object ProjectDetail : Screen("project_detail/{projectId}") {
        fun createRoute(projectId: Int) = "project_detail/$projectId"
    }

    // 工时记录
    object Timer : Screen("timer")

    // 个人中心
    object Profile : Screen("profile")
}

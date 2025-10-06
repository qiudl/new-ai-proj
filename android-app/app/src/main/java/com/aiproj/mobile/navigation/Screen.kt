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

    // 数据统计
    object Analytics : Screen("analytics")

    // 任务状态详情
    object TaskStatusDetail : Screen("task_status_detail/{status}/{startDate}/{endDate}/{projectId}") {
        fun createRoute(
            status: String,
            startDate: String,
            endDate: String,
            projectId: Int? = null
        ) = "task_status_detail/$status/$startDate/$endDate/${projectId ?: 0}"
    }

    // 文档列表
    object DocumentList : Screen("document_list/{taskId}") {
        fun createRoute(taskId: Int) = "document_list/$taskId"
    }

    // 文档查看
    object DocumentViewer : Screen("document_viewer/{taskId}/{documentId}") {
        fun createRoute(taskId: Int, documentId: Int) = "document_viewer/$taskId/$documentId"
    }

    // 文档编辑
    object DocumentEditor : Screen("document_editor/{taskId}?documentId={documentId}") {
        fun createRoute(taskId: Int, documentId: Int? = null) = if (documentId != null) {
            "document_editor/$taskId?documentId=$documentId"
        } else {
            "document_editor/$taskId"
        }
    }

    // ========== 笔记模块 ==========

    // 笔记列表
    object NoteList : Screen("note_list")

    // 笔记详情
    object NoteDetail : Screen("note_detail/{noteId}") {
        fun createRoute(noteId: Int) = "note_detail/$noteId"
    }

    // 笔记创建/编辑
    object NoteEditor : Screen("note_editor?noteId={noteId}") {
        fun createRoute(noteId: Int? = null) = if (noteId != null) {
            "note_editor?noteId=$noteId"
        } else {
            "note_editor"
        }
    }
}

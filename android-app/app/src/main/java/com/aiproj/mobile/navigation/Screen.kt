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

    // 计时器历史记录
    object TimerHistory : Screen("timer_history")

    // 番茄钟
    object Pomodoro : Screen("pomodoro")

    // 3日效率对比
    object EfficiencyComparison : Screen("efficiency_comparison")

    // 个人中心
    object Profile : Screen("profile")

    // 数据统计
    object Analytics : Screen("analytics")

    // ========== Dashboard 详情页 ==========

    // 今日任务详情
    object TodayTasksDetail : Screen("today_tasks_detail?date={date}&projectId={projectId}") {
        fun createRoute(date: String? = null, projectId: Int? = null): String {
            val params = buildList {
                date?.let { add("date=$it") }
                projectId?.let { add("projectId=$it") }
            }.joinToString("&")
            return if (params.isEmpty()) "today_tasks_detail" else "today_tasks_detail?$params"
        }
    }

    // 工作时长详情
    object WorkTimeDetail : Screen("work_time_detail?projectId={projectId}") {
        fun createRoute(projectId: Int? = null): String {
            return projectId?.let { "work_time_detail?projectId=$it" } ?: "work_time_detail"
        }
    }

    // 今日工作时长详情
    object TodayWorkTimeDetail : Screen("today_work_time_detail?date={date}") {
        fun createRoute(date: String? = null): String {
            return date?.let { "today_work_time_detail?date=$it" } ?: "today_work_time_detail"
        }
    }

    // 活跃项目详情
    object ActiveProjectsDetail : Screen("active_projects_detail")

    // 待办任务详情
    object PendingTasksDetail : Screen("pending_tasks_detail?projectId={projectId}") {
        fun createRoute(projectId: Int? = null): String {
            return projectId?.let { "pending_tasks_detail?projectId=$it" } ?: "pending_tasks_detail"
        }
    }

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

    // 文档版本历史
    object DocumentVersionHistory : Screen("document_version_history/{projectId}/{taskId}/{documentId}") {
        fun createRoute(projectId: Int, taskId: Int, documentId: Int) =
            "document_version_history/$projectId/$taskId/$documentId"
    }

    // 文档版本对比
    object DocumentVersionComparison : Screen("document_version_comparison/{projectId}/{taskId}/{documentId}/{version1}/{version2}") {
        fun createRoute(
            projectId: Int,
            taskId: Int,
            documentId: Int,
            version1: Int,
            version2: Int
        ) = "document_version_comparison/$projectId/$taskId/$documentId/$version1/$version2"
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

    // ========== AI功能模块 ==========

    // AI文档生成
    object AIDocumentGenerate : Screen("ai_document_generate/{taskId}") {
        fun createRoute(taskId: Int) = "ai_document_generate/$taskId"
    }

    // AI子任务生成
    object AISubtaskGenerate : Screen("ai_subtask_generate/{taskId}") {
        fun createRoute(taskId: Int) = "ai_subtask_generate/$taskId"
    }

    // AI描述生成
    object AIDescriptionGenerate : Screen("ai_description_generate/{taskId}") {
        fun createRoute(taskId: Int) = "ai_description_generate/$taskId"
    }
}

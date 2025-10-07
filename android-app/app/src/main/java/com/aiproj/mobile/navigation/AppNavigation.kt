package com.aiproj.mobile.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.aiproj.mobile.ui.screens.analytics.AnalyticsScreen
import com.aiproj.mobile.ui.screens.analytics.TaskStatusDetailScreen
import com.aiproj.mobile.ui.screens.dashboard.DashboardScreen
import com.aiproj.mobile.ui.screens.login.LoginScreen
import com.aiproj.mobile.ui.screens.profile.ProfileScreen
import com.aiproj.mobile.ui.screens.tasks.TaskDetailScreen
import com.aiproj.mobile.ui.screens.tasks.TaskFormScreen
import com.aiproj.mobile.ui.screens.tasks.TaskListScreen
import com.aiproj.mobile.ui.screens.timer.TimerScreen
import com.aiproj.mobile.ui.screens.timer.history.TimerHistoryScreen
import com.aiproj.mobile.ui.screens.efficiency.EfficiencyComparisonScreen
import com.aiproj.mobile.ui.document.list.DocumentListScreen
import com.aiproj.mobile.ui.document.viewer.DocumentViewerScreen
import com.aiproj.mobile.ui.document.editor.DocumentEditorScreen
import com.aiproj.mobile.ui.screens.notes.NotesScreen
import com.aiproj.mobile.ui.screens.notes.NoteDetailScreen
import com.aiproj.mobile.ui.screens.notes.NoteEditorScreen
import com.aiproj.mobile.ui.screens.details.todaytasks.TodayTasksDetailScreen
import com.aiproj.mobile.ui.screens.details.worktime.WorkTimeDetailScreen
import com.aiproj.mobile.ui.screens.details.todayworktime.TodayWorkTimeDetailScreen
import com.aiproj.mobile.ui.screens.details.activeprojects.ActiveProjectsDetailScreen
import com.aiproj.mobile.ui.screens.details.pendingtasks.PendingTasksDetailScreen
import com.aiproj.mobile.ui.screens.projects.ProjectListScreen
import com.aiproj.mobile.ui.screens.projects.ProjectDetailScreen

/**
 * 应用主导航
 */
@Composable
fun AppNavigation(
    startDestination: String = Screen.Login.route
) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // 登录页面
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        // 主页面（带底部导航）
        composable(Screen.Main.route) {
            MainScreen(
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Main.route) { inclusive = true }
                    }
                }
            )
        }
    }
}

/**
 * 主页面（包含底部导航栏）
 */
@Composable
fun MainScreen(
    onLogout: () -> Unit
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    Scaffold(
        bottomBar = {
            NavigationBar {
                bottomNavItems.forEach { item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                        selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            // Dashboard
            composable(Screen.Dashboard.route) {
                DashboardScreen(
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    },
                    onProjectClick = { projectId ->
                        // TODO: 导航到项目详情
                    },
                    onNavigateToTimer = {
                        navController.navigate(Screen.Timer.route)
                    },
                    onTodayTasksClick = { date, projectId ->
                        navController.navigate(Screen.TodayTasksDetail.createRoute(date, projectId))
                    },
                    onWorkTimeClick = { projectId ->
                        navController.navigate(Screen.WorkTimeDetail.createRoute(projectId))
                    },
                    onTodayWorkTimeClick = {
                        navController.navigate(Screen.TodayWorkTimeDetail.createRoute())
                    },
                    onActiveProjectsClick = {
                        navController.navigate(Screen.ProjectList.route)
                    },
                    onPendingTasksClick = { projectId ->
                        navController.navigate(Screen.PendingTasksDetail.createRoute(projectId))
                    }
                )
            }

            // ========== Dashboard 详情页 ==========

            // 今日任务详情
            composable(
                route = Screen.TodayTasksDetail.route,
                arguments = listOf(
                    navArgument("date") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    },
                    navArgument("projectId") {
                        type = NavType.IntType
                        defaultValue = 0
                    }
                )
            ) {
                TodayTasksDetailScreen(
                    onBackClick = { navController.popBackStack() },
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    }
                )
            }

            // 工作时长详情
            composable(
                route = Screen.WorkTimeDetail.route,
                arguments = listOf(
                    navArgument("projectId") {
                        type = NavType.IntType
                        defaultValue = 0
                    }
                )
            ) {
                WorkTimeDetailScreen(
                    onBackClick = { navController.popBackStack() },
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    }
                )
            }

            // 今日工作时长详情
            composable(
                route = Screen.TodayWorkTimeDetail.route,
                arguments = listOf(
                    navArgument("date") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    }
                )
            ) {
                TodayWorkTimeDetailScreen(
                    onBackClick = { navController.popBackStack() },
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    }
                )
            }

            // 活跃项目详情
            composable(Screen.ActiveProjectsDetail.route) {
                ActiveProjectsDetailScreen(
                    onBackClick = { navController.popBackStack() },
                    onProjectClick = { projectId ->
                        // TODO: 导航到项目详情
                    }
                )
            }

            // 待办任务详情
            composable(
                route = Screen.PendingTasksDetail.route,
                arguments = listOf(
                    navArgument("projectId") {
                        type = NavType.IntType
                        defaultValue = 0
                    }
                )
            ) {
                PendingTasksDetailScreen(
                    onBackClick = { navController.popBackStack() },
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    }
                )
            }

            // 任务列表
            composable(Screen.TaskList.route) {
                TaskListScreen(
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    },
                    onCreateTask = {
                        navController.navigate(Screen.TaskEdit.createRoute())
                    }
                )
            }

            // 任务详情
            composable(
                route = Screen.TaskDetail.route,
                arguments = listOf(
                    navArgument("taskId") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getInt("taskId") ?: return@composable
                TaskDetailScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onEdit = { editTaskId ->
                        navController.navigate(Screen.TaskEdit.createRoute(editTaskId))
                    },
                    onNavigateToDocuments = { navigateTaskId ->
                        navController.navigate(Screen.DocumentList.createRoute(navigateTaskId))
                    },
                    onNavigateToTask = { navigateTaskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(navigateTaskId))
                    },
                    onNavigateToDocumentViewer = { navigateTaskId, documentId ->
                        navController.navigate(Screen.DocumentViewer.createRoute(navigateTaskId, documentId))
                    }
                )
            }

            // 任务创建/编辑
            composable(
                route = Screen.TaskEdit.route,
                arguments = listOf(
                    navArgument("taskId") {
                        type = NavType.IntType
                        defaultValue = -1
                    }
                )
            ) { backStackEntry ->
                val taskIdArg = backStackEntry.arguments?.getInt("taskId") ?: -1
                // taskId 通过 SavedStateHandle 传递给 TaskFormViewModel
                TaskFormScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // 工时记录
            composable(Screen.Timer.route) {
                TimerScreen()
            }

            // 计时器历史记录
            composable(Screen.TimerHistory.route) {
                TimerHistoryScreen(
                    onBackClick = { navController.popBackStack() },
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId.toInt()))
                    }
                )
            }

            // 3日效率对比
            composable(Screen.EfficiencyComparison.route) {
                EfficiencyComparisonScreen(
                    onBackClick = { navController.popBackStack() }
                )
            }

            // 个人中心
            composable(Screen.Profile.route) {
                ProfileScreen(onLogout = onLogout)
            }

            // 数据统计
            composable(Screen.Analytics.route) {
                AnalyticsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToTaskStatusDetail = { status, startDate, endDate, projectId ->
                        navController.navigate(
                            Screen.TaskStatusDetail.createRoute(status, startDate, endDate, projectId)
                        )
                    },
                    onNavigateToTaskDetail = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    }
                )
            }

            // 任务状态详情
            composable(
                route = Screen.TaskStatusDetail.route,
                arguments = listOf(
                    navArgument("status") { type = NavType.StringType },
                    navArgument("startDate") { type = NavType.StringType },
                    navArgument("endDate") { type = NavType.StringType },
                    navArgument("projectId") {
                        type = NavType.IntType
                        defaultValue = 0
                    }
                )
            ) {
                TaskStatusDetailScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    }
                )
            }

            // 文档列表
            composable(
                route = Screen.DocumentList.route,
                arguments = listOf(
                    navArgument("taskId") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getInt("taskId") ?: return@composable
                DocumentListScreen(
                    taskId = taskId,
                    onNavigateBack = { navController.popBackStack() },
                    onDocumentClick = { documentId ->
                        navController.navigate(Screen.DocumentViewer.createRoute(taskId, documentId))
                    },
                    onCreateDocument = {
                        navController.navigate(Screen.DocumentEditor.createRoute(taskId))
                    }
                )
            }

            // 文档查看
            composable(
                route = Screen.DocumentViewer.route,
                arguments = listOf(
                    navArgument("taskId") { type = NavType.IntType },
                    navArgument("documentId") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getInt("taskId") ?: return@composable
                val documentId = backStackEntry.arguments?.getInt("documentId") ?: return@composable
                DocumentViewerScreen(
                    taskId = taskId,
                    documentId = documentId,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToEdit = { editTaskId, editDocumentId ->
                        navController.navigate(Screen.DocumentEditor.createRoute(editTaskId, editDocumentId))
                    }
                )
            }

            // 文档编辑
            composable(
                route = Screen.DocumentEditor.route,
                arguments = listOf(
                    navArgument("taskId") { type = NavType.IntType },
                    navArgument("documentId") {
                        type = NavType.IntType
                        defaultValue = -1
                    }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getInt("taskId") ?: return@composable
                val documentIdArg = backStackEntry.arguments?.getInt("documentId") ?: -1
                val documentId = if (documentIdArg == -1) null else documentIdArg
                DocumentEditorScreen(
                    taskId = taskId,
                    documentId = documentId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // 笔记列表
            composable(Screen.NoteList.route) {
                NotesScreen(
                    onNoteClick = { noteId ->
                        navController.navigate(Screen.NoteDetail.createRoute(noteId))
                    },
                    onCreateNote = {
                        navController.navigate(Screen.NoteEditor.createRoute())
                    }
                )
            }

            // 笔记详情
            composable(
                route = Screen.NoteDetail.route,
                arguments = listOf(
                    navArgument("noteId") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val noteId = backStackEntry.arguments?.getInt("noteId") ?: return@composable
                NoteDetailScreen(
                    noteId = noteId,
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { editNoteId ->
                        navController.navigate(Screen.NoteEditor.createRoute(editNoteId))
                    },
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    },
                    onNoteClick = { relatedNoteId ->
                        navController.navigate(Screen.NoteDetail.createRoute(relatedNoteId))
                    }
                )
            }

            // 笔记编辑
            composable(
                route = Screen.NoteEditor.route,
                arguments = listOf(
                    navArgument("noteId") {
                        type = NavType.IntType
                        defaultValue = -1
                    }
                )
            ) { backStackEntry ->
                val noteIdArg = backStackEntry.arguments?.getInt("noteId") ?: -1
                val noteId = if (noteIdArg == -1) null else noteIdArg
                NoteEditorScreen(
                    noteId = noteId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // ========== AI功能模块 ==========

            // AI文档生成
            composable(
                route = Screen.AIDocumentGenerate.route,
                arguments = listOf(
                    navArgument("taskId") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getInt("taskId") ?: return@composable
                com.aiproj.mobile.ui.screens.ai.document.AIDocumentGenerateScreen(
                    taskId = taskId,
                    onNavigateBack = { navController.popBackStack() },
                    onDocumentSaved = { navController.popBackStack() }
                )
            }

            // AI子任务生成
            composable(
                route = Screen.AISubtaskGenerate.route,
                arguments = listOf(
                    navArgument("taskId") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getInt("taskId") ?: return@composable
                com.aiproj.mobile.ui.screens.ai.subtask.AISubtaskGenerateScreen(
                    taskId = taskId,
                    onNavigateBack = { navController.popBackStack() },
                    onSubtasksCreated = { navController.popBackStack() }
                )
            }

            // AI描述生成
            composable(
                route = Screen.AIDescriptionGenerate.route,
                arguments = listOf(
                    navArgument("taskId") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getInt("taskId") ?: return@composable
                com.aiproj.mobile.ui.screens.ai.description.AIDescriptionGenerateScreen(
                    taskId = taskId,
                    onNavigateBack = { navController.popBackStack() },
                    onDescriptionApplied = { navController.popBackStack() }
                )
            }

            // ========== 项目模块 ==========

            // 项目列表
            composable(Screen.ProjectList.route) {
                ProjectListScreen(
                    onProjectClick = { projectId ->
                        navController.navigate(Screen.ProjectDetail.createRoute(projectId))
                    },
                    onCreateProject = {
                        // TODO: 创建ProjectFormScreen后启用
                        // navController.navigate(Screen.ProjectForm.createRoute())
                    }
                )
            }

            // 项目详情
            composable(
                route = Screen.ProjectDetail.route,
                arguments = listOf(
                    navArgument("projectId") { type = NavType.IntType }
                )
            ) { backStackEntry ->
                val projectId = backStackEntry.arguments?.getInt("projectId") ?: return@composable
                ProjectDetailScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onTaskClick = { taskId ->
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    },
                    onEdit = { editProjectId ->
                        // TODO: 创建ProjectFormScreen后启用
                        // navController.navigate(Screen.ProjectForm.createRoute(editProjectId))
                    }
                )
            }
        }
    }
}

/**
 * 底部导航项
 */
data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

private val bottomNavItems = listOf(
    BottomNavItem(Screen.Dashboard.route, "首页", Icons.Default.Home),
    BottomNavItem(Screen.TaskList.route, "任务", Icons.Default.Assignment),
    BottomNavItem(Screen.NoteList.route, "工作笔记", Icons.Default.Description),
    BottomNavItem(Screen.Analytics.route, "统计", Icons.Default.BarChart),
    BottomNavItem(Screen.Profile.route, "我的", Icons.Default.Person)
)

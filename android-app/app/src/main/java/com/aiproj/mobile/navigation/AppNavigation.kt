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
import com.aiproj.mobile.ui.screens.dashboard.DashboardScreen
import com.aiproj.mobile.ui.screens.login.LoginScreen
import com.aiproj.mobile.ui.screens.profile.ProfileScreen
import com.aiproj.mobile.ui.screens.tasks.TaskDetailScreen
import com.aiproj.mobile.ui.screens.tasks.TaskListScreen
import com.aiproj.mobile.ui.screens.timer.TimerScreen

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
                        // TODO: 创建TaskEditScreen后启用
                        // navController.navigate(Screen.TaskEdit.createRoute())
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
                        // TODO: 创建TaskEditScreen后启用
                        // navController.navigate(Screen.TaskEdit.createRoute(editTaskId))
                    }
                )
            }

            // 工时记录
            composable(Screen.Timer.route) {
                TimerScreen()
            }

            // 个人中心
            composable(Screen.Profile.route) {
                ProfileScreen(onLogout = onLogout)
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
    BottomNavItem(Screen.Timer.route, "工时", Icons.Default.Timer),
    BottomNavItem(Screen.Profile.route, "我的", Icons.Default.Person)
)

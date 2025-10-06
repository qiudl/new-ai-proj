package com.aiproj.mobile.ui.components

import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.aiproj.mobile.ui.common.OperationState
import com.aiproj.mobile.ui.common.UiState

/**
 * 错误消息处理器
 * 当UiState为Error时显示Snackbar
 */
@Composable
fun <T> ErrorMessageHandler(
    uiState: UiState<T>,
    snackbarHostState: SnackbarHostState,
    onErrorShown: () -> Unit = {}
) {
    LaunchedEffect(uiState) {
        if (uiState is UiState.Error) {
            snackbarHostState.showSnackbar(
                message = uiState.message,
                duration = SnackbarDuration.Short
            )
            onErrorShown()
        }
    }
}

/**
 * 操作状态消息处理器
 * 显示操作成功或失败的Snackbar
 */
@Composable
fun OperationMessageHandler(
    operationState: OperationState,
    snackbarHostState: SnackbarHostState,
    onSuccess: () -> Unit = {},
    onFailure: () -> Unit = {},
    successMessage: String = "操作成功",
    actionLabel: String? = null,
    onActionPerformed: () -> Unit = {}
) {
    LaunchedEffect(operationState) {
        when (operationState) {
            is OperationState.Success -> {
                val result = snackbarHostState.showSnackbar(
                    message = operationState.message ?: successMessage,
                    actionLabel = actionLabel,
                    duration = SnackbarDuration.Short
                )
                if (result == SnackbarResult.ActionPerformed) {
                    onActionPerformed()
                }
                onSuccess()
            }
            is OperationState.Failure -> {
                snackbarHostState.showSnackbar(
                    message = operationState.error,
                    duration = SnackbarDuration.Short
                )
                onFailure()
            }
            else -> {}
        }
    }
}

/**
 * 简单错误消息处理器
 * 显示错误字符串的Snackbar
 */
@Composable
fun SimpleErrorHandler(
    error: String?,
    snackbarHostState: SnackbarHostState,
    onErrorShown: () -> Unit = {}
) {
    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(
                message = it,
                duration = SnackbarDuration.Short
            )
            onErrorShown()
        }
    }
}

/**
 * 可重试的错误消息处理器
 * 带有"重试"按钮的Snackbar
 */
@Composable
fun RetryableErrorHandler(
    error: String?,
    snackbarHostState: SnackbarHostState,
    onRetry: () -> Unit,
    onErrorShown: () -> Unit = {}
) {
    LaunchedEffect(error) {
        error?.let {
            val result = snackbarHostState.showSnackbar(
                message = it,
                actionLabel = "重试",
                duration = SnackbarDuration.Long
            )
            if (result == SnackbarResult.ActionPerformed) {
                onRetry()
            }
            onErrorShown()
        }
    }
}

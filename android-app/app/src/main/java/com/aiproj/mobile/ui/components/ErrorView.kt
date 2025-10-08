package com.aiproj.mobile.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.core.error.AppException
import com.aiproj.mobile.core.error.getUserMessage
import com.aiproj.mobile.core.error.isRetryable

/**
 * 错误视图组件
 */
@Composable
fun ErrorView(
    exception: AppException,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // 错误图标
        Icon(
            imageVector = getErrorIcon(exception),
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.error
        )

        Spacer(modifier = Modifier.height(16.dp))

        // 错误标题
        Text(
            text = getErrorTitle(exception),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(8.dp))

        // 错误消息
        Text(
            text = exception.getUserMessage(),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        // 重试按钮
        if (onRetry != null && exception.isRetryable()) {
            Spacer(modifier = Modifier.height(24.dp))
            Button(onClick = onRetry) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("重试")
            }
        }
    }
}

/**
 * 紧凑型错误视图 (用于列表项等)
 */
@Composable
fun CompactErrorView(
    exception: AppException,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Error,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = exception.getUserMessage(),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        if (onRetry != null && exception.isRetryable()) {
            Spacer(modifier = Modifier.width(8.dp))
            TextButton(onClick = onRetry) {
                Text("重试")
            }
        }
    }
}

/**
 * 内联错误提示 (用于Snackbar等)
 */
@Composable
fun InlineErrorMessage(
    exception: AppException,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        color = MaterialTheme.colorScheme.errorContainer,
        shape = MaterialTheme.shapes.small
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = exception.getUserMessage(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onErrorContainer
            )
        }
    }
}

/**
 * 获取错误图标
 */
private fun getErrorIcon(exception: AppException) = when (exception) {
    is AppException.NetworkException.NoConnectivity -> Icons.Default.WifiOff
    is AppException.NetworkException.Timeout -> Icons.Default.HourglassEmpty
    is AppException.ApiException.Unauthorized -> Icons.Default.Lock
    is AppException.ApiException.Forbidden -> Icons.Default.Block
    is AppException.ApiException.NotFound -> Icons.Default.SearchOff
    is AppException.DataException.EmptyData -> Icons.Default.Inbox
    else -> Icons.Default.Error
}

/**
 * 获取错误标题
 */
private fun getErrorTitle(exception: AppException) = when (exception) {
    is AppException.NetworkException -> "网络错误"
    is AppException.ApiException -> "请求失败"
    is AppException.DataException -> "数据错误"
    is AppException.BusinessException -> "操作失败"
    is AppException.Unknown -> "未知错误"
}

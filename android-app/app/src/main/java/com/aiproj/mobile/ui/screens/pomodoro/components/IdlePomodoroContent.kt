package com.aiproj.mobile.ui.screens.pomodoro.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.PomodoroConfig

/**
 * 空闲状态番茄钟内容
 * 显示配置信息和启动按钮
 */
@Composable
fun IdlePomodoroContent(
    config: PomodoroConfig,
    onStartClick: () -> Unit,
    onConfigClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // 标题和图标
        Icon(
            imageVector = Icons.Default.Timer,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(80.dp)
        )

        Text(
            text = "番茄钟",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onSurface
        )

        Text(
            text = "使用番茄工作法提高专注力",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        // 配置卡片
        ConfigurationCard(
            config = config,
            onConfigClick = onConfigClick
        )

        Spacer(modifier = Modifier.height(16.dp))

        // 启动按钮
        Button(
            onClick = onStartClick,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary
            )
        ) {
            Icon(
                imageVector = Icons.Default.PlayArrow,
                contentDescription = null,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "开始番茄钟",
                style = MaterialTheme.typography.titleMedium
            )
        }

        // 提示文本
        Text(
            text = "点击开始进入25分钟专注工作",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 配置信息卡片
 */
@Composable
private fun ConfigurationCard(
    config: PomodoroConfig,
    onConfigClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 标题栏
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "当前配置",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                IconButton(onClick = onConfigClick) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "配置",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }

            HorizontalDivider()

            // 配置项列表
            ConfigItem(
                icon = Icons.Default.Work,
                label = "工作时长",
                value = "${config.workMinutes} 分钟"
            )

            ConfigItem(
                icon = Icons.Default.Coffee,
                label = "短休息",
                value = "${config.shortBreakMinutes} 分钟"
            )

            ConfigItem(
                icon = Icons.Default.Weekend,
                label = "长休息",
                value = "${config.longBreakMinutes} 分钟"
            )

            ConfigItem(
                icon = Icons.Default.Loop,
                label = "长休息间隔",
                value = "每 ${config.pomodorosUntilLongBreak} 个番茄"
            )
        }
    }
}

/**
 * 单个配置项
 */
@Composable
private fun ConfigItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

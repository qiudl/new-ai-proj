package com.aiproj.mobile.ui.screens.pomodoro.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.data.models.PomodoroConfig

/**
 * 番茄钟配置对话框
 */
@Composable
fun PomodoroConfigDialog(
    config: PomodoroConfig,
    onDismiss: () -> Unit,
    onConfirm: (PomodoroConfig) -> Unit
) {
    var workMinutes by remember { mutableStateOf(config.workMinutes.toString()) }
    var shortBreakMinutes by remember { mutableStateOf(config.shortBreakMinutes.toString()) }
    var longBreakMinutes by remember { mutableStateOf(config.longBreakMinutes.toString()) }
    var pomodorosUntilLongBreak by remember { mutableStateOf(config.pomodorosUntilLongBreak.toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "番茄钟配置",
                style = MaterialTheme.typography.headlineSmall
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 工作时长
                ConfigTextField(
                    value = workMinutes,
                    onValueChange = { workMinutes = it },
                    label = "工作时长（分钟）",
                    placeholder = "25"
                )

                // 短休息时长
                ConfigTextField(
                    value = shortBreakMinutes,
                    onValueChange = { shortBreakMinutes = it },
                    label = "短休息（分钟）",
                    placeholder = "5"
                )

                // 长休息时长
                ConfigTextField(
                    value = longBreakMinutes,
                    onValueChange = { longBreakMinutes = it },
                    label = "长休息（分钟）",
                    placeholder = "15"
                )

                // 长休息间隔
                ConfigTextField(
                    value = pomodorosUntilLongBreak,
                    onValueChange = { pomodorosUntilLongBreak = it },
                    label = "长休息间隔（番茄数）",
                    placeholder = "4"
                )

                // 提示文本
                Text(
                    text = "建议：工作25分钟，短休息5分钟，长休息15分钟",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val newConfig = PomodoroConfig(
                        workMinutes = workMinutes.toIntOrNull() ?: config.workMinutes,
                        shortBreakMinutes = shortBreakMinutes.toIntOrNull() ?: config.shortBreakMinutes,
                        longBreakMinutes = longBreakMinutes.toIntOrNull() ?: config.longBreakMinutes,
                        pomodorosUntilLongBreak = pomodorosUntilLongBreak.toIntOrNull() ?: config.pomodorosUntilLongBreak
                    )
                    onConfirm(newConfig)
                }
            ) {
                Text("保存")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}

/**
 * 配置文本输入框
 */
@Composable
private fun ConfigTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        placeholder = { Text(placeholder) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )
}

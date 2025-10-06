package com.aiproj.mobile.ui.screens.notes.components

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle

/**
 * 高亮文本组件
 *
 * 在文本中高亮显示搜索关键词
 */
@Composable
fun HighlightedText(
    text: String,
    query: String,
    highlightColor: Color = MaterialTheme.colorScheme.primary,
    modifier: Modifier = Modifier
) {
    if (query.isBlank()) {
        Text(text = text, modifier = modifier)
        return
    }

    val annotatedString = buildAnnotatedString {
        var startIndex = 0
        while (startIndex < text.length) {
            val index = text.indexOf(query, startIndex, ignoreCase = true)
            if (index == -1) {
                append(text.substring(startIndex))
                break
            }

            // 添加匹配前的文本
            append(text.substring(startIndex, index))

            // 添加高亮的匹配文本
            withStyle(
                style = SpanStyle(
                    background = highlightColor.copy(alpha = 0.3f),
                    fontWeight = FontWeight.Bold,
                    color = highlightColor
                )
            ) {
                append(text.substring(index, index + query.length))
            }

            startIndex = index + query.length
        }
    }

    Text(text = annotatedString, modifier = modifier)
}

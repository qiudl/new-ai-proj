package com.aiproj.mobile.ui.screens.analytics.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiproj.mobile.ui.screens.analytics.AnalyticsViewModel
import com.aiproj.mobile.ui.screens.analytics.AnalyticsUiState

/**
 * 每日详情Tab内容组件
 *
 * 布局结构：
 * - 左侧：日期列表（最近7天）
 * - 右侧：选中日期的详细信息（统计卡片 + 任务时间条目列表）
 */
@Composable
fun DailyDetailTabContent(
    uiState: AnalyticsUiState,
    viewModel: AnalyticsViewModel,
    modifier: Modifier = Modifier
) {
    // TODO: 从viewModel获取dailyDetailState
    // val dailyDetailState by viewModel.dailyDetailState.collectAsState()

    Row(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // 左侧：日期列表
        DayListColumn(
            // dailyList = dailyDetailState.dailyList,
            // selectedDate = dailyDetailState.selectedDayDetail?.date,
            // onDateSelected = { date -> viewModel.selectDate(date) },
            modifier = Modifier
                .width(140.dp)
                .fillMaxHeight()
        )

        Spacer(modifier = Modifier.width(16.dp))

        // 右侧：选中日期的详细信息
        DayDetailColumn(
            // dayDetail = dailyDetailState.selectedDayDetail,
            // isLoading = dailyDetailState.isLoading,
            // error = dailyDetailState.error,
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
        )
    }
}

package com.aiproj.mobile.ui.screens.efficiency

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiproj.mobile.data.models.DailyComparisonResponse
import com.aiproj.mobile.data.models.EfficiencyInsight
import com.aiproj.mobile.ui.screens.efficiency.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EfficiencyComparisonScreen(
    onBackClick: () -> Unit,
    viewModel: EfficiencyComparisonViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val insights by viewModel.insights.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("3日效率对比") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "刷新")
                    }
                }
            )
        }
    ) { paddingValues ->
        when (val state = uiState) {
            is EfficiencyUiState.Loading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            is EfficiencyUiState.Success -> {
                SuccessContent(
                    data = state.data,
                    insights = insights,
                    modifier = Modifier.padding(paddingValues)
                )
            }

            is EfficiencyUiState.Error -> {
                ErrorContent(
                    message = state.message,
                    onRetry = { viewModel.loadComparison() },
                    modifier = Modifier.padding(paddingValues)
                )
            }
        }
    }
}

@Composable
private fun SuccessContent(
    data: DailyComparisonResponse,
    insights: List<EfficiencyInsight>,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Trend card
        TrendCard(
            trend = data.trend,
            averageMinutes = data.averageWorkMinutes
        )

        // 3-day comparison chart
        ThreeDayComparisonChart(days = data.days)

        // Metrics comparison
        MetricsComparisonCard(days = data.days)

        // Insights
        if (insights.isNotEmpty()) {
            InsightsSection(insights = insights)
        }

        // Recommendations
        if (data.insights.isNotEmpty()) {
            RecommendationsCard(recommendations = data.insights)
        }
    }
}

@Composable
private fun ErrorContent(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("重试")
        }
    }
}

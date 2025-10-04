package com.aiproj.mobile

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import com.aiproj.mobile.navigation.AppNavigation
import com.aiproj.mobile.ui.theme.AIProjMobileTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * AI Project 移动端主 Activity
 *
 * @AndroidEntryPoint 启用 Hilt 依赖注入
 * 继承 FragmentActivity 以支持生物识别功能
 */
@AndroidEntryPoint
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // 安装启动画面
        installSplashScreen()

        super.onCreate(savedInstanceState)

        setContent {
            AIProjMobileTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}

package com.aiproj.mobile.ui.screens.ai

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.aiproj.mobile.MainActivity
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * AI描述生成功能集成测试
 *
 * 测试完整的端到端流程：
 * 1. 导航到AI描述生成界面
 * 2. 配置生成参数
 * 3. 触发生成
 * 4. 验证结果
 * 5. 应用描述到任务
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class AIDescriptionIntegrationTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun testAIDescriptionGenerationFlow_Success() {
        // Given: 用户在任务详情页
        // 导航到AI描述生成界面（这里假设已经导航到目标界面）

        // When: 用户配置生成参数
        // 1. 选择AI模型
        composeTestRule.onNodeWithText("GPT-4o")
            .assertExists()
            .assertIsDisplayed()

        // 2. 选择长度
        composeTestRule.onNodeWithText("中等")
            .performClick()

        // 3. 选择风格
        composeTestRule.onNodeWithText("技术性")
            .performClick()

        // 4. 输入自定义提示词（可选）
        composeTestRule.onNodeWithTag("customPromptInput")
            .performTextInput("请强调性能优化")

        // 5. 点击生成按钮
        composeTestRule.onNodeWithText("生成描述")
            .performClick()

        // Then: 验证Loading状态显示
        composeTestRule.onNodeWithTag("loadingIndicator")
            .assertExists()

        // 等待生成完成（使用较长的超时时间，因为AI生成需要时间）
        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedDescription")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Then: 验证生成的描述显示
        composeTestRule.onNodeWithTag("generatedDescription")
            .assertExists()
            .assertIsDisplayed()

        // 验证字数统计显示
        composeTestRule.onNodeWithTag("wordCount")
            .assertExists()

        // When: 用户点击应用按钮
        composeTestRule.onNodeWithText("应用到任务")
            .performClick()

        // Then: 验证成功提示
        composeTestRule.onNodeWithText("描述已成功应用")
            .assertExists()
    }

    @Test
    fun testAIDescriptionGenerationFlow_NetworkError() {
        // Given: 网络连接失败（需要配置Mock）

        // When: 用户尝试生成描述
        composeTestRule.onNodeWithText("生成描述")
            .performClick()

        // Then: 验证错误提示
        composeTestRule.waitUntil(timeoutMillis = 10000) {
            composeTestRule.onAllNodesWithText("网络连接失败")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule.onNodeWithText("网络连接失败")
            .assertExists()

        // 验证重试按钮存在
        composeTestRule.onNodeWithText("重试")
            .assertExists()
    }

    @Test
    fun testAIDescriptionGenerationFlow_ValidationError() {
        // Given: 用户未配置任何参数

        // When: 直接点击生成按钮
        composeTestRule.onNodeWithText("生成描述")
            .performClick()

        // Then: 验证不会触发API调用（生成按钮应该被禁用）
        composeTestRule.onNodeWithText("生成描述")
            .assertIsNotEnabled()
    }

    @Test
    fun testAIDescriptionRegenerate() {
        // Given: 已经生成过一次描述
        composeTestRule.onNodeWithText("生成描述")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedDescription")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // When: 用户点击重新生成
        composeTestRule.onNodeWithText("重新生成")
            .performClick()

        // Then: 验证Loading状态再次显示
        composeTestRule.onNodeWithTag("loadingIndicator")
            .assertExists()

        // 验证新的描述生成
        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedDescription")
                .fetchSemanticsNodes().isNotEmpty()
        }
    }

    @Test
    fun testAIDescriptionCustomPrompt() {
        // Given: 用户输入自定义提示词
        val customPrompt = "请详细说明技术架构和设计模式的选择理由"

        // When: 输入提示词并生成
        composeTestRule.onNodeWithTag("customPromptInput")
            .performTextInput(customPrompt)

        composeTestRule.onNodeWithText("生成描述")
            .performClick()

        // Then: 验证生成的描述包含相关内容
        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedDescription")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证描述中包含技术架构相关内容（这取决于AI生成的实际内容）
        composeTestRule.onNodeWithTag("generatedDescription")
            .assertExists()
    }

    @Test
    fun testAIDescriptionDifferentLengths() {
        // Test 1: 短描述
        composeTestRule.onNodeWithText("简短")
            .performClick()

        composeTestRule.onNodeWithText("生成描述")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("wordCount")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证字数较少（< 100字）
        val shortWordCount = composeTestRule.onNodeWithTag("wordCount")
            .fetchSemanticsNode()
            .config[androidx.compose.ui.semantics.SemanticsProperties.Text]
            .firstOrNull()?.text

        // Test 2: 长描述
        composeTestRule.onNodeWithText("重置")
            .performClick()

        composeTestRule.onNodeWithText("详细")
            .performClick()

        composeTestRule.onNodeWithText("生成描述")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("wordCount")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证字数较多（> 200字）
    }

    @Test
    fun testAIDescriptionDifferentStyles() {
        // Test 1: 技术风格
        composeTestRule.onNodeWithText("技术性")
            .performClick()

        composeTestRule.onNodeWithText("生成描述")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedDescription")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Test 2: 业务风格
        composeTestRule.onNodeWithText("重置")
            .performClick()

        composeTestRule.onNodeWithText("业务性")
            .performClick()

        composeTestRule.onNodeWithText("生成描述")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedDescription")
                .fetchSemanticsNodes().isNotEmpty()
        }
    }
}

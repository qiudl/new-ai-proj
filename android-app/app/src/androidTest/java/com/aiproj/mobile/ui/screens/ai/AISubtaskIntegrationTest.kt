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
 * AI子任务生成功能集成测试
 *
 * 测试完整的端到端流程：
 * 1. 导航到AI子任务生成界面
 * 2. 配置生成参数
 * 3. 触发AI生成
 * 4. 预览生成的子任务
 * 5. 批量创建子任务
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class AISubtaskIntegrationTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun testAISubtaskGenerationFlow_Success() {
        // Given: 用户在任务详情页
        // 导航到AI子任务生成界面（这里假设已经导航到目标界面）

        // When: 用户配置生成参数
        // 1. 选择AI模型
        composeTestRule.onNodeWithText("GPT-4o")
            .assertExists()
            .assertIsDisplayed()

        // 2. 设置子任务数量
        composeTestRule.onNodeWithTag("subtaskCountSlider")
            .assertExists()

        // 设置为5个子任务
        composeTestRule.onNodeWithText("5")
            .performClick()

        // 3. 启用时间预估
        composeTestRule.onNodeWithTag("includeEstimatesSwitch")
            .performClick()

        // 4. 输入自定义提示词（可选）
        composeTestRule.onNodeWithTag("customPromptInput")
            .performTextInput("请按照前后端分离的架构拆分任务")

        // 5. 点击生成按钮
        composeTestRule.onNodeWithText("生成子任务")
            .performClick()

        // Then: 验证Loading状态显示
        composeTestRule.onNodeWithTag("loadingIndicator")
            .assertExists()

        // 等待AI生成完成（使用较长的超时时间）
        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedSubtasksList")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Then: 验证生成的子任务列表显示
        composeTestRule.onNodeWithTag("generatedSubtasksList")
            .assertExists()
            .assertIsDisplayed()

        // 验证子任务数量显示
        composeTestRule.onNodeWithTag("subtaskCountInfo")
            .assertExists()
            .assertTextContains("共5个子任务")

        // 验证总时间预估显示
        composeTestRule.onNodeWithTag("totalEstimatedTime")
            .assertExists()

        // When: 用户预览第一个子任务
        composeTestRule.onNodeWithTag("subtaskItem_0")
            .assertExists()
            .performClick()

        // Then: 验证子任务详情显示
        composeTestRule.onNodeWithTag("subtaskDetailDialog")
            .assertExists()

        // 关闭详情对话框
        composeTestRule.onNodeWithText("关闭")
            .performClick()

        // When: 用户点击批量创建按钮
        composeTestRule.onNodeWithText("批量创建子任务")
            .performClick()

        // Then: 验证确认对话框显示
        composeTestRule.onNodeWithText("确认创建5个子任务？")
            .assertExists()

        // 确认创建
        composeTestRule.onNodeWithText("确认")
            .performClick()

        // 等待创建完成
        composeTestRule.waitUntil(timeoutMillis = 15000) {
            composeTestRule.onAllNodesWithText("子任务创建成功")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Then: 验证成功提示
        composeTestRule.onNodeWithText("子任务创建成功")
            .assertExists()
    }

    @Test
    fun testAISubtaskGenerationFlow_NetworkError() {
        // Given: 网络连接失败（需要配置Mock）

        // When: 用户尝试生成子任务
        composeTestRule.onNodeWithText("生成子任务")
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
    fun testAISubtaskGenerationFlow_ValidationError() {
        // Given: 用户设置了不合理的参数（如子任务数量为0）

        // When: 设置子任务数量为0
        composeTestRule.onNodeWithText("0")
            .performClick()

        // Then: 验证生成按钮被禁用
        composeTestRule.onNodeWithText("生成子任务")
            .assertIsNotEnabled()
    }

    @Test
    fun testAISubtaskRegenerate() {
        // Given: 已经生成过一次子任务
        composeTestRule.onNodeWithText("生成子任务")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedSubtasksList")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // When: 用户点击重新生成
        composeTestRule.onNodeWithText("重新生成")
            .performClick()

        // Then: 验证确认对话框
        composeTestRule.onNodeWithText("重新生成将清空当前结果")
            .assertExists()

        // 确认重新生成
        composeTestRule.onNodeWithText("确认")
            .performClick()

        // Then: 验证Loading状态再次显示
        composeTestRule.onNodeWithTag("loadingIndicator")
            .assertExists()

        // 验证新的子任务生成
        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedSubtasksList")
                .fetchSemanticsNodes().isNotEmpty()
        }
    }

    @Test
    fun testAISubtaskCustomPrompt() {
        // Given: 用户输入详细的自定义提示词
        val customPrompt = """
            请按照以下要求拆分任务：
            1. 前端和后端分离
            2. 每个子任务不超过4小时
            3. 优先处理核心功能
            4. 预留测试时间
        """.trimIndent()

        // When: 输入提示词并生成
        composeTestRule.onNodeWithTag("customPromptInput")
            .performTextInput(customPrompt)

        composeTestRule.onNodeWithText("生成子任务")
            .performClick()

        // Then: 验证生成的子任务
        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedSubtasksList")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule.onNodeWithTag("generatedSubtasksList")
            .assertExists()

        // 验证生成逻辑说明显示
        composeTestRule.onNodeWithTag("breakdownLogic")
            .assertExists()
    }

    @Test
    fun testAISubtaskDifferentCounts() {
        // Test 1: 3个子任务
        composeTestRule.onNodeWithText("3")
            .performClick()

        composeTestRule.onNodeWithText("生成子任务")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("subtaskCountInfo")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证生成了3个子任务
        composeTestRule.onNodeWithTag("subtaskCountInfo")
            .assertTextContains("共3个子任务")

        // Test 2: 重置后生成10个子任务
        composeTestRule.onNodeWithText("重置")
            .performClick()

        composeTestRule.onNodeWithText("10")
            .performClick()

        composeTestRule.onNodeWithText("生成子任务")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("subtaskCountInfo")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证生成了10个子任务
        composeTestRule.onNodeWithTag("subtaskCountInfo")
            .assertTextContains("共10个子任务")
    }

    @Test
    fun testAISubtaskWithAndWithoutEstimates() {
        // Test 1: 不启用时间预估
        composeTestRule.onNodeWithTag("includeEstimatesSwitch")
            .assertIsOff()

        composeTestRule.onNodeWithText("生成子任务")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedSubtasksList")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证没有时间预估显示
        composeTestRule.onNodeWithTag("totalEstimatedTime")
            .assertDoesNotExist()

        // Test 2: 启用时间预估
        composeTestRule.onNodeWithText("重置")
            .performClick()

        composeTestRule.onNodeWithTag("includeEstimatesSwitch")
            .performClick()

        composeTestRule.onNodeWithText("生成子任务")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedSubtasksList")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证显示总时间预估
        composeTestRule.onNodeWithTag("totalEstimatedTime")
            .assertExists()
    }

    @Test
    fun testAISubtaskEditBeforeCreate() {
        // Given: 已生成子任务
        composeTestRule.onNodeWithText("生成子任务")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedSubtasksList")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // When: 用户点击第一个子任务的编辑按钮
        composeTestRule.onNodeWithTag("editSubtask_0")
            .performClick()

        // Then: 验证编辑对话框显示
        composeTestRule.onNodeWithTag("editSubtaskDialog")
            .assertExists()

        // 修改标题
        composeTestRule.onNodeWithTag("subtaskTitleInput")
            .performTextClearance()
        composeTestRule.onNodeWithTag("subtaskTitleInput")
            .performTextInput("修改后的子任务标题")

        // 保存修改
        composeTestRule.onNodeWithText("保存")
            .performClick()

        // 验证修改成功
        composeTestRule.onNodeWithText("修改后的子任务标题")
            .assertExists()
    }

    @Test
    fun testAISubtaskDeleteBeforeCreate() {
        // Given: 已生成5个子任务
        composeTestRule.onNodeWithText("5")
            .performClick()

        composeTestRule.onNodeWithText("生成子任务")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("generatedSubtasksList")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // When: 用户删除第一个子任务
        composeTestRule.onNodeWithTag("deleteSubtask_0")
            .performClick()

        // Then: 验证确认对话框
        composeTestRule.onNodeWithText("确认删除此子任务？")
            .assertExists()

        // 确认删除
        composeTestRule.onNodeWithText("确认")
            .performClick()

        // 验证子任务数量变为4
        composeTestRule.onNodeWithTag("subtaskCountInfo")
            .assertTextContains("共4个子任务")
    }
}

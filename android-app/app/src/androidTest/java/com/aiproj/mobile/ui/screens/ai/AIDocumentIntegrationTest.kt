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
 * AI文档生成功能集成测试
 *
 * 测试完整的端到端流程：
 * 1. 导航到AI文档生成界面
 * 2. 选择文档类型和模板
 * 3. 配置生成参数
 * 4. 触发AI生成
 * 5. 预览和编辑文档
 * 6. 保存文档
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class AIDocumentIntegrationTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun testAIDocumentGenerationFlow_TechnicalDesign() {
        // Given: 用户在文档生成界面
        // 导航到AI文档生成界面（这里假设已经导航到目标界面）

        // When: 用户选择文档类型 - 技术设计文档
        composeTestRule.onNodeWithText("技术设计文档")
            .performClick()

        // Then: 验证模板列表显示
        composeTestRule.onNodeWithTag("templateList")
            .assertExists()
            .assertIsDisplayed()

        // When: 选择模板
        composeTestRule.onNodeWithText("标准技术设计模板")
            .performClick()

        // 选择AI模型
        composeTestRule.onNodeWithText("GPT-4o")
            .assertExists()
            .assertIsDisplayed()

        // 输入自定义要求
        composeTestRule.onNodeWithTag("customRequirementsInput")
            .performTextInput("请详细说明系统架构和技术选型理由")

        // 点击生成按钮
        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        // Then: 验证Loading状态
        composeTestRule.onNodeWithTag("loadingIndicator")
            .assertExists()

        // 等待AI生成完成（文档生成可能需要更长时间）
        composeTestRule.waitUntil(timeoutMillis = 45000) {
            composeTestRule.onAllNodesWithTag("generatedDocumentPreview")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // Then: 验证文档预览显示
        composeTestRule.onNodeWithTag("generatedDocumentPreview")
            .assertExists()
            .assertIsDisplayed()

        // 验证文档包含必要的章节
        composeTestRule.onNodeWithText("系统架构")
            .assertExists()

        // 验证字数统计
        composeTestRule.onNodeWithTag("wordCountInfo")
            .assertExists()

        // When: 用户点击保存按钮
        composeTestRule.onNodeWithText("保存文档")
            .performClick()

        // Then: 验证保存成功提示
        composeTestRule.waitUntil(timeoutMillis = 10000) {
            composeTestRule.onAllNodesWithText("文档保存成功")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule.onNodeWithText("文档保存成功")
            .assertExists()
    }

    @Test
    fun testAIDocumentGenerationFlow_FeatureSpec() {
        // Given: 用户选择功能需求文档类型

        // When: 选择功能需求文档
        composeTestRule.onNodeWithText("功能需求文档")
            .performClick()

        // 选择模板
        composeTestRule.onNodeWithText("产品功能规格模板")
            .performClick()

        // 输入功能描述
        composeTestRule.onNodeWithTag("featureDescriptionInput")
            .performTextInput("实现用户权限管理系统，支持角色和权限配置")

        // 生成文档
        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        // Then: 等待生成完成
        composeTestRule.waitUntil(timeoutMillis = 45000) {
            composeTestRule.onAllNodesWithTag("generatedDocumentPreview")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证文档包含功能描述
        composeTestRule.onNodeWithText("功能描述")
            .assertExists()

        // 验证文档包含用例说明
        composeTestRule.onNodeWithText("用例说明")
            .assertExists()
    }

    @Test
    fun testAIDocumentGenerationFlow_APIDoc() {
        // Given: 用户选择API文档类型

        // When: 选择API文档
        composeTestRule.onNodeWithText("API文档")
            .performClick()

        // 选择RESTful API模板
        composeTestRule.onNodeWithText("RESTful API文档模板")
            .performClick()

        // 输入API描述
        composeTestRule.onNodeWithTag("apiDescriptionInput")
            .performTextInput("""
                用户管理API
                - GET /api/users - 获取用户列表
                - POST /api/users - 创建用户
                - PUT /api/users/:id - 更新用户
                - DELETE /api/users/:id - 删除用户
            """.trimIndent())

        // 生成文档
        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        // Then: 等待生成完成
        composeTestRule.waitUntil(timeoutMillis = 45000) {
            composeTestRule.onAllNodesWithTag("generatedDocumentPreview")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证API文档包含请求示例
        composeTestRule.onNodeWithText("请求示例")
            .assertExists()

        // 验证包含响应示例
        composeTestRule.onNodeWithText("响应示例")
            .assertExists()
    }

    @Test
    fun testAIDocumentGenerationFlow_NetworkError() {
        // Given: 网络连接失败（需要配置Mock）

        // When: 尝试生成文档
        composeTestRule.onNodeWithText("技术设计文档")
            .performClick()

        composeTestRule.onNodeWithText("标准技术设计模板")
            .performClick()

        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        // Then: 验证错误提示
        composeTestRule.waitUntil(timeoutMillis = 10000) {
            composeTestRule.onAllNodesWithText("网络连接失败")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule.onNodeWithText("网络连接失败")
            .assertExists()

        // 验证重试按钮
        composeTestRule.onNodeWithText("重试")
            .assertExists()
    }

    @Test
    fun testAIDocumentEditBeforeSave() {
        // Given: 已生成文档
        composeTestRule.onNodeWithText("技术设计文档")
            .performClick()

        composeTestRule.onNodeWithText("标准技术设计模板")
            .performClick()

        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 45000) {
            composeTestRule.onAllNodesWithTag("generatedDocumentPreview")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // When: 用户点击编辑按钮
        composeTestRule.onNodeWithText("编辑文档")
            .performClick()

        // Then: 验证进入编辑模式
        composeTestRule.onNodeWithTag("documentEditor")
            .assertExists()
            .assertIsDisplayed()

        // 修改文档内容
        composeTestRule.onNodeWithTag("documentContentInput")
            .performTextInput("\n\n## 新增章节\n补充的内容...")

        // 保存编辑
        composeTestRule.onNodeWithText("保存编辑")
            .performClick()

        // 验证预览更新
        composeTestRule.onNodeWithText("新增章节")
            .assertExists()
    }

    @Test
    fun testAIDocumentRegenerateSection() {
        // Given: 已生成文档
        composeTestRule.onNodeWithText("技术设计文档")
            .performClick()

        composeTestRule.onNodeWithText("标准技术设计模板")
            .performClick()

        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 45000) {
            composeTestRule.onAllNodesWithTag("generatedDocumentPreview")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // When: 用户选择重新生成某个章节
        composeTestRule.onNodeWithTag("section_系统架构")
            .performLongClick()

        // Then: 验证章节操作菜单显示
        composeTestRule.onNodeWithText("重新生成此章节")
            .assertExists()
            .performClick()

        // 验证Loading状态
        composeTestRule.onNodeWithTag("sectionLoadingIndicator")
            .assertExists()

        // 等待章节重新生成
        composeTestRule.waitUntil(timeoutMillis = 30000) {
            composeTestRule.onAllNodesWithTag("sectionLoadingIndicator")
                .fetchSemanticsNodes().isEmpty()
        }
    }

    @Test
    fun testAIDocumentExportFormats() {
        // Given: 已生成文档
        composeTestRule.onNodeWithText("技术设计文档")
            .performClick()

        composeTestRule.onNodeWithText("标准技术设计模板")
            .performClick()

        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 45000) {
            composeTestRule.onAllNodesWithTag("generatedDocumentPreview")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // When: 用户点击导出按钮
        composeTestRule.onNodeWithText("导出")
            .performClick()

        // Then: 验证导出格式选择对话框
        composeTestRule.onNodeWithTag("exportFormatDialog")
            .assertExists()

        // 验证支持的导出格式
        composeTestRule.onNodeWithText("Markdown")
            .assertExists()

        composeTestRule.onNodeWithText("PDF")
            .assertExists()

        composeTestRule.onNodeWithText("Word")
            .assertExists()

        // 选择Markdown格式
        composeTestRule.onNodeWithText("Markdown")
            .performClick()

        // 验证导出成功
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule.onAllNodesWithText("导出成功")
                .fetchSemanticsNodes().isNotEmpty()
        }
    }

    @Test
    fun testAIDocumentTemplateCustomization() {
        // Given: 用户在文档类型选择界面

        // When: 选择自定义模板
        composeTestRule.onNodeWithText("技术设计文档")
            .performClick()

        composeTestRule.onNodeWithText("自定义模板")
            .performClick()

        // Then: 验证模板配置界面显示
        composeTestRule.onNodeWithTag("templateConfigDialog")
            .assertExists()

        // 添加自定义章节
        composeTestRule.onNodeWithText("添加章节")
            .performClick()

        composeTestRule.onNodeWithTag("sectionNameInput")
            .performTextInput("安全考虑")

        composeTestRule.onNodeWithTag("sectionDescriptionInput")
            .performTextInput("描述系统的安全措施和防护机制")

        composeTestRule.onNodeWithText("确认")
            .performClick()

        // 验证章节已添加
        composeTestRule.onNodeWithText("安全考虑")
            .assertExists()

        // 使用自定义模板生成
        composeTestRule.onNodeWithText("使用此模板")
            .performClick()

        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 45000) {
            composeTestRule.onAllNodesWithTag("generatedDocumentPreview")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // 验证生成的文档包含自定义章节
        composeTestRule.onNodeWithText("安全考虑")
            .assertExists()
    }

    @Test
    fun testAIDocumentVersionHistory() {
        // Given: 已保存过文档
        composeTestRule.onNodeWithText("技术设计文档")
            .performClick()

        composeTestRule.onNodeWithText("标准技术设计模板")
            .performClick()

        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 45000) {
            composeTestRule.onAllNodesWithTag("generatedDocumentPreview")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule.onNodeWithText("保存文档")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 10000) {
            composeTestRule.onAllNodesWithText("文档保存成功")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // When: 用户查看版本历史
        composeTestRule.onNodeWithText("版本历史")
            .performClick()

        // Then: 验证版本历史列表显示
        composeTestRule.onNodeWithTag("versionHistoryList")
            .assertExists()
            .assertIsDisplayed()

        // 验证至少有一个版本记录
        composeTestRule.onNodeWithTag("versionItem_0")
            .assertExists()
    }

    @Test
    fun testAIDocumentCollaboration() {
        // Given: 已生成文档
        composeTestRule.onNodeWithText("技术设计文档")
            .performClick()

        composeTestRule.onNodeWithText("标准技术设计模板")
            .performClick()

        composeTestRule.onNodeWithText("生成文档")
            .performClick()

        composeTestRule.waitUntil(timeoutMillis = 45000) {
            composeTestRule.onAllNodesWithTag("generatedDocumentPreview")
                .fetchSemanticsNodes().isNotEmpty()
        }

        // When: 用户点击分享按钮
        composeTestRule.onNodeWithText("分享")
            .performClick()

        // Then: 验证分享选项对话框
        composeTestRule.onNodeWithTag("shareOptionsDialog")
            .assertExists()

        // 验证分享选项
        composeTestRule.onNodeWithText("生成分享链接")
            .assertExists()

        composeTestRule.onNodeWithText("添加协作者")
            .assertExists()

        // 选择生成分享链接
        composeTestRule.onNodeWithText("生成分享链接")
            .performClick()

        // 验证分享链接生成成功
        composeTestRule.waitUntil(timeoutMillis = 5000) {
            composeTestRule.onAllNodesWithTag("shareLinkDisplay")
                .fetchSemanticsNodes().isNotEmpty()
        }

        composeTestRule.onNodeWithTag("shareLinkDisplay")
            .assertExists()

        // 验证复制按钮
        composeTestRule.onNodeWithText("复制链接")
            .assertExists()
    }
}

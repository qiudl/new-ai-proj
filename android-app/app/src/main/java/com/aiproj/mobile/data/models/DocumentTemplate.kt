package com.aiproj.mobile.data.models

data class DocumentTemplate(
    val id: String,
    val name: String,
    val description: String,
    val icon: String,
    val content: String
)

object DocumentTemplates {

    val MEETING_NOTES = DocumentTemplate(
        id = "meeting_notes",
        name = "会议纪要",
        description = "标准会议记录模板",
        icon = "📝",
        content = """
# 会议纪要

## 会议信息
- **日期**:
- **时间**:
- **地点**:
- **参会人员**:

## 会议议程
1.

## 讨论内容
### 议题一
- 讨论要点:
- 决议:

## 待办事项
- [ ] 任务1 - 负责人: - 截止日期:
- [ ] 任务2 - 负责人: - 截止日期:
        """.trimIndent()
    )

    val BUG_REPORT = DocumentTemplate(
        id = "bug_report",
        name = "Bug报告",
        description = "标准缺陷报告模板",
        icon = "🐛",
        content = """
# Bug报告

## Bug描述
简要描述发现的问题

## 复现步骤
1. 第一步
2. 第二步
3. 第三步

## 预期行为
描述期望的正确行为

## 实际行为
描述实际发生的错误行为

## 环境信息
- 设备型号:
- 系统版本:
- App版本:

## 优先级
- [ ] P0 - 紧急
- [ ] P1 - 高
- [ ] P2 - 中
- [ ] P3 - 低
        """.trimIndent()
    )

    val FEATURE_SPEC = DocumentTemplate(
        id = "feature_spec",
        name = "需求文档",
        description = "功能需求规格说明",
        icon = "✨",
        content = """
# 功能需求文档

## 需求概述
### 背景
描述需求产生的背景和原因

### 目标
明确要达成的目标

## 功能详情
### 用户故事
作为[角色],我希望[功能],以便[价值]

### 功能范围
#### 包含功能
- 功能点1
- 功能点2

## 验收标准
- [ ] 标准1
- [ ] 标准2

## 时间规划
- 设计:
- 开发:
- 测试:
        """.trimIndent()
    )

    fun getAll(): List<DocumentTemplate> {
        return listOf(MEETING_NOTES, BUG_REPORT, FEATURE_SPEC)
    }

    fun getById(id: String): DocumentTemplate? {
        return getAll().find { it.id == id }
    }
}

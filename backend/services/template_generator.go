package services

import (
	"fmt"
	"strings"
	"time"

	"ai-project-backend/models"
)

// TemplateGenerator 模板内容生成器
type TemplateGenerator struct {
	// 未来可能需要数据库访问、AI服务等
}

// NewTemplateGenerator 创建模板生成器实例
func NewTemplateGenerator() *TemplateGenerator {
	return &TemplateGenerator{}
}

// Generate 根据模板类型和上下文生成文档内容
func (g *TemplateGenerator) Generate(templateType models.TemplateType, context models.TemplateContext) (string, map[string]interface{}, error) {
	switch templateType {
	case models.TemplateBugReport:
		return g.generateBugReport(context)
	case models.TemplateFeatureSpec:
		return g.generateFeatureSpec(context)
	case models.TemplateMeetingNotes:
		return g.generateMeetingNotes(context)
	case models.TemplateProjectPlan:
		return g.generateProjectPlan(context)
	case models.TemplateAPIDocumentation:
		return g.generateAPIDocumentation(context)
	case models.TemplateTestPlan:
		return g.generateTestPlan(context)
	case models.TemplateUserStory:
		return g.generateUserStory(context)
	case models.TemplateTechnicalDesign:
		return g.generateTechnicalDesign(context)
	default:
		return "", nil, fmt.Errorf("不支持的模板类型: %s", templateType)
	}
}

// generateBugReport 生成Bug报告
func (g *TemplateGenerator) generateBugReport(ctx models.TemplateContext) (string, map[string]interface{}, error) {
	title := getOrDefault(ctx.Title, "Bug报告")
	requirements := getOrDefault(ctx.Requirements, "待补充")

	// 智能解析requirements生成更详细的内容
	reproduceSteps := g.extractReproduceSteps(requirements)
	expectedBehavior := g.extractExpectedBehavior(requirements)
	actualBehavior := g.extractActualBehavior(requirements)

	// 根据title推断相关信息
	environmentHints := g.inferEnvironmentInfo(title)

	content := fmt.Sprintf(`# %s

## 问题描述
%s

## 复现步骤
%s

## 预期行为
%s

## 实际行为
%s

## 环境信息
%s

## 截图/日志
如有相关截图或日志，请在此处添加

## 优先级
%s

## 指派给
%s

## 截止日期
%s

---
*此文档由模板自动生成，请根据实际情况修改*
`,
		title,
		requirements,
		reproduceSteps,
		expectedBehavior,
		actualBehavior,
		environmentHints,
		getOrDefault(ctx.Priority, "medium"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Deadline, "待定"))

	metadata := map[string]interface{}{
		"template_type": models.TemplateBugReport,
		"generated_at":  time.Now().Format(time.RFC3339),
		"title":         title,
	}

	return content, metadata, nil
}

// extractReproduceSteps 从requirements中提取复现步骤
func (g *TemplateGenerator) extractReproduceSteps(requirements string) string {
	if requirements == "" || requirements == "待补充" {
		return `1. 打开应用
2. 执行操作...
3. 观察结果`
	}

	// 查找步骤相关的关键词
	lines := strings.Split(requirements, "\n")
	var steps []string
	foundSteps := false

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// 检测是否包含步骤相关的关键词
		lowerLine := strings.ToLower(line)
		if strings.Contains(lowerLine, "步骤") || strings.Contains(lowerLine, "复现") ||
		   strings.Contains(lowerLine, "操作") || strings.Contains(lowerLine, "step") {
			foundSteps = true
			continue
		}

		// 如果找到了步骤部分，收集后续的步骤描述
		if foundSteps {
			// 如果遇到其他章节关键词，停止收集
			if strings.Contains(lowerLine, "预期") || strings.Contains(lowerLine, "实际") ||
			   strings.Contains(lowerLine, "环境") || strings.Contains(lowerLine, "expected") {
				break
			}

			// 如果行以数字开头，认为是步骤
			if len(line) > 0 && (line[0] >= '0' && line[0] <= '9' || line[0] == '-' || line[0] == '*') {
				steps = append(steps, line)
			} else if len(steps) > 0 {
				// 如果已经收集了步骤，且当前行不是步骤格式，则停止
				break
			}
		}
	}

	if len(steps) > 0 {
		return strings.Join(steps, "\n")
	}

	// 如果没有找到明确的步骤，尝试从描述中智能生成
	if strings.Contains(strings.ToLower(requirements), "登录") {
		return `1. 打开应用登录页面
2. 输入用户名和密码
3. 点击登录按钮
4. 观察登录结果`
	} else if strings.Contains(strings.ToLower(requirements), "创建") ||
	          strings.Contains(strings.ToLower(requirements), "新建") {
		return `1. 打开应用
2. 点击创建/新建按钮
3. 填写相关信息
4. 点击保存/提交
5. 观察结果`
	}

	// 默认使用简化的步骤描述
	return fmt.Sprintf(`1. 打开应用
2. 尝试重现以下场景：%s
3. 观察实际行为`, strings.Split(requirements, "\n")[0])
}

// extractExpectedBehavior 从requirements中提取预期行为
func (g *TemplateGenerator) extractExpectedBehavior(requirements string) string {
	if requirements == "" || requirements == "待补充" {
		return "描述应该发生的正确行为"
	}

	lines := strings.Split(requirements, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		lowerLine := strings.ToLower(line)

		// 查找包含"预期"、"应该"、"期望"等关键词的行
		if strings.Contains(lowerLine, "预期") || strings.Contains(lowerLine, "应该") ||
		   strings.Contains(lowerLine, "期望") || strings.Contains(lowerLine, "expected") ||
		   strings.Contains(lowerLine, "should") {
			// 移除"预期："等前缀
			result := strings.TrimPrefix(line, "预期:")
			result = strings.TrimPrefix(result, "预期行为:")
			result = strings.TrimPrefix(result, "Expected:")
			result = strings.TrimSpace(result)
			if result != "" {
				return result
			}
		}
	}

	// 如果找不到明确的预期行为，根据问题类型推断
	if strings.Contains(strings.ToLower(requirements), "应该") {
		// 提取"应该"后面的内容
		parts := strings.Split(requirements, "应该")
		if len(parts) > 1 {
			expected := strings.TrimSpace(parts[1])
			if expected != "" {
				return "应该" + strings.Split(expected, "\n")[0]
			}
		}
	}

	return "系统应该正常工作，完成预期的功能操作"
}

// extractActualBehavior 从requirements中提取实际行为
func (g *TemplateGenerator) extractActualBehavior(requirements string) string {
	if requirements == "" || requirements == "待补充" {
		return "描述实际观察到的错误行为"
	}

	lines := strings.Split(requirements, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		lowerLine := strings.ToLower(line)

		// 查找包含"实际"、"但是"、"却"等关键词的行
		if strings.Contains(lowerLine, "实际") || strings.Contains(lowerLine, "但是") ||
		   strings.Contains(lowerLine, "却") || strings.Contains(lowerLine, "actual") ||
		   strings.Contains(lowerLine, "however") || strings.Contains(lowerLine, "but") {
			// 移除"实际："等前缀
			result := strings.TrimPrefix(line, "实际:")
			result = strings.TrimPrefix(result, "实际行为:")
			result = strings.TrimPrefix(result, "Actual:")
			result = strings.TrimSpace(result)
			if result != "" {
				return result
			}
		}
	}

	// 如果找不到明确的实际行为，使用requirements的主要描述
	// 获取第一句话作为实际行为描述
	firstLine := strings.Split(requirements, "\n")[0]
	if len(firstLine) > 10 {
		return firstLine
	}

	return "系统出现异常行为，未能正确完成预期功能"
}

// inferEnvironmentInfo 根据title推断环境信息
func (g *TemplateGenerator) inferEnvironmentInfo(title string) string {
	lowerTitle := strings.ToLower(title)

	envInfo := []string{}

	// 根据title中的关键词推断相关环境
	if strings.Contains(lowerTitle, "ios") || strings.Contains(lowerTitle, "iphone") {
		envInfo = append(envInfo, "- 操作系统: iOS")
		envInfo = append(envInfo, "- 设备型号: iPhone")
	} else if strings.Contains(lowerTitle, "android") {
		envInfo = append(envInfo, "- 操作系统: Android")
		envInfo = append(envInfo, "- 设备型号: ")
	} else if strings.Contains(lowerTitle, "web") || strings.Contains(lowerTitle, "浏览器") ||
	          strings.Contains(lowerTitle, "chrome") || strings.Contains(lowerTitle, "safari") {
		envInfo = append(envInfo, "- 操作系统: ")
		envInfo = append(envInfo, "- 浏览器/版本: ")
	} else {
		envInfo = append(envInfo, "- 操作系统:")
		envInfo = append(envInfo, "- 浏览器/版本:")
	}

	// 添加通用环境信息
	envInfo = append(envInfo, "- 应用版本:")

	// 如果title中提到后端或API，添加后端环境信息
	if strings.Contains(lowerTitle, "api") || strings.Contains(lowerTitle, "后端") ||
	   strings.Contains(lowerTitle, "backend") || strings.Contains(lowerTitle, "接口") {
		envInfo = append(envInfo, "- 后端环境: 测试环境/生产环境")
		envInfo = append(envInfo, "- API版本:")
	}

	return strings.Join(envInfo, "\n")
}

// generateFeatureSpec 生成功能规格说明
func (g *TemplateGenerator) generateFeatureSpec(ctx models.TemplateContext) (string, map[string]interface{}, error) {
	title := getOrDefault(ctx.Title, "功能规格说明")
	requirements := getOrDefault(ctx.Requirements, "待补充功能需求描述")

	content := fmt.Sprintf(`# %s

## 1. 功能概述
%s

## 2. 用户故事
作为【用户角色】，我希望【功能描述】，以便【价值说明】

## 3. 功能需求

### 3.1 核心功能
- [ ] 功能点1
- [ ] 功能点2
- [ ] 功能点3

### 3.2 辅助功能
- [ ] 辅助功能1
- [ ] 辅助功能2

## 4. 非功能需求
- 性能要求：
- 安全要求：
- 可用性要求：
- 兼容性要求：

## 5. 界面设计
### 5.1 页面布局
描述主要界面布局

### 5.2 交互流程
` + "```mermaid" + `
graph LR
A[开始] --> B[用户操作]
B --> C[系统响应]
C --> D[结束]
` + "```" + `

## 6. 技术实现建议
- 前端技术栈：
- 后端技术栈：
- 数据库设计：

## 7. 验收标准
1. 标准1
2. 标准2
3. 标准3

## 8. 风险评估
- 技术风险：
- 业务风险：
- 时间风险：

## 9. 项目信息
- **优先级**: %s
- **负责人**: %s
- **截止日期**: %s
- **标签**: %s

---
*文档生成时间: %s*
`,
		title,
		requirements,
		getOrDefault(ctx.Priority, "medium"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Deadline, "待定"),
		strings.Join(ctx.Tags, ", "),
		time.Now().Format("2006-01-02 15:04:05"))

	metadata := map[string]interface{}{
		"template_type": models.TemplateFeatureSpec,
		"generated_at":  time.Now().Format(time.RFC3339),
		"title":         title,
	}

	return content, metadata, nil
}

// generateTechnicalDesign 生成技术设计文档
func (g *TemplateGenerator) generateTechnicalDesign(ctx models.TemplateContext) (string, map[string]interface{}, error) {
	title := getOrDefault(ctx.Title, "技术设计文档")
	requirements := getOrDefault(ctx.Requirements, "待补充技术需求")

	content := fmt.Sprintf(`# %s

## 1. 设计目标
%s

## 2. 系统架构

### 2.1 总体架构
` + "```" + `
┌─────────────┐
│  前端层     │
├─────────────┤
│  API网关    │
├─────────────┤
│  服务层     │
├─────────────┤
│  数据层     │
└─────────────┘
` + "```" + `

### 2.2 技术栈选型
- **前端**:
- **后端**:
- **数据库**:
- **缓存**:
- **消息队列**:

## 3. 核心模块设计

### 3.1 模块A
- **职责**:
- **接口**:
- **依赖**:

### 3.2 模块B
- **职责**:
- **接口**:
- **依赖**:

## 4. 数据模型设计

### 4.1 核心实体
` + "```sql" + `
CREATE TABLE example (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
` + "```" + `

### 4.2 ER图
[待补充实体关系图]

## 5. API设计

### 5.1 RESTful API

#### 5.1.1 获取资源
` + "```http" + `
GET /api/v1/resources
` + "```" + `

#### 5.1.2 创建资源
` + "```http" + `
POST /api/v1/resources
Content-Type: application/json

{
  "name": "example"
}
` + "```" + `

## 6. 安全设计
- 认证机制：JWT Token
- 授权机制：RBAC
- 数据加密：
- 防护措施：

## 7. 性能优化
- 数据库优化：索引设计、查询优化
- 缓存策略：Redis缓存热点数据
- 并发控制：
- 负载均衡：

## 8. 可扩展性设计
- 水平扩展：
- 垂直扩展：
- 微服务拆分：

## 9. 监控与日志
- 日志收集：
- 性能监控：
- 告警机制：

## 10. 部署方案
- 容器化：Docker
- 编排：Kubernetes
- CI/CD：

## 11. 项目信息
- **优先级**: %s
- **负责人**: %s
- **截止日期**: %s
- **标签**: %s

---
*文档生成时间: %s*
*此文档为技术设计初稿，需要根据实际情况调整*
`,
		title,
		requirements,
		getOrDefault(ctx.Priority, "medium"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Deadline, "待定"),
		strings.Join(ctx.Tags, ", "),
		time.Now().Format("2006-01-02 15:04:05"))

	metadata := map[string]interface{}{
		"template_type": models.TemplateTechnicalDesign,
		"generated_at":  time.Now().Format(time.RFC3339),
		"title":         title,
	}

	return content, metadata, nil
}

// generateMeetingNotes 生成会议纪要
func (g *TemplateGenerator) generateMeetingNotes(ctx models.TemplateContext) (string, map[string]interface{}, error) {
	title := getOrDefault(ctx.Title, "会议纪要")
	requirements := getOrDefault(ctx.Requirements, "")

	content := fmt.Sprintf(`# %s

## 📋 会议基本信息

| 项目 | 内容 |
|------|------|
| **会议时间** | %s |
| **会议地点** | 线上/线下 |
| **会议类型** | 例会/专题讨论/项目启动/复盘 |
| **主持人** | %s |
| **记录人** | %s |
| **参会人员** | 待补充 |
| **缺席人员** | 无 |

## 🎯 会议目标

%s

## 📝 议题与讨论

### 议题1: [议题名称]

**背景**
- 简要说明议题背景

**讨论要点**
- 要点1
- 要点2
- 要点3

**决策结果**
- ✅ 决定采取的方案
- ❌ 否决的方案及原因

**行动项**
- [ ] 具体行动 - 负责人: @XXX - 截止: YYYY-MM-DD

### 议题2: [议题名称]

**背景**
- 简要说明议题背景

**讨论要点**
- 要点1

**决策结果**
- 待定/已确定

## ✅ 待办事项汇总

| 任务描述 | 负责人 | 优先级 | 截止日期 | 状态 |
|---------|-------|--------|---------|------|
| 任务1 | %s | %s | %s | 待开始 |
| 任务2 | 待分配 | Medium | 待定 | 待开始 |

## 📊 会议效果评估

- 议题完成度: __/%%
- 决策明确度: ⭐⭐⭐⭐⭐
- 参与度: 高/中/低
- 改进建议:

## 📅 下次会议安排

- **时间**: 待定
- **地点**: 待定
- **议题预告**:
  1. 上次待办事项跟进
  2. 新议题1
  3. 新议题2

## 📎 附件与参考

- 会议PPT: [链接]
- 相关文档: [链接]
- 数据报表: [链接]

---

**会议记录人**: %s
**生成时间**: %s
**状态**: 🔴 草稿 / 🟡 待审核 / 🟢 已确认
`,
		title,
		time.Now().Format("2006-01-02 15:04"),
		getOrDefault(ctx.Assignee, "待指定"),
		getOrDefault(ctx.Assignee, "待指定"),
		requirements,
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Priority, "Medium"),
		getOrDefault(ctx.Deadline, "待定"),
		getOrDefault(ctx.Assignee, "待指定"),
		time.Now().Format("2006-01-02 15:04:05"))

	metadata := map[string]interface{}{
		"template_type": models.TemplateMeetingNotes,
		"generated_at":  time.Now().Format(time.RFC3339),
	}

	return content, metadata, nil
}

// generateProjectPlan 生成项目计划
func (g *TemplateGenerator) generateProjectPlan(ctx models.TemplateContext) (string, map[string]interface{}, error) {
	title := getOrDefault(ctx.Title, "项目计划")
	requirements := getOrDefault(ctx.Requirements, "待补充项目背景和需求")

	content := fmt.Sprintf(`# %s

## 📊 项目概述

**项目背景**
%s

**项目范围**
- 包含范围: [明确要做的事情]
- 不包含范围: [明确不做的事情]

**项目价值**
- 业务价值:
- 技术价值:
- 用户价值:

## 🎯 项目目标 (SMART原则)

| 目标 | 具体指标 | 可衡量性 | 达成时间 | 优先级 |
|------|---------|---------|---------|-------|
| 目标1: [Specific] | [指标] | [如何衡量] | %s | %s |
| 目标2: [Specific] | [指标] | [如何衡量] | 待定 | Medium |
| 目标3: [Specific] | [指标] | [如何衡量] | 待定 | Low |

## 📅 项目时间线与里程碑

` + "```mermaid" + `
gantt
    title 项目时间线
    dateFormat  YYYY-MM-DD
    section 阶段1-需求分析
    需求调研           :a1, 2025-01-01, 7d
    需求文档编写       :after a1, 5d
    section 阶段2-设计开发
    系统设计           :2025-01-15, 10d
    功能开发           :2025-01-25, 20d
    section 阶段3-测试上线
    测试验证           :2025-02-20, 10d
    上线部署           :2025-03-05, 5d
` + "```" + `

### 关键里程碑

| 里程碑 | 交付物 | 验收标准 | 截止日期 | 负责人 | 状态 |
|-------|-------|---------|---------|-------|------|
| M1: 需求确认 | 需求文档v1.0 | 业务方签字确认 | 待定 | %s | 🔴 未开始 |
| M2: 设计评审 | 技术设计文档 | 技术评审通过 | 待定 | %s | 🔴 未开始 |
| M3: 功能完成 | 可运行版本 | 核心功能100%%完成 | 待定 | %s | 🔴 未开始 |
| M4: 测试通过 | 测试报告 | 0严重Bug | 待定 | %s | 🔴 未开始 |
| M5: 正式上线 | 生产环境部署 | 用户可访问 | %s | %s | 🔴 未开始 |

## 👥 团队与资源分配

### 核心团队

| 角色 | 姓名 | 职责 | 投入度 | 联系方式 |
|------|------|------|--------|---------|
| 项目经理 | %s | 整体协调、进度把控 | 100%% | - |
| 技术负责人 | 待定 | 技术架构、难点攻关 | 80%% | - |
| 前端开发 | 待定 | 前端功能实现 | 100%% | - |
| 后端开发 | 待定 | 后端功能实现 | 100%% | - |
| 测试工程师 | 待定 | 质量保证、自动化测试 | 100%% | - |
| UI/UX设计师 | 待定 | 界面设计、交互优化 | 50%% | - |

### 预算估算

| 类别 | 子项 | 预算 | 实际 | 差异 |
|------|------|------|------|------|
| 人力成本 | 开发团队 | ¥XXX,XXX | - | - |
| 基础设施 | 云服务、域名等 | ¥XX,XXX | - | - |
| 第三方服务 | API、工具订阅 | ¥X,XXX | - | - |
| **总计** | | **¥XXX,XXX** | **-** | **-** |

## 🎨 技术栈选型

**前端技术**
- 框架: Vue 3 / React / Angular
- UI组件库: Element Plus / Ant Design
- 状态管理: Pinia / Redux
- 构建工具: Vite / Webpack

**后端技术**
- 语言: Go / Python / Java / Node.js
- 框架: Gin / FastAPI / Spring Boot / Express
- 数据库: PostgreSQL / MySQL / MongoDB
- 缓存: Redis
- 消息队列: RabbitMQ / Kafka (如需要)

**DevOps**
- 版本控制: Git (GitHub/GitLab)
- CI/CD: GitHub Actions / GitLab CI / Jenkins
- 容器化: Docker
- 编排: Kubernetes (如需要)
- 监控: Prometheus + Grafana

## ⚠️ 风险管理

### 风险识别与应对

| 风险类别 | 风险描述 | 影响程度 | 发生概率 | 应对策略 | 责任人 |
|---------|---------|---------|---------|---------|-------|
| 技术风险 | 新技术栈学习成本高 | 🔴 高 | 🟡 中 | 提前技术预研、培训 | 技术负责人 |
| 需求风险 | 需求变更频繁 | 🟡 中 | 🟢 低 | 需求冻结机制、变更评审 | 项目经理 |
| 资源风险 | 关键人员离职 | 🔴 高 | 🟢 低 | 知识共享、文档完善 | 项目经理 |
| 时间风险 | 开发进度延期 | 🟡 中 | 🟡 中 | 每周进度review、弹性buffer | 项目经理 |
| 质量风险 | Bug过多影响上线 | 🔴 高 | 🟡 中 | 自动化测试、Code Review | 测试负责人 |

**风险监控机制**
- 每周风险评审会议
- 风险登记册定期更新
- 预警阈值: 高风险>3个立即启动应急预案

## 📈 项目成功标准

**量化指标**
- [ ] 按时交付率: ≥95%%
- [ ] 功能完成度: 100%%
- [ ] 测试通过率: ≥99%%
- [ ] 用户满意度: ≥4.5/5.0
- [ ] 系统可用性: ≥99.9%%

**质量指标**
- [ ] 代码覆盖率: ≥80%%
- [ ] 严重Bug数: 0
- [ ] 性能指标: 响应时间<500ms
- [ ] 安全扫描: 0高危漏洞

## 📋 沟通计划

| 会议类型 | 频率 | 参与人 | 目的 |
|---------|------|-------|------|
| 项目启动会 | 1次 | 全体成员 | 明确目标、分工 |
| 每日站会 | 每日 | 开发团队 | 同步进度、识别障碍 |
| 周会 | 每周 | 全体成员 | 进度汇报、风险评估 |
| 评审会 | 按需 | 相关方 | 需求/设计/代码评审 |
| 复盘会 | 项目结束 | 全体成员 | 总结经验教训 |

## 📚 项目文档清单

- [x] 项目计划书 (本文档)
- [ ] 需求规格说明书
- [ ] 技术设计文档
- [ ] 接口文档
- [ ] 测试计划
- [ ] 用户手册
- [ ] 运维手册
- [ ] 项目总结报告

---

**项目基本信息**
- **优先级**: %s
- **项目经理**: %s
- **计划开始**: 待定
- **计划结束**: %s
- **当前状态**: 🔴 规划中 / 🟡 进行中 / 🟢 已完成
- **文档版本**: v1.0
- **生成时间**: %s
`,
		title,
		requirements,
		getOrDefault(ctx.Deadline, "待定"),
		getOrDefault(ctx.Priority, "High"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Deadline, "待定"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Priority, "High"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Deadline, "待定"),
		time.Now().Format("2006-01-02 15:04:05"))

	metadata := map[string]interface{}{
		"template_type": models.TemplateProjectPlan,
		"generated_at":  time.Now().Format(time.RFC3339),
	}

	return content, metadata, nil
}

// generateAPIDocumentation 生成API文档
func (g *TemplateGenerator) generateAPIDocumentation(ctx models.TemplateContext) (string, map[string]interface{}, error) {
	title := getOrDefault(ctx.Title, "API文档")
	requirements := getOrDefault(ctx.Requirements, "待补充API描述和用途")

	content := fmt.Sprintf(`# %s

## 📚 API 概述

**接口描述**
%s

**Base URL**
` + "```" + `
生产环境: https://api.example.com/v1
测试环境: https://api-test.example.com/v1
开发环境: http://localhost:8080/api/v1
` + "```" + `

**版本信息**
- 当前版本: v1.0
- 最后更新: %s
- 负责人: %s

## 🔐 认证方式

### Bearer Token 认证

所有API请求都需要在Header中携带认证令牌:

` + "```http" + `
Authorization: Bearer <your_access_token>
` + "```" + `

### 获取Token

` + "```http" + `
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
` + "```" + `

**响应示例**:
` + "```json" + `
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 7200
  }
}
` + "```" + `

## 📡 接口列表

### 1. 创建资源

**接口地址**: ` + "`POST /api/v1/resources`" + `

**请求头**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Authorization | string | 是 | Bearer Token |
| Content-Type | string | 是 | application/json |

**请求参数**:
| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| name | string | 是 | 资源名称 | "新资源" |
| description | string | 否 | 资源描述 | "这是一个测试资源" |
| type | string | 是 | 资源类型 | "document" |
| metadata | object | 否 | 元数据 | {"key": "value"} |
| tags | array | 否 | 标签列表 | ["tag1", "tag2"] |

**请求示例**:
` + "```http" + `
POST /api/v1/resources
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "name": "新资源",
  "description": "这是一个测试资源",
  "type": "document",
  "metadata": {
    "author": "张三",
    "version": "1.0"
  },
  "tags": ["重要", "待审核"]
}
` + "```" + `

**成功响应** (HTTP 201):
` + "```json" + `
{
  "success": true,
  "message": "创建成功",
  "data": {
    "id": 12345,
    "name": "新资源",
    "description": "这是一个测试资源",
    "type": "document",
    "status": "active",
    "created_at": "2025-10-01T12:00:00Z",
    "updated_at": "2025-10-01T12:00:00Z"
  },
  "timestamp": "2025-10-01T12:00:00Z"
}
` + "```" + `

**错误响应** (HTTP 400):
` + "```json" + `
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "参数验证失败: name不能为空",
    "details": {
      "field": "name",
      "constraint": "required"
    }
  },
  "timestamp": "2025-10-01T12:00:00Z"
}
` + "```" + `

---

### 2. 获取资源列表

**接口地址**: ` + "`GET /api/v1/resources`" + `

**查询参数**:
| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| page | integer | 否 | 页码 | 1 |
| limit | integer | 否 | 每页数量 | 20 |
| type | string | 否 | 资源类型筛选 | - |
| keyword | string | 否 | 关键词搜索 | - |
| sort_by | string | 否 | 排序字段 | created_at |
| order | string | 否 | 排序方向 (asc/desc) | desc |

**请求示例**:
` + "```http" + `
GET /api/v1/resources?page=1&limit=20&type=document&sort_by=created_at&order=desc
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
` + "```" + `

**成功响应** (HTTP 200):
` + "```json" + `
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 12345,
        "name": "资源1",
        "type": "document",
        "created_at": "2025-10-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
` + "```" + `

---

### 3. 获取单个资源

**接口地址**: ` + "`GET /api/v1/resources/{id}`" + `

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | integer | 是 | 资源ID |

**请求示例**:
` + "```http" + `
GET /api/v1/resources/12345
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
` + "```" + `

**成功响应** (HTTP 200):
` + "```json" + `
{
  "success": true,
  "data": {
    "id": 12345,
    "name": "资源1",
    "description": "详细描述",
    "type": "document",
    "metadata": {},
    "created_at": "2025-10-01T12:00:00Z",
    "updated_at": "2025-10-01T12:00:00Z"
  }
}
` + "```" + `

---

### 4. 更新资源

**接口地址**: ` + "`PUT /api/v1/resources/{id}`" + `

**请求示例**:
` + "```http" + `
PUT /api/v1/resources/12345
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "name": "更新后的名称",
  "description": "更新后的描述"
}
` + "```" + `

**成功响应** (HTTP 200):
` + "```json" + `
{
  "success": true,
  "message": "更新成功",
  "data": {
    "id": 12345,
    "name": "更新后的名称",
    "updated_at": "2025-10-01T13:00:00Z"
  }
}
` + "```" + `

---

### 5. 删除资源

**接口地址**: ` + "`DELETE /api/v1/resources/{id}`" + `

**请求示例**:
` + "```http" + `
DELETE /api/v1/resources/12345
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
` + "```" + `

**成功响应** (HTTP 200):
` + "```json" + `
{
  "success": true,
  "message": "删除成功"
}
` + "```" + `

## 📋 通用响应格式

### 成功响应

` + "```json" + `
{
  "success": true,
  "message": "操作成功提示信息",
  "data": {}, // 实际数据
  "timestamp": "2025-10-01T12:00:00Z"
}
` + "```" + `

### 错误响应

` + "```json" + `
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息",
    "details": {} // 错误详情(可选)
  },
  "timestamp": "2025-10-01T12:00:00Z"
}
` + "```" + `

## ⚠️ 错误码说明

### HTTP 状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|---------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功，无返回内容 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或Token过期 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突(如重复创建) |
| 422 | Unprocessable Entity | 业务逻辑验证失败 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务暂时不可用 |

### 业务错误码

| 错误码 | 说明 | HTTP状态 |
|--------|------|----------|
| INVALID_PARAMETER | 参数验证失败 | 400 |
| UNAUTHORIZED | 未认证 | 401 |
| TOKEN_EXPIRED | Token已过期 | 401 |
| FORBIDDEN | 无访问权限 | 403 |
| NOT_FOUND | 资源不存在 | 404 |
| ALREADY_EXISTS | 资源已存在 | 409 |
| BUSINESS_ERROR | 业务逻辑错误 | 422 |
| RATE_LIMIT_EXCEEDED | 请求频率超限 | 429 |
| INTERNAL_ERROR | 服务器内部错误 | 500 |

## 🔄 速率限制

| 限制类型 | 限制值 | 说明 |
|---------|-------|------|
| 单IP限制 | 100请求/分钟 | 基于IP地址限制 |
| 单用户限制 | 1000请求/小时 | 基于用户Token限制 |
| 创建操作限制 | 50次/小时 | 写操作频率限制 |

**超限响应示例**:
` + "```json" + `
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求频率超限，请稍后重试",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2025-10-01T12:05:00Z"
    }
  }
}
` + "```" + `

## 📊 分页规范

所有列表类接口统一使用以下分页参数:

**请求参数**:
- ` + "`page`" + `: 页码，从1开始
- ` + "`limit`" + `: 每页数量，默认20，最大100

**响应格式**:
` + "```json" + `
{
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5,
      "has_next": true,
      "has_prev": false
    }
  }
}
` + "```" + `

## 🧪 测试环境

**测试账号**:
- 用户名: ` + "`test_user`" + `
- 密码: ` + "`test_password`" + `
- Token有效期: 24小时

**Postman Collection**: [下载链接]
**Swagger文档**: https://api-test.example.com/swagger-ui

## 📝 更新日志

### v1.0 (2025-10-01)
- ✅ 初始版本发布
- ✅ 基础CRUD接口
- ✅ Bearer Token认证

---

**API负责人**: %s
**优先级**: %s
**文档版本**: v1.0
**生成时间**: %s
**状态**: 🟢 已发布
`,
		title,
		requirements,
		time.Now().Format("2006-01-02"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Priority, "High"),
		time.Now().Format("2006-01-02 15:04:05"))

	metadata := map[string]interface{}{
		"template_type": models.TemplateAPIDocumentation,
		"generated_at":  time.Now().Format(time.RFC3339),
	}

	return content, metadata, nil
}

// generateTestPlan 生成测试计划
func (g *TemplateGenerator) generateTestPlan(ctx models.TemplateContext) (string, map[string]interface{}, error) {
	title := getOrDefault(ctx.Title, "测试计划")
	requirements := getOrDefault(ctx.Requirements, "待补充测试目标和范围")

	content := fmt.Sprintf(`# %s

## 📋 测试概述

**测试目标**
%s

**测试范围**
- ✅ 包含: 核心功能模块、关键业务流程、API接口、UI交互
- ❌ 不包含: 第三方服务、外部依赖、性能压测(单独计划)

**测试周期**
- 开始时间: 待定
- 结束时间: %s
- 测试周期: 10个工作日

## 🎯 测试策略

### 测试金字塔

` + "```" + `
        /\
       /E2E\      10%% - 端到端测试 (关键流程)
      /------\
     /集成测试\    30%% - 集成测试 (模块协作)
    /----------\
   /  单元测试   \  60%% - 单元测试 (函数/类)
  /--------------\
` + "```" + `

### 1. 单元测试 (Unit Testing)

**目标**: 验证独立模块的正确性
**覆盖率要求**: ≥80%%
**工具**:
- 前端: Jest / Vitest
- 后端: Go Testing / PyTest / JUnit

**测试内容**:
- ✅ 工具函数
- ✅ 业务逻辑类
- ✅ 数据验证
- ✅ 边界条件

### 2. 集成测试 (Integration Testing)

**目标**: 验证模块间协作
**工具**:
- API测试: Postman / Newman
- 数据库: TestContainers

**测试内容**:
- ✅ API端点
- ✅ 数据库操作
- ✅ 缓存逻辑
- ✅ 消息队列

### 3. 端到端测试 (E2E Testing)

**目标**: 验证完整业务流程
**工具**: Cypress / Playwright / Selenium
**测试内容**:
- ✅ 用户注册登录流程
- ✅ 核心业务流程
- ✅ 支付流程(如有)

### 4. 性能测试 (Performance Testing)

**目标**: 验证系统性能指标
**工具**: JMeter / k6 / Locust

**测试指标**:
| 指标 | 目标值 | 备注 |
|------|-------|------|
| 响应时间 | <500ms | 95分位 |
| 并发用户 | 1000+ | 同时在线 |
| TPS | >500 | 每秒事务数 |
| 错误率 | <0.1%% | 系统错误率 |

### 5. 安全测试 (Security Testing)

**测试内容**:
- ✅ SQL注入防护
- ✅ XSS攻击防护
- ✅ CSRF token验证
- ✅ 敏感数据加密
- ✅ 权限控制验证

**工具**: OWASP ZAP / Burp Suite

## 📊 测试用例设计

### 功能测试用例

| 用例ID | 模块 | 测试场景 | 前置条件 | 测试步骤 | 预期结果 | 优先级 | 状态 |
|--------|------|---------|---------|---------|---------|--------|------|
| TC-001 | 用户登录 | 正确用户名密码登录 | 用户已注册 | 1. 输入用户名<br>2. 输入密码<br>3. 点击登录 | 登录成功，跳转首页 | 🔴 P0 | ⏳ 待测试 |
| TC-002 | 用户登录 | 错误密码登录 | 用户已注册 | 1. 输入正确用户名<br>2. 输入错误密码<br>3. 点击登录 | 提示密码错误 | 🔴 P0 | ⏳ 待测试 |
| TC-003 | 数据创建 | 创建新文档 | 用户已登录 | 1. 点击新建<br>2. 填写内容<br>3. 点击保存 | 文档创建成功 | 🟡 P1 | ⏳ 待测试 |
| TC-004 | 数据查询 | 分页查询列表 | 数据库有数据 | 1. 访问列表页<br>2. 点击翻页 | 正确显示数据 | 🟡 P1 | ⏳ 待测试 |
| TC-005 | 数据更新 | 编辑已有文档 | 文档已存在 | 1. 打开文档<br>2. 修改内容<br>3. 保存 | 更新成功 | 🟡 P1 | ⏳ 待测试 |
| TC-006 | 数据删除 | 删除文档 | 文档已存在 | 1. 选择文档<br>2. 点击删除<br>3. 确认 | 删除成功 | 🟢 P2 | ⏳ 待测试 |
| TC-007 | 权限控制 | 无权限访问 | 普通用户登录 | 1. 访问管理页 | 提示无权限 | 🔴 P0 | ⏳ 待测试 |
| TC-008 | 数据验证 | 必填字段验证 | 用户已登录 | 1. 不填必填项<br>2. 点击提交 | 提示必填 | 🟡 P1 | ⏳ 待测试 |

### API测试用例

| 用例ID | 接口路径 | 方法 | 测试场景 | 请求参数 | 预期状态码 | 预期响应 | 状态 |
|--------|---------|------|---------|---------|-----------|---------|------|
| API-001 | /api/v1/login | POST | 正常登录 | {username, password} | 200 | {success: true, token} | ⏳ 待测试 |
| API-002 | /api/v1/login | POST | 参数缺失 | {username} | 400 | {success: false, error} | ⏳ 待测试 |
| API-003 | /api/v1/resources | GET | 获取列表 | ?page=1&limit=20 | 200 | {success: true, data} | ⏳ 待测试 |
| API-004 | /api/v1/resources | POST | 创建资源 | {name, type} | 201 | {success: true, id} | ⏳ 待测试 |
| API-005 | /api/v1/resources/:id | GET | 获取详情 | id=123 | 200 | {success: true, data} | ⏳ 待测试 |
| API-006 | /api/v1/resources/:id | PUT | 更新资源 | {name} | 200 | {success: true} | ⏳ 待测试 |
| API-007 | /api/v1/resources/:id | DELETE | 删除资源 | id=123 | 200 | {success: true} | ⏳ 待测试 |
| API-008 | /api/v1/resources/:id | GET | 资源不存在 | id=99999 | 404 | {success: false} | ⏳ 待测试 |

## 🌍 测试环境配置

### 测试环境清单

| 环境 | URL | 用途 | 负责人 | 状态 |
|------|-----|------|-------|------|
| 开发环境 | http://localhost:3000 | 开发自测 | 开发团队 | ✅ 可用 |
| 测试环境 | https://test.example.com | 功能测试 | %s | 🟡 准备中 |
| 预发布环境 | https://staging.example.com | UAT测试 | %s | 🔴 未就绪 |
| 生产环境 | https://www.example.com | 仅烟雾测试 | 运维团队 | - |

### 测试数据准备

**测试账号**:
` + "```" + `
管理员账号: admin / admin123
普通用户1: user1 / user123
普通用户2: user2 / user123
访客账号: guest / guest123
` + "```" + `

**测试数据集**:
- ✅ 基础数据: 100条标准数据
- ✅ 边界数据: 空值、最大值、特殊字符
- ✅ 压力数据: 10万条批量数据
- ✅ 异常数据: 非法格式、超长内容

### 环境依赖

| 依赖项 | 版本 | 说明 |
|--------|------|------|
| 数据库 | PostgreSQL 14+ | 测试数据库 |
| 缓存 | Redis 7+ | 缓存服务 |
| Node.js | v20+ | 前端运行环境 |
| Go | 1.21+ | 后端运行环境 |

## 📈 测试进度跟踪

### 测试完成度

` + "```mermaid" + `
pie title 测试用例执行状态
    "已通过" : 0
    "测试中" : 0
    "待测试" : 15
    "已失败" : 0
` + "```" + `

### 里程碑计划

| 里程碑 | 日期 | 交付物 | 状态 |
|--------|------|-------|------|
| 测试环境搭建 | Day 1-2 | 测试环境可用 | 🔴 未开始 |
| 测试用例编写 | Day 2-3 | 测试用例文档 | 🔴 未开始 |
| 单元测试执行 | Day 3-5 | 单元测试报告 | 🔴 未开始 |
| 集成测试执行 | Day 5-7 | 集成测试报告 | 🔴 未开始 |
| E2E测试执行 | Day 7-8 | E2E测试报告 | 🔴 未开始 |
| Bug修复验证 | Day 8-9 | Bug修复确认 | 🔴 未开始 |
| 测试总结报告 | Day 10 | 测试总结文档 | 🔴 未开始 |

## 🐛 缺陷管理

### 缺陷严重等级

| 等级 | 定义 | 修复时间 | 示例 |
|------|------|---------|------|
| 🔴 P0-阻塞 | 系统崩溃、数据丢失 | 24小时内 | 无法登录、数据库连接失败 |
| 🟡 P1-严重 | 核心功能不可用 | 48小时内 | 支付失败、无法提交表单 |
| 🟠 P2-一般 | 功能部分不可用 | 1周内 | 图片加载失败、搜索不准确 |
| 🟢 P3-轻微 | UI/文案问题 | 2周内 | 按钮颜色、文字错别字 |

### 缺陷统计

| 严重程度 | 新增 | 已修复 | 待修复 | 已关闭 |
|---------|------|-------|-------|-------|
| 🔴 P0 | 0 | 0 | 0 | 0 |
| 🟡 P1 | 0 | 0 | 0 | 0 |
| 🟠 P2 | 0 | 0 | 0 | 0 |
| 🟢 P3 | 0 | 0 | 0 | 0 |
| **合计** | **0** | **0** | **0** | **0** |

## ✅ 验收标准

### 通过标准

- [ ] 单元测试覆盖率 ≥ 80%%
- [ ] 所有P0用例100%%通过
- [ ] 所有P1用例 ≥ 95%%通过
- [ ] P0/P1级Bug全部修复
- [ ] 性能指标达标
- [ ] 安全扫描0高危漏洞
- [ ] 代码Review完成
- [ ] 测试报告已输出

### 上线阻塞条件

以下情况**禁止上线**:
- ❌ 存在P0级Bug
- ❌ P1级Bug修复率 < 90%%
- ❌ 核心流程测试未通过
- ❌ 性能指标未达标
- ❌ 存在高危安全漏洞

## 📄 测试交付物

- [ ] 测试计划文档 (本文档)
- [ ] 测试用例清单 (Excel/Jira)
- [ ] 自动化测试脚本
- [ ] 测试数据集
- [ ] 测试执行报告
- [ ] 缺陷统计报告
- [ ] 性能测试报告(如有)
- [ ] 安全测试报告(如有)
- [ ] 测试总结报告

## 👥 测试团队

| 角色 | 姓名 | 职责 | 工作量 |
|------|------|------|--------|
| 测试负责人 | %s | 测试策略、进度把控 | 100%% |
| 功能测试工程师 | 待定 | 功能测试执行 | 100%% |
| 自动化测试工程师 | 待定 | 自动化脚本开发 | 80%% |
| 性能测试工程师 | 待定 | 性能测试执行 | 30%% |

## 📞 沟通机制

- 每日测试站会: 9:30 AM (15分钟)
- 缺陷评审会: 每周三 3:00 PM
- 测试周报: 每周五提交
- 紧急Bug报告: 立即通知开发负责人

---

**测试负责人**: %s
**优先级**: %s
**计划开始**: 待定
**计划结束**: %s
**文档版本**: v1.0
**生成时间**: %s
**状态**: 🔴 计划中 / 🟡 执行中 / 🟢 已完成
`,
		title,
		requirements,
		getOrDefault(ctx.Deadline, "待定"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Priority, "High"),
		getOrDefault(ctx.Deadline, "待定"),
		time.Now().Format("2006-01-02 15:04:05"))

	metadata := map[string]interface{}{
		"template_type": models.TemplateTestPlan,
		"generated_at":  time.Now().Format(time.RFC3339),
	}

	return content, metadata, nil
}

// generateUserStory 生成用户故事
func (g *TemplateGenerator) generateUserStory(ctx models.TemplateContext) (string, map[string]interface{}, error) {
	title := getOrDefault(ctx.Title, "用户故事")
	requirements := getOrDefault(ctx.Requirements, "待补充用户需求描述")

	content := fmt.Sprintf(`# %s

## 📖 用户故事 (User Story)

### 故事陈述

**作为** (As a): [用户角色]
**我想要** (I want): [功能需求]
**以便** (So that): [业务价值]

### 示例
` + "```" + `
作为：电商平台的普通用户
我想要：能够将商品添加到购物车
以便：在浏览更多商品后一次性结算，提高购物效率
` + "```" + `

## 🎯 背景与动机

**业务背景**
%s

**用户痛点**
- 当前状况：[描述现有问题]
- 用户困扰：[用户遇到的具体困难]
- 影响范围：[影响的用户群体规模]

**预期价值**
- 💼 业务价值：[对业务的贡献]
- 👥 用户价值：[对用户的好处]
- 📈 数据指标：[可衡量的改进指标]

## 📋 详细需求

### 功能需求

**核心功能**
1. [功能点1]: 详细描述
   - 触发条件：
   - 操作步骤：
   - 预期结果：

2. [功能点2]: 详细描述
   - 触发条件：
   - 操作步骤：
   - 预期结果：

**辅助功能**
- [ ] 错误提示
- [ ] 数据验证
- [ ] 权限控制
- [ ] 日志记录

### 非功能需求

| 需求类别 | 具体要求 | 指标 |
|---------|---------|------|
| 性能 | 页面响应时间 | <300ms |
| 可用性 | 系统可用性 | ≥99.9%% |
| 安全性 | 数据加密 | AES-256 |
| 兼容性 | 浏览器支持 | Chrome 90+, Safari 14+ |
| 可访问性 | 屏幕阅读器支持 | WCAG 2.1 AA |

## ✅ 验收标准 (Acceptance Criteria)

### Given-When-Then格式

**场景1: 正常流程**
` + "```gherkin" + `
Given 用户已登录系统
  And 用户在商品详情页
When 用户点击"加入购物车"按钮
Then 商品应该成功添加到购物车
  And 页面显示成功提示"已添加到购物车"
  And 购物车图标显示商品数量+1
` + "```" + `

**场景2: 异常处理**
` + "```gherkin" + `
Given 用户未登录
When 用户点击"加入购物车"按钮
Then 系统显示登录提示
  And 引导用户到登录页面
  And 登录后自动返回当前页面
` + "```" + `

**场景3: 边界条件**
` + "```gherkin" + `
Given 用户购物车已有99件商品
When 用户尝试添加第100件商品
Then 系统显示提示"购物车已达上限"
  And 商品不会被添加
` + "```" + `

### 验收检查清单

**功能验收**
- [ ] 核心功能正常工作
- [ ] 所有交互按钮可用
- [ ] 数据正确保存到数据库
- [ ] 页面刷新后数据保持
- [ ] 错误提示信息准确友好

**性能验收**
- [ ] 页面加载时间 < 2秒
- [ ] 操作响应时间 < 300ms
- [ ] 并发100用户无异常

**兼容性验收**
- [ ] Chrome浏览器测试通过
- [ ] Safari浏览器测试通过
- [ ] 移动端适配正常
- [ ] 响应式布局正确

**安全性验证**
- [ ] 权限验证正确
- [ ] 输入数据已转义
- [ ] SQL注入防护有效
- [ ] XSS攻击防护有效

## 🎨 界面设计 (UI/UX)

### 交互流程

` + "```mermaid" + `
graph TD
    A[用户进入商品页] --> B{是否登录?}
    B -->|是| C[显示商品信息]
    B -->|否| D[引导登录]
    D --> C
    C --> E[用户点击加购按钮]
    E --> F{库存是否充足?}
    F -->|是| G[添加到购物车]
    F -->|否| H[显示库存不足]
    G --> I[更新购物车数量]
    I --> J[显示成功提示]
` + "```" + `

### 页面元素

**必需UI组件**
- 商品标题、图片、价格
- "加入购物车"按钮
- 数量选择器 (+/- 按钮)
- 库存提示
- 成功/失败Toast提示

**状态展示**
- 默认状态：按钮可点击
- 加载状态：显示loading动画
- 成功状态：绿色提示，自动消失
- 失败状态：红色提示，需手动关闭

## 🔧 技术实现要点

### 前端实现

**涉及文件**
- ` + "`components/ProductDetail.vue`" + ` - 商品详情组件
- ` + "`components/ShoppingCart.vue`" + ` - 购物车组件
- ` + "`stores/cart.ts`" + ` - 购物车状态管理
- ` + "`api/cart.ts`" + ` - 购物车API调用

**关键技术点**
- 使用Pinia/Vuex管理购物车状态
- 防抖处理防止重复点击
- 乐观更新提升用户体验
- 错误重试机制

**代码示例**
` + "```typescript" + `
// 添加到购物车
async function addToCart(productId: number, quantity: number) {
  try {
    // 乐观更新UI
    cartStore.addItem({ productId, quantity })

    // 调用API
    await cartAPI.addItem({ productId, quantity })

    showToast('添加成功', 'success')
  } catch (error) {
    // 回滚状态
    cartStore.removeItem(productId)
    showToast('添加失败，请重试', 'error')
  }
}
` + "```" + `

### 后端实现

**涉及文件**
- ` + "`handlers/cart_handler.go`" + ` - 购物车Handler
- ` + "`services/cart_service.go`" + ` - 业务逻辑
- ` + "`models/cart.go`" + ` - 数据模型

**API端点**
` + "```http" + `
POST /api/v1/cart/items
Authorization: Bearer {token}
Content-Type: application/json

{
  "product_id": 123,
  "quantity": 2
}
` + "```" + `

**数据库设计**
` + "```sql" + `
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);
` + "```" + `

### 测试策略

**单元测试**
- ✅ 购物车状态管理逻辑
- ✅ 数据验证函数
- ✅ 工具函数

**集成测试**
- ✅ API端点测试
- ✅ 数据库操作测试

**E2E测试**
- ✅ 完整加购流程
- ✅ 异常场景处理

## ⏱️ 工作量估算

### Story Points: 5分

**开发任务分解**
| 任务 | 负责人 | 预估工时 | 实际工时 | 状态 |
|------|-------|---------|---------|------|
| 数据库设计 | 后端 | 1h | - | ⏳ 待开始 |
| 后端API开发 | %s | 3h | - | ⏳ 待开始 |
| 前端组件开发 | 前端 | 4h | - | ⏳ 待开始 |
| 状态管理实现 | 前端 | 2h | - | ⏳ 待开始 |
| 单元测试 | 开发 | 2h | - | ⏳ 待开始 |
| 集成测试 | 测试 | 2h | - | ⏳ 待开始 |
| Code Review | 团队 | 1h | - | ⏳ 待开始 |
| **总计** | | **15h** | **-** | |

**估算依据**
- 类似功能参考：购物车列表开发(8h)
- 复杂度评估：中等(涉及前后端协作)
- 风险buffer：20%%(约3h)

## 🔗 相关资源

**关联需求**
- #1234 - 购物车列表页面
- #1235 - 订单结算功能
- #1236 - 库存管理系统

**参考文档**
- [产品PRD文档](链接)
- [接口设计文档](链接)
- [UI设计稿](Figma链接)

**竞品分析**
- 淘宝：即时加购，无需页面跳转
- 京东：加购后显示侧边栏
- 拼多多：加购后推荐相似商品

## 📝 备注与讨论

**技术决策**
- ✅ 采用乐观更新策略
- ✅ 前端缓存购物车数据
- ⏸️ 待定：是否支持匿名购物车

**已知风险**
- ⚠️ 高并发下的库存扣减可能冲突 → 使用Redis分布式锁
- ⚠️ 购物车数据同步问题 → 登录后合并本地和服务端数据

**遗留问题**
- [ ] 购物车商品失效处理策略待确认
- [ ] 是否需要购物车商品推荐功能

---

**用户故事信息**
- **Story ID**: US-%s
- **负责人**: %s
- **优先级**: %s
- **Sprint**: Sprint XX
- **截止日期**: %s
- **Story Points**: 5分
- **状态**: 🔴 Backlog / 🟡 In Progress / 🟢 Done
- **创建时间**: %s
`,
		title,
		requirements,
		getOrDefault(ctx.Assignee, "待分配"),
		title,
		getOrDefault(ctx.Assignee, "待分配"),
		getOrDefault(ctx.Priority, "Medium"),
		getOrDefault(ctx.Deadline, "待定"),
		time.Now().Format("2006-01-02 15:04:05"))

	metadata := map[string]interface{}{
		"template_type": models.TemplateUserStory,
		"generated_at":  time.Now().Format(time.RFC3339),
	}

	return content, metadata, nil
}

// getOrDefault 辅助函数：获取指针值或默认值
func getOrDefault(ptr *string, defaultValue string) string {
	if ptr != nil && *ptr != "" {
		return *ptr
	}
	return defaultValue
}

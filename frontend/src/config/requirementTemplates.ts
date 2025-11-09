/**
 * 需求模板预设配置
 * Requirement Template Presets
 */

import {
  RequirementTemplate,
  RequirementTemplateType,
  TemplateCategory,
} from '../types/requirementTemplate';
import { RequirementPriority } from '../types/requirement';

/**
 * 功能需求模板
 */
const featureTemplate: RequirementTemplate = {
  id: 'tpl-feature',
  type: RequirementTemplateType.Feature,
  name: '功能需求',
  description: '新功能开发需求',
  icon: 'PlusCircleOutlined',
  color: '#1890ff',
  fields: {
    title: '',
    description: `## 功能描述
请详细描述需要开发的新功能，包括：
- 功能的核心目标
- 适用的用户场景
- 功能的主要特点

## 背景说明
为什么需要这个功能？解决什么问题？

## 参考资料
相关文档、原型图、竞品分析等
`,
    business_value: `## 商业价值
- **用户价值**: 为用户带来什么便利或解决什么痛点
- **业务价值**: 对公司业务的促进作用
- **市场价值**: 市场竞争力提升

## 预期收益
- 用户增长: XX%
- 转化率提升: XX%
- 收入增长: ¥XX
`,
    expected_outcome: `## 预期结果
- 功能完整实现并上线
- 用户可以正常使用所有特性
- 性能指标达到要求

## 成功指标
- 日活用户使用率 > XX%
- 功能完成率 > XX%
- 用户满意度 > XX分
`,
    acceptance_criteria: `## 验收标准

### 功能性验收
- [ ] 核心功能正常工作
- [ ] 所有用户场景覆盖
- [ ] 边界情况处理正确

### 非功能性验收
- [ ] 响应时间 < XXXms
- [ ] 并发支持 > XX用户
- [ ] 错误率 < XX%

### 质量验收
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 代码审查通过
`,
    priority: RequirementPriority.High,
    category: '功能开发',
  },
  tags: ['功能', '开发', '新特性'],
  recommended_for: ['产品经理', '技术负责人'],
};

/**
 * 缺陷修复模板
 */
const bugFixTemplate: RequirementTemplate = {
  id: 'tpl-bug-fix',
  type: RequirementTemplateType.BugFix,
  name: '缺陷修复',
  description: 'Bug修复需求',
  icon: 'BugOutlined',
  color: '#f5222d',
  fields: {
    title: '[BUG] ',
    description: `## 问题描述
简要描述遇到的问题

## 复现步骤
1. 进入XX页面
2. 点击XX按钮
3. 输入XX内容
4. 观察到XX错误

## 预期行为
应该发生什么？

## 实际行为
实际发生了什么？

## 环境信息
- 浏览器: Chrome/Safari/Firefox
- 版本: vX.X.X
- 操作系统: Windows/macOS/iOS/Android
- 设备: Desktop/Mobile

## 错误日志
\`\`\`
粘贴相关错误日志
\`\`\`

## 截图/录屏
如有必要，添加截图或录屏
`,
    business_value: `## 影响范围
- **影响用户数**: XX人/XX%
- **严重程度**: 阻塞/严重/一般/轻微
- **紧急程度**: 立即/本周/下周/后续

## 业务影响
- 用户体验影响
- 业务流程影响
- 数据准确性影响
`,
    expected_outcome: `## 修复目标
- Bug完全修复，问题不再出现
- 相关场景全部验证通过
- 无新的副作用产生

## 验证方式
- 按原复现步骤验证
- 扩展场景测试
- 回归测试通过
`,
    acceptance_criteria: `## 验收标准

### 问题解决
- [ ] 原问题已完全解决
- [ ] 复现步骤无法再触发问题
- [ ] 相关场景均正常

### 质量保证
- [ ] 添加相应的单元测试
- [ ] 添加回归测试用例
- [ ] 代码审查通过

### 影响评估
- [ ] 无新的副作用产生
- [ ] 性能无明显下降
- [ ] 其他功能未受影响
`,
    priority: RequirementPriority.High,
    category: '缺陷修复',
  },
  tags: ['Bug', '修复', '问题'],
  recommended_for: ['开发工程师', 'QA测试'],
};

/**
 * 性能优化模板
 */
const performanceTemplate: RequirementTemplate = {
  id: 'tpl-performance',
  type: RequirementTemplateType.Performance,
  name: '性能优化',
  description: '系统性能优化需求',
  icon: 'ThunderboltOutlined',
  color: '#faad14',
  fields: {
    title: '[性能] ',
    description: `## 性能问题
详细描述当前的性能瓶颈

## 现状分析
- 当前响应时间: XXms
- 当前并发能力: XX QPS
- 资源使用情况: CPU XX%, 内存 XX%

## 优化目标
- 目标响应时间: XXms
- 目标并发能力: XX QPS
- 资源使用优化: CPU XX%, 内存 XX%

## 技术方案
- 数据库优化: 索引、查询优化
- 缓存策略: Redis缓存
- 代码优化: 算法改进
- 架构优化: 服务拆分、异步处理
`,
    business_value: `## 优化价值
- **用户体验提升**: 加载速度提升XX%
- **成本节约**: 服务器成本降低XX%
- **容量提升**: 支持更多并发用户

## ROI分析
- 开发投入: XX人天
- 预期收益: 每月节省¥XX
- 回报周期: XX个月
`,
    expected_outcome: `## 预期结果
- 响应时间从XXms降至XXms
- 并发能力从XX提升至XX
- 资源利用率降低XX%

## 监控指标
- P50响应时间 < XXms
- P95响应时间 < XXms
- P99响应时间 < XXms
- CPU使用率 < XX%
`,
    acceptance_criteria: `## 验收标准

### 性能指标
- [ ] 响应时间达标
- [ ] 并发能力达标
- [ ] 资源使用达标

### 稳定性
- [ ] 压力测试通过
- [ ] 长时间运行稳定
- [ ] 无内存泄漏

### 兼容性
- [ ] 功能保持不变
- [ ] API兼容性保持
- [ ] 数据完整性保证
`,
    priority: RequirementPriority.Medium,
    category: '性能优化',
  },
  tags: ['性能', '优化', '提速'],
  recommended_for: ['技术负责人', '架构师'],
};

/**
 * 用户故事模板
 */
const userStoryTemplate: RequirementTemplate = {
  id: 'tpl-user-story',
  type: RequirementTemplateType.UserStory,
  name: '用户故事',
  description: '敏捷开发用户故事',
  icon: 'UserOutlined',
  color: '#52c41a',
  fields: {
    title: '',
    description: `## 用户故事
**作为** [用户角色]
**我想要** [完成什么目标]
**以便于** [获得什么价值]

## 详细说明
进一步解释用户的需求和上下文

## 用户画像
- 角色: XX用户
- 使用场景: XX场景
- 频率: 每天/每周/偶尔
- 技能水平: 初级/中级/高级
`,
    business_value: `## 用户价值
为用户带来的直接价值和好处

## 业务价值
对业务指标的提升作用
`,
    expected_outcome: `## 完成定义 (Definition of Done)
- 功能已开发并通过测试
- 用户可以完成预期操作
- 产品负责人验收通过

## 用户反馈
期望的用户反馈和评价
`,
    acceptance_criteria: `## 验收条件 (Acceptance Criteria)

### 场景1: [主要场景]
- **Given** [前提条件]
- **When** [用户操作]
- **Then** [预期结果]

### 场景2: [异常场景]
- **Given** [前提条件]
- **When** [用户操作]
- **Then** [预期结果]

### 场景3: [边界场景]
- **Given** [前提条件]
- **When** [用户操作]
- **Then** [预期结果]
`,
    priority: RequirementPriority.Medium,
    category: '用户故事',
  },
  tags: ['用户故事', '敏捷', 'Scrum'],
  recommended_for: ['产品经理', 'Scrum Master'],
};

/**
 * 技术研究模板
 */
const researchTemplate: RequirementTemplate = {
  id: 'tpl-research',
  type: RequirementTemplateType.Research,
  name: '技术研究',
  description: '技术调研和可行性分析',
  icon: 'ExperimentOutlined',
  color: '#722ed1',
  fields: {
    title: '[调研] ',
    description: `## 研究目标
需要调研的技术方向或问题

## 背景说明
为什么需要进行这项研究？

## 研究范围
- 技术选型: XX vs YY vs ZZ
- 可行性分析
- 成本评估
- 风险评估

## 时间计划
- 调研周期: XX天
- 输出时间: YYYY-MM-DD
`,
    business_value: `## 研究价值
- 为技术决策提供依据
- 降低技术风险
- 提升团队技术水平

## 预期收益
调研完成后对业务的帮助
`,
    expected_outcome: `## 交付物
- [ ] 技术调研报告
- [ ] 方案对比分析
- [ ] POC验证结果
- [ ] 实施建议

## 决策支持
基于调研结果，给出明确的技术建议
`,
    acceptance_criteria: `## 验收标准

### 调研深度
- [ ] 主流方案全部调研
- [ ] 优缺点对比清晰
- [ ] 有实际测试数据

### 文档质量
- [ ] 报告结构完整
- [ ] 数据真实可靠
- [ ] 结论明确可执行

### 决策支持
- [ ] 给出明确建议
- [ ] 风险评估完整
- [ ] 实施路径清晰
`,
    priority: RequirementPriority.Medium,
    category: '技术研究',
  },
  tags: ['研究', '调研', 'POC'],
  recommended_for: ['技术负责人', '架构师'],
};

/**
 * 安全需求模板
 */
const securityTemplate: RequirementTemplate = {
  id: 'tpl-security',
  type: RequirementTemplateType.Security,
  name: '安全需求',
  description: '安全加固和漏洞修复',
  icon: 'SafetyOutlined',
  color: '#eb2f96',
  fields: {
    title: '[安全] ',
    description: `## 安全问题
描述发现的安全隐患或需要加固的方面

## 风险等级
- **严重性**: 严重/高/中/低
- **影响范围**: 全部用户/部分用户/内部用户
- **CVSS评分**: X.X

## 漏洞详情
- 漏洞类型: SQL注入/XSS/CSRF/权限绕过等
- 影响版本: vX.X.X
- 发现时间: YYYY-MM-DD
- 发现方式: 安全扫描/渗透测试/用户报告

## 修复方案
- 短期方案: 临时缓解措施
- 长期方案: 彻底修复方案
`,
    business_value: `## 安全价值
- **数据保护**: 防止数据泄露
- **合规要求**: 满足XX法规要求
- **品牌保护**: 避免安全事件影响品牌

## 风险规避
如不修复可能造成的损失
`,
    expected_outcome: `## 修复目标
- 安全漏洞完全修复
- 安全测试全部通过
- 无新的安全风险引入

## 验证方式
- 漏洞扫描工具验证
- 渗透测试验证
- 安全专家评审
`,
    acceptance_criteria: `## 验收标准

### 安全修复
- [ ] 漏洞已完全修复
- [ ] 安全扫描无告警
- [ ] 渗透测试通过

### 合规性
- [ ] 符合安全规范
- [ ] 通过合规审计
- [ ] 安全文档完善

### 应急响应
- [ ] 建立应急预案
- [ ] 监控告警配置
- [ ] 团队培训完成
`,
    priority: RequirementPriority.Urgent,
    category: '安全需求',
  },
  tags: ['安全', '漏洞', '加固'],
  recommended_for: ['安全工程师', '技术负责人'],
};

/**
 * 所有预设模板列表
 */
export const REQUIREMENT_TEMPLATES: RequirementTemplate[] = [
  featureTemplate,
  bugFixTemplate,
  performanceTemplate,
  userStoryTemplate,
  researchTemplate,
  securityTemplate,
];

/**
 * 模板分类
 */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'development',
    name: '开发类',
    description: '功能开发和技术实现',
    templates: [featureTemplate, bugFixTemplate, performanceTemplate],
  },
  {
    id: 'product',
    name: '产品类',
    description: '产品规划和用户需求',
    templates: [userStoryTemplate],
  },
  {
    id: 'technical',
    name: '技术类',
    description: '技术研究和架构设计',
    templates: [researchTemplate, securityTemplate],
  },
];

/**
 * 根据类型获取模板
 */
export const getTemplateByType = (
  type: RequirementTemplateType
): RequirementTemplate | undefined => {
  return REQUIREMENT_TEMPLATES.find((t) => t.type === type);
};

/**
 * 根据ID获取模板
 */
export const getTemplateById = (id: string): RequirementTemplate | undefined => {
  return REQUIREMENT_TEMPLATES.find((t) => t.id === id);
};

/**
 * 获取推荐模板
 */
export const getRecommendedTemplates = (userRole?: string): RequirementTemplate[] => {
  if (!userRole) return REQUIREMENT_TEMPLATES.slice(0, 3);

  return REQUIREMENT_TEMPLATES.filter((t) =>
    t.recommended_for?.some((role) =>
      role.toLowerCase().includes(userRole.toLowerCase())
    )
  );
};

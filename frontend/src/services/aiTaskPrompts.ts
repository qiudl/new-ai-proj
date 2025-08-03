import { PromptTemplate } from '../types/aiTaskGenerator';

/**
 * AI任务生成的Prompt工程
 * 针对不同AI提供商优化的提示词模板
 */

// 通用任务生成Prompt模板
export const TASK_GENERATION_PROMPTS: PromptTemplate = {
  system: `你是一个专业的项目管理助手，擅长将复杂任务分解为具体可执行的子任务。

核心规则：
1. 根据提供的父任务和关键词，生成3-8个具体的子任务
2. 每个子任务都应该是独立、具体、可执行的行动项
3. 合理估算每个子任务的优先级和工作时长
4. 考虑任务间的逻辑依赖关系和执行顺序
5. 使用简洁明确的中文描述

返回格式要求：
- 必须返回严格的JSON格式
- 包含tasks数组和reasoning字段
- 每个任务包含：title（标题）、description（描述）、priority（优先级）、estimatedHours（预估小时数）、tags（标签数组）

JSON格式示例：
{
  "tasks": [
    {
      "title": "需求分析和文档整理",
      "description": "收集和整理项目需求，编写详细的需求规格说明书",
      "priority": "high",
      "estimatedHours": 4,
      "tags": ["需求分析", "文档"]
    },
    {
      "title": "技术方案设计",
      "description": "设计系统架构和技术实现方案，选择合适的技术栈",
      "priority": "high", 
      "estimatedHours": 6,
      "tags": ["设计", "架构"]
    }
  ],
  "reasoning": "基于父任务的复杂度，我将其分解为需求分析、设计、开发、测试等几个阶段..."
}

重要提醒：
- 只返回JSON，不要包含任何其他文本
- 确保JSON格式正确，可以被解析
- 任务数量控制在3-8个之间
- 优先级只能是：high、medium、low
- 预估时长要合理，通常在0.5-16小时之间`,

  user: (parentTask: string, keywords: string, context?: string) => {
    let prompt = `父任务：${parentTask}

关键词：${keywords}`;

    if (context) {
      prompt += `

项目背景：${context}`;
    }

    prompt += `

请根据上述信息，将父任务分解为具体的子任务。重点考虑：
1. 任务的可执行性和具体性
2. 合理的优先级设置
3. 准确的工作量估算
4. 任务间的逻辑关系

请严格按照JSON格式返回结果。`;

    return prompt;
  },

  fallback: `如果无法生成JSON格式，请至少提供以下格式的任务列表：

任务1：[标题] - [描述] - 优先级：[high/medium/low] - 预估：[X小时]
任务2：[标题] - [描述] - 优先级：[high/medium/low] - 预估：[X小时]
...`
};

// 针对不同复杂度的Prompt变体
export const COMPLEXITY_VARIANTS = {
  simple: {
    system: `你是一个任务分解助手。将复杂任务分解为3-5个简单的子任务。

要求：
- 任务描述简洁明了
- 专注于核心步骤
- 避免过度细分
- 返回JSON格式

JSON示例：
{
  "tasks": [
    {
      "title": "准备阶段",
      "description": "收集资料和准备工作",
      "priority": "high",
      "estimatedHours": 2,
      "tags": ["准备"]
    }
  ],
  "reasoning": "简化分解思路..."
}`,
    user: (parentTask: string, keywords: string) => 
      `任务：${parentTask}\n关键词：${keywords}\n\n请简化分解为3-5个核心子任务，返回JSON格式。`
  },

  detailed: {
    system: `你是一个专业的项目管理专家。将任务分解为详细的、可执行的子任务。

要求：
- 详细考虑每个执行步骤
- 包含验收标准和注意事项
- 合理估算时间和优先级
- 考虑风险和依赖关系
- 生成5-8个详细任务

JSON格式要求：
{
  "tasks": [
    {
      "title": "详细任务标题",
      "description": "包含具体步骤、验收标准、注意事项的详细描述",
      "priority": "high|medium|low",
      "estimatedHours": 数值,
      "tags": ["标签1", "标签2"]
    }
  ],
  "reasoning": "详细的分解思路说明..."
}`,
    user: (parentTask: string, keywords: string, context?: string) => {
      let prompt = `父任务：${parentTask}\n关键词：${keywords}`;
      if (context) prompt += `\n项目背景：${context}`;
      prompt += `\n\n请详细分解任务，包含具体执行步骤、验收标准和注意事项。返回JSON格式。`;
      return prompt;
    }
  }
};

// 针对不同AI提供商的优化Prompt
export const PROVIDER_OPTIMIZED_PROMPTS = {
  deepseek: {
    system: `你是一个专业的任务分解专家，特别擅长中文项目管理。

核心能力：
- 深度理解中文语境下的项目需求
- 合理分解复杂任务为可执行步骤
- 提供准确的工作量估算
- 考虑中国团队的工作习惯

输出要求：
- 严格JSON格式
- 中文描述简洁专业
- 时间估算符合实际
- 优先级设置合理

JSON模板：
{
  "tasks": [
    {
      "title": "任务标题（动宾结构）",
      "description": "具体操作步骤和预期成果",
      "priority": "high|medium|low",
      "estimatedHours": 数值,
      "tags": ["分类标签"]
    }
  ],
  "reasoning": "分解思路和考虑因素"
}`,
    user: (parentTask: string, keywords: string, context?: string) => 
      `项目任务：${parentTask}\n\n关键要素：${keywords}${context ? `\n\n项目背景：${context}` : ''}\n\n请基于中文项目管理经验，将此任务分解为3-8个可执行的子任务。注重实用性和可操作性。`
  },

  claude: {
    system: `You are an expert project manager with strong analytical skills. Break down complex tasks into well-structured, executable subtasks.

Key principles:
- Systematic decomposition approach
- Clear dependencies and relationships
- Realistic time estimates
- Balanced priority distribution
- Comprehensive but not overwhelming

Response format (JSON only):
{
  "tasks": [
    {
      "title": "Clear action-oriented title",
      "description": "Detailed description with acceptance criteria",
      "priority": "high|medium|low", 
      "estimatedHours": number,
      "tags": ["category", "type"]
    }
  ],
  "reasoning": "Analytical breakdown explanation"
}`,
    user: (parentTask: string, keywords: string, context?: string) =>
      `Parent Task: ${parentTask}\n\nKey Elements: ${keywords}${context ? `\n\nProject Context: ${context}` : ''}\n\nPlease analyze and decompose this task into 3-8 actionable subtasks with clear priorities and realistic time estimates. Focus on logical flow and dependencies.`
  },

  openai: {
    system: `You are a skilled project management assistant. Transform complex tasks into clear, actionable subtasks.

Guidelines:
- Create 3-8 specific, measurable tasks
- Assign realistic priorities and time estimates  
- Consider task dependencies and logical sequence
- Provide clear, concise descriptions
- Use consistent JSON formatting

Required JSON structure:
{
  "tasks": [
    {
      "title": "Specific task title",
      "description": "Clear description with deliverables",
      "priority": "high|medium|low",
      "estimatedHours": number,
      "tags": ["tag1", "tag2"]
    }
  ],
  "reasoning": "Brief explanation of decomposition approach"
}`,
    user: (parentTask: string, keywords: string, context?: string) =>
      `Task to decompose: ${parentTask}\n\nKey requirements: ${keywords}${context ? `\n\nAdditional context: ${context}` : ''}\n\nBreak this down into actionable subtasks with appropriate priorities and time estimates. Return valid JSON only.`
  }
};

// 特定领域的Prompt模板
export const DOMAIN_SPECIFIC_PROMPTS = {
  development: {
    system: `你是一个软件开发项目管理专家。将开发任务分解为标准的开发流程步骤。

开发流程考虑：
- 需求分析 → 设计 → 编码 → 测试 → 部署
- 前端、后端、数据库的协调
- 代码质量和文档要求
- 测试覆盖和质量保证

标准开发任务类型：
- 需求分析、技术设计、接口设计
- 前端开发、后端开发、数据库设计
- 单元测试、集成测试、用户测试
- 代码审查、文档编写、部署发布`,
    user: (parentTask: string, keywords: string) =>
      `开发任务：${parentTask}\n技术要求：${keywords}\n\n请按照标准软件开发流程分解任务，确保包含设计、开发、测试等关键环节。`
  },

  design: {
    system: `你是一个设计项目管理专家。将设计任务分解为创意和执行的各个阶段。

设计流程考虑：
- 调研分析 → 概念设计 → 详细设计 → 制作输出
- 用户体验和视觉表现的平衡
- 迭代优化和反馈收集
- 多平台适配和规范制定`,
    user: (parentTask: string, keywords: string) =>
      `设计任务：${parentTask}\n设计要求：${keywords}\n\n请按照设计项目流程分解任务，涵盖调研、设计、制作、优化等阶段。`
  },

  marketing: {
    system: `你是一个营销项目管理专家。将营销任务分解为策略制定到执行监测的完整流程。

营销流程考虑：
- 市场调研 → 策略制定 → 内容创作 → 渠道执行 → 效果监测
- 目标受众分析和用户画像
- 多渠道整合营销策略
- 数据分析和效果优化`,
    user: (parentTask: string, keywords: string) =>
      `营销任务：${parentTask}\n市场要求：${keywords}\n\n请按照营销项目流程分解任务，包含策略、创意、执行、监测等环节。`
  }
};

// Prompt选择逻辑
export class PromptSelector {
  static selectPrompt(
    provider: 'deepseek' | 'claude' | 'openai',
    complexity: 'simple' | 'detailed' = 'detailed',
    domain?: 'development' | 'design' | 'marketing'
  ): PromptTemplate {
    // 优先选择领域特定Prompt
    if (domain && DOMAIN_SPECIFIC_PROMPTS[domain]) {
      return DOMAIN_SPECIFIC_PROMPTS[domain];
    }

    // 选择复杂度变体
    if (COMPLEXITY_VARIANTS[complexity]) {
      return COMPLEXITY_VARIANTS[complexity];
    }

    // 选择提供商优化Prompt
    if (PROVIDER_OPTIMIZED_PROMPTS[provider]) {
      return PROVIDER_OPTIMIZED_PROMPTS[provider];
    }

    // 默认通用Prompt
    return TASK_GENERATION_PROMPTS;
  }

  static getSystemPrompt(
    provider: 'deepseek' | 'claude' | 'openai',
    complexity: 'simple' | 'detailed' = 'detailed',
    domain?: string
  ): string {
    const prompt = this.selectPrompt(provider, complexity, domain as unknown);
    return prompt.system;
  }

  static getUserPrompt(
    provider: 'deepseek' | 'claude' | 'openai',
    parentTask: string,
    keywords: string,
    complexity: 'simple' | 'detailed' = 'detailed',
    context?: string,
    domain?: string
  ): string {
    const prompt = this.selectPrompt(provider, complexity, domain as unknown);
    return prompt.user(parentTask, keywords, context);
  }
}

// Prompt质量检查
export class PromptValidator {
  static validateRequest(parentTask: string, keywords: string): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 检查父任务
    if (!parentTask || parentTask.trim().length < 5) {
      issues.push('父任务描述过短，至少需要5个字符');
    }
    if (parentTask && parentTask.length > 200) {
      issues.push('父任务描述过长，建议控制在200字符以内');
    }

    // 检查关键词
    if (!keywords || keywords.trim().length < 3) {
      issues.push('关键词描述过短，至少需要3个字符');
    }
    if (keywords && keywords.length > 500) {
      issues.push('关键词描述过长，建议控制在500字符以内');
    }

    // 提供改进建议
    if (parentTask && !parentTask.includes('开发') && !parentTask.includes('设计') && !parentTask.includes('实现')) {
      suggestions.push('父任务描述中建议包含具体的动作词（如：开发、设计、实现等）');
    }

    if (keywords && !keywords.includes('功能') && !keywords.includes('需求') && !keywords.includes('特性')) {
      suggestions.push('关键词中建议包含具体的功能需求描述');
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }
}

export default {
  TASK_GENERATION_PROMPTS,
  COMPLEXITY_VARIANTS,
  PROVIDER_OPTIMIZED_PROMPTS,
  DOMAIN_SPECIFIC_PROMPTS,
  PromptSelector,
  PromptValidator
};
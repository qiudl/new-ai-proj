// AI服务相关类型定义

export type AIProvider = 'openai' | 'claude' | 'deepseek';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProviderConfig {
  openai: {
    apiKey: string;
    baseURL?: string;
    model: string; // gpt-3.5-turbo, gpt-4, gpt-4o等
    temperature: number;
    maxTokens: number;
  };
  claude: {
    apiKey: string;
    baseURL?: string;
    model: string; // claude-3-haiku, claude-3-sonnet, claude-3-opus等
    temperature: number;
    maxTokens: number;
  };
  deepseek: {
    apiKey: string;
    baseURL?: string;
    model: string; // deepseek-chat, deepseek-coder等
    temperature: number;
    maxTokens: number;
  };
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  success: boolean;
  data?: {
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model?: string;
    provider?: AIProvider;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AICompanyAnalysisRequest {
  companyName: string;
  existingInfo?: Partial<{
    industry: string;
    companyType: string;
    address: string;
    website: string;
  }>;
  analysisType: 'full' | 'verification' | 'enhancement';
}

export interface AICompanyAnalysisResponse {
  success: boolean;
  data?: {
    companyInfo: {
      companyName: string;
      companyType?: 'limited_company' | 'joint_stock' | 'individual' | 'partnership';
      industry?: string;
      businessLicense?: string;
      legalRepresentative?: string;
      address?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      website?: string;
      mainPhone?: string;
      mainEmail?: string;
      companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
      employeeCount?: number;
      description?: string;
      establishedYear?: number;
    };
    confidence: number;
    reasoning: string;
    sources: string[];
    alternatives?: any[];
  };
  error?: {
    message: string;
    code: string;
  };
}

// AI提供商的默认配置
export const AI_PROVIDER_DEFAULTS: Record<AIProvider, Partial<AIProviderConfig[AIProvider]>> = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
    maxTokens: 2000,
  },
  claude: {
    baseURL: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307',
    temperature: 0.3,
    maxTokens: 2000,
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    temperature: 0.3,
    maxTokens: 2000,
  },
};

export const AI_PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    description: 'GPT系列模型，通用性强，响应快速',
    models: [
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (推荐)', description: '性价比高，适合大多数场景' },
      { value: 'gpt-4', label: 'GPT-4', description: '更强大的推理能力' },
      { value: 'gpt-4o', label: 'GPT-4o', description: '最新优化模型' },
    ],
    pricing: '相对较高',
    speed: '快',
  },
  claude: {
    name: 'Anthropic Claude',
    description: 'Claude系列模型，在分析和推理方面表现优秀',
    models: [
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (推荐)', description: '快速且经济' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', description: '平衡性能和成本' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: '最强性能' },
    ],
    pricing: '中等',
    speed: '中等',
  },
  deepseek: {
    name: 'DeepSeek',
    description: '国产AI模型，性价比极高，支持中文优化',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat (推荐)', description: '通用对话模型' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder', description: '代码专用模型' },
    ],
    pricing: '非常低',
    speed: '快',
  },
};
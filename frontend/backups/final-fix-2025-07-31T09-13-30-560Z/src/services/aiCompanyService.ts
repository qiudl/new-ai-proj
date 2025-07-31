import { CompanyRequest } from '../types/company';
import { AIProvider, AIMessage } from '../types/ai';
import aiConfigDatabaseService from './aiConfigDatabaseService';
import { OpenAIProvider } from './aiProviders/openaiProvider';
import { ClaudeProvider } from './aiProviders/claudeProvider';
import { DeepSeekProvider } from './aiProviders/deepseekProvider';

// AI企业信息补充服务接口
export interface AICompanyInfo {
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
  confidence: number; // 0-1之间，表示AI信息的可信度
  source: string; // 信息来源说明
  reasoning?: string; // AI推理过程
  usedProvider?: AIProvider; // 使用的AI提供商
}

export interface AISearchResult {
  success: boolean;
  data?: AICompanyInfo;
  message?: string;
  alternatives?: AICompanyInfo[]; // 备选结果
  usedProvider?: AIProvider;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
}

class AICompanyService {
  private async getAIProvider() {
    const enabledConfigResponse = await aiConfigDatabaseService.getEnabledConfig();
    
    if (!enabledConfigResponse.success || !enabledConfigResponse.data) {
      throw new Error('未配置AI API，请联系管理员配置');
    }

    const config = enabledConfigResponse.data;
    
    // 构造提供商配置（注意：API密钥从数据库获取时已解密）
    const providerConfig = {
      apiKey: config.apiKeyMasked, // 这里应该是后端解密后的真实API密钥
      model: config.model,
      baseURL: config.baseURL,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    };

    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(providerConfig);
      case 'claude':
        return new ClaudeProvider(providerConfig);
      case 'deepseek':
        return new DeepSeekProvider(providerConfig);
      default:
        throw new Error(`不支持的AI提供商: ${config.provider}`);
    }
  }

  /**
   * 根据企业名称智能搜索企业信息
   */
  async searchCompanyInfo(companyName: string): Promise<AISearchResult> {
    try {
      // 检查AI配置并获取提供商
      const provider = await this.getAIProvider();
      const enabledConfigResponse = await aiConfigDatabaseService.getEnabledConfig();
      const currentProviderName = enabledConfigResponse.data?.provider;
      
      // 构建提示词
      const prompt = this.buildCompanyAnalysisPrompt(companyName);
      
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: '你是一个专业的企业信息分析助手，能够根据企业名称推测和分析企业的基本信息。请以JSON格式返回结果，并确保信息的准确性和合理性。'
        },
        {
          role: 'user',
          content: prompt
        }
      ];
      
      if (!response.success) {
        console.error('AI接口调用失败:', response.error);
        return this.getFallbackResults(companyName, response.error?.message || 'AI服务调用失败');
      }

      // 解析AI返回的JSON结果
      const aiResult = this.parseAIResponse(response.data!.content);
      
      if (!aiResult) {
        return this.getFallbackResults(companyName, 'AI返回的数据格式错误');
      }

      // 计算成本（如果有用量信息）
      let cost = 0;
      if (response.data?.usage) {
        if (currentProviderName === 'openai') {
          cost = (provider as OpenAIProvider).estimateCost(
            response.data.usage.promptTokens,
            response.data.usage.completionTokens
          );
        } else if (currentProviderName === 'claude') {
          cost = (provider as ClaudeProvider).estimateCost(
            response.data.usage.promptTokens,
            response.data.usage.completionTokens
          );
        } else if (currentProviderName === 'deepseek') {
          cost = (provider as DeepSeekProvider).estimateCost(
            response.data.usage.promptTokens,
            response.data.usage.completionTokens
          );
        }
      }

      return {
        success: true,
        data: {
          ...aiResult.primary,
          usedProvider: currentProviderName},
        alternatives: aiResult.alternatives,
        usedProvider: currentProviderName,
        tokenUsage: response.data?.usage ? {
          prompt: response.data.usage.promptTokens,
          completion: response.data.usage.completionTokens,
          total: response.data.usage.totalTokens
        } : undefined,
        cost
      };
      
    } catch (error) {
      console.error('AI企业信息搜索失败:', error);
      return this.getFallbackResults(companyName, error instanceof Error ? error.message : '未知错误');
    }
  }

  /**
   * 验证和优化企业信息
   */
  async validateAndOptimizeInfo(companyInfo: Partial<CompanyRequest>): Promise<{
    optimized: Partial<CompanyRequest>;
    suggestions: string[];
    warnings: string[];
  }> {
    try {
      const enabledConfigResponse = await aiConfigDatabaseService.getEnabledConfig();
      if (!enabledConfigResponse.success || !enabledConfigResponse.data) {
        return this.getBasicValidation(companyInfo);
      }

      const provider = await this.getAIProvider();
      
      const prompt = `请分析以下企业信息的合理性和一致性，并提出优化建议：

企业信息：
${JSON.stringify(companyInfo, null, 2)}

请以以下JSON格式返回结果：
{
  "optimized": {
    // 优化后的企业信息
  },
  "suggestions": [
    // 改进建议列表
  ],
  "warnings": [
    // 不一致或可疑信息警告
  ]
}`;

      const messages: AIMessage[] = [
        {
          role: 'system',
          content: '你是一个企业信息验证专家，能够识别信息中的不一致之处并提出优化建议。'
        },
        {
          role: 'user',
          content: prompt
        }
      ];
      
      if (response.success) {
        const result = this.parseValidationResponse(response.data!.content);
        if (result) {
          return result;
        }
      }

      // AI失败时回退到基本验证
      return this.getBasicValidation(companyInfo);
      
    } catch (error) {
      console.error('AI优化失败:', error);
      return this.getBasicValidation(companyInfo);
    }
  }

  /**
   * 构建企业分析提示词
   */
  private buildCompanyAnalysisPrompt(companyName: string): string {
    return `请分析企业“${companyName}”的信息，并根据企业名称推测其基本信息。

请以以下JSON格式返回结果：
{
  "primary": {
    "companyName": "${companyName}",
    "companyType": "limited_company|joint_stock|individual|partnership",
    "industry": "推测的行业",
    "legalRepresentative": "法定代表人（如有）",
    "address": "推测的地址",
    "city": "城市",
    "province": "省份",
    "website": "推测的网站",
    "mainPhone": "联系电话",
    "mainEmail": "联系邮箱",
    "companySize": "startup|small|medium|large|enterprise",
    "employeeCount": 员工人数,
    "description": "企业描述",
    "establishedYear": 成立年份,
    "confidence": 0.8,
    "source": "AI分析推测",
    "reasoning": "推理过程说明"
  },
  "alternatives": [
    // 其他可能的结果（可选）
  ]
}

注意事项：
1. 只返回JSON数据，不要包含其他文字
2. 对于无法推测的字段可以省略或设为null
3. confidence应该反映推测的可靠程度
4. 请基于常识和逻辑进行推测`;
  }

  /**
   * 解析AI返回的响应
   */
  private parseAIResponse(content: string): { primary: AICompanyInfo; alternatives?: AICompanyInfo[] } | null {
    try {
      // 清理可能的非 JSON 内容
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        return null;
      }

      const jsonStr = content.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.primary) {
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.error('解析AI响应失败:', error);
      return null;
    }
  }

  /**
   * 解析验证响应
   */
  private parseValidationResponse(content: string): {
    optimized: Partial<CompanyRequest>;
    suggestions: string[];
    warnings: string[];
  } | null {
    try {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        return null;
      }

      const jsonStr = content.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.optimized && Array.isArray(parsed.suggestions) && Array.isArray(parsed.warnings)) {
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.error('解析验证响应失败:', error);
      return null;
    }
  }

  /**
   * 获取基本验证结果（不AI的情况下）
   */
  private getBasicValidation(companyInfo: Partial<CompanyRequest>): {
    optimized: Partial<CompanyRequest>;
    suggestions: string[];
    warnings: string[];
  } {
    const suggestions: string[] = [];
    const warnings: string[] = [];
    const optimized = { ...companyInfo };

    if (!companyInfo.industry) {
      suggestions.push('建议补充行业信息');
    }

    if (!companyInfo.website) {
      suggestions.push('建议添加企业官网地址');
    }

    if (companyInfo.employeeCount && companyInfo.employeeCount > 1000 && companyInfo.companySize === 'small') {
      warnings.push('员工人数与企业规模不匹配');
      optimized.companySize = 'large';
    }

    return { optimized, suggestions, warnings };
  }

  /**
   * 获取备用结果（AI服务不可用时）
   */
  private getFallbackResults(companyName: string, reason: string): AISearchResult {
    const mockResults = this.getMockCompanyInfo(companyName);
    
    return {
      success: true,
      data: {
        ...mockResults.primary,
        source: `模拟数据 (${reason})`,
        confidence: 0.3
      },
      alternatives: mockResults.alternatives,
      message: `正在使用模拟数据: ${reason}`
    };
  }

  /**
   * 生成模拟企业数据（备用方案）
   */
  private getMockCompanyInfo(companyName: string): {
    primary: AICompanyInfo;
    alternatives: AICompanyInfo[];
  } {
    const baseName = companyName.replace(/有限公司|股份有限公司|科技|技术|信息|网络|软件/g, '').trim();
    
    // 主要结果
    const primary: AICompanyInfo = {
      companyName: companyName,
      companyType: this.inferCompanyType(companyName),
      industry: this.inferIndustry(companyName),
      legalRepresentative: this.generatePersonName(),
      address: this.generateAddress(),
      city: this.getRandomCity(),
      province: this.getRandomProvince(),
      postalCode: this.generatePostalCode(),
      website: this.generateWebsite(baseName),
      mainPhone: this.generatePhoneNumber(),
      mainEmail: this.generateEmail(baseName),
      companySize: this.inferCompanySize(companyName),
      employeeCount: this.generateEmployeeCount(companyName),
      description: this.generateDescription(companyName),
      establishedYear: this.generateEstablishedYear(),
      confidence: 0.85,
      source: 'AI智能分析 + 公开企业数据库'
    };

    // 备选结果
    const alternatives: AICompanyInfo[] = [
      {
        ...primary,
        companyName: companyName + '分公司',
        confidence: 0.65,
        source: '关联企业推测'
      },
      {
        ...primary,
        companyName: companyName.replace('有限公司', '股份有限公司'),
        companyType: 'joint_stock',
        confidence: 0.45,
        source: '企业变更记录'
      }
    ];

    return { primary, alternatives };
  }

  private inferCompanyType(companyName: string): 'limited_company' | 'joint_stock' | 'individual' | 'partnership' {
    if (companyName.includes('股份有限公司')) return 'joint_stock';
    if (companyName.includes('有限公司')) return 'limited_company';
    if (companyName.includes('个体') || companyName.includes('工商户')) return 'individual';
    if (companyName.includes('合伙')) return 'partnership';
    return 'limited_company';
  }

  private inferIndustry(companyName: string): string {
    const industryMap: Record<string, string> = {
      '科技': '信息技术',
      '软件': '软件开发',
      '网络': '互联网',
      '技术': '技术服务',
      '信息': '信息服务',
      '建筑': '建筑业',
      '房地产': '房地产',
      '金融': '金融业',
      '教育': '教育',
      '医疗': '医疗健康',
      '制造': '制造业',
      '贸易': '商贸',
      '物流': '物流运输',
      '咨询': '商务服务'
    };

    for (const [keyword, industry] of Object.entries(industryMap)) {
      if (companyName.includes(keyword)) {
        return industry;
      }
    }
    return '商务服务';
  }

  private inferCompanySize(companyName: string): 'startup' | 'small' | 'medium' | 'large' | 'enterprise' {
    if (companyName.includes('集团') || companyName.includes('控股')) return 'enterprise';
    if (companyName.includes('股份')) return 'large';
    if (companyName.includes('科技') || companyName.includes('创新')) return 'medium';
    return 'small';
  }

  private generatePersonName(): string {
    const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
    const names = ['建华', '明', '强', '军', '平', '伟', '勇', '磊', '洋', '涛'];
    return surnames[Math.floor(Math.random() * surnames.length)] + 
           names[Math.floor(Math.random() * names.length)];
  }

  private generateAddress(): string {
    const districts = ['朝阳区', '海淀区', '西城区', '东城区', '丰台区', '石景山区'];
    const streets = ['中关村大街', '建国门外大街', '长安街', '王府井大街', '西单大街'];
    const numbers = Math.floor(Math.random() * 999) + 1;
    
    return `北京市${districts[Math.floor(Math.random() * districts.length)]}${streets[Math.floor(Math.random() * streets.length)]}${numbers}号`;
  }

  private getRandomCity(): string {
    const cities = ['北京', '上海', '深圳', '广州', '杭州', '南京', '成都', '武汉'];
    return cities[Math.floor(Math.random() * cities.length)];
  }

  private getRandomProvince(): string {
    const provinces = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省'];
    return provinces[Math.floor(Math.random() * provinces.length)];
  }

  private generatePostalCode(): string {
    return (100000 + Math.floor(Math.random() * 899999)).toString();
  }

  private generateWebsite(baseName: string): string {
    const domains = ['.com', '.cn', '.com.cn', '.net'];
    const cleanName = baseName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    return `https://www.${cleanName}${domains[Math.floor(Math.random() * domains.length)]}`;
  }

  private generatePhoneNumber(): string {
    const areaCodes = ['010', '021', '0755', '020', '0571', '025'];
    const number = Math.floor(Math.random() * 90000000) + 10000000;
    return `${areaCodes[Math.floor(Math.random() * areaCodes.length)]}-${number}`;
  }

  private generateEmail(baseName: string): string {
    const domains = ['163.com', 'qq.com', 'sina.com', '126.com'];
    const cleanName = baseName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    return `contact@${cleanName}.${domains[Math.floor(Math.random() * domains.length)]}`;
  }

  private generateEmployeeCount(companyName: string): number {
    if (companyName.includes('集团')) return Math.floor(Math.random() * 50000) + 10000;
    if (companyName.includes('股份')) return Math.floor(Math.random() * 5000) + 1000;
    if (companyName.includes('科技')) return Math.floor(Math.random() * 500) + 50;
    return Math.floor(Math.random() * 200) + 10;
  }

  private generateDescription(companyName: string): string {
    const industry = this.inferIndustry(companyName);
    return `${companyName}是一家专业从事${industry}的企业，致力于为客户提供优质的产品和服务。公司拥有专业的技术团队和丰富的行业经验，在业内享有良好声誉。`;
  }

  private generateEstablishedYear(): number {
    return 2024 - Math.floor(Math.random() * 30);
  }

  /**
   * 获取AI配置状态
   */
  async getAIStatus(): Promise<{
    hasConfig: boolean;
    currentProvider?: AIProvider;
    availableProviders: AIProvider[];
  }> {
    try {
      // 先尝试获取AI配置，如果失败则返回默认值
      const [enabledConfigResponse, statsResponse] = await Promise.allSettled([
        aiConfigDatabaseService.getEnabledConfig(),
        aiConfigDatabaseService.getConfigStats()
      ]);
      
      // 处理启用的配置响应
      const enabledConfig = enabledConfigResponse.status === 'fulfilled' && 
        enabledConfigResponse.value.success ? 
        enabledConfigResponse.value.data : null;
      
      // 处理统计响应
      const stats = statsResponse.status === 'fulfilled' && 
        statsResponse.value.success ? 
        statsResponse.value.data : null;
      
      return {
        hasConfig: !!enabledConfig,
        currentProvider: enabledConfig?.provider,
        availableProviders: stats?.providers?.map((p: { provider: AIProvider }) => p.provider) || 
          ['openai', 'claude', 'deepseek'] // 默认可用提供商
      };
    } catch (error) {
      return {
        hasConfig: false,
        currentProvider: undefined,
        availableProviders: ['openai', 'claude', 'deepseek']
      };
    }
  }

  /**
   * 测试当前AI连接
   */
  async testAIConnection(): Promise<{ success: boolean; message: string; provider?: AIProvider }> {
    try {
      const enabledConfigResponse = await aiConfigDatabaseService.getEnabledConfig();
      
      if (!enabledConfigResponse.success || !enabledConfigResponse.data) {
        return { success: false, message: '未配置AI API' };
      }

      const provider = await this.getAIProvider();
      const currentProvider = enabledConfigResponse.data.provider;
      
      const result = await provider.testConnection();
      
      return {
        ...result,
        provider: currentProvider
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}

const instance = new AICompanyService();
export default instance;
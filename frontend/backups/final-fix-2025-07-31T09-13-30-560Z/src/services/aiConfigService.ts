import { AIProvider, AIProviderConfig, AI_PROVIDER_DEFAULTS } from '../types/ai';

/**
 * AI配置管理服务
 * 负责管理用户的AI API配置，包括API密钥、模型选择等
 */
class AIConfigService {
  private readonly STORAGE_KEY = 'ai_config';
  private readonly DEFAULT_PROVIDER: AIProvider = 'openai';

  /**
   * 获取当前AI配置
   */
  getConfig(): Partial<AIProviderConfig> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        // 合并默认配置
        return this.mergeWithDefaults(config);
      }
    } catch (error) {
      console.error('获取AI配置失败:', error);
    }
    
    // 返回默认配置
    return this.getDefaultConfig();
  }

  /**
   * 保存AI配置
   */
  saveConfig(config: Partial<AIProviderConfig>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('保存AI配置失败:', error);
      throw new Error('保存配置失败，请检查存储空间');
    }
  }

  /**
   * 获取当前选中的AI提供商
   */
  getCurrentProvider(): AIProvider {
    const config = this.getConfig();
    
    // 检查哪个提供商有有效的API密钥
    for (const provider of ['openai', 'claude', 'deepseek'] as AIProvider[]) {
      if (config[provider]?.apiKey) {
        return provider;
      }
    }
    
    return this.DEFAULT_PROVIDER;
  }

  /**
   * 获取指定提供商的配置
   */
  getProviderConfig(provider: AIProvider): AIProviderConfig[AIProvider] | null {
    const config = this.getConfig();
    const providerConfig = config[provider];
    
    if (!providerConfig?.apiKey) {
      return null;
    }
    
    return providerConfig;
  }

  /**
   * 验证API密钥格式
   */
  validateApiKey(provider: AIProvider, apiKey: string): { valid: boolean; message?: string } {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, message: 'API密钥不能为空' };
    }

    switch (provider) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return { valid: false, message: 'OpenAI API密钥应以 "sk-" 开头' };
        }
        if (apiKey.length < 20) {
          return { valid: false, message: 'OpenAI API密钥长度不足' };
        }
        break;
        
      case 'claude':
        if (!apiKey.startsWith('sk-ant-')) {
          return { valid: false, message: 'Claude API密钥应以 "sk-ant-" 开头' };
        }
        break;
        
      case 'deepseek':
        if (!apiKey.startsWith('sk-')) {
          return { valid: false, message: 'DeepSeek API密钥应以 "sk-" 开头' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * 测试API连接
   */
  async testConnection(provider: AIProvider, config: AIProviderConfig[AIProvider]): Promise<{ success: boolean; message: string }> {
    try {
      // 这里应该调用对应的API进行连接测试
      // 为了演示，我们模拟一个简单的测试
      const testMessage = '测试连接';
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 简单的API密钥格式验证
      const validation = this.validateApiKey(provider, config.apiKey);
      if (!validation.valid) {
        return { success: false, message: validation.message || '连接失败' };
      }
      
      return { success: true, message: '连接成功！' };
    } catch (error) {
      return { success: false, message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }

  /**
   * 重置配置
   */
  resetConfig(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('重置AI配置失败:', error);
    }
  }

  /**
   * 获取可用的提供商列表
   */
  getAvailableProviders(): AIProvider[] {
    const config = this.getConfig();
    return (['openai', 'claude', 'deepseek'] as AIProvider[]).filter(
      provider => config[provider]?.apiKey
    );
  }

  /**
   * 检查是否有任何可用的AI配置
   */
  hasValidConfig(): boolean {
    return this.getAvailableProviders().length > 0;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): Partial<AIProviderConfig> {
    return {
      openai: {
        ...AI_PROVIDER_DEFAULTS.openai,
        apiKey: ''} as AIProviderConfig['openai'],
      claude: {
        ...AI_PROVIDER_DEFAULTS.claude,
        apiKey: ''} as AIProviderConfig['claude'],
      deepseek: {
        ...AI_PROVIDER_DEFAULTS.deepseek,
        apiKey: ''} as AIProviderConfig['deepseek']};
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaults(config: Partial<AIProviderConfig>): AIProviderConfig {
    const defaultConfig = this.getDefaultConfig();
    
    return {
      openai: { ...defaultConfig.openai, ...config.openai } as AIProviderConfig['openai'],
      claude: { ...defaultConfig.claude, ...config.claude } as AIProviderConfig['claude'],
      deepseek: { ...defaultConfig.deepseek, ...config.deepseek } as AIProviderConfig['deepseek']};
  }

  /**
   * 导出配置（用于备份）
   */
  exportConfig(): string {
    const config = this.getConfig();
    // 移除敏感的API密钥信息
    const safeConfig = JSON.parse(JSON.stringify(config));
    
    Object.keys(safeConfig).forEach(provider => {
      if (safeConfig[provider]?.apiKey) {
        safeConfig[provider].apiKey = '***hidden***';
      }
    });
    
    return JSON.stringify(safeConfig, null, 2);
  }

  /**
   * 导入配置（需要用户重新输入API密钥）
   */
  importConfig(configJson: string): { success: boolean; message: string } {
    try {
      const importedConfig = JSON.parse(configJson);
      
      // 验证配置结构
      if (typeof importedConfig !== 'object' || !importedConfig) {
        return { success: false, message: '无效的配置格式' };
      }
      
      // 合并到现有配置
      const currentConfig = this.getConfig();
      const mergedConfig = { ...currentConfig };
      
      Object.keys(importedConfig).forEach(provider => {
        if (['openai', 'claude', 'deepseek'].includes(provider)) {
          mergedConfig[provider as AIProvider] = {
            ...mergedConfig[provider as AIProvider],
            ...importedConfig[provider],
            // 保留现有的API密钥
            apiKey: mergedConfig[provider as AIProvider]?.apiKey || ''};
        }
      });
      
      this.saveConfig(mergedConfig);
      return { success: true, message: '配置导入成功！请重新设置API密钥。' };
    } catch (error) {
      return { success: false, message: '配置解析失败，请检查格式' };
    }
  }
}

export default new AIConfigService();
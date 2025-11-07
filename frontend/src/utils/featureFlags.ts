/**
 * FeatureFlagService - 特性开关服务
 *
 * 用于灰度发布和A/B测试的特性开关管理
 * 支持：
 * - 百分比灰度
 * - 白名单/黑名单
 * - 环境覆盖
 * - LocalStorage持久化
 */

export enum FeatureFlag {
  NEW_TASK_DETAIL = 'NEW_TASK_DETAIL',
}

export interface FeatureFlagConfig {
  /** 特性是否启用 */
  enabled: boolean;
  /** 灰度发布百分比 0-100 */
  rolloutPercentage: number;
  /** 白名单用户ID列表（优先级高） */
  whitelistUsers?: number[];
  /** 黑名单用户ID列表（优先级最高） */
  blacklistUsers?: number[];
  /** 环境覆盖（开发环境强制启用） */
  environmentOverride?: boolean;
}

// ✅ FIXED - Export FeatureFlagConfigs type so it can be imported by other modules (TS2724)
export type FeatureFlagConfigs = Record<FeatureFlag, FeatureFlagConfig>;

const STORAGE_KEY = 'featureFlags';

export class FeatureFlagService {
  private static config: Map<FeatureFlag, FeatureFlagConfig> = new Map();
  private static initialized = false;

  /**
   * 初始化特性开关配置
   */
  static init(configs: FeatureFlagConfigs): void {
    this.config.clear();

    // 尝试从LocalStorage加载
    const stored = this.loadFromLocalStorage();

    Object.entries(configs).forEach(([key, value]) => {
      const flag = key as FeatureFlag;
      // 优先使用LocalStorage中的配置，否则使用传入的默认配置
      const finalConfig = stored.get(flag) || value;
      this.config.set(flag, finalConfig);
    });

    this.initialized = true;
    console.log('[FeatureFlag] Initialized with configs:', Array.from(this.config.entries()));
  }

  /**
   * 检查特性是否启用
   *
   * 优先级：
   * 1. 环境覆盖（开发环境）
   * 2. 黑名单（强制禁用）
   * 3. 白名单（强制启用）
   * 4. 百分比灰度（基于用户ID哈希）
   * 5. 总开关
   */
  static isEnabled(flag: FeatureFlag, userId?: number): boolean {
    if (!this.initialized) {
      console.warn('[FeatureFlag] Service not initialized, returning false');
      return false;
    }

    const config = this.config.get(flag);
    if (!config) {
      console.warn(`[FeatureFlag] Config not found for flag: ${flag}`);
      return false;
    }

    // 如果总开关关闭，直接返回false
    if (!config.enabled) {
      return false;
    }

    // 1. 环境覆盖（开发环境强制启用）
    if (config.environmentOverride && process.env.NODE_ENV === 'development') {
      console.log(`[FeatureFlag] ${flag} enabled by environment override`);
      return true;
    }

    // 2. 黑名单检查（最高优先级）
    if (userId !== undefined && config.blacklistUsers?.includes(userId)) {
      console.log(`[FeatureFlag] ${flag} disabled by blacklist for user ${userId}`);
      return false;
    }

    // 3. 白名单检查
    if (userId !== undefined && config.whitelistUsers?.includes(userId)) {
      console.log(`[FeatureFlag] ${flag} enabled by whitelist for user ${userId}`);
      return true;
    }

    // 4. 百分比灰度（基于用户ID哈希）
    if (userId !== undefined && config.rolloutPercentage > 0) {
      const hash = this.hashUserId(userId);
      const enabled = hash < config.rolloutPercentage;
      console.log(`[FeatureFlag] ${flag} ${enabled ? 'enabled' : 'disabled'} by rollout for user ${userId} (hash: ${hash}, threshold: ${config.rolloutPercentage})`);
      return enabled;
    }

    // 5. 如果没有userId，根据rolloutPercentage决定
    // 100%则启用，否则禁用
    return config.rolloutPercentage >= 100;
  }

  /**
   * 用户ID哈希函数
   * 将用户ID映射到0-100的范围
   * 保证同一用户始终得到相同的哈希值（分流稳定性）
   */
  private static hashUserId(userId: number): number {
    return userId % 100;
  }

  /**
   * 获取特性配置
   */
  static getConfig(flag: FeatureFlag): FeatureFlagConfig | undefined {
    return this.config.get(flag);
  }

  /**
   * 设置特性启用状态
   */
  static setEnabled(flag: FeatureFlag, enabled: boolean): void {
    const config = this.config.get(flag);
    if (config) {
      config.enabled = enabled;
      this.saveToLocalStorage();
      console.log(`[FeatureFlag] ${flag} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * 设置灰度百分比
   */
  static setRolloutPercentage(flag: FeatureFlag, percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      console.error(`[FeatureFlag] Invalid percentage: ${percentage}, must be 0-100`);
      return;
    }

    const config = this.config.get(flag);
    if (config) {
      config.rolloutPercentage = percentage;
      this.saveToLocalStorage();
      console.log(`[FeatureFlag] ${flag} rollout percentage set to ${percentage}%`);
    }
  }

  /**
   * 设置白名单
   */
  static setWhitelist(flag: FeatureFlag, userIds: number[]): void {
    const config = this.config.get(flag);
    if (config) {
      config.whitelistUsers = userIds;
      this.saveToLocalStorage();
      console.log(`[FeatureFlag] ${flag} whitelist updated:`, userIds);
    }
  }

  /**
   * 设置黑名单
   */
  static setBlacklist(flag: FeatureFlag, userIds: number[]): void {
    const config = this.config.get(flag);
    if (config) {
      config.blacklistUsers = userIds;
      this.saveToLocalStorage();
      console.log(`[FeatureFlag] ${flag} blacklist updated:`, userIds);
    }
  }

  /**
   * 添加用户到白名单
   */
  static addToWhitelist(flag: FeatureFlag, userId: number): void {
    const config = this.config.get(flag);
    if (config) {
      if (!config.whitelistUsers) {
        config.whitelistUsers = [];
      }
      if (!config.whitelistUsers.includes(userId)) {
        config.whitelistUsers.push(userId);
        this.saveToLocalStorage();
        console.log(`[FeatureFlag] User ${userId} added to ${flag} whitelist`);
      }
    }
  }

  /**
   * 从白名单移除用户
   */
  static removeFromWhitelist(flag: FeatureFlag, userId: number): void {
    const config = this.config.get(flag);
    if (config && config.whitelistUsers) {
      config.whitelistUsers = config.whitelistUsers.filter(id => id !== userId);
      this.saveToLocalStorage();
      console.log(`[FeatureFlag] User ${userId} removed from ${flag} whitelist`);
    }
  }

  /**
   * 保存到LocalStorage
   */
  private static saveToLocalStorage(): void {
    try {
      const configObj: Record<string, FeatureFlagConfig> = {};
      this.config.forEach((value, key) => {
        configObj[key] = value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configObj));
      console.log('[FeatureFlag] Config saved to localStorage');
    } catch (error) {
      console.error('[FeatureFlag] Failed to save to localStorage:', error);
    }
  }

  /**
   * 从LocalStorage加载
   */
  private static loadFromLocalStorage(): Map<FeatureFlag, FeatureFlagConfig> {
    const map = new Map<FeatureFlag, FeatureFlagConfig>();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const configObj = JSON.parse(stored);
        Object.entries(configObj).forEach(([key, value]) => {
          map.set(key as FeatureFlag, value as FeatureFlagConfig);
        });
        console.log('[FeatureFlag] Config loaded from localStorage');
      }
    } catch (error) {
      console.error('[FeatureFlag] Failed to load from localStorage:', error);
    }
    return map;
  }

  /**
   * 清除LocalStorage中的配置
   */
  static clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[FeatureFlag] Storage cleared');
    } catch (error) {
      console.error('[FeatureFlag] Failed to clear storage:', error);
    }
  }

  /**
   * 重置为默认配置
   */
  static reset(): void {
    this.config.clear();
    this.clearStorage();
    this.initialized = false;
    console.log('[FeatureFlag] Service reset');
  }

  /**
   * 获取所有配置（调试用）
   */
  static getAllConfigs(): Map<FeatureFlag, FeatureFlagConfig> {
    return new Map(this.config);
  }
}

// 默认配置
export const DEFAULT_FEATURE_FLAGS: FeatureFlagConfigs = {
  [FeatureFlag.NEW_TASK_DETAIL]: {
    enabled: false,
    rolloutPercentage: 0,
    whitelistUsers: [],
    blacklistUsers: [],
    environmentOverride: true, // 开发环境默认启用
  },
};

// 自动初始化
if (typeof window !== 'undefined') {
  FeatureFlagService.init(DEFAULT_FEATURE_FLAGS);
}

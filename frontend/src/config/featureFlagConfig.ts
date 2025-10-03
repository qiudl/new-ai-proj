/**
 * Feature Flag 配置文件
 * 用于初始化特性开关的默认配置
 */

import { FeatureFlag, FeatureFlagConfigs } from '../utils/featureFlags';

/**
 * 生产环境特性开关配置
 */
export const productionFeatureFlags: FeatureFlagConfigs = {
  [FeatureFlag.NEW_TASK_DETAIL]: {
    enabled: true,
    rolloutPercentage: 100, // 100% 全量发布
    whitelistUsers: [],
    blacklistUsers: [],
    environmentOverride: false,
  },
};

/**
 * 开发环境特性开关配置
 */
export const developmentFeatureFlags: FeatureFlagConfigs = {
  [FeatureFlag.NEW_TASK_DETAIL]: {
    enabled: true,
    rolloutPercentage: 100,
    whitelistUsers: [],
    blacklistUsers: [],
    environmentOverride: true, // 开发环境自动启用
  },
};

/**
 * 测试环境特性开关配置
 */
export const testFeatureFlags: FeatureFlagConfigs = {
  [FeatureFlag.NEW_TASK_DETAIL]: {
    enabled: true,
    rolloutPercentage: 100,
    whitelistUsers: [],
    blacklistUsers: [],
    environmentOverride: false,
  },
};

/**
 * 获取当前环境的特性开关配置
 */
export function getFeatureFlagConfig(): FeatureFlagConfigs {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return productionFeatureFlags;
    case 'test':
      return testFeatureFlags;
    case 'development':
    default:
      return developmentFeatureFlags;
  }
}

/**
 * Phase 4 全量发布配置
 * 在Phase 3验证成功后使用此配置
 */
export const phase4FullReleaseConfig: FeatureFlagConfigs = {
  [FeatureFlag.NEW_TASK_DETAIL]: {
    enabled: true,
    rolloutPercentage: 100,
    whitelistUsers: [],
    blacklistUsers: [],
    environmentOverride: false,
  },
};

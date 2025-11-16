/**
 * Figma API 速率限制管理器
 * 用于管理 Figma MCP 工具调用，避免触发速率限制
 *
 * 功能:
 * - 自动速率限制追踪
 * - 智能延迟和重试
 * - 本地缓存
 * - 调用历史记录
 */

class FigmaAPIManager {
  constructor(config = {}) {
    this.config = {
      // 速率限制配置（根据你的账户类型调整）
      rateLimit: config.rateLimit || 15, // Professional Full seat = 15次/分钟
      rateLimitWindow: config.rateLimitWindow || 60000, // 1分钟（毫秒）

      // 延迟配置
      minDelay: config.minDelay || 5000, // 最小延迟5秒
      maxRetries: config.maxRetries || 3, // 最大重试次数
      retryDelay: config.retryDelay || 60000, // 重试延迟60秒

      // 缓存配置
      enableCache: config.enableCache !== false, // 默认启用缓存
      cacheDir: config.cacheDir || './figma-cache',
      cacheTTL: config.cacheTTL || 3600000, // 缓存1小时

      // 日志配置
      verbose: config.verbose || true,
      logFile: config.logFile || './figma-api-calls.log'
    };

    // 调用追踪
    this.callHistory = [];
    this.currentWindowCalls = 0;
    this.windowStartTime = Date.now();

    // 缓存存储
    this.cache = new Map();

    // 初始化
    this.log('📊 Figma API Manager 初始化完成');
    this.log(`⚙️ 配置: ${this.config.rateLimit}次/分钟, 延迟${this.config.minDelay/1000}秒`);
  }

  /**
   * 日志记录
   */
  log(message, level = 'info') {
    if (!this.config.verbose) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    // 可选：写入日志文件
    if (typeof window === 'undefined') {
      // Node.js 环境
      const fs = require('fs');
      fs.appendFileSync(this.config.logFile, logMessage + '\n');
    }
  }

  /**
   * 检查速率限制
   */
  checkRateLimit() {
    const now = Date.now();
    const elapsed = now - this.windowStartTime;

    // 如果超过时间窗口，重置计数
    if (elapsed >= this.config.rateLimitWindow) {
      this.log(`🔄 速率限制窗口重置 (${this.currentWindowCalls}次调用)`);
      this.currentWindowCalls = 0;
      this.windowStartTime = now;
      return { allowed: true, waitTime: 0 };
    }

    // 检查是否超过限制
    if (this.currentWindowCalls >= this.config.rateLimit) {
      const waitTime = this.config.rateLimitWindow - elapsed;
      this.log(`⚠️ 速率限制触发！已调用${this.currentWindowCalls}/${this.config.rateLimit}次`, 'warn');
      this.log(`⏳ 需要等待 ${Math.ceil(waitTime/1000)} 秒`, 'warn');
      return { allowed: false, waitTime };
    }

    // 计算建议延迟
    const remaining = this.config.rateLimit - this.currentWindowCalls;
    const avgDelay = elapsed / (this.currentWindowCalls || 1);

    this.log(`✅ 速率检查通过: ${this.currentWindowCalls}/${this.config.rateLimit} (剩余${remaining}次)`);

    return {
      allowed: true,
      waitTime: 0,
      remaining,
      avgDelay: Math.round(avgDelay)
    };
  }

  /**
   * 等待指定时间
   */
  async sleep(ms) {
    this.log(`⏸️ 延迟 ${ms/1000} 秒...`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成缓存键
   */
  getCacheKey(tool, fileKey, nodeId, params = {}) {
    const paramStr = JSON.stringify(params);
    return `${tool}-${fileKey}-${nodeId}-${paramStr}`;
  }

  /**
   * 检查缓存
   */
  checkCache(cacheKey) {
    if (!this.config.enableCache) return null;

    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTTL) {
      this.log(`🗑️ 缓存过期: ${cacheKey}`);
      this.cache.delete(cacheKey);
      return null;
    }

    this.log(`💾 缓存命中: ${cacheKey}`);
    return cached.data;
  }

  /**
   * 保存到缓存
   */
  saveCache(cacheKey, data) {
    if (!this.config.enableCache) return;

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    this.log(`💾 缓存保存: ${cacheKey}`);
  }

  /**
   * 核心调用方法（带速率限制和重试）
   */
  async call(tool, fileKey, nodeId, params = {}, options = {}) {
    const cacheKey = this.getCacheKey(tool, fileKey, nodeId, params);

    // 检查缓存
    if (!options.skipCache) {
      const cached = this.checkCache(cacheKey);
      if (cached) return cached;
    }

    // 速率限制检查
    const rateLimitCheck = this.checkRateLimit();

    if (!rateLimitCheck.allowed) {
      // 等待速率限制窗口重置
      await this.sleep(rateLimitCheck.waitTime);
      // 递归重试
      return this.call(tool, fileKey, nodeId, params, options);
    }

    // 自动延迟（避免过快调用）
    if (this.currentWindowCalls > 0) {
      await this.sleep(this.config.minDelay);
    }

    // 执行调用
    let attempts = 0;
    while (attempts < this.config.maxRetries) {
      try {
        this.log(`🚀 调用 ${tool} (尝试 ${attempts + 1}/${this.config.maxRetries})`);
        this.log(`   - fileKey: ${fileKey}`);
        this.log(`   - nodeId: ${nodeId}`);

        // 记录调用
        this.currentWindowCalls++;
        const callRecord = {
          tool,
          fileKey,
          nodeId,
          params,
          timestamp: Date.now(),
          attempt: attempts + 1
        };
        this.callHistory.push(callRecord);

        // 这里需要实际的 MCP 工具调用
        // 由于我们在浏览器环境中无法直接调用 MCP，这里返回模拟数据
        // 实际使用时，需要通过 Claude Code 的 MCP 接口调用
        const result = await this.executeMCPTool(tool, fileKey, nodeId, params);

        // 保存缓存
        this.saveCache(cacheKey, result);

        this.log(`✅ 调用成功: ${tool}`);
        return result;

      } catch (error) {
        attempts++;

        if (error.code === 429 || error.message?.includes('rate limit')) {
          // 速率限制错误
          const retryAfter = error.retryAfter || this.config.retryDelay;
          this.log(`⚠️ 429 错误 - 速率限制触发`, 'error');
          this.log(`⏳ ${retryAfter/1000}秒后重试...`, 'warn');

          if (attempts < this.config.maxRetries) {
            await this.sleep(retryAfter);
            continue;
          }
        }

        // 其他错误或超过重试次数
        this.log(`❌ 调用失败: ${error.message}`, 'error');
        throw error;
      }
    }

    throw new Error(`调用失败：超过最大重试次数 (${this.config.maxRetries})`);
  }

  /**
   * 执行实际的 MCP 工具调用
   * 注意：这个方法需要在实际环境中实现
   */
  async executeMCPTool(tool, fileKey, nodeId, params) {
    // 这里是占位实现
    // 实际使用时，需要通过 Claude Code 的 MCP 接口
    throw new Error('此方法需要在实际环境中实现。请通过 Claude Code MCP 调用。');
  }

  /**
   * 便捷方法：获取截图
   */
  async getScreenshot(fileKey, nodeId, params = {}) {
    return this.call('get_screenshot', fileKey, nodeId, {
      clientLanguages: params.clientLanguages || 'html,css,javascript',
      clientFrameworks: params.clientFrameworks || 'react',
      ...params
    });
  }

  /**
   * 便捷方法：获取设计上下文
   */
  async getDesignContext(fileKey, nodeId, params = {}) {
    return this.call('get_design_context', fileKey, nodeId, {
      clientLanguages: params.clientLanguages || 'html,css,javascript,typescript',
      clientFrameworks: params.clientFrameworks || 'react',
      forceCode: params.forceCode || false,
      disableCodeConnect: params.disableCodeConnect || false,
      ...params
    });
  }

  /**
   * 便捷方法：获取元数据
   */
  async getMetadata(fileKey, nodeId, params = {}) {
    return this.call('get_metadata', fileKey, nodeId, {
      clientLanguages: params.clientLanguages || 'html,css,javascript',
      clientFrameworks: params.clientFrameworks || 'react',
      ...params
    });
  }

  /**
   * 便捷方法：获取变量定义
   */
  async getVariableDefs(fileKey, nodeId, params = {}) {
    return this.call('get_variable_defs', fileKey, nodeId, params);
  }

  /**
   * 便捷方法：获取 FigJam
   */
  async getFigJam(fileKey, nodeId, params = {}) {
    return this.call('get_figjam', fileKey, nodeId, {
      includeImagesOfNodes: params.includeImagesOfNodes !== false,
      ...params
    });
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const now = Date.now();
    const windowElapsed = now - this.windowStartTime;
    const totalCalls = this.callHistory.length;

    // 按工具统计
    const toolStats = {};
    this.callHistory.forEach(call => {
      toolStats[call.tool] = (toolStats[call.tool] || 0) + 1;
    });

    // 最近1分钟的调用
    const recentCalls = this.callHistory.filter(
      call => now - call.timestamp < 60000
    );

    return {
      totalCalls,
      currentWindowCalls: this.currentWindowCalls,
      rateLimit: this.config.rateLimit,
      windowProgress: `${Math.round(windowElapsed/1000)}s / 60s`,
      remaining: this.config.rateLimit - this.currentWindowCalls,
      toolStats,
      recentCalls: recentCalls.length,
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * 计算缓存命中率
   */
  calculateCacheHitRate() {
    // 简化实现，实际需要追踪缓存命中和未命中
    return 'N/A';
  }

  /**
   * 打印统计信息
   */
  printStats() {
    const stats = this.getStats();
    console.log('\n📊 Figma API 调用统计');
    console.log('━'.repeat(50));
    console.log(`总调用次数: ${stats.totalCalls}`);
    console.log(`当前窗口: ${stats.currentWindowCalls}/${stats.rateLimit} (剩余${stats.remaining})`);
    console.log(`窗口进度: ${stats.windowProgress}`);
    console.log(`最近1分钟: ${stats.recentCalls}次调用`);
    console.log(`缓存大小: ${stats.cacheSize}条`);
    console.log('\n按工具统计:');
    Object.entries(stats.toolStats).forEach(([tool, count]) => {
      console.log(`  - ${tool}: ${count}次`);
    });
    console.log('━'.repeat(50) + '\n');
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.log('🗑️ 缓存已清除');
  }

  /**
   * 重置速率限制追踪
   */
  reset() {
    this.currentWindowCalls = 0;
    this.windowStartTime = Date.now();
    this.callHistory = [];
    this.log('🔄 速率追踪已重置');
  }
}

// 导出（浏览器和 Node.js 兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FigmaAPIManager;
} else if (typeof window !== 'undefined') {
  window.FigmaAPIManager = FigmaAPIManager;
}

// 使用示例
if (typeof require !== 'undefined' && require.main === module) {
  // 仅在直接运行此脚本时执行示例
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Figma API 速率限制管理器 - 使用示例
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 1. 创建管理器实例
const manager = new FigmaAPIManager({
  rateLimit: 15,        // 15次/分钟 (Professional Full seat)
  minDelay: 5000,       // 每次调用间隔5秒
  enableCache: true     // 启用缓存
});

// 2. 调用 API（自动处理速率限制）
const screenshot = await manager.getScreenshot(
  'fileKey',
  'nodeId'
);

// 3. 获取设计代码
const design = await manager.getDesignContext(
  'fileKey',
  'nodeId',
  { forceCode: true }
);

// 4. 查看统计
manager.printStats();

// 5. 清除缓存
manager.clearCache();

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

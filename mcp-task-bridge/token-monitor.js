import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
/**
 * Token刷新事件类型
 */
export var TokenRefreshEventType;
(function (TokenRefreshEventType) {
    TokenRefreshEventType["REFRESH_STARTED"] = "refresh_started";
    TokenRefreshEventType["REFRESH_SUCCESS"] = "refresh_success";
    TokenRefreshEventType["REFRESH_FAILED"] = "refresh_failed";
    TokenRefreshEventType["REFRESH_EXPIRED"] = "refresh_expired";
    TokenRefreshEventType["TOKEN_LOADED"] = "token_loaded";
    TokenRefreshEventType["TOKEN_EXPIRED"] = "token_expired";
    TokenRefreshEventType["TOKEN_PERSISTED"] = "token_persisted";
    TokenRefreshEventType["TOKEN_CLEARED"] = "token_cleared"; // Token清除
})(TokenRefreshEventType || (TokenRefreshEventType = {}));
/**
 * Token健康状态
 */
export var TokenHealthStatus;
(function (TokenHealthStatus) {
    TokenHealthStatus["HEALTHY"] = "healthy";
    TokenHealthStatus["WARNING"] = "warning";
    TokenHealthStatus["CRITICAL"] = "critical";
    TokenHealthStatus["UNKNOWN"] = "unknown"; // 未知
})(TokenHealthStatus || (TokenHealthStatus = {}));
/**
 * Token刷新监控器
 * 记录Token刷新事件、统计信息和健康状态
 */
export class TokenRefreshMonitor {
    constructor(config = {}) {
        this.events = [];
        this.startTime = new Date();
        // 默认配置
        this.config = {
            enableLogging: config.enableLogging !== false,
            enableMetrics: config.enableMetrics !== false,
            logFilePath: config.logFilePath || path.join(homedir(), '.mcp-task-bridge', 'token-refresh.log'),
            maxLogSize: config.maxLogSize || 10 * 1024 * 1024, // 10MB
            maxEventHistory: config.maxEventHistory || 1000,
            alertThreshold: {
                consecutiveFailures: config.alertThreshold?.consecutiveFailures || 3,
                failureRate: config.alertThreshold?.failureRate || 0.5
            }
        };
        this.logFilePath = this.config.logFilePath;
        // 初始化统计
        this.stats = {
            totalRefreshes: 0,
            successfulRefreshes: 0,
            failedRefreshes: 0,
            consecutiveFailures: 0,
            uptime: 0,
            startTime: this.startTime.toISOString()
        };
        // 确保日志目录存在
        this.ensureLogDirectory();
    }
    /**
     * 确保日志目录存在
     */
    ensureLogDirectory() {
        try {
            const logDir = path.dirname(this.logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
            }
        }
        catch (error) {
            console.error('[TOKEN_MONITOR] 创建日志目录失败:', error.message);
        }
    }
    /**
     * 记录Token刷新事件
     */
    recordEvent(eventType, success, metadata, errorMessage, errorCode, duration) {
        const event = {
            timestamp: new Date().toISOString(),
            eventType,
            success,
            duration,
            errorMessage,
            errorCode,
            metadata
        };
        // 添加到事件历史
        this.events.push(event);
        // 限制事件历史大小
        if (this.events.length > this.config.maxEventHistory) {
            this.events.shift();
        }
        // 更新统计
        this.updateStats(event);
        // 写入日志
        if (this.config.enableLogging) {
            this.writeLog(event);
        }
        // 检查告警
        this.checkAlerts(event);
    }
    /**
     * 更新统计信息
     */
    updateStats(event) {
        // 更新运行时长
        this.stats.uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
        // 处理刷新事件
        if (event.eventType === TokenRefreshEventType.REFRESH_STARTED) {
            this.stats.totalRefreshes++;
        }
        if (event.eventType === TokenRefreshEventType.REFRESH_SUCCESS) {
            this.stats.successfulRefreshes++;
            this.stats.lastSuccessTime = event.timestamp;
            this.stats.lastRefreshTime = event.timestamp;
            this.stats.consecutiveFailures = 0;
            // 更新平均刷新耗时
            if (event.duration !== undefined) {
                const totalDuration = (this.stats.averageRefreshDuration || 0) * (this.stats.successfulRefreshes - 1);
                this.stats.averageRefreshDuration = (totalDuration + event.duration) / this.stats.successfulRefreshes;
            }
        }
        if (event.eventType === TokenRefreshEventType.REFRESH_FAILED) {
            this.stats.failedRefreshes++;
            this.stats.lastFailureTime = event.timestamp;
            this.stats.lastRefreshTime = event.timestamp;
            this.stats.consecutiveFailures++;
        }
    }
    /**
     * 写入日志文件
     */
    writeLog(event) {
        try {
            // 检查日志文件大小
            if (fs.existsSync(this.logFilePath)) {
                const stats = fs.statSync(this.logFilePath);
                if (stats.size > this.config.maxLogSize) {
                    // 轮转日志文件
                    this.rotateLog();
                }
            }
            // 格式化日志行
            const logLine = this.formatLogLine(event);
            // 追加到日志文件
            fs.appendFileSync(this.logFilePath, logLine + '\n', { mode: 0o600 });
        }
        catch (error) {
            console.error('[TOKEN_MONITOR] 写入日志失败:', error.message);
        }
    }
    /**
     * 格式化日志行
     */
    formatLogLine(event) {
        const parts = [
            event.timestamp,
            `[${event.eventType.toUpperCase()}]`,
            event.success ? 'SUCCESS' : 'FAILED'
        ];
        if (event.duration !== undefined) {
            parts.push(`duration=${event.duration}ms`);
        }
        if (event.errorMessage) {
            parts.push(`error="${event.errorMessage}"`);
        }
        if (event.errorCode) {
            parts.push(`code=${event.errorCode}`);
        }
        if (event.metadata) {
            const metadataStr = Object.entries(event.metadata)
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join(' ');
            if (metadataStr) {
                parts.push(metadataStr);
            }
        }
        return parts.join(' ');
    }
    /**
     * 轮转日志文件
     */
    rotateLog() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedPath = `${this.logFilePath}.${timestamp}`;
            fs.renameSync(this.logFilePath, rotatedPath);
            console.error('[TOKEN_MONITOR] 日志文件已轮转:', rotatedPath);
        }
        catch (error) {
            console.error('[TOKEN_MONITOR] 日志轮转失败:', error.message);
        }
    }
    /**
     * 检查告警条件
     */
    checkAlerts(event) {
        // 检查连续失败
        if (this.stats.consecutiveFailures >= this.config.alertThreshold.consecutiveFailures) {
            this.triggerAlert('consecutive_failures', `Token刷新连续失败 ${this.stats.consecutiveFailures} 次`, event);
        }
        // 检查失败率
        if (this.stats.totalRefreshes >= 10) {
            const failureRate = this.stats.failedRefreshes / this.stats.totalRefreshes;
            if (failureRate >= this.config.alertThreshold.failureRate) {
                this.triggerAlert('high_failure_rate', `Token刷新失败率过高: ${(failureRate * 100).toFixed(1)}%`, event);
            }
        }
    }
    /**
     * 触发告警
     */
    triggerAlert(alertType, message, event) {
        console.error(`[TOKEN_MONITOR] 🚨 告警 [${alertType}]: ${message}`);
        // 这里可以扩展为发送邮件、Slack通知等
        if (this.config.enableLogging) {
            const alertLog = `${new Date().toISOString()} [ALERT] [${alertType}] ${message} - Event: ${JSON.stringify(event)}`;
            fs.appendFileSync(this.logFilePath, alertLog + '\n', { mode: 0o600 });
        }
    }
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000)
        };
    }
    /**
     * 获取最近的事件
     */
    getRecentEvents(limit = 10) {
        return this.events.slice(-limit);
    }
    /**
     * 执行健康检查
     */
    healthCheck() {
        const stats = this.getStats();
        const issues = [];
        const recommendations = [];
        let status = TokenHealthStatus.HEALTHY;
        // 检查连续失败
        if (stats.consecutiveFailures > 0) {
            status = TokenHealthStatus.WARNING;
            issues.push(`连续失败 ${stats.consecutiveFailures} 次`);
            recommendations.push('检查网络连接和认证配置');
        }
        if (stats.consecutiveFailures >= this.config.alertThreshold.consecutiveFailures) {
            status = TokenHealthStatus.CRITICAL;
            recommendations.push('立即检查Refresh Token是否过期');
        }
        // 检查失败率
        if (stats.totalRefreshes >= 10) {
            const failureRate = stats.failedRefreshes / stats.totalRefreshes;
            if (failureRate >= this.config.alertThreshold.failureRate) {
                status = TokenHealthStatus.CRITICAL;
                issues.push(`失败率过高: ${(failureRate * 100).toFixed(1)}%`);
                recommendations.push('检查API服务器状态和Token配置');
            }
            else if (failureRate >= 0.3) {
                status = TokenHealthStatus.WARNING;
                issues.push(`失败率偏高: ${(failureRate * 100).toFixed(1)}%`);
            }
        }
        // 检查是否有刷新记录
        if (stats.totalRefreshes === 0 && stats.uptime > 300) {
            status = TokenHealthStatus.WARNING;
            issues.push('运行超过5分钟但没有Token刷新记录');
            recommendations.push('检查Token配置和刷新机制');
        }
        // 如果没有问题
        if (issues.length === 0) {
            recommendations.push('Token刷新状态正常');
        }
        return {
            status,
            lastCheck: new Date().toISOString(),
            issues,
            recommendations,
            stats
        };
    }
    /**
     * 重置统计信息
     */
    resetStats() {
        this.startTime = new Date();
        this.stats = {
            totalRefreshes: 0,
            successfulRefreshes: 0,
            failedRefreshes: 0,
            consecutiveFailures: 0,
            uptime: 0,
            startTime: this.startTime.toISOString()
        };
        this.events = [];
        console.error('[TOKEN_MONITOR] 统计信息已重置');
    }
    /**
     * 获取日志文件路径
     */
    getLogFilePath() {
        return this.logFilePath;
    }
}
// 全局监控器实例
let globalMonitor = null;
/**
 * 获取全局Token刷新监控器
 */
export function getGlobalTokenMonitor(config) {
    if (!globalMonitor) {
        globalMonitor = new TokenRefreshMonitor(config);
    }
    return globalMonitor;
}

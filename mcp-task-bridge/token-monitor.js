"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenRefreshMonitor = exports.TokenHealthStatus = exports.TokenRefreshEventType = void 0;
exports.getGlobalTokenMonitor = getGlobalTokenMonitor;
var fs = require("fs");
var path = require("path");
var os_1 = require("os");
/**
 * Token刷新事件类型
 */
var TokenRefreshEventType;
(function (TokenRefreshEventType) {
    TokenRefreshEventType["REFRESH_STARTED"] = "refresh_started";
    TokenRefreshEventType["REFRESH_SUCCESS"] = "refresh_success";
    TokenRefreshEventType["REFRESH_FAILED"] = "refresh_failed";
    TokenRefreshEventType["REFRESH_EXPIRED"] = "refresh_expired";
    TokenRefreshEventType["TOKEN_LOADED"] = "token_loaded";
    TokenRefreshEventType["TOKEN_EXPIRED"] = "token_expired";
    TokenRefreshEventType["TOKEN_PERSISTED"] = "token_persisted";
    TokenRefreshEventType["TOKEN_CLEARED"] = "token_cleared"; // Token清除
})(TokenRefreshEventType || (exports.TokenRefreshEventType = TokenRefreshEventType = {}));
/**
 * Token健康状态
 */
var TokenHealthStatus;
(function (TokenHealthStatus) {
    TokenHealthStatus["HEALTHY"] = "healthy";
    TokenHealthStatus["WARNING"] = "warning";
    TokenHealthStatus["CRITICAL"] = "critical";
    TokenHealthStatus["UNKNOWN"] = "unknown"; // 未知
})(TokenHealthStatus || (exports.TokenHealthStatus = TokenHealthStatus = {}));
/**
 * Token刷新监控器
 * 记录Token刷新事件、统计信息和健康状态
 */
var TokenRefreshMonitor = /** @class */ (function () {
    function TokenRefreshMonitor(config) {
        if (config === void 0) { config = {}; }
        var _a, _b;
        this.events = [];
        this.startTime = new Date();
        // 默认配置
        this.config = {
            enableLogging: config.enableLogging !== false,
            enableMetrics: config.enableMetrics !== false,
            logFilePath: config.logFilePath || path.join((0, os_1.homedir)(), '.mcp-task-bridge', 'token-refresh.log'),
            maxLogSize: config.maxLogSize || 10 * 1024 * 1024, // 10MB
            maxEventHistory: config.maxEventHistory || 1000,
            alertThreshold: {
                consecutiveFailures: ((_a = config.alertThreshold) === null || _a === void 0 ? void 0 : _a.consecutiveFailures) || 3,
                failureRate: ((_b = config.alertThreshold) === null || _b === void 0 ? void 0 : _b.failureRate) || 0.5
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
    TokenRefreshMonitor.prototype.ensureLogDirectory = function () {
        try {
            var logDir = path.dirname(this.logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true, mode: 448 });
            }
        }
        catch (error) {
            console.error('[TOKEN_MONITOR] 创建日志目录失败:', error.message);
        }
    };
    /**
     * 记录Token刷新事件
     */
    TokenRefreshMonitor.prototype.recordEvent = function (eventType, success, metadata, errorMessage, errorCode, duration) {
        var event = {
            timestamp: new Date().toISOString(),
            eventType: eventType,
            success: success,
            duration: duration,
            errorMessage: errorMessage,
            errorCode: errorCode,
            metadata: metadata
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
    };
    /**
     * 更新统计信息
     */
    TokenRefreshMonitor.prototype.updateStats = function (event) {
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
                var totalDuration = (this.stats.averageRefreshDuration || 0) * (this.stats.successfulRefreshes - 1);
                this.stats.averageRefreshDuration = (totalDuration + event.duration) / this.stats.successfulRefreshes;
            }
        }
        if (event.eventType === TokenRefreshEventType.REFRESH_FAILED) {
            this.stats.failedRefreshes++;
            this.stats.lastFailureTime = event.timestamp;
            this.stats.lastRefreshTime = event.timestamp;
            this.stats.consecutiveFailures++;
        }
    };
    /**
     * 写入日志文件
     */
    TokenRefreshMonitor.prototype.writeLog = function (event) {
        try {
            // 检查日志文件大小
            if (fs.existsSync(this.logFilePath)) {
                var stats = fs.statSync(this.logFilePath);
                if (stats.size > this.config.maxLogSize) {
                    // 轮转日志文件
                    this.rotateLog();
                }
            }
            // 格式化日志行
            var logLine = this.formatLogLine(event);
            // 追加到日志文件
            fs.appendFileSync(this.logFilePath, logLine + '\n', { mode: 384 });
        }
        catch (error) {
            console.error('[TOKEN_MONITOR] 写入日志失败:', error.message);
        }
    };
    /**
     * 格式化日志行
     */
    TokenRefreshMonitor.prototype.formatLogLine = function (event) {
        var parts = [
            event.timestamp,
            "[".concat(event.eventType.toUpperCase(), "]"),
            event.success ? 'SUCCESS' : 'FAILED'
        ];
        if (event.duration !== undefined) {
            parts.push("duration=".concat(event.duration, "ms"));
        }
        if (event.errorMessage) {
            parts.push("error=\"".concat(event.errorMessage, "\""));
        }
        if (event.errorCode) {
            parts.push("code=".concat(event.errorCode));
        }
        if (event.metadata) {
            var metadataStr = Object.entries(event.metadata)
                .map(function (_a) {
                var key = _a[0], value = _a[1];
                return "".concat(key, "=").concat(JSON.stringify(value));
            })
                .join(' ');
            if (metadataStr) {
                parts.push(metadataStr);
            }
        }
        return parts.join(' ');
    };
    /**
     * 轮转日志文件
     */
    TokenRefreshMonitor.prototype.rotateLog = function () {
        try {
            var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            var rotatedPath = "".concat(this.logFilePath, ".").concat(timestamp);
            fs.renameSync(this.logFilePath, rotatedPath);
            console.error('[TOKEN_MONITOR] 日志文件已轮转:', rotatedPath);
        }
        catch (error) {
            console.error('[TOKEN_MONITOR] 日志轮转失败:', error.message);
        }
    };
    /**
     * 检查告警条件
     */
    TokenRefreshMonitor.prototype.checkAlerts = function (event) {
        // 检查连续失败
        if (this.stats.consecutiveFailures >= this.config.alertThreshold.consecutiveFailures) {
            this.triggerAlert('consecutive_failures', "Token\u5237\u65B0\u8FDE\u7EED\u5931\u8D25 ".concat(this.stats.consecutiveFailures, " \u6B21"), event);
        }
        // 检查失败率
        if (this.stats.totalRefreshes >= 10) {
            var failureRate = this.stats.failedRefreshes / this.stats.totalRefreshes;
            if (failureRate >= this.config.alertThreshold.failureRate) {
                this.triggerAlert('high_failure_rate', "Token\u5237\u65B0\u5931\u8D25\u7387\u8FC7\u9AD8: ".concat((failureRate * 100).toFixed(1), "%"), event);
            }
        }
    };
    /**
     * 触发告警
     */
    TokenRefreshMonitor.prototype.triggerAlert = function (alertType, message, event) {
        console.error("[TOKEN_MONITOR] \uD83D\uDEA8 \u544A\u8B66 [".concat(alertType, "]: ").concat(message));
        // 这里可以扩展为发送邮件、Slack通知等
        if (this.config.enableLogging) {
            var alertLog = "".concat(new Date().toISOString(), " [ALERT] [").concat(alertType, "] ").concat(message, " - Event: ").concat(JSON.stringify(event));
            fs.appendFileSync(this.logFilePath, alertLog + '\n', { mode: 384 });
        }
    };
    /**
     * 获取统计信息
     */
    TokenRefreshMonitor.prototype.getStats = function () {
        return __assign(__assign({}, this.stats), { uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000) });
    };
    /**
     * 获取最近的事件
     */
    TokenRefreshMonitor.prototype.getRecentEvents = function (limit) {
        if (limit === void 0) { limit = 10; }
        return this.events.slice(-limit);
    };
    /**
     * 执行健康检查
     */
    TokenRefreshMonitor.prototype.healthCheck = function () {
        var stats = this.getStats();
        var issues = [];
        var recommendations = [];
        var status = TokenHealthStatus.HEALTHY;
        // 检查连续失败
        if (stats.consecutiveFailures > 0) {
            status = TokenHealthStatus.WARNING;
            issues.push("\u8FDE\u7EED\u5931\u8D25 ".concat(stats.consecutiveFailures, " \u6B21"));
            recommendations.push('检查网络连接和认证配置');
        }
        if (stats.consecutiveFailures >= this.config.alertThreshold.consecutiveFailures) {
            status = TokenHealthStatus.CRITICAL;
            recommendations.push('立即检查Refresh Token是否过期');
        }
        // 检查失败率
        if (stats.totalRefreshes >= 10) {
            var failureRate = stats.failedRefreshes / stats.totalRefreshes;
            if (failureRate >= this.config.alertThreshold.failureRate) {
                status = TokenHealthStatus.CRITICAL;
                issues.push("\u5931\u8D25\u7387\u8FC7\u9AD8: ".concat((failureRate * 100).toFixed(1), "%"));
                recommendations.push('检查API服务器状态和Token配置');
            }
            else if (failureRate >= 0.3) {
                status = TokenHealthStatus.WARNING;
                issues.push("\u5931\u8D25\u7387\u504F\u9AD8: ".concat((failureRate * 100).toFixed(1), "%"));
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
            status: status,
            lastCheck: new Date().toISOString(),
            issues: issues,
            recommendations: recommendations,
            stats: stats
        };
    };
    /**
     * 重置统计信息
     */
    TokenRefreshMonitor.prototype.resetStats = function () {
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
    };
    /**
     * 获取日志文件路径
     */
    TokenRefreshMonitor.prototype.getLogFilePath = function () {
        return this.logFilePath;
    };
    return TokenRefreshMonitor;
}());
exports.TokenRefreshMonitor = TokenRefreshMonitor;
// 全局监控器实例
var globalMonitor = null;
/**
 * 获取全局Token刷新监控器
 */
function getGlobalTokenMonitor(config) {
    if (!globalMonitor) {
        globalMonitor = new TokenRefreshMonitor(config);
    }
    return globalMonitor;
}

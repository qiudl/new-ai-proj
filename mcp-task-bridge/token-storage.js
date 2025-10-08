"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenStorageManager = void 0;
exports.getGlobalTokenStorage = getGlobalTokenStorage;
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var util_1 = require("util");
var os_1 = require("os");
var writeFile = (0, util_1.promisify)(fs.writeFile);
var readFile = (0, util_1.promisify)(fs.readFile);
var mkdir = (0, util_1.promisify)(fs.mkdir);
/**
 * Token持久化存储管理器
 * 支持Token的加密存储和自动加载
 */
var TokenStorageManager = /** @class */ (function () {
    function TokenStorageManager(config) {
        if (config === void 0) { config = {}; }
        // AES-256-GCM加密参数
        this.ALGORITHM = 'aes-256-gcm';
        this.KEY_LENGTH = 32; // 256 bits
        this.IV_LENGTH = 16; // 128 bits
        this.AUTH_TAG_LENGTH = 16; // 128 bits
        // 确定存储目录
        this.storageDir = config.storageDir || path.join((0, os_1.homedir)(), '.mcp-task-bridge');
        this.storageFile = path.join(this.storageDir, 'token-storage.enc');
        this.enableEncryption = config.enableEncryption !== false;
        // 初始化加密密钥
        if (this.enableEncryption) {
            this.encryptionKey = this.initEncryptionKey(config.encryptionKey);
        }
        else {
            // 即使不加密，也需要一个占位符密钥
            this.encryptionKey = Buffer.alloc(this.KEY_LENGTH);
        }
        // 确保存储目录存在
        this.ensureStorageDir();
    }
    /**
     * 初始化加密密钥
     * 优先级：传入的密钥 > 环境变量 > 自动生成
     */
    TokenStorageManager.prototype.initEncryptionKey = function (providedKey) {
        // 1. 使用传入的密钥
        if (providedKey) {
            return this.normalizeKey(providedKey);
        }
        // 2. 从环境变量读取
        var envKey = process.env.MCP_TOKEN_ENCRYPTION_KEY;
        if (envKey) {
            return this.normalizeKey(envKey);
        }
        // 3. 尝试从密钥文件读取（如果存在）
        var keyFile = path.join(this.storageDir, '.encryption-key');
        if (fs.existsSync(keyFile)) {
            try {
                var keyData = fs.readFileSync(keyFile, 'utf-8').trim();
                console.error('[TOKEN_STORAGE] 从密钥文件加载加密密钥');
                return this.normalizeKey(keyData);
            }
            catch (error) {
                console.error('[TOKEN_STORAGE] 密钥文件读取失败:', error.message);
            }
        }
        // 4. 自动生成并保存密钥
        console.error('[TOKEN_STORAGE] 自动生成新的加密密钥');
        var newKey = crypto.randomBytes(this.KEY_LENGTH);
        try {
            // 确保目录存在
            if (!fs.existsSync(this.storageDir)) {
                fs.mkdirSync(this.storageDir, { recursive: true, mode: 448 });
            }
            // 保存密钥（仅用户可读）
            fs.writeFileSync(keyFile, newKey.toString('hex'), { mode: 384 });
            console.error('[TOKEN_STORAGE] 加密密钥已保存到:', keyFile);
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 密钥文件保存失败:', error.message);
        }
        return newKey;
    };
    /**
     * 规范化密钥长度（确保32字节）
     */
    TokenStorageManager.prototype.normalizeKey = function (key) {
        var keyBuffer = Buffer.from(key, 'hex').length === this.KEY_LENGTH
            ? Buffer.from(key, 'hex')
            : crypto.createHash('sha256').update(key).digest();
        if (keyBuffer.length !== this.KEY_LENGTH) {
            throw new Error("Invalid key length: expected ".concat(this.KEY_LENGTH, " bytes"));
        }
        return keyBuffer;
    };
    /**
     * 确保存储目录存在
     */
    TokenStorageManager.prototype.ensureStorageDir = function () {
        try {
            if (!fs.existsSync(this.storageDir)) {
                fs.mkdirSync(this.storageDir, { recursive: true, mode: 448 });
                console.error('[TOKEN_STORAGE] 创建存储目录:', this.storageDir);
            }
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 创建存储目录失败:', error.message);
        }
    };
    /**
     * 加密数据
     */
    TokenStorageManager.prototype.encrypt = function (data) {
        if (!this.enableEncryption) {
            return Buffer.from(data).toString('base64');
        }
        try {
            // 生成随机IV
            var iv = crypto.randomBytes(this.IV_LENGTH);
            // 创建加密器
            var cipher = crypto.createCipheriv(this.ALGORITHM, this.encryptionKey, iv);
            // 加密数据
            var encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // 获取认证标签
            var authTag = cipher.getAuthTag();
            // 组合: IV + AuthTag + 加密数据
            var result = Buffer.concat([
                iv,
                authTag,
                Buffer.from(encrypted, 'hex')
            ]);
            return result.toString('base64');
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 加密失败:', error.message);
            throw new Error("Encryption failed: ".concat(error.message));
        }
    };
    /**
     * 解密数据
     */
    TokenStorageManager.prototype.decrypt = function (encryptedData) {
        if (!this.enableEncryption) {
            return Buffer.from(encryptedData, 'base64').toString('utf8');
        }
        try {
            // 解码Base64
            var buffer = Buffer.from(encryptedData, 'base64');
            // 提取IV、AuthTag和加密数据
            var iv = buffer.subarray(0, this.IV_LENGTH);
            var authTag = buffer.subarray(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH);
            var encrypted = buffer.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH);
            // 创建解密器
            var decipher = crypto.createDecipheriv(this.ALGORITHM, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);
            // 解密数据
            var decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 解密失败:', error.message);
            throw new Error("Decryption failed: ".concat(error.message));
        }
    };
    /**
     * 保存Token到持久化存储
     */
    TokenStorageManager.prototype.saveToken = function (tokenData) {
        return __awaiter(this, void 0, void 0, function () {
            var jsonData, encryptedData, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        jsonData = JSON.stringify(tokenData, null, 2);
                        encryptedData = this.encrypt(jsonData);
                        // 写入文件
                        return [4 /*yield*/, writeFile(this.storageFile, encryptedData, { mode: 384 })];
                    case 1:
                        // 写入文件
                        _a.sent();
                        console.error('[TOKEN_STORAGE] Token已保存到持久化存储', {
                            file: this.storageFile,
                            encrypted: this.enableEncryption,
                            expiresAt: tokenData.expiresAt
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('[TOKEN_STORAGE] 保存Token失败:', error_1.message);
                        throw new Error("Failed to save token: ".concat(error_1.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 从持久化存储加载Token
     */
    TokenStorageManager.prototype.loadToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var encryptedData, jsonData, tokenData, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 5]);
                        // 检查文件是否存在
                        if (!fs.existsSync(this.storageFile)) {
                            console.error('[TOKEN_STORAGE] Token存储文件不存在');
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, readFile(this.storageFile, 'utf-8')];
                    case 1:
                        encryptedData = _a.sent();
                        jsonData = this.decrypt(encryptedData);
                        tokenData = JSON.parse(jsonData);
                        // 验证数据完整性
                        if (!tokenData.accessToken || !tokenData.refreshToken || !tokenData.expiresAt) {
                            throw new Error('Invalid token data structure');
                        }
                        console.error('[TOKEN_STORAGE] Token已从持久化存储加载', {
                            expiresAt: tokenData.expiresAt,
                            lastUpdate: tokenData.lastUpdate
                        });
                        return [2 /*return*/, tokenData];
                    case 2:
                        error_2 = _a.sent();
                        console.error('[TOKEN_STORAGE] 加载Token失败:', error_2.message);
                        if (!(error_2.message.includes('Decryption failed') ||
                            error_2.message.includes('Invalid token data'))) return [3 /*break*/, 4];
                        console.error('[TOKEN_STORAGE] 检测到损坏的Token文件，自动删除');
                        return [4 /*yield*/, this.clearToken()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, null];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 清除持久化的Token
     */
    TokenStorageManager.prototype.clearToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    if (fs.existsSync(this.storageFile)) {
                        fs.unlinkSync(this.storageFile);
                        console.error('[TOKEN_STORAGE] Token已从持久化存储中删除');
                    }
                }
                catch (error) {
                    console.error('[TOKEN_STORAGE] 删除Token文件失败:', error.message);
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * 检查Token是否过期
     */
    TokenStorageManager.prototype.isTokenExpired = function (tokenData, bufferMs) {
        if (bufferMs === void 0) { bufferMs = 60000; }
        var expiresAt = new Date(tokenData.expiresAt);
        var now = new Date();
        var timeUntilExpiry = expiresAt.getTime() - now.getTime();
        return timeUntilExpiry <= bufferMs;
    };
    /**
     * 获取存储文件路径（用于调试）
     */
    TokenStorageManager.prototype.getStorageFilePath = function () {
        return this.storageFile;
    };
    /**
     * 检查是否启用了加密
     */
    TokenStorageManager.prototype.isEncryptionEnabled = function () {
        return this.enableEncryption;
    };
    return TokenStorageManager;
}());
exports.TokenStorageManager = TokenStorageManager;
// 导出单例实例（可选）
var globalTokenStorage = null;
/**
 * 获取全局Token存储管理器实例
 */
function getGlobalTokenStorage(config) {
    if (!globalTokenStorage) {
        globalTokenStorage = new TokenStorageManager(config);
    }
    return globalTokenStorage;
}

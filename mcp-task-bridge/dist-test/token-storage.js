import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { homedir } from 'os';
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
/**
 * Token持久化存储管理器
 * 支持Token的加密存储和自动加载
 */
export class TokenStorageManager {
    constructor(config = {}) {
        // AES-256-GCM加密参数
        this.ALGORITHM = 'aes-256-gcm';
        this.KEY_LENGTH = 32; // 256 bits
        this.IV_LENGTH = 16; // 128 bits
        this.AUTH_TAG_LENGTH = 16; // 128 bits
        // 确定存储目录
        this.storageDir = config.storageDir || path.join(homedir(), '.mcp-task-bridge');
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
    initEncryptionKey(providedKey) {
        // 1. 使用传入的密钥
        if (providedKey) {
            return this.normalizeKey(providedKey);
        }
        // 2. 从环境变量读取
        const envKey = process.env.MCP_TOKEN_ENCRYPTION_KEY;
        if (envKey) {
            return this.normalizeKey(envKey);
        }
        // 3. 尝试从密钥文件读取（如果存在）
        const keyFile = path.join(this.storageDir, '.encryption-key');
        if (fs.existsSync(keyFile)) {
            try {
                const keyData = fs.readFileSync(keyFile, 'utf-8').trim();
                console.error('[TOKEN_STORAGE] 从密钥文件加载加密密钥');
                return this.normalizeKey(keyData);
            }
            catch (error) {
                console.error('[TOKEN_STORAGE] 密钥文件读取失败:', error.message);
            }
        }
        // 4. 自动生成并保存密钥
        console.error('[TOKEN_STORAGE] 自动生成新的加密密钥');
        const newKey = crypto.randomBytes(this.KEY_LENGTH);
        try {
            // 确保目录存在
            if (!fs.existsSync(this.storageDir)) {
                fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o700 });
            }
            // 保存密钥（仅用户可读）
            fs.writeFileSync(keyFile, newKey.toString('hex'), { mode: 0o600 });
            console.error('[TOKEN_STORAGE] 加密密钥已保存到:', keyFile);
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 密钥文件保存失败:', error.message);
        }
        return newKey;
    }
    /**
     * 规范化密钥长度（确保32字节）
     */
    normalizeKey(key) {
        const keyBuffer = Buffer.from(key, 'hex').length === this.KEY_LENGTH
            ? Buffer.from(key, 'hex')
            : crypto.createHash('sha256').update(key).digest();
        if (keyBuffer.length !== this.KEY_LENGTH) {
            throw new Error(`Invalid key length: expected ${this.KEY_LENGTH} bytes`);
        }
        return keyBuffer;
    }
    /**
     * 确保存储目录存在
     */
    ensureStorageDir() {
        try {
            if (!fs.existsSync(this.storageDir)) {
                fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o700 });
                console.error('[TOKEN_STORAGE] 创建存储目录:', this.storageDir);
            }
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 创建存储目录失败:', error.message);
        }
    }
    /**
     * 加密数据
     */
    encrypt(data) {
        if (!this.enableEncryption) {
            return Buffer.from(data).toString('base64');
        }
        try {
            // 生成随机IV
            const iv = crypto.randomBytes(this.IV_LENGTH);
            // 创建加密器
            const cipher = crypto.createCipheriv(this.ALGORITHM, this.encryptionKey, iv);
            // 加密数据
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // 获取认证标签
            const authTag = cipher.getAuthTag();
            // 组合: IV + AuthTag + 加密数据
            const result = Buffer.concat([
                iv,
                authTag,
                Buffer.from(encrypted, 'hex')
            ]);
            return result.toString('base64');
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 加密失败:', error.message);
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
    /**
     * 解密数据
     */
    decrypt(encryptedData) {
        if (!this.enableEncryption) {
            return Buffer.from(encryptedData, 'base64').toString('utf8');
        }
        try {
            // 解码Base64
            const buffer = Buffer.from(encryptedData, 'base64');
            // 提取IV、AuthTag和加密数据
            const iv = buffer.subarray(0, this.IV_LENGTH);
            const authTag = buffer.subarray(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH);
            const encrypted = buffer.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH);
            // 创建解密器
            const decipher = crypto.createDecipheriv(this.ALGORITHM, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);
            // 解密数据
            let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 解密失败:', error.message);
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    /**
     * 保存Token到持久化存储
     */
    async saveToken(tokenData) {
        try {
            // 序列化为JSON
            const jsonData = JSON.stringify(tokenData, null, 2);
            // 加密（如果启用）
            const encryptedData = this.encrypt(jsonData);
            // 写入文件
            await writeFile(this.storageFile, encryptedData, { mode: 0o600 });
            console.error('[TOKEN_STORAGE] Token已保存到持久化存储', {
                file: this.storageFile,
                encrypted: this.enableEncryption,
                expiresAt: tokenData.expiresAt
            });
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 保存Token失败:', error.message);
            throw new Error(`Failed to save token: ${error.message}`);
        }
    }
    /**
     * 从持久化存储加载Token
     */
    async loadToken() {
        try {
            // 检查文件是否存在
            if (!fs.existsSync(this.storageFile)) {
                console.error('[TOKEN_STORAGE] Token存储文件不存在');
                return null;
            }
            // 读取加密数据
            const encryptedData = await readFile(this.storageFile, 'utf-8');
            // 解密
            const jsonData = this.decrypt(encryptedData);
            // 解析JSON
            const tokenData = JSON.parse(jsonData);
            // 验证数据完整性
            if (!tokenData.accessToken || !tokenData.refreshToken || !tokenData.expiresAt) {
                throw new Error('Invalid token data structure');
            }
            console.error('[TOKEN_STORAGE] Token已从持久化存储加载', {
                expiresAt: tokenData.expiresAt,
                lastUpdate: tokenData.lastUpdate
            });
            return tokenData;
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 加载Token失败:', error.message);
            // 如果是解密错误或格式错误，删除损坏的文件
            if (error.message.includes('Decryption failed') ||
                error.message.includes('Invalid token data')) {
                console.error('[TOKEN_STORAGE] 检测到损坏的Token文件，自动删除');
                await this.clearToken();
            }
            return null;
        }
    }
    /**
     * 清除持久化的Token
     */
    async clearToken() {
        try {
            if (fs.existsSync(this.storageFile)) {
                fs.unlinkSync(this.storageFile);
                console.error('[TOKEN_STORAGE] Token已从持久化存储中删除');
            }
        }
        catch (error) {
            console.error('[TOKEN_STORAGE] 删除Token文件失败:', error.message);
        }
    }
    /**
     * 检查Token是否过期
     */
    isTokenExpired(tokenData, bufferMs = 60000) {
        const expiresAt = new Date(tokenData.expiresAt);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        return timeUntilExpiry <= bufferMs;
    }
    /**
     * 获取存储文件路径（用于调试）
     */
    getStorageFilePath() {
        return this.storageFile;
    }
    /**
     * 检查是否启用了加密
     */
    isEncryptionEnabled() {
        return this.enableEncryption;
    }
}
// 导出单例实例（可选）
let globalTokenStorage = null;
/**
 * 获取全局Token存储管理器实例
 */
export function getGlobalTokenStorage(config) {
    if (!globalTokenStorage) {
        globalTokenStorage = new TokenStorageManager(config);
    }
    return globalTokenStorage;
}

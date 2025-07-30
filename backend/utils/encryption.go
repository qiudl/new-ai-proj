package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	mathrand "math/rand"
	"strings"
)

// EncryptionService 提供API密钥加密解密服务
type EncryptionService struct {
	gcm    cipher.AEAD
	keyID  string
}

// NewEncryptionService 创建加密服务实例
func NewEncryptionService(key []byte, keyID string) (*EncryptionService, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	return &EncryptionService{
		gcm:   gcm,
		keyID: keyID,
	}, nil
}

// EncryptAPIKey 加密API密钥
func (es *EncryptionService) EncryptAPIKey(plaintext string) (string, error) {
	if plaintext == "" {
		return "", errors.New("plaintext cannot be empty")
	}

	// 生成随机nonce
	nonce := make([]byte, es.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// 加密数据
	ciphertext := es.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	
	// 添加密钥ID前缀，格式: keyID:base64(ciphertext)
	encrypted := fmt.Sprintf("%s:%s", es.keyID, base64.StdEncoding.EncodeToString(ciphertext))
	
	return encrypted, nil
}

// DecryptAPIKey 解密API密钥
func (es *EncryptionService) DecryptAPIKey(encrypted string) (string, error) {
	if encrypted == "" {
		return "", errors.New("encrypted text cannot be empty")
	}

	// 解析密钥ID和密文
	keyID, ciphertextB64, found := parseEncryptedData(encrypted)
	if !found {
		return "", errors.New("invalid encrypted data format")
	}

	// 验证密钥ID
	if keyID != es.keyID {
		return "", fmt.Errorf("key ID mismatch: expected %s, got %s", es.keyID, keyID)
	}

	// Base64解码
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// 检查密文长度
	nonceSize := es.gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	// 提取nonce和密文
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	
	// 解密
	plaintext, err := es.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}

// HashAPIKey 生成API密钥的SHA256哈希值
func (es *EncryptionService) HashAPIKey(apiKey string) string {
	hash := sha256.Sum256([]byte(apiKey))
	return hex.EncodeToString(hash[:])
}

// MaskAPIKey 脱敏显示API密钥
func (es *EncryptionService) MaskAPIKey(apiKey string) string {
	if len(apiKey) <= 8 {
		return "••••••••"
	}
	
	// 显示前4位和后4位
	prefix := apiKey[:4]
	suffix := apiKey[len(apiKey)-4:]
	middle := "••••••••••••••••" // 16个点
	
	return fmt.Sprintf("%s%s%s", prefix, middle, suffix)
}

// VerifyAPIKey 验证API密钥是否匹配
func (es *EncryptionService) VerifyAPIKey(apiKey, hash string) bool {
	return es.HashAPIKey(apiKey) == hash
}

// GenerateEncryptionKey 生成新的AES-256密钥
func GenerateEncryptionKey() ([]byte, error) {
	key := make([]byte, 32) // 256位
	if _, err := rand.Read(key); err != nil {
		return nil, fmt.Errorf("failed to generate key: %w", err)
	}
	return key, nil
}

// EncodeKey 将密钥编码为Base64字符串
func EncodeKey(key []byte) string {
	return base64.StdEncoding.EncodeToString(key)
}

// DecodeKey 从Base64字符串解码密钥
func DecodeKey(encoded string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(encoded)
}

// parseEncryptedData 解析加密数据格式 "keyID:ciphertext"
func parseEncryptedData(encrypted string) (keyID, ciphertext string, found bool) {
	for i, char := range encrypted {
		if char == ':' {
			return encrypted[:i], encrypted[i+1:], true
		}
	}
	return "", "", false
}

// RotateEncryption 密钥轮换：使用新密钥重新加密
func RotateEncryption(oldService, newService *EncryptionService, encryptedData string) (string, error) {
	// 用旧密钥解密
	plaintext, err := oldService.DecryptAPIKey(encryptedData)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt with old key: %w", err)
	}
	
	// 用新密钥加密
	newEncrypted, err := newService.EncryptAPIKey(plaintext)
	if err != nil {
		return "", fmt.Errorf("failed to encrypt with new key: %w", err)
	}
	
	return newEncrypted, nil
}

// 辅助函数

// HasPrefix 检查字符串是否有指定前缀
func HasPrefix(s, prefix string) bool {
	return len(s) >= len(prefix) && s[0:len(prefix)] == prefix
}

// ContainsAny 检查字符串是否包含任意一个子字符串
func ContainsAny(s string, substrs []string) bool {
	for _, substr := range substrs {
		if strings.Contains(strings.ToLower(s), strings.ToLower(substr)) {
			return true
		}
	}
	return false
}

// RandomInt 生成指定范围内的随机整数
func RandomInt(max int) int {
	if max <= 0 {
		return 0
	}
	return int(mathrand.Int31n(int32(max)))
}

// RandomFloat 生成0-1之间的随机浮点数
func RandomFloat() float64 {
	return mathrand.Float64()
}

// GetProviderName 获取AI提供商的友好名称
func GetProviderName(provider string) string {
	switch provider {
	case "deepseek":
		return "DeepSeek"
	case "openai":
		return "OpenAI"
	case "claude":
		return "Claude"
	default:
		return "AI Provider"
	}
}
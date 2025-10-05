package utils

import (
	"strings"
	"testing"
)

// TestEncryptionService 加密服务测试
func TestEncryptionService(t *testing.T) {
	// 生成测试密钥
	key, err := GenerateEncryptionKey()
	if err != nil {
		t.Fatalf("Failed to generate encryption key: %v", err)
	}

	// 创建加密服务
	encService, err := NewEncryptionService(key, "test-key-v1")
	if err != nil {
		t.Fatalf("Failed to create encryption service: %v", err)
	}

	tests := []struct {
		name      string
		plaintext string
		wantErr   bool
	}{
		{"valid openai key", "sk-1234567890abcdefghijklmnopqrstuvwxyz", false},
		{"valid deepseek key", "deepseek-api-key-test-12345", false},
		{"empty key", "", true},
		{"long key", strings.Repeat("a", 1000), false},
		{"special characters", "key-with-!@#$%^&*()_+-=[]{}|;:',.<>?/", false},
		{"unicode characters", "密钥-测试-🔑", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test encryption
			encrypted, err := encService.EncryptAPIKey(tt.plaintext)
			if (err != nil) != tt.wantErr {
				t.Errorf("EncryptAPIKey() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if err == nil {
				// Verify encrypted text is different from plaintext
				if encrypted == tt.plaintext {
					t.Error("Encrypted text should be different from plaintext")
				}

				// Verify encrypted text contains key ID prefix
				if !strings.HasPrefix(encrypted, "test-key-v1:") {
					t.Errorf("Encrypted text should have key ID prefix, got %s", encrypted)
				}

				// Test decryption
				decrypted, err := encService.DecryptAPIKey(encrypted)
				if err != nil {
					t.Errorf("DecryptAPIKey() error = %v", err)
					return
				}

				// Verify decrypted text matches original plaintext
				if decrypted != tt.plaintext {
					t.Errorf("Decrypt mismatch: got %v, want %v", decrypted, tt.plaintext)
				}
			}
		})
	}
}

// TestHashConsistency 测试哈希一致性
func TestHashConsistency(t *testing.T) {
	key, _ := GenerateEncryptionKey()
	encService, _ := NewEncryptionService(key, "test-key-v1")

	// 确保相同输入产生相同哈希
	apiKey := "sk-test-key-123456"
	hash1 := encService.HashAPIKey(apiKey)
	hash2 := encService.HashAPIKey(apiKey)

	if hash1 != hash2 {
		t.Error("Hash should be consistent for the same input")
	}

	// 确保不同输入产生不同哈希
	hash3 := encService.HashAPIKey("sk-different-key-789")
	if hash1 == hash3 {
		t.Error("Different inputs should produce different hashes")
	}

	// 验证哈希长度（SHA256产生64个十六进制字符）
	if len(hash1) != 64 {
		t.Errorf("Hash length should be 64, got %d", len(hash1))
	}
}

// TestVerifyAPIKey 测试密钥验证
func TestVerifyAPIKey(t *testing.T) {
	key, _ := GenerateEncryptionKey()
	encService, _ := NewEncryptionService(key, "test-key-v1")

	apiKey := "sk-test-key-verify"
	hash := encService.HashAPIKey(apiKey)

	// 正确的密钥应该验证成功
	if !encService.VerifyAPIKey(apiKey, hash) {
		t.Error("VerifyAPIKey should return true for correct key")
	}

	// 错误的密钥应该验证失败
	if encService.VerifyAPIKey("sk-wrong-key", hash) {
		t.Error("VerifyAPIKey should return false for wrong key")
	}
}

// TestMaskAPIKey 测试密钥脱敏
func TestMaskAPIKey(t *testing.T) {
	key, _ := GenerateEncryptionKey()
	encService, _ := NewEncryptionService(key, "test-key-v1")

	tests := []struct {
		name     string
		apiKey   string
		expected string
	}{
		{
			name:     "standard openai key",
			apiKey:   "sk-1234567890abcdefghijklmnopqrstuvwxyz",
			expected: "sk-1••••••••••••••••wxyz",
		},
		{
			name:     "short key",
			apiKey:   "short",
			expected: "••••••••",
		},
		{
			name:     "very short key",
			apiKey:   "key",
			expected: "••••••••",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			masked := encService.MaskAPIKey(tt.apiKey)
			if masked != tt.expected {
				t.Errorf("MaskAPIKey() = %v, want %v", masked, tt.expected)
			}

			// 确保脱敏后的密钥不包含完整明文
			if len(tt.apiKey) > 8 && strings.Contains(masked, tt.apiKey[4:len(tt.apiKey)-4]) {
				t.Error("Masked key should not contain full plaintext")
			}
		})
	}
}

// TestDecryptInvalidData 测试解密无效数据
func TestDecryptInvalidData(t *testing.T) {
	key, _ := GenerateEncryptionKey()
	encService, _ := NewEncryptionService(key, "test-key-v1")

	tests := []struct {
		name      string
		encrypted string
		wantErr   bool
	}{
		{"empty string", "", true},
		{"invalid format no colon", "invalidformatnocolon", true},
		{"invalid base64", "test-key-v1:invalid-base64!!!", true},
		{"wrong key id", "wrong-key-id:dGVzdA==", true},
		{"too short ciphertext", "test-key-v1:dGVzdA==", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := encService.DecryptAPIKey(tt.encrypted)
			if (err != nil) != tt.wantErr {
				t.Errorf("DecryptAPIKey() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestKeyIDMismatch 测试密钥ID不匹配
func TestKeyIDMismatch(t *testing.T) {
	key, _ := GenerateEncryptionKey()
	encService1, _ := NewEncryptionService(key, "key-v1")
	encService2, _ := NewEncryptionService(key, "key-v2")

	plaintext := "test-api-key"
	encrypted, _ := encService1.EncryptAPIKey(plaintext)

	// 使用不同的密钥ID尝试解密应该失败
	_, err := encService2.DecryptAPIKey(encrypted)
	if err == nil {
		t.Error("DecryptAPIKey should fail with mismatched key ID")
	}
	if !strings.Contains(err.Error(), "key ID mismatch") {
		t.Errorf("Error should mention key ID mismatch, got: %v", err)
	}
}

// TestRotateEncryption 测试密钥轮换加密
func TestRotateEncryption(t *testing.T) {
	// 创建旧的加密服务
	oldKey, _ := GenerateEncryptionKey()
	oldService, _ := NewEncryptionService(oldKey, "key-v1")

	// 创建新的加密服务
	newKey, _ := GenerateEncryptionKey()
	newService, _ := NewEncryptionService(newKey, "key-v2")

	// 原始数据
	plaintext := "sk-original-api-key-12345"

	// 用旧密钥加密
	oldEncrypted, err := oldService.EncryptAPIKey(plaintext)
	if err != nil {
		t.Fatalf("Failed to encrypt with old key: %v", err)
	}

	// 轮换加密
	newEncrypted, err := RotateEncryption(oldService, newService, oldEncrypted)
	if err != nil {
		t.Fatalf("RotateEncryption failed: %v", err)
	}

	// 验证新加密的数据可以用新密钥解密
	decrypted, err := newService.DecryptAPIKey(newEncrypted)
	if err != nil {
		t.Fatalf("Failed to decrypt with new key: %v", err)
	}

	// 验证解密后的数据与原始数据一致
	if decrypted != plaintext {
		t.Errorf("Decrypted text mismatch: got %v, want %v", decrypted, plaintext)
	}

	// 验证新加密的数据包含新的密钥ID
	if !strings.HasPrefix(newEncrypted, "key-v2:") {
		t.Errorf("Rotated encryption should have new key ID, got %s", newEncrypted)
	}

	// 验证旧密钥无法解密新加密的数据
	_, err = oldService.DecryptAPIKey(newEncrypted)
	if err == nil {
		t.Error("Old key should not be able to decrypt new encryption")
	}
}

// TestConcurrentEncryption 测试并发加密
func TestConcurrentEncryption(t *testing.T) {
	key, _ := GenerateEncryptionKey()
	encService, _ := NewEncryptionService(key, "test-key-v1")

	const numGoroutines = 100
	done := make(chan bool, numGoroutines)
	errors := make(chan error, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			plaintext := "test-key-concurrent-" + string(rune(id))
			encrypted, err := encService.EncryptAPIKey(plaintext)
			if err != nil {
				errors <- err
				done <- false
				return
			}

			decrypted, err := encService.DecryptAPIKey(encrypted)
			if err != nil {
				errors <- err
				done <- false
				return
			}

			if decrypted != plaintext {
				errors <- err
				done <- false
				return
			}

			done <- true
		}(i)
	}

	// 等待所有goroutine完成
	for i := 0; i < numGoroutines; i++ {
		select {
		case err := <-errors:
			t.Errorf("Concurrent encryption error: %v", err)
		case <-done:
			// Success
		}
	}
}

// TestGenerateEncryptionKey 测试密钥生成
func TestGenerateEncryptionKey(t *testing.T) {
	key1, err := GenerateEncryptionKey()
	if err != nil {
		t.Fatalf("GenerateEncryptionKey failed: %v", err)
	}

	// 验证密钥长度（256位 = 32字节）
	if len(key1) != 32 {
		t.Errorf("Key length should be 32 bytes, got %d", len(key1))
	}

	// 生成第二个密钥，确保不同
	key2, _ := GenerateEncryptionKey()
	if string(key1) == string(key2) {
		t.Error("Generated keys should be different")
	}
}

// TestEncodeDecodeKey 测试密钥编码解码
func TestEncodeDecodeKey(t *testing.T) {
	originalKey, _ := GenerateEncryptionKey()

	// 编码
	encoded := EncodeKey(originalKey)
	if encoded == "" {
		t.Error("EncodeKey should return non-empty string")
	}

	// 解码
	decodedKey, err := DecodeKey(encoded)
	if err != nil {
		t.Fatalf("DecodeKey failed: %v", err)
	}

	// 验证解码后的密钥与原始密钥一致
	if string(decodedKey) != string(originalKey) {
		t.Error("Decoded key should match original key")
	}
}

// BenchmarkEncryption 加密性能基准测试
func BenchmarkEncryption(b *testing.B) {
	key, _ := GenerateEncryptionKey()
	encService, _ := NewEncryptionService(key, "bench-key")
	plaintext := "sk-benchmark-api-key-1234567890abcdefghijklmnopqrstuvwxyz"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		encService.EncryptAPIKey(plaintext)
	}
}

// BenchmarkDecryption 解密性能基准测试
func BenchmarkDecryption(b *testing.B) {
	key, _ := GenerateEncryptionKey()
	encService, _ := NewEncryptionService(key, "bench-key")
	plaintext := "sk-benchmark-api-key-1234567890abcdefghijklmnopqrstuvwxyz"
	encrypted, _ := encService.EncryptAPIKey(plaintext)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		encService.DecryptAPIKey(encrypted)
	}
}

// BenchmarkHashAPIKey 哈希性能基准测试
func BenchmarkHashAPIKey(b *testing.B) {
	key, _ := GenerateEncryptionKey()
	encService, _ := NewEncryptionService(key, "bench-key")
	apiKey := "sk-benchmark-api-key-1234567890abcdefghijklmnopqrstuvwxyz"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		encService.HashAPIKey(apiKey)
	}
}

// BenchmarkEncryptionParallel 并发加密性能基准测试
func BenchmarkEncryptionParallel(b *testing.B) {
	key, _ := GenerateEncryptionKey()
	encService, _ := NewEncryptionService(key, "bench-key")
	plaintext := "sk-benchmark-api-key-1234567890abcdefghijklmnopqrstuvwxyz"

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			encrypted, _ := encService.EncryptAPIKey(plaintext)
			encService.DecryptAPIKey(encrypted)
		}
	})
}

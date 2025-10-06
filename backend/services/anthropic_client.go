package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"ai-project-backend/models"
)

// AnthropicClient Anthropic API客户端
type AnthropicClient struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

// NewAnthropicClient 创建Anthropic客户端
func NewAnthropicClient() *AnthropicClient {
	return &AnthropicClient{
		apiKey:  os.Getenv("ANTHROPIC_API_KEY"),
		baseURL: getEnvOrDefault("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1"),
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// AnthropicRequest API请求结构
type AnthropicRequest struct {
	Model     string              `json:"model"`
	MaxTokens int                 `json:"max_tokens"`
	Messages  []AnthropicMessage  `json:"messages"`
}

// AnthropicMessage 消息结构
type AnthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AnthropicResponse API响应结构
type AnthropicResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error"`
}

// Generate 生成文本
func (c *AnthropicClient) Generate(ctx context.Context, prompt string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("ANTHROPIC_API_KEY 环境变量未设置")
	}

	reqBody := AnthropicRequest{
		Model:     "claude-3-5-sonnet-20241022",
		MaxTokens: 4096,
		Messages: []AnthropicMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API请求失败 (status: %d): %s", resp.StatusCode, string(body))
	}

	var response AnthropicResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	if response.Error != nil {
		return "", fmt.Errorf("API返回错误: %s", response.Error.Message)
	}

	if len(response.Content) == 0 {
		return "", fmt.Errorf("AI返回空响应")
	}

	return response.Content[0].Text, nil
}

// GenerateWithConfig 使用指定配置生成文本
func (c *AnthropicClient) GenerateWithConfig(ctx context.Context, prompt string, config *models.AIConfig) (string, error) {
	if config.APIKeyEncrypted == "" {
		return "", fmt.Errorf("AI配置缺少API密钥")
	}

	// 根据provider选择不同的API调用方式
	switch config.Provider {
	case models.ProviderOpenAI:
		return c.generateWithOpenAI(ctx, prompt, config)
	case models.ProviderClaude, "anthropic":
		return c.generateWithAnthropic(ctx, prompt, config)
	case models.ProviderDeepSeek:
		return c.generateWithOpenAICompatible(ctx, prompt, config)
	default:
		return "", fmt.Errorf("不支持的AI提供商: %s", config.Provider)
	}
}

// generateWithAnthropic 使用Anthropic API生成文本
func (c *AnthropicClient) generateWithAnthropic(ctx context.Context, prompt string, config *models.AIConfig) (string, error) {
	// 使用配置中的参数
	maxTokens := 4096
	if config.MaxTokens > 0 {
		maxTokens = config.MaxTokens
	}

	reqBody := AnthropicRequest{
		Model:     config.Model,
		MaxTokens: maxTokens,
		Messages: []AnthropicMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}

	// 使用配置中的BaseURL
	baseURL := "https://api.anthropic.com/v1"
	if config.BaseURL != nil && *config.BaseURL != "" {
		baseURL = *config.BaseURL
	}

	req, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", config.APIKeyEncrypted)
	req.Header.Set("anthropic-version", "2023-06-01")

	// 使用配置中的超时时间，AI生成需要更长时间
	timeout := 120 * time.Second // 增加到120秒
	if config.Metadata.Timeout > 0 {
		timeout = time.Duration(config.Metadata.Timeout) * time.Second
	}

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API请求失败 (status: %d): %s", resp.StatusCode, string(body))
	}

	var response AnthropicResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	if response.Error != nil {
		return "", fmt.Errorf("API返回错误: %s", response.Error.Message)
	}

	if len(response.Content) == 0 {
		return "", fmt.Errorf("AI返回空响应")
	}

	return response.Content[0].Text, nil
}

// getEnvOrDefault 获取环境变量或返回默认值
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// OpenAI结构已在ai_client.go中定义,这里直接使用

// generateWithOpenAI 使用OpenAI API生成文本
func (c *AnthropicClient) generateWithOpenAI(ctx context.Context, prompt string, config *models.AIConfig) (string, error) {
	return c.generateWithOpenAICompatible(ctx, prompt, config)
}

// generateWithOpenAICompatible 使用OpenAI兼容的API生成文本(适用于OpenAI、DeepSeek等)
func (c *AnthropicClient) generateWithOpenAICompatible(ctx context.Context, prompt string, config *models.AIConfig) (string, error) {
	maxTokens := 4096
	if config.MaxTokens > 0 {
		maxTokens = config.MaxTokens
	}

	temperature := 0.7
	if config.Temperature > 0 {
		temperature = config.Temperature
	}

	reqBody := OpenAIRequest{
		Model:     config.Model,
		MaxTokens: maxTokens,
		Temperature: temperature,
		Messages: []Message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}

	// 使用配置中的BaseURL
	baseURL := "https://api.openai.com/v1"
	if config.BaseURL != nil && *config.BaseURL != "" {
		baseURL = *config.BaseURL
	}

	req, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.APIKeyEncrypted)

	// 使用配置中的超时时间，AI生成需要更长时间
	timeout := 120 * time.Second // 增加到120秒
	if config.Metadata.Timeout > 0 {
		timeout = time.Duration(config.Metadata.Timeout) * time.Second
	}

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API请求失败 (status: %d): %s", resp.StatusCode, string(body))
	}

	var response OpenAIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	if response.Error != nil {
		return "", fmt.Errorf("API返回错误: %s", response.Error.Message)
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("AI返回空响应")
	}

	return response.Choices[0].Message.Content, nil
}

package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"ai-project-backend/models"
)

// AIClient AI客户端接口
type AIClient interface {
	TestConnection(ctx context.Context, config *models.AIConfig, question string) (*models.AITestResponse, error)
	GenerateCompletion(ctx context.Context, config *models.AIConfig, prompt string) (*models.AICompletionResponse, error)
}

// HTTPAIClient HTTP实现的AI客户端
type HTTPAIClient struct {
	httpClient *http.Client
}

// NewHTTPAIClient 创建HTTP AI客户端
func NewHTTPAIClient() *HTTPAIClient {
	return &HTTPAIClient{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// OpenAI API请求结构
type OpenAIRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAI API响应结构
type OpenAIResponse struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage"`
	Error   *APIError `json:"error,omitempty"`
}

type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

// Claude API请求结构
type ClaudeRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens"`
}

// Claude API响应结构
type ClaudeResponse struct {
	ID      string         `json:"id"`
	Type    string         `json:"type"`
	Role    string         `json:"role"`
	Model   string         `json:"model"`
	Content []ClaudeContent `json:"content"`
	Usage   Usage          `json:"usage"`
	Error   *APIError      `json:"error,omitempty"`
}

type ClaudeContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// TestConnection 测试AI连接并进行问答
func (c *HTTPAIClient) TestConnection(ctx context.Context, config *models.AIConfig, question string) (*models.AITestResponse, error) {
	startTime := time.Now()
	
	// 根据不同的AI提供商调用相应的API
	switch config.Provider {
	case models.ProviderOpenAI, models.ProviderDeepSeek:
		return c.testOpenAICompatible(ctx, config, question, startTime)
	case models.ProviderClaude:
		return c.testClaude(ctx, config, question, startTime)
	default:
		return &models.AITestResponse{
			Success:      false,
			Message:      "不支持的AI提供商",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        "unsupported provider",
		}, nil
	}
}

// testOpenAICompatible 测试OpenAI兼容的API (OpenAI, DeepSeek)
func (c *HTTPAIClient) testOpenAICompatible(ctx context.Context, config *models.AIConfig, question string, startTime time.Time) (*models.AITestResponse, error) {
	// 构建请求体
	reqBody := OpenAIRequest{
		Model:       config.Model,
		Temperature: config.Temperature,
		MaxTokens:   min(config.MaxTokens, 150), // 限制测试响应长度
		Messages: []Message{
			{
				Role:    "user",
				Content: question,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "构建请求失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}

	// 确定API URL
	baseURL := "https://api.openai.com/v1"
	if config.BaseURL != nil && *config.BaseURL != "" {
		baseURL = strings.TrimSuffix(*config.BaseURL, "/")
	}
	url := baseURL + "/chat/completions"

	// 创建HTTP请求
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "创建请求失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}

	// 解密API密钥
	apiKey, err := c.getDecryptedAPIKey(config)
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "获取API密钥失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	
	// DeepSeek 特殊处理
	if config.Provider == models.ProviderDeepSeek {
		req.Header.Set("User-Agent", "AI-Project-Backend/1.0")
	}

	// 发送请求
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "API请求失败: " + err.Error(),
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "读取响应失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}

	// 解析响应
	var apiResp OpenAIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "解析响应失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        fmt.Sprintf("JSON解析错误: %v, 响应内容: %s", err, string(body)),
		}, nil
	}

	responseTime := int(time.Since(startTime).Milliseconds())

	// 检查API错误
	if apiResp.Error != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "API返回错误: " + apiResp.Error.Message,
			ResponseTime: responseTime,
			Error:        apiResp.Error.Message,
		}, nil
	}

	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return &models.AITestResponse{
			Success:      false,
			Message:      fmt.Sprintf("API请求失败，状态码: %d", resp.StatusCode),
			ResponseTime: responseTime,
			Error:        fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(body)),
		}, nil
	}

	// 检查响应内容
	if len(apiResp.Choices) == 0 {
		return &models.AITestResponse{
			Success:      false,
			Message:      "API返回空响应",
			ResponseTime: responseTime,
			Error:        "no choices in response",
		}, nil
	}

	choice := apiResp.Choices[0]
	return &models.AITestResponse{
		Success:      true,
		Message:      fmt.Sprintf("%s连接测试成功", getProviderDisplayName(config.Provider)),
		ResponseTime: responseTime,
		ModelInfo: &models.AIModelInfo{
			Name:    apiResp.Model,
			Version: "1.0.0",
		},
		Conversation: &models.AITestConversation{
			Question: question,
			Answer:   choice.Message.Content,
			Model:    apiResp.Model,
			Usage: &models.AIUsageStatistics{
				PromptTokens:     apiResp.Usage.PromptTokens,
				CompletionTokens: apiResp.Usage.CompletionTokens,
				TotalTokens:      apiResp.Usage.TotalTokens,
			},
		},
	}, nil
}

// testClaude 测试Claude API
func (c *HTTPAIClient) testClaude(ctx context.Context, config *models.AIConfig, question string, startTime time.Time) (*models.AITestResponse, error) {
	// 构建请求体
	reqBody := ClaudeRequest{
		Model:       config.Model,
		Temperature: config.Temperature,
		MaxTokens:   min(config.MaxTokens, 150), // 限制测试响应长度
		Messages: []Message{
			{
				Role:    "user",
				Content: question,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "构建请求失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}

	// 确定API URL
	baseURL := "https://api.anthropic.com"
	var url string
	if config.BaseURL != nil && *config.BaseURL != "" {
		baseURL = strings.TrimSuffix(*config.BaseURL, "/")
		// 如果用户配置的BaseURL已经包含/v1，则直接使用
		if strings.HasSuffix(baseURL, "/v1") {
			url = baseURL + "/messages"
		} else {
			url = baseURL + "/v1/messages"
		}
	} else {
		// 默认使用Claude官方API
		url = baseURL + "/v1/messages"
	}

	// 创建HTTP请求
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "创建请求失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}

	// 解密API密钥
	apiKey, err := c.getDecryptedAPIKey(config)
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "获取API密钥失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	// 发送请求
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "API请求失败: " + err.Error(),
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "读取响应失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        err.Error(),
		}, nil
	}

	// 解析响应
	var apiResp ClaudeResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "解析响应失败",
			ResponseTime: int(time.Since(startTime).Milliseconds()),
			Error:        fmt.Sprintf("JSON解析错误: %v, 响应内容: %s", err, string(body)),
		}, nil
	}

	responseTime := int(time.Since(startTime).Milliseconds())

	// 检查API错误
	if apiResp.Error != nil {
		return &models.AITestResponse{
			Success:      false,
			Message:      "API返回错误: " + apiResp.Error.Message,
			ResponseTime: responseTime,
			Error:        apiResp.Error.Message,
		}, nil
	}

	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return &models.AITestResponse{
			Success:      false,
			Message:      fmt.Sprintf("API请求失败，状态码: %d", resp.StatusCode),
			ResponseTime: responseTime,
			Error:        fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(body)),
		}, nil
	}

	// 检查响应内容
	if len(apiResp.Content) == 0 {
		return &models.AITestResponse{
			Success:      false,
			Message:      "API返回空响应",
			ResponseTime: responseTime,
			Error:        "no content in response",
		}, nil
	}

	answer := ""
	for _, content := range apiResp.Content {
		if content.Type == "text" {
			answer += content.Text
		}
	}

	return &models.AITestResponse{
		Success:      true,
		Message:      "Claude连接测试成功",
		ResponseTime: responseTime,
		ModelInfo: &models.AIModelInfo{
			Name:    apiResp.Model,
			Version: "1.0.0",
		},
		Conversation: &models.AITestConversation{
			Question: question,
			Answer:   answer,
			Model:    apiResp.Model,
			Usage: &models.AIUsageStatistics{
				PromptTokens:     apiResp.Usage.PromptTokens,
				CompletionTokens: apiResp.Usage.CompletionTokens,
				TotalTokens:      apiResp.Usage.TotalTokens,
			},
		},
	}, nil
}

// getDecryptedAPIKey 获取解密的API密钥
// 注意：在测试场景中，APIKeyEncrypted字段已经包含了明文密钥
func (c *HTTPAIClient) getDecryptedAPIKey(config *models.AIConfig) (string, error) {
	// 对于测试连接，APIKeyEncrypted字段包含明文密钥
	if config.APIKeyEncrypted == "" {
		return "", fmt.Errorf("API密钥为空")
	}
	return config.APIKeyEncrypted, nil
}

// getProviderDisplayName 获取提供商显示名称
func getProviderDisplayName(provider models.AIProvider) string {
	switch provider {
	case models.ProviderOpenAI:
		return "OpenAI"
	case models.ProviderClaude:
		return "Claude"
	case models.ProviderDeepSeek:
		return "DeepSeek"
	default:
		return "AI Provider"
	}
}

// GenerateCompletion 生成AI完成响应
func (c *HTTPAIClient) GenerateCompletion(ctx context.Context, config *models.AIConfig, prompt string) (*models.AICompletionResponse, error) {
	// 根据不同的AI提供商调用相应的API
	switch config.Provider {
	case models.ProviderOpenAI, models.ProviderDeepSeek:
		return c.generateOpenAICompatible(ctx, config, prompt)
	case models.ProviderClaude:
		return c.generateClaude(ctx, config, prompt)
	default:
		return &models.AICompletionResponse{
			Success: false,
			Error:   "不支持的AI提供商",
		}, nil
	}
}

// generateOpenAICompatible 生成OpenAI兼容的API响应
func (c *HTTPAIClient) generateOpenAICompatible(ctx context.Context, config *models.AIConfig, prompt string) (*models.AICompletionResponse, error) {
	// 构建请求体
	reqBody := OpenAIRequest{
		Model:       config.Model,
		Temperature: config.Temperature,
		MaxTokens:   config.MaxTokens,
		Messages: []Message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "构建请求失败: " + err.Error(),
		}, nil
	}

	// 确定API URL
	baseURL := "https://api.openai.com/v1"
	if config.BaseURL != nil && *config.BaseURL != "" {
		baseURL = strings.TrimSuffix(*config.BaseURL, "/")
	}
	url := baseURL + "/chat/completions"

	// 创建HTTP请求
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "创建请求失败: " + err.Error(),
		}, nil
	}

	// 解密API密钥
	apiKey, err := c.getDecryptedAPIKey(config)
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "获取API密钥失败: " + err.Error(),
		}, nil
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	
	// DeepSeek 特殊处理
	if config.Provider == models.ProviderDeepSeek {
		req.Header.Set("User-Agent", "AI-Project-Backend/1.0")
	}

	// 发送请求
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "API请求失败: " + err.Error(),
		}, nil
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "读取响应失败: " + err.Error(),
		}, nil
	}

	// 解析响应
	var apiResp OpenAIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   fmt.Sprintf("JSON解析错误: %v, 响应内容: %s", err, string(body)),
		}, nil
	}

	// 检查API错误
	if apiResp.Error != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "API返回错误: " + apiResp.Error.Message,
		}, nil
	}

	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return &models.AICompletionResponse{
			Success: false,
			Error:   fmt.Sprintf("API请求失败，状态码: %d, 响应: %s", resp.StatusCode, string(body)),
		}, nil
	}

	// 检查响应内容
	if len(apiResp.Choices) == 0 {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "API返回空响应",
		}, nil
	}

	choice := apiResp.Choices[0]
	return &models.AICompletionResponse{
		Success: true,
		Content: choice.Message.Content,
		Model:   apiResp.Model,
		Usage: &models.AIUsageStatistics{
			PromptTokens:     apiResp.Usage.PromptTokens,
			CompletionTokens: apiResp.Usage.CompletionTokens,
			TotalTokens:      apiResp.Usage.TotalTokens,
		},
	}, nil
}

// generateClaude 生成Claude API响应
func (c *HTTPAIClient) generateClaude(ctx context.Context, config *models.AIConfig, prompt string) (*models.AICompletionResponse, error) {
	// 构建请求体
	reqBody := ClaudeRequest{
		Model:       config.Model,
		Temperature: config.Temperature,
		MaxTokens:   config.MaxTokens,
		Messages: []Message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "构建请求失败: " + err.Error(),
		}, nil
	}

	// 确定API URL
	baseURL := "https://api.anthropic.com"
	var url string
	if config.BaseURL != nil && *config.BaseURL != "" {
		baseURL = strings.TrimSuffix(*config.BaseURL, "/")
		// 如果用户配置的BaseURL已经包含/v1，则直接使用
		if strings.HasSuffix(baseURL, "/v1") {
			url = baseURL + "/messages"
		} else {
			url = baseURL + "/v1/messages"
		}
	} else {
		// 默认使用Claude官方API
		url = baseURL + "/v1/messages"
	}

	// 创建HTTP请求
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "创建请求失败: " + err.Error(),
		}, nil
	}

	// 解密API密钥
	apiKey, err := c.getDecryptedAPIKey(config)
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "获取API密钥失败: " + err.Error(),
		}, nil
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	// 发送请求
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "API请求失败: " + err.Error(),
		}, nil
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "读取响应失败: " + err.Error(),
		}, nil
	}

	// 解析响应
	var apiResp ClaudeResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   fmt.Sprintf("JSON解析错误: %v, 响应内容: %s", err, string(body)),
		}, nil
	}

	// 检查API错误
	if apiResp.Error != nil {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "API返回错误: " + apiResp.Error.Message,
		}, nil
	}

	// 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		return &models.AICompletionResponse{
			Success: false,
			Error:   fmt.Sprintf("API请求失败，状态码: %d, 响应: %s", resp.StatusCode, string(body)),
		}, nil
	}

	// 检查响应内容
	if len(apiResp.Content) == 0 {
		return &models.AICompletionResponse{
			Success: false,
			Error:   "API返回空响应",
		}, nil
	}

	answer := ""
	for _, content := range apiResp.Content {
		if content.Type == "text" {
			answer += content.Text
		}
	}

	return &models.AICompletionResponse{
		Success: true,
		Content: answer,
		Model:   apiResp.Model,
		Usage: &models.AIUsageStatistics{
			PromptTokens:     apiResp.Usage.PromptTokens,
			CompletionTokens: apiResp.Usage.CompletionTokens,
			TotalTokens:      apiResp.Usage.TotalTokens,
		},
	}, nil
}

// min 返回两个整数的最小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
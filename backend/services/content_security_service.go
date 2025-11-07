package services

import (
	"context"
	"fmt"
	"html"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

// ContentSecurityService 内容安全服务接口
type ContentSecurityService interface {
	// SanitizeContent 清理和验证内容
	SanitizeContent(ctx context.Context, content string) (*SanitizedContent, error)

	// CheckSensitiveWords 检查敏感词
	CheckSensitiveWords(ctx context.Context, content string) (*SensitiveWordCheckResult, error)

	// ValidateContentSafety 验证内容安全性
	ValidateContentSafety(ctx context.Context, content string) error
}

// SanitizedContent 清理后的内容
type SanitizedContent struct {
	OriginalContent  string   `json:"original_content"`  // 原始内容
	CleanedContent   string   `json:"cleaned_content"`   // 清理后的内容
	RemovedTags      []string `json:"removed_tags"`      // 移除的HTML标签
	HasXSSAttempt    bool     `json:"has_xss_attempt"`   // 是否检测到XSS攻击尝试
	HasSensitiveWord bool     `json:"has_sensitive_word"` // 是否包含敏感词
	SensitiveWords   []string `json:"sensitive_words"`   // 检测到的敏感词列表
}

// SensitiveWordCheckResult 敏感词检查结果
type SensitiveWordCheckResult struct {
	HasSensitiveWord bool     `json:"has_sensitive_word"`
	SensitiveWords   []string `json:"sensitive_words"`
	CleanedContent   string   `json:"cleaned_content"` // 替换敏感词后的内容
}

// contentSecurityServiceImpl 内容安全服务实现
type contentSecurityServiceImpl struct {
	sensitiveWords     []string
	sensitiveWordsMap  map[string]bool
	xssPatterns        []*regexp.Regexp
	mu                 sync.RWMutex
}

// NewContentSecurityService 创建内容安全服务
func NewContentSecurityService() ContentSecurityService {
	service := &contentSecurityServiceImpl{
		sensitiveWords:    getDefaultSensitiveWords(),
		sensitiveWordsMap: make(map[string]bool),
		xssPatterns:       compileXSSPatterns(),
	}

	// 构建敏感词映射表
	for _, word := range service.sensitiveWords {
		service.sensitiveWordsMap[strings.ToLower(word)] = true
	}

	return service
}

// SanitizeContent 清理和验证内容
func (s *contentSecurityServiceImpl) SanitizeContent(ctx context.Context, content string) (*SanitizedContent, error) {
	result := &SanitizedContent{
		OriginalContent: content,
		RemovedTags:     make([]string, 0),
		SensitiveWords:  make([]string, 0),
	}

	// 1. 检测XSS攻击尝试
	result.HasXSSAttempt = s.detectXSSAttempt(content)

	// 2. 清理HTML标签
	cleanedContent, removedTags := s.sanitizeHTML(content)
	result.CleanedContent = cleanedContent
	result.RemovedTags = removedTags

	// 3. 检查敏感词
	sensitiveCheckResult, err := s.CheckSensitiveWords(ctx, cleanedContent)
	if err != nil {
		return nil, err
	}
	result.HasSensitiveWord = sensitiveCheckResult.HasSensitiveWord
	result.SensitiveWords = sensitiveCheckResult.SensitiveWords
	result.CleanedContent = sensitiveCheckResult.CleanedContent

	// 4. HTML实体转义（防止XSS）
	result.CleanedContent = html.EscapeString(result.CleanedContent)

	return result, nil
}

// CheckSensitiveWords 检查敏感词
func (s *contentSecurityServiceImpl) CheckSensitiveWords(ctx context.Context, content string) (*SensitiveWordCheckResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := &SensitiveWordCheckResult{
		HasSensitiveWord: false,
		SensitiveWords:   make([]string, 0),
		CleanedContent:   content,
	}

	lowerContent := strings.ToLower(content)

	// 检查每个敏感词
	for word := range s.sensitiveWordsMap {
		if strings.Contains(lowerContent, word) {
			result.HasSensitiveWord = true
			result.SensitiveWords = append(result.SensitiveWords, word)

			// 替换敏感词为 ***
			replacement := strings.Repeat("*", utf8.RuneCountInString(word))
			result.CleanedContent = strings.ReplaceAll(
				result.CleanedContent,
				word,
				replacement,
			)
			// 同时替换首字母大写的版本
			capitalizedWord := strings.Title(word)
			result.CleanedContent = strings.ReplaceAll(
				result.CleanedContent,
				capitalizedWord,
				replacement,
			)
		}
	}

	return result, nil
}

// ValidateContentSafety 验证内容安全性
func (s *contentSecurityServiceImpl) ValidateContentSafety(ctx context.Context, content string) error {
	// 1. 检查内容长度
	if len(content) == 0 {
		return fmt.Errorf("内容不能为空")
	}

	if len(content) > 10000 {
		return fmt.Errorf("内容过长，最多允许10000字符")
	}

	// 2. 检测明显的XSS攻击
	if s.detectXSSAttempt(content) {
		return fmt.Errorf("检测到潜在的XSS攻击尝试，内容已被拒绝")
	}

	// 3. 检查敏感词（如果有敏感词，返回警告但不阻止）
	// 敏感词检查在SanitizeContent中处理

	return nil
}

// detectXSSAttempt 检测XSS攻击尝试
func (s *contentSecurityServiceImpl) detectXSSAttempt(content string) bool {
	lowerContent := strings.ToLower(content)

	// 检查常见的XSS攻击模式
	for _, pattern := range s.xssPatterns {
		if pattern.MatchString(lowerContent) {
			return true
		}
	}

	return false
}

// sanitizeHTML 清理HTML标签
func (s *contentSecurityServiceImpl) sanitizeHTML(content string) (string, []string) {
	removedTags := make([]string, 0)

	// 1. 移除所有script标签及其内容
	scriptRegex := regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`)
	scriptMatches := scriptRegex.FindAllString(content, -1)
	for range scriptMatches {
		removedTags = append(removedTags, "script")
	}
	content = scriptRegex.ReplaceAllString(content, "")

	// 2. 移除所有style标签及其内容
	styleRegex := regexp.MustCompile(`(?i)<style[^>]*>.*?</style>`)
	styleMatches := styleRegex.FindAllString(content, -1)
	for range styleMatches {
		removedTags = append(removedTags, "style")
	}
	content = styleRegex.ReplaceAllString(content, "")

	// 3. 移除所有iframe标签
	iframeRegex := regexp.MustCompile(`(?i)<iframe[^>]*>.*?</iframe>`)
	iframeMatches := iframeRegex.FindAllString(content, -1)
	for range iframeMatches {
		removedTags = append(removedTags, "iframe")
	}
	content = iframeRegex.ReplaceAllString(content, "")

	// 4. 移除所有object和embed标签
	objectRegex := regexp.MustCompile(`(?i)<(object|embed)[^>]*>.*?</(object|embed)>`)
	content = objectRegex.ReplaceAllString(content, "")

	// 5. 移除事件处理器属性 (onclick, onerror, etc.)
	eventHandlerRegex := regexp.MustCompile(`(?i)\s+on\w+\s*=\s*["'][^"']*["']`)
	content = eventHandlerRegex.ReplaceAllString(content, "")

	// 6. 移除javascript: 协议
	javascriptProtocolRegex := regexp.MustCompile(`(?i)javascript:`)
	content = javascriptProtocolRegex.ReplaceAllString(content, "")

	// 7. 移除data: 协议（可能包含base64编码的脚本）
	dataProtocolRegex := regexp.MustCompile(`(?i)data:`)
	content = dataProtocolRegex.ReplaceAllString(content, "")

	return content, removedTags
}

// compileXSSPatterns 编译XSS检测正则表达式
func compileXSSPatterns() []*regexp.Regexp {
	patterns := []string{
		// Script标签
		`<script[^>]*>.*?</script>`,

		// 事件处理器
		`\s+on\w+\s*=`,

		// JavaScript协议
		`javascript:`,

		// Data协议
		`data:text/html`,

		// Iframe注入
		`<iframe`,

		// Object和embed
		`<(object|embed)`,

		// Meta refresh
		`<meta[^>]*http-equiv\s*=\s*["']?refresh`,

		// Base64编码的脚本
		`base64.*<script`,

		// 常见的XSS payload
		`<img[^>]*onerror`,
		`<svg[^>]*onload`,
		`<body[^>]*onload`,
	}

	compiled := make([]*regexp.Regexp, 0, len(patterns))
	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		compiled = append(compiled, re)
	}

	return compiled
}

// getDefaultSensitiveWords 获取默认敏感词列表
func getDefaultSensitiveWords() []string {
	// 这里是一个基本的敏感词列表
	// 实际生产环境应该从数据库或配置文件加载
	return []string{
		// 政治敏感词
		"反动", "颠覆", "暴力",

		// 色情淫秽词汇
		"色情", "淫秽", "黄色",

		// 侮辱性词汇
		"傻逼", "操你妈", "草泥马", "尼玛",

		// 赌博相关
		"赌博", "赌场", "博彩",

		// 毒品相关
		"毒品", "海洛因", "冰毒",

		// 诈骗相关
		"诈骗", "骗子", "钓鱼",

		// 广告垃圾信息
		"加微信", "扫码领取", "免费领取",

		// 暴力恐怖
		"恐怖", "爆炸", "杀人",
	}
}

// RateLimiter 简单的频率限制器
type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.RWMutex
	limit    int           // 允许的最大请求数
	window   time.Duration // 时间窗口
}

// NewRateLimiter 创建频率限制器
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

// Allow 检查是否允许请求
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	// 获取该key的请求历史
	requests, exists := rl.requests[key]
	if !exists {
		requests = make([]time.Time, 0)
	}

	// 过滤掉窗口外的请求
	validRequests := make([]time.Time, 0)
	for _, reqTime := range requests {
		if reqTime.After(windowStart) {
			validRequests = append(validRequests, reqTime)
		}
	}

	// 检查是否超过限制
	if len(validRequests) >= rl.limit {
		return false
	}

	// 添加当前请求
	validRequests = append(validRequests, now)
	rl.requests[key] = validRequests

	return true
}

// Cleanup 清理过期的请求记录
func (rl *RateLimiter) Cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window * 2) // 清理2倍窗口之前的数据

	for key, requests := range rl.requests {
		validRequests := make([]time.Time, 0)
		for _, reqTime := range requests {
			if reqTime.After(windowStart) {
				validRequests = append(validRequests, reqTime)
			}
		}

		if len(validRequests) == 0 {
			delete(rl.requests, key)
		} else {
			rl.requests[key] = validRequests
		}
	}
}

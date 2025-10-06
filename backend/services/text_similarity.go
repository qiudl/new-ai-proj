package services

import (
	"math"
	"strings"
	"unicode"

	"github.com/yanyiwu/gojieba"
)

// TextSimilarityService 文本相似度服务
type TextSimilarityService struct {
	jieba *gojieba.Jieba
}

// NewTextSimilarityService 创建服务实例
func NewTextSimilarityService() *TextSimilarityService {
	// 初始化jieba分词器
	jieba := gojieba.NewJieba()

	return &TextSimilarityService{
		jieba: jieba,
	}
}

// Close 释放jieba资源
func (s *TextSimilarityService) Close() {
	s.jieba.Free()
}

// Tokenize 中文分词和清理
func (s *TextSimilarityService) Tokenize(text string) []string {
	// 1. 转小写
	text = strings.ToLower(text)

	// 2. jieba分词
	words := s.jieba.Cut(text, true)

	// 3. 过滤停用词和短词
	stopWords := map[string]bool{
		"的": true, "了": true, "是": true, "在": true, "我": true,
		"有": true, "和": true, "就": true, "不": true, "人": true,
		"都": true, "一": true, "个": true, "上": true, "也": true,
		"这": true, "中": true, "到": true, "说": true, "要": true,
		"与": true, "为": true, "以": true, "将": true, "及": true,
	}

	var tokens []string
	for _, word := range words {
		// 跳过停用词
		if stopWords[word] {
			continue
		}
		// 跳过纯数字和单字符
		if len(word) < 2 || isNumeric(word) {
			continue
		}
		// 跳过纯标点
		if isPunctuation(word) {
			continue
		}
		tokens = append(tokens, word)
	}

	return tokens
}

// CalculateTFIDF 计算TF-IDF向量
func (s *TextSimilarityService) CalculateTFIDF(tokens []string, corpus [][]string) map[string]float64 {
	// 1. 计算TF (词频)
	tf := make(map[string]float64)
	for _, token := range tokens {
		tf[token]++
	}
	totalTokens := float64(len(tokens))
	if totalTokens > 0 {
		for token := range tf {
			tf[token] /= totalTokens
		}
	}

	// 2. 计算IDF (逆文档频率)
	idf := make(map[string]float64)
	totalDocs := float64(len(corpus))

	for token := range tf {
		// 统计包含该词的文档数
		docsWithToken := 0.0
		for _, doc := range corpus {
			for _, word := range doc {
				if word == token {
					docsWithToken++
					break
				}
			}
		}
		// IDF = log(总文档数 / (包含该词的文档数 + 1))
		if totalDocs > 0 {
			idf[token] = math.Log(totalDocs / (docsWithToken + 1))
		}
	}

	// 3. 计算TF-IDF
	tfidf := make(map[string]float64)
	for token, tfValue := range tf {
		tfidf[token] = tfValue * idf[token]
	}

	return tfidf
}

// CosineSimilarity 计算余弦相似度
func (s *TextSimilarityService) CosineSimilarity(vec1, vec2 map[string]float64) float64 {
	// 计算点积
	dotProduct := 0.0
	for key, val1 := range vec1 {
		if val2, exists := vec2[key]; exists {
			dotProduct += val1 * val2
		}
	}

	// 计算向量模
	magnitude1 := 0.0
	for _, val := range vec1 {
		magnitude1 += val * val
	}
	magnitude1 = math.Sqrt(magnitude1)

	magnitude2 := 0.0
	for _, val := range vec2 {
		magnitude2 += val * val
	}
	magnitude2 = math.Sqrt(magnitude2)

	// 避免除零
	if magnitude1 == 0 || magnitude2 == 0 {
		return 0
	}

	return dotProduct / (magnitude1 * magnitude2)
}

// SimpleSimilarity 简化版相似度（不依赖语料库，适合快速计算）
func (s *TextSimilarityService) SimpleSimilarity(text1, text2 string) float64 {
	tokens1 := s.Tokenize(text1)
	tokens2 := s.Tokenize(text2)

	// 转换为集合
	set1 := make(map[string]bool)
	for _, token := range tokens1 {
		set1[token] = true
	}

	set2 := make(map[string]bool)
	for _, token := range tokens2 {
		set2[token] = true
	}

	// Jaccard相似度: |交集| / |并集|
	intersection := 0
	union := len(set1)

	for token := range set2 {
		if set1[token] {
			intersection++
		} else {
			union++
		}
	}

	if union == 0 {
		return 0
	}

	return float64(intersection) / float64(union)
}

// 辅助函数
func isNumeric(s string) bool {
	for _, r := range s {
		if !unicode.IsDigit(r) {
			return false
		}
	}
	return true
}

func isPunctuation(s string) bool {
	for _, r := range s {
		if !unicode.IsPunct(r) {
			return false
		}
	}
	return true
}

package services

import (
	"database/sql"
	"fmt"
	"sort"

	"ai-project-backend/database"
	"ai-project-backend/models"
)

// PromptRecommendationService 提示词推荐服务
type PromptRecommendationService struct {
	db             *sql.DB
	promptRepo     *database.PromptRepository
	textSimilarity *TextSimilarityService
}

// NewPromptRecommendationService 创建推荐服务
func NewPromptRecommendationService(db *sql.DB) *PromptRecommendationService {
	return &PromptRecommendationService{
		db:             db,
		promptRepo:     database.NewPromptRepository(db),
		textSimilarity: NewTextSimilarityService(),
	}
}

// RecommendationItem 推荐项
type RecommendationItem struct {
	Type        string  `json:"type"`         // "template" 或 "history"
	ID          int     `json:"id"`
	Content     string  `json:"content"`
	Score       float64 `json:"score"`        // 推荐得分
	Similarity  float64 `json:"similarity"`   // 相似度
	SuccessRate float64 `json:"success_rate"` // 成功率
	UsageCount  int     `json:"usage_count"`  // 使用次数
	Source      string  `json:"source"`       // 来源描述
}

// RecommendPrompts 推荐提示词
func (s *PromptRecommendationService) RecommendPrompts(userID int, taskDescription string, aiProvider string, limit int) ([]*RecommendationItem, error) {
	// 1. 获取系统模板推荐
	templateRecs, err := s.recommendFromTemplates(taskDescription, aiProvider)
	if err != nil {
		return nil, fmt.Errorf("获取模板推荐失败: %w", err)
	}

	// 2. 获取用户历史推荐
	historyRecs, err := s.recommendFromHistory(userID, taskDescription)
	if err != nil {
		return nil, fmt.Errorf("获取历史推荐失败: %w", err)
	}

	// 3. 合并并排序
	allRecs := append(templateRecs, historyRecs...)
	sort.Slice(allRecs, func(i, j int) bool {
		return allRecs[i].Score > allRecs[j].Score
	})

	// 4. 返回Top-N
	if len(allRecs) > limit {
		allRecs = allRecs[:limit]
	}

	return allRecs, nil
}

// recommendFromTemplates 从模板库推荐
func (s *PromptRecommendationService) recommendFromTemplates(taskDesc string, aiProvider string) ([]*RecommendationItem, error) {
	// 获取所有模板
	templates, err := s.promptRepo.GetActiveTemplates()
	if err != nil {
		return nil, err
	}

	// 如果指定了AI提供商，过滤模板
	if aiProvider != "" {
		filtered := make([]models.PromptTemplate, 0)
		for _, t := range templates {
			for _, model := range t.RecommendedModels {
				if model == aiProvider {
					filtered = append(filtered, t)
					break
				}
			}
		}
		templates = filtered
	}

	// 计算相似度并打分
	var recommendations []*RecommendationItem
	for _, tmpl := range templates {
		// 计算文本相似度
		similarity := s.textSimilarity.SimpleSimilarity(taskDesc, tmpl.Content)

		// 计算综合得分
		// 得分 = 0.6 * 相似度 + 0.3 * 成功率 + 0.1 * 使用次数归一化
		normalizedUsage := normalizeValue(float64(tmpl.UsageCount), 0, 1000) // 假设最大1000次
		score := 0.6*similarity + 0.3*(tmpl.SuccessRate/100) + 0.1*normalizedUsage

		recommendations = append(recommendations, &RecommendationItem{
			Type:        "template",
			ID:          tmpl.ID,
			Content:     tmpl.Content,
			Score:       score,
			Similarity:  similarity,
			SuccessRate: tmpl.SuccessRate,
			UsageCount:  tmpl.UsageCount,
			Source:      fmt.Sprintf("系统模板: %s", tmpl.Name),
		})
	}

	// 按得分排序
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].Score > recommendations[j].Score
	})

	// 返回Top-3
	if len(recommendations) > 3 {
		recommendations = recommendations[:3]
	}

	return recommendations, nil
}

// recommendFromHistory 从用户历史推荐
func (s *PromptRecommendationService) recommendFromHistory(userID int, taskDesc string) ([]*RecommendationItem, error) {
	// 获取用户的成功历史（最近30条）
	histories, err := s.promptRepo.GetSuccessfulHistoryForUser(userID, 30)
	if err != nil {
		return nil, err
	}

	if len(histories) == 0 {
		return []*RecommendationItem{}, nil
	}

	// 计算相似度并打分
	var recommendations []*RecommendationItem
	for _, hist := range histories {
		// 计算文本相似度
		similarity := s.textSimilarity.SimpleSimilarity(taskDesc, hist.PromptText)

		// 历史记录的成功率 = 接受数 / 生成数
		successRate := 0.0
		if hist.SubtasksGenerated > 0 {
			successRate = float64(hist.SubtasksAccepted) / float64(hist.SubtasksGenerated) * 100
		}

		// 计算得分（历史记录更看重相似度）
		score := 0.7*similarity + 0.3*(successRate/100)

		recommendations = append(recommendations, &RecommendationItem{
			Type:        "history",
			ID:          hist.ID,
			Content:     hist.PromptText,
			Score:       score,
			Similarity:  similarity,
			SuccessRate: successRate,
			UsageCount:  1, // 历史记录使用次数为1
			Source:      fmt.Sprintf("您在%s使用过", hist.CreatedAt.Format("01-02")),
		})
	}

	// 按得分排序
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].Score > recommendations[j].Score
	})

	// 返回Top-3
	if len(recommendations) > 3 {
		recommendations = recommendations[:3]
	}

	return recommendations, nil
}

// normalizeValue 归一化数值到0-1范围
func normalizeValue(value, min, max float64) float64 {
	if max-min == 0 {
		return 0
	}
	normalized := (value - min) / (max - min)
	if normalized < 0 {
		return 0
	}
	if normalized > 1 {
		return 1
	}
	return normalized
}

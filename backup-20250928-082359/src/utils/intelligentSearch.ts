/**
 * 智能搜索和推荐系统
 * 提供高级搜索、模糊匹配、语义搜索和个性化推荐
 */

import { Document, DocumentListItem } from '../types/document';

// 搜索权重配置
interface SearchWeights {
  title: number;
  content: number;
  description: number;
  tags: number;
  ownerName: number;
  projectName: number;
  category: number;
}

// 搜索结果
interface SearchResult<T> {
  item: T;
  score: number;
  matchedFields: string[];
  highlights: Record<string, string[]>;
}

// 搜索选项
interface SearchOptions {
  fuzzy?: boolean;           // 模糊匹配
  semantic?: boolean;        // 语义搜索
  maxResults?: number;       // 最大结果数
  minScore?: number;         // 最小匹配分数
  weights?: Partial<SearchWeights>;
  boost?: {                 // 结果提升
    recency?: number;        // 最近文档权重
    favorites?: number;      // 收藏文档权重
    frequency?: number;      // 访问频率权重
  };
}

// 搜索历史
interface SearchHistory {
  query: string;
  timestamp: number;
  resultsCount: number;
  clickedResult?: number;   // 点击的结果ID
}

// 用户行为数据
interface UserBehavior {
  documentViews: Map<number, number>;      // 文档查看次数
  searchHistory: SearchHistory[];          // 搜索历史
  favoriteCategories: Map<string, number>; // 偏好类别
  recentDocuments: number[];               // 最近访问文档
  collaborativeFilters: number[];          // 协同过滤数据
}

class IntelligentSearch {
  private searchHistory: SearchHistory[] = [];
  private userBehavior: UserBehavior;
  private defaultWeights: SearchWeights = {
    title: 3.0,
    content: 1.0,
    description: 2.0,
    tags: 2.5,
    ownerName: 1.5,
    projectName: 2.0,
    category: 1.8
  };

  constructor() {
    this.userBehavior = {
      documentViews: new Map(),
      searchHistory: [],
      favoriteCategories: new Map(),
      recentDocuments: [],
      collaborativeFilters: []
    };

    this.loadUserBehavior();
  }

  /**
   * 执行智能搜索
   */
  search<T extends Document | DocumentListItem>(
    documents: T[],
    query: string,
    options: SearchOptions = {}
  ): SearchResult<T>[] {
    const {
      fuzzy = true,
      semantic = false,
      maxResults = 50,
      minScore = 0.1,
      weights = {},
      boost = {}
    } = options;

    if (!query.trim()) {
      return this.getRecommendations(documents, maxResults);
    }

    // 记录搜索历史
    this.recordSearch(query);

    // 预处理查询
    const processedQuery = this.preprocessQuery(query);

    // 搜索结果
    const results: SearchResult<T>[] = [];

    for (const document of documents) {
      const searchResult = this.scoreDocument(
        document, 
        processedQuery, 
        { ...this.defaultWeights, ...weights },
        boost
      );

      if (searchResult.score >= minScore) {
        results.push(searchResult);
      }
    }

    // 排序结果
    results.sort((a, b) => b.score - a.score);

    // 语义搜索增强（如果启用）
    if (semantic) {
      this.enhanceWithSemanticSearch(results, query);
    }

    // 模糊匹配增强（如果启用）
    if (fuzzy) {
      this.enhanceWithFuzzySearch(results, query);
    }

    // 个性化排序
    this.personalizeResults(results);

    return results.slice(0, maxResults);
  }

  /**
   * 获取推荐文档
   */
  getRecommendations<T extends Document | DocumentListItem>(
    documents: T[],
    maxResults: number = 10
  ): SearchResult<T>[] {
    const recommendations: SearchResult<T>[] = [];

    for (const document of documents) {
      const score = this.calculateRecommendationScore(document);
      
      if (score > 0) {
        recommendations.push({
          item: document,
          score,
          matchedFields: ['recommendation'],
          highlights: {}
        });
      }
    }

    // 排序并返回
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, maxResults);
  }

  /**
   * 获取搜索建议
   */
  getSearchSuggestions(query: string, limit: number = 5): string[] {
    const suggestions: string[] = [];

    // 基于搜索历史的建议
    const historyMatches = this.searchHistory
      .filter(h => h.query.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(h => h.query);

    suggestions.push(...historyMatches);

    // 基于常见搜索模式的建议
    const patternSuggestions = this.generatePatternSuggestions(query);
    suggestions.push(...patternSuggestions);

    // 去重并限制数量
    return Array.from(new Set(suggestions)).slice(0, limit);
  }

  /**
   * 记录用户行为
   */
  recordDocumentView(documentId: number): void {
    const currentViews = this.userBehavior.documentViews.get(documentId) || 0;
    this.userBehavior.documentViews.set(documentId, currentViews + 1);

    // 更新最近访问
    this.userBehavior.recentDocuments = [
      documentId,
      ...this.userBehavior.recentDocuments.filter(id => id !== documentId)
    ].slice(0, 50); // 保留最近50个

    this.saveUserBehavior();
  }

  /**
   * 记录搜索点击
   */
  recordSearchClick(query: string, documentId: number): void {
    const recentSearch = this.searchHistory
      .reverse()
      .find(h => h.query === query);
    
    if (recentSearch) {
      recentSearch.clickedResult = documentId;
    }

    this.recordDocumentView(documentId);
  }

  /**
   * 获取热门搜索词
   */
  getTrendingSearches(limit: number = 10): Array<{query: string; count: number}> {
    const queryCount = new Map<string, number>();

    this.searchHistory.forEach(h => {
      const count = queryCount.get(h.query) || 0;
      queryCount.set(h.query, count + 1);
    });

    return Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 分析搜索统计
   */
  getSearchAnalytics(): {
    totalSearches: number;
    uniqueQueries: number;
    averageResultsCount: number;
    clickThroughRate: number;
    topCategories: Array<{category: string; searches: number}>;
  } {
    const totalSearches = this.searchHistory.length;
    const uniqueQueries = new Set(this.searchHistory.map(h => h.query)).size;
    const averageResultsCount = totalSearches > 0 
      ? this.searchHistory.reduce((sum, h) => sum + h.resultsCount, 0) / totalSearches
      : 0;
    
    const clickedSearches = this.searchHistory.filter(h => h.clickedResult).length;
    const clickThroughRate = totalSearches > 0 ? clickedSearches / totalSearches : 0;

    const topCategories = Array.from(this.userBehavior.favoriteCategories.entries())
      .map(([category, searches]) => ({ category, searches }))
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 5);

    return {
      totalSearches,
      uniqueQueries,
      averageResultsCount,
      clickThroughRate,
      topCategories
    };
  }

  // 私有方法

  private preprocessQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // 保留中英文和数字
      .replace(/\s+/g, ' ');
  }

  private scoreDocument<T extends Document | DocumentListItem>(
    document: T,
    query: string,
    weights: SearchWeights,
    boost: SearchOptions['boost'] = {}
  ): SearchResult<T> {
    const matchedFields: string[] = [];
    const highlights: Record<string, string[]> = {};
    let totalScore = 0;

    const queryTerms = query.split(' ').filter(term => term.length > 0);

    // 标题匹配
    const titleScore = this.calculateFieldScore(
      this.getDocumentTitle(document),
      queryTerms,
      weights.title
    );
    if (titleScore > 0) {
      matchedFields.push('title');
      highlights.title = this.getHighlights(this.getDocumentTitle(document), queryTerms);
      totalScore += titleScore;
    }

    // 内容匹配（如果有）
    const content = this.getDocumentContent(document);
    if (content) {
      const contentScore = this.calculateFieldScore(content, queryTerms, weights.content);
      if (contentScore > 0) {
        matchedFields.push('content');
        highlights.content = this.getHighlights(content, queryTerms);
        totalScore += contentScore;
      }
    }

    // 描述匹配
    const description = this.getDocumentDescription(document);
    if (description) {
      const descScore = this.calculateFieldScore(description, queryTerms, weights.description);
      if (descScore > 0) {
        matchedFields.push('description');
        highlights.description = this.getHighlights(description, queryTerms);
        totalScore += descScore;
      }
    }

    // 标签匹配
    const tags = this.getDocumentTags(document);
    if (tags.length > 0) {
      const tagsText = tags.join(' ');
      const tagsScore = this.calculateFieldScore(tagsText, queryTerms, weights.tags);
      if (tagsScore > 0) {
        matchedFields.push('tags');
        highlights.tags = this.getHighlights(tagsText, queryTerms);
        totalScore += tagsScore;
      }
    }

    // 所有者名称匹配
    const ownerName = this.getDocumentOwner(document);
    if (ownerName) {
      const ownerScore = this.calculateFieldScore(ownerName, queryTerms, weights.ownerName);
      if (ownerScore > 0) {
        matchedFields.push('owner');
        highlights.owner = this.getHighlights(ownerName, queryTerms);
        totalScore += ownerScore;
      }
    }

    // 应用提升因子
    totalScore = this.applyBoostFactors(document, totalScore, boost);

    return {
      item: document,
      score: totalScore,
      matchedFields,
      highlights
    };
  }

  private calculateFieldScore(fieldValue: string, queryTerms: string[], weight: number): number {
    if (!fieldValue) return 0;

    const normalizedField = fieldValue.toLowerCase();
    let score = 0;

    for (const term of queryTerms) {
      const termScore = this.calculateTermScore(normalizedField, term);
      score += termScore;
    }

    return score * weight;
  }

  private calculateTermScore(text: string, term: string): number {
    // 精确匹配得分最高
    if (text.includes(term)) {
      const exactMatches = (text.match(new RegExp(term, 'g')) || []).length;
      return exactMatches * 1.0;
    }

    // 模糊匹配
    const fuzzyScore = this.calculateFuzzyScore(text, term);
    return fuzzyScore * 0.5;
  }

  private calculateFuzzyScore(text: string, term: string): number {
    // 简单的编辑距离算法
    const maxDistance = Math.floor(term.length * 0.3); // 允许30%的差异
    
    for (let i = 0; i <= text.length - term.length; i++) {
      const substring = text.substr(i, term.length);
      const distance = this.levenshteinDistance(substring, term);
      
      if (distance <= maxDistance) {
        return 1 - (distance / term.length);
      }
    }

    return 0;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private getHighlights(text: string, queryTerms: string[]): string[] {
    const highlights: string[] = [];
    const normalizedText = text.toLowerCase();

    for (const term of queryTerms) {
      const regex = new RegExp(`(${term})`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        highlights.push(...matches);
      }
    }

    return Array.from(new Set(highlights));
  }

  private applyBoostFactors<T extends Document | DocumentListItem>(
    document: T,
    baseScore: number,
    boost: SearchOptions['boost'] = {}
  ): number {
    let boostedScore = baseScore;

    // 最近文档提升
    if (boost.recency) {
      const daysSinceUpdate = (Date.now() - new Date(document.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 1 - (daysSinceUpdate / 30)) * boost.recency;
      boostedScore += recencyBoost;
    }

    // 收藏文档提升
    if (boost.favorites && 'is_favorite' in document && document.is_favorite) {
      boostedScore += boost.favorites;
    }

    // 访问频率提升
    if (boost.frequency) {
      const views = this.userBehavior.documentViews.get(document.id) || 0;
      const frequencyBoost = Math.min(views * 0.1, 1.0) * boost.frequency;
      boostedScore += frequencyBoost;
    }

    return boostedScore;
  }

  private calculateRecommendationScore<T extends Document | DocumentListItem>(document: T): number {
    let score = 0;

    // 基于访问历史
    const views = this.userBehavior.documentViews.get(document.id) || 0;
    score += Math.min(views * 0.2, 1.0);

    // 基于最近访问
    const recentIndex = this.userBehavior.recentDocuments.indexOf(document.id);
    if (recentIndex >= 0) {
      score += (10 - recentIndex) * 0.1;
    }

    // 基于类别偏好
    const category = this.getDocumentCategory(document);
    if (category) {
      const categoryPreference = this.userBehavior.favoriteCategories.get(category) || 0;
      score += Math.min(categoryPreference * 0.1, 0.5);
    }

    // 基于文档热度（最近更新）
    const daysSinceUpdate = (Date.now() - new Date(document.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 1 - (daysSinceUpdate / 7)) * 0.3; // 一周内的文档有热度加成

    return score;
  }

  private enhanceWithSemanticSearch<T extends Document | DocumentListItem>(results: SearchResult<T>[], query: string): void {
    // 这里可以集成语义搜索API，比如使用词向量相似度
    // 简化实现：基于关键词相关性
    const semanticKeywords = this.extractSemanticKeywords(query);
    
    results.forEach(result => {
      const semanticScore = this.calculateSemanticScore(result.item, semanticKeywords);
      result.score += semanticScore * 0.3; // 语义搜索权重为30%
    });
  }

  private enhanceWithFuzzySearch<T extends Document | DocumentListItem>(results: SearchResult<T>[], query: string): void {
    // 模糊搜索已在基础搜索中实现
    // 这里可以添加更高级的模糊搜索逻辑
  }

  private personalizeResults<T extends Document | DocumentListItem>(results: SearchResult<T>[]): void {
    results.forEach(result => {
      const personalScore = this.calculatePersonalScore(result.item);
      result.score += personalScore * 0.2; // 个性化权重为20%
    });

    // 重新排序
    results.sort((a, b) => b.score - a.score);
  }

  private calculatePersonalScore<T extends Document | DocumentListItem>(document: T): number {
    let score = 0;

    // 基于用户历史行为
    const views = this.userBehavior.documentViews.get(document.id) || 0;
    score += Math.min(views * 0.1, 0.5);

    // 基于协同过滤
    if (this.userBehavior.collaborativeFilters.includes(document.id)) {
      score += 0.3;
    }

    return score;
  }

  private extractSemanticKeywords(query: string): string[] {
    // 简化的语义关键词提取
    const synonyms: Record<string, string[]> = {
      '文档': ['文件', '资料', '材料'],
      '项目': ['工程', '任务', '计划'],
      '报告': ['汇报', '总结', '分析'],
      '设计': ['方案', '图纸', '规划']
    };

    const keywords = query.split(' ');
    const semanticKeywords: string[] = [...keywords];

    keywords.forEach(keyword => {
      if (synonyms[keyword]) {
        semanticKeywords.push(...synonyms[keyword]);
      }
    });

    return Array.from(new Set(semanticKeywords));
  }

  private calculateSemanticScore<T extends Document | DocumentListItem>(
    document: T, 
    semanticKeywords: string[]
  ): number {
    const text = [
      this.getDocumentTitle(document),
      this.getDocumentDescription(document),
      ...this.getDocumentTags(document)
    ].join(' ').toLowerCase();

    let score = 0;
    semanticKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 0.1;
      }
    });

    return Math.min(score, 1.0);
  }

  private calculatePersonalScoreForItem<T extends Document | DocumentListItem>(document: T): number {
    return this.calculatePersonalScore(document);
  }

  private generatePatternSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    
    // 基于查询模式生成建议
    if (query.includes('类型:') || query.includes('type:')) {
      suggestions.push('类型:pdf', '类型:word', '类型:markdown');
    }
    
    if (query.includes('状态:') || query.includes('status:')) {
      suggestions.push('状态:草稿', '状态:已发布', '状态:已归档');
    }

    if (query.includes('标签:') || query.includes('tag:')) {
      suggestions.push('标签:重要', '标签:紧急', '标签:待办');
    }

    return suggestions;
  }

  private recordSearch(query: string): void {
    this.searchHistory.push({
      query,
      timestamp: Date.now(),
      resultsCount: 0 // 将在搜索完成后更新
    });

    // 保留最近1000次搜索
    if (this.searchHistory.length > 1000) {
      this.searchHistory = this.searchHistory.slice(-1000);
    }

    this.saveUserBehavior();
  }

  private loadUserBehavior(): void {
    try {
      const saved = localStorage.getItem('intelligentSearch_userBehavior');
      if (saved) {
        const data = JSON.parse(saved);
        this.userBehavior = {
          documentViews: new Map(data.documentViews || []),
          searchHistory: data.searchHistory || [],
          favoriteCategories: new Map(data.favoriteCategories || []),
          recentDocuments: data.recentDocuments || [],
          collaborativeFilters: data.collaborativeFilters || []
        };
        this.searchHistory = data.searchHistory || [];
      }
    } catch (error) {
      console.warn('加载用户行为数据失败:', error);
    }
  }

  private saveUserBehavior(): void {
    try {
      const data = {
        documentViews: Array.from(this.userBehavior.documentViews.entries()),
        searchHistory: this.searchHistory,
        favoriteCategories: Array.from(this.userBehavior.favoriteCategories.entries()),
        recentDocuments: this.userBehavior.recentDocuments,
        collaborativeFilters: this.userBehavior.collaborativeFilters
      };
      localStorage.setItem('intelligentSearch_userBehavior', JSON.stringify(data));
    } catch (error) {
      console.warn('保存用户行为数据失败:', error);
    }
  }

  // 文档字段提取方法
  private getDocumentTitle<T extends Document | DocumentListItem>(document: T): string {
    return document.title || '';
  }

  private getDocumentContent<T extends Document | DocumentListItem>(document: T): string {
    return 'content' in document ? document.content || '' : '';
  }

  private getDocumentDescription<T extends Document | DocumentListItem>(document: T): string {
    return 'description' in document ? document.description || '' : '';
  }

  private getDocumentTags<T extends Document | DocumentListItem>(document: T): string[] {
    return 'tags' in document && Array.isArray(document.tags) ? document.tags : [];
  }

  private getDocumentOwner<T extends Document | DocumentListItem>(document: T): string {
    if ('owner_name' in document) return document.owner_name || '';
    if ('creator_name' in document) return document.creator_name || '';
    return '';
  }

  private getDocumentCategory<T extends Document | DocumentListItem>(document: T): string {
    return 'category' in document ? document.category || '' : '';
  }
}

// 单例实例
export const intelligentSearch = new IntelligentSearch();

// 便捷函数
export const searchDocuments = <T extends Document | DocumentListItem>(
  documents: T[],
  query: string,
  options?: SearchOptions
) => intelligentSearch.search(documents, query, options);

export const getRecommendations = <T extends Document | DocumentListItem>(
  documents: T[],
  maxResults?: number
) => intelligentSearch.getRecommendations(documents, maxResults);

export const getSearchSuggestions = (query: string, limit?: number) => 
  intelligentSearch.getSearchSuggestions(query, limit);

// 在开发环境下挂载到window
if (process.env.NODE_ENV === 'development') {
  (window as any).intelligentSearch = intelligentSearch;
}

export default IntelligentSearch;
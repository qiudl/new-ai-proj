import api from './api';

// 搜索结果接口
export interface SearchResult {
  id: number;
  type: 'document' | 'task' | 'project' | 'user';
  title: string;
  description: string;
  content?: string;
  url: string;
  thumbnail?: string;
  score: number;
  highlights: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: number;
  created_by_name: string;
  tags: string[];
  category: string;
  status: string;
  file_size?: number;
  file_type?: string;
  project_id?: number;
  project_name?: string;
}

// 搜索响应接口
export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_previous: boolean;
  search_time: number;
  facets: Record<string, any>;
  suggestions: string[];
}

// 搜索过滤器接口
export interface SearchFilter {
  query: string;
  type?: string;
  categories?: string[];
  tags?: string[];
  date_from?: string;
  date_to?: string;
  created_by?: number[];
  assigned_to?: number[];
  project_ids?: number[];
  status?: string[];
  priority?: string[];
  file_types?: string[];
  size_min?: number;
  size_max?: number;
  include_content?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}

// 保存的搜索接口
export interface SavedSearch {
  id: number;
  name: string;
  query: string;
  filters: Record<string, any>;
  created_at: string;
}

// 搜索统计接口
export interface SearchStats {
  total_searches: number;
  unique_queries: number;
  avg_results: number;
  most_searched: string[];
  search_types: Record<string, number>;
  period: string;
  date_range: {
    from: string;
    to: string;
  };
}

// 增强搜索服务
export class SearchService {
  private static instance: SearchService;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * 执行搜索
   */
  async search(filter: SearchFilter): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams();
      
      // 基本参数
      if (filter.query) params.append('q', filter.query);
      if (filter.type) params.append('type', filter.type);
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.sort_by) params.append('sort_by', filter.sort_by);
      if (filter.sort_order) params.append('sort_order', filter.sort_order);
      if (filter.include_content !== undefined) {
        params.append('include_content', filter.include_content.toString());
      }

      // 数组参数
      filter.categories?.forEach(cat => params.append('categories', cat));
      filter.tags?.forEach(tag => params.append('tags', tag));
      filter.status?.forEach(status => params.append('status', status));
      filter.priority?.forEach(priority => params.append('priority', priority));
      filter.file_types?.forEach(type => params.append('file_types', type));
      filter.created_by?.forEach(id => params.append('created_by', id.toString()));
      filter.assigned_to?.forEach(id => params.append('assigned_to', id.toString()));
      filter.project_ids?.forEach(id => params.append('project_ids', id.toString()));

      // 日期和大小过滤
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      if (filter.size_min) params.append('size_min', filter.size_min.toString());
      if (filter.size_max) params.append('size_max', filter.size_max.toString());

      const response = await api.get(`/search?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('搜索失败:', error);
      throw this.enhanceError(error, '搜索');
    }
  }

  /**
   * 获取搜索建议
   */
  async getAutocompleteSuggestions(
    query: string, 
    type?: string, 
    limit: number = 10
  ): Promise<string[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      if (type) params.append('type', type);
      params.append('limit', limit.toString());

      const response = await api.get(`/search/autocomplete?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      throw this.enhanceError(error, '获取搜索建议');
    }
  }

  /**
   * 获取搜索统计
   */
  async getSearchStats(period: string = 'week'): Promise<SearchStats> {
    try {
      const response = await api.get('/search/stats', {
        params: { period }
      });
      return response;
    } catch (error) {
      console.error('获取搜索统计失败:', error);
      throw this.enhanceError(error, '获取搜索统计');
    }
  }

  /**
   * 获取保存的搜索
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    try {
      const response = await api.get('/search/saved');
      return response;
    } catch (error) {
      console.error('获取保存的搜索失败:', error);
      throw this.enhanceError(error, '获取保存的搜索');
    }
  }

  /**
   * 保存搜索
   */
  async saveSearch(
    name: string, 
    query: string, 
    filters: Record<string, any>
  ): Promise<SavedSearch> {
    try {
      const response = await api.post('/search/saved', {
        name,
        query,
        filters
      });
      return response;
    } catch (error) {
      console.error('保存搜索失败:', error);
      throw this.enhanceError(error, '保存搜索');
    }
  }

  /**
   * 删除保存的搜索
   */
  async deleteSavedSearch(searchId: number): Promise<void> {
    try {
      await api.delete(`/search/saved/${searchId}`);
    } catch (error) {
      console.error('删除保存的搜索失败:', error);
      throw this.enhanceError(error, '删除保存的搜索');
    }
  }

  /**
   * 高级搜索 - 支持复杂查询语法
   */
  async advancedSearch(
    query: string,
    options: {
      fuzzy?: boolean;
      boost_fields?: Record<string, number>;
      minimum_should_match?: string;
      highlight_fields?: string[];
    } = {}
  ): Promise<SearchResponse> {
    try {
      const response = await api.post('/search/advanced', {
        query,
        ...options
      });
      return response;
    } catch (error) {
      console.error('高级搜索失败:', error);
      throw this.enhanceError(error, '高级搜索');
    }
  }

  /**
   * 相似内容搜索
   */
  async findSimilarContent(
    contentId: number,
    contentType: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      const response = await api.get('/search/similar', {
        params: {
          content_id: contentId,
          content_type: contentType,
          limit
        }
      });
      return response;
    } catch (error) {
      console.error('相似内容搜索失败:', error);
      throw this.enhanceError(error, '相似内容搜索');
    }
  }

  /**
   * 搜索历史
   */
  async getSearchHistory(limit: number = 20): Promise<Array<{
    query: string;
    timestamp: string;
    result_count: number;
  }>> {
    try {
      const response = await api.get('/search/history', {
        params: { limit }
      });
      return response;
    } catch (error) {
      console.error('获取搜索历史失败:', error);
      throw this.enhanceError(error, '获取搜索历史');
    }
  }

  /**
   * 清除搜索历史
   */
  async clearSearchHistory(): Promise<void> {
    try {
      await api.delete('/search/history');
    } catch (error) {
      console.error('清除搜索历史失败:', error);
      throw this.enhanceError(error, '清除搜索历史');
    }
  }

  /**
   * 获取热门搜索词
   */
  async getTrendingSearches(limit: number = 10): Promise<Array<{
    query: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>> {
    try {
      const response = await api.get('/search/trending', {
        params: { limit }
      });
      return response;
    } catch (error) {
      console.error('获取热门搜索失败:', error);
      throw this.enhanceError(error, '获取热门搜索');
    }
  }

  /**
   * 搜索索引状态
   */
  async getIndexStatus(): Promise<{
    total_documents: number;
    indexed_documents: number;
    pending_documents: number;
    last_index_time: string;
    index_health: 'green' | 'yellow' | 'red';
  }> {
    try {
      const response = await api.get('/search/index/status');
      return response;
    } catch (error) {
      console.error('获取索引状态失败:', error);
      throw this.enhanceError(error, '获取索引状态');
    }
  }

  /**
   * 重建搜索索引
   */
  async rebuildIndex(): Promise<{
    job_id: string;
    status: 'started' | 'in_progress' | 'completed' | 'failed';
    message: string;
  }> {
    try {
      const response = await api.post('/search/index/rebuild');
      return response;
    } catch (error) {
      console.error('重建索引失败:', error);
      throw this.enhanceError(error, '重建索引');
    }
  }

  /**
   * 导出搜索结果
   */
  async exportSearchResults(
    filter: SearchFilter,
    format: 'csv' | 'json' | 'xlsx' = 'csv'
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      
      // 构建查询参数
      if (filter.query) params.append('q', filter.query);
      if (filter.type) params.append('type', filter.type);
      params.append('format', format);

      const response = await api.get(`/search/export?${params.toString()}`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('导出搜索结果失败:', error);
      throw this.enhanceError(error, '导出搜索结果');
    }
  }

  /**
   * 批量操作搜索结果
   */
  async batchOperation(
    resultIds: number[],
    operation: 'delete' | 'archive' | 'tag' | 'move',
    params?: Record<string, any>
  ): Promise<{
    success_count: number;
    failed_count: number;
    errors: string[];
  }> {
    try {
      const response = await api.post('/search/batch', {
        result_ids: resultIds,
        operation,
        params
      });
      return response;
    } catch (error) {
      console.error('批量操作失败:', error);
      throw this.enhanceError(error, '批量操作');
    }
  }

  /**
   * 工具方法：构建搜索URL
   */
  buildSearchUrl(filter: SearchFilter): string {
    const params = new URLSearchParams();
    
    if (filter.query) params.append('q', filter.query);
    if (filter.type) params.append('type', filter.type);
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());

    return `/search?${params.toString()}`;
  }

  /**
   * 工具方法：解析搜索URL
   */
  parseSearchUrl(url: string): SearchFilter {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    
    return {
      query: urlParams.get('q') || '',
      type: urlParams.get('type') || undefined,
      page: parseInt(urlParams.get('page') || '1'),
      limit: parseInt(urlParams.get('limit') || '20'),
      sort_by: urlParams.get('sort_by') || 'relevance',
      sort_order: urlParams.get('sort_order') || 'desc',
      include_content: urlParams.get('include_content') === 'true'
    };
  }

  /**
   * 工具方法：验证搜索查询
   */
  validateSearchQuery(query: string): {
    valid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // 基本验证
    if (!query.trim()) {
      errors.push('搜索查询不能为空');
    }
    
    if (query.length > 500) {
      errors.push('搜索查询过长（最多500字符）');
    }
    
    // 特殊字符检查
    const invalidChars = /[<>]/g;
    if (invalidChars.test(query)) {
      errors.push('搜索查询包含无效字符');
      suggestions.push('请移除 < 和 > 字符');
    }
    
    // 过多的通配符
    const wildcardCount = (query.match(/[*?]/g) || []).length;
    if (wildcardCount > 10) {
      errors.push('通配符使用过多');
      suggestions.push('减少通配符的使用');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * 工具方法：格式化搜索结果
   */
  formatSearchResults(results: SearchResult[]): SearchResult[] {
    return results.map(result => ({
      ...result,
      // 确保高亮文本安全
      highlights: result.highlights.map(highlight => 
        this.sanitizeHtml(highlight)
      ),
      // 标准化URL
      url: result.url.startsWith('/') ? result.url : `/${result.url}`,
      // 格式化文件大小
      file_size: result.file_size || 0
    }));
  }

  /**
   * 工具方法：清理HTML
   */
  private sanitizeHtml(html: string): string {
    // 只允许 mark 标签用于高亮
    return html.replace(/<(?!\/?(mark)\b)[^>]*>/gi, '');
  }

  /**
   * 增强错误信息
   */
  private enhanceError(error: any, operation: string): Error {
    let message = `${operation}失败`;
    
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 400: message += ': 请求参数错误'; break;
        case 401: message += ': 身份验证失败'; break;
        case 403: message += ': 权限不足'; break;
        case 404: message += ': 资源不存在'; break;
        case 429: message += ': 请求过于频繁'; break;
        case 500: message += ': 服务器内部错误'; break;
        default: message += `: 服务器错误 (${status})`;
      }
      
      if (error.response.data?.message) {
        message += ` - ${error.response.data.message}`;
      }
    } else if (error.request) {
      message += ': 网络连接失败';
    } else {
      message += `: ${error.message}`;
    }
    
    const enhancedError = new Error(message);
    (enhancedError as any).originalError = error;
    return enhancedError;
  }
}

// 导出单例实例
export const searchService = SearchService.getInstance();
export default searchService;
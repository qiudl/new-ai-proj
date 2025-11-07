import { request } from '../utils/request';

export interface TagAnalysisResult {
  task_id: number;
  title: string;
  existing_tags: string[];
  suggested_tags: string[];
  new_tags: string[];
  tag_categories: { [key: string]: string[] };
  confidence: number;
  analysis: { [key: string]: any };
}

export interface TaskAnalysisRequest {
  task_ids?: number[];
  filters?: {
    status?: string[];
    priority?: string[];
    project_id?: number;
  };
}

export interface WeeklyReportRequest {
  start_date: string;
  end_date: string;
  project_id?: number;
  format?: 'json' | 'markdown';
}

export interface KeyMetrics {
  completed_tasks: number;
  completion_rate: number;
  new_tasks: number;
  velocity: number;
  blockage_rate: number;
}

export interface TechnicalArea {
  area: string;
  count: number;
  percentage: number;
}

export interface Achievement {
  title: string;
  impact: string;
  complexity: string;
}

export interface Risk {
  type: string;
  description: string;
}

export interface ExecutiveSummary {
  key_metrics: KeyMetrics;
  technical_distribution: TechnicalArea[];
  major_achievements: Achievement[];
  risks: Risk[];
  trend: { [key: string]: string };
}

export interface ReportInsight {
  type: string;
  level: 'positive' | 'warning' | 'critical' | 'info';
  message: string;
  details: string;
}

export interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actions: string[];
}

export interface WeeklyReportResponse {
  period: {
    start_date: string;
    end_date: string;
  };
  executive_summary: ExecutiveSummary;
  detailed_analysis: any;
  insights: ReportInsight[];
  recommendations: Recommendation[];
  generated_at: string;
  report_url?: string;
}

export interface TagStatistics {
  total_tasks: number;
  tagged_tasks: number;
  tagging_coverage: number;
  tag_distribution: { [key: string]: number };
  category_stats: {
    [key: string]: {
      count: number;
      percentage: number;
      tags: { [key: string]: number };
    };
  };
  most_used_tags: Array<{
    tag: string;
    count: number;
    trend?: string;
  }>;
  recently_added_tags: Array<{
    tag: string;
    count: number;
    trend?: string;
  }>;
}

class TaskAnalysisService {
  private baseURL = '';

  /**
   * 分析单个任务的标签建议
   */
  async analyzeTaskTags(projectId: number, taskId: number): Promise<TagAnalysisResult> {
    const response = await request.get(`/projects/${projectId}/tasks/${taskId}/analysis/tags`);
    return response.data;
  }

  /**
   * 更新任务标签
   */
  async updateTaskTags(projectId: number, taskId: number, tags: string[]): Promise<void> {
    await request.put(`/projects/${projectId}/tasks/${taskId}/analysis/tags`, {
      tags
    });
  }

  /**
   * 批量分析任务标签
   */
  async batchAnalyzeTasks(analysisRequest: TaskAnalysisRequest): Promise<{
    results: TagAnalysisResult[];
    count: number;
  }> {
    const response = await request.post(`/analysis/tasks/batch-analyze`, analysisRequest);
    return response.data;
  }

  /**
   * 批量更新所有任务标签
   */
  async batchUpdateTags(): Promise<void> {
    await request.post(`/analysis/tags/batch-update`);
  }

  /**
   * 生成周报
   */
  async generateWeeklyReport(reportRequest: WeeklyReportRequest): Promise<WeeklyReportResponse> {
    const response = await request.post(`/analysis/reports/weekly`, reportRequest);
    return response.data;
  }

  /**
   * 获取标签统计信息
   */
  async getTagStatistics(): Promise<TagStatistics> {
    const response = await request.get(`/analysis/tags/statistics`);
    return response.data;
  }

  /**
   * 获取任务分析概览数据（汇总多个接口数据）
   */
  async getAnalysisOverview(): Promise<{
    statistics: TagStatistics;
    recent_insights: ReportInsight[];
    recommendations: Recommendation[];
  }> {
    try {
      // 并行调用多个接口获取数据
      const [statisticsResponse] = await Promise.all([
        this.getTagStatistics(),
      ]);

      // 生成最近一周的快速洞察
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let recentInsights: ReportInsight[] = [];
      let recommendations: Recommendation[] = [];

      try {
        const reportResponse = await this.generateWeeklyReport({
          start_date: startDate,
          end_date: endDate,
          format: 'json'
        });
        recentInsights = reportResponse.insights.slice(0, 3); // 只取前3个
        recommendations = reportResponse.recommendations.slice(0, 3); // 只取前3个
      } catch (error) {
        console.warn('Failed to generate weekly insights:', error);
        // 如果周报生成失败，提供默认洞察
        recentInsights = [
          {
            type: 'info',
            level: 'info',
            message: '任务分析系统已就绪',
            details: '可以开始使用智能标签和分析功能'
          }
        ];
      }

      return {
        statistics: statisticsResponse,
        recent_insights: recentInsights,
        recommendations: recommendations
      };
    } catch (error) {
      console.error('Failed to get analysis overview:', error);
      throw error;
    }
  }

  /**
   * 获取标签建议（基于任务内容）
   */
  async getTagSuggestions(taskTitle: string, taskDescription?: string): Promise<string[]> {
    // 这是一个客户端的简单标签建议逻辑
    // 在实际应用中，这应该调用后端的智能分析接口
    const text = `${taskTitle} ${taskDescription || ''}`.toLowerCase();
    const suggestions: string[] = [];

    // 技术栈标签
    if (text.includes('前端') || text.includes('react') || text.includes('ui') || text.includes('界面')) {
      suggestions.push('frontend');
    }
    if (text.includes('后端') || text.includes('api') || text.includes('接口') || text.includes('服务')) {
      suggestions.push('backend');
    }
    if (text.includes('数据库') || text.includes('sql') || text.includes('表')) {
      suggestions.push('database');
    }

    // 任务类型标签
    if (text.includes('修复') || text.includes('bug') || text.includes('错误')) {
      suggestions.push('bugfix');
    }
    if (text.includes('优化') || text.includes('性能') || text.includes('改进')) {
      suggestions.push('optimization');
    }
    if (text.includes('功能') || text.includes('实现') || text.includes('开发')) {
      suggestions.push('feature');
    }
    if (text.includes('测试') || text.includes('验证')) {
      suggestions.push('testing');
    }

    // 复杂度标签
    if (text.includes('简单') || text.includes('小') || text.includes('调整')) {
      suggestions.push('simple');
    } else if (text.includes('复杂') || text.includes('架构') || text.includes('重构')) {
      suggestions.push('complex');
    } else {
      suggestions.push('medium');
    }

    return suggestions;
  }

  /**
   * 验证标签格式
   */
  isValidTag(tag: string): boolean {
    // 标签应该是小写字母、数字和连字符
    return /^[a-z0-9-]+$/.test(tag) && tag.length > 0 && tag.length <= 50;
  }

  /**
   * 标准化标签
   */
  normalizeTag(tag: string): string {
    return tag
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 获取标签分类
   */
  getTagCategory(tag: string): string {
    const technicalTags = ['frontend', 'backend', 'database', 'api', 'ui-ux', 'infrastructure'];
    const typeTags = ['feature', 'bugfix', 'optimization', 'testing', 'refactor', 'enhancement'];
    const complexityTags = ['simple', 'medium', 'complex', 'architectural'];
    const businessTags = ['task-management', 'user-interface', 'document-management', 'time-tracking'];
    const priorityTags = ['urgent', 'high-priority', 'critical', 'blocked', 'technical-debt'];
    const phaseTags = ['mvp', 'phase-1', 'phase-2', 'foundation', 'enhancement', 'polish'];

    if (technicalTags.includes(tag)) return 'technical';
    if (typeTags.includes(tag)) return 'type';
    if (complexityTags.includes(tag)) return 'complexity';
    if (businessTags.includes(tag)) return 'business';
    if (priorityTags.includes(tag)) return 'priority';
    if (phaseTags.includes(tag)) return 'phase';
    
    return 'other';
  }

  /**
   * 获取标签颜色（用于UI显示）
   */
  getTagColor(tag: string): string {
    const category = this.getTagCategory(tag);
    
    const categoryColors: { [key: string]: string } = {
      'technical': '#1890ff',     // 蓝色
      'type': '#52c41a',          // 绿色
      'complexity': '#fa8c16',    // 橙色
      'business': '#722ed1',      // 紫色
      'priority': '#f5222d',      // 红色
      'phase': '#13c2c2',         // 青色
      'other': '#666666'          // 灰色
    };

    return categoryColors[category] || categoryColors.other;
  }
}

export const taskAnalysisService = new TaskAnalysisService();
export default taskAnalysisService;
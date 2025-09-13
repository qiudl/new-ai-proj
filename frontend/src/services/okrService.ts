import api from './api';
import { 
  OKRObjective, 
  KeyResult, 
  OKRStats, 
  CreateObjectiveRequest,
  UpdateObjectiveRequest,
  UpdateKeyResultRequest,
  OKRListResponse,
  TaskKeyResultAssociation,
  TaskKRAssociationWithKR,
  TaskKRAssociationWithTask,
  CreateTaskKRAssociationRequest
} from '../types/okr';

class OKRService {
  private baseUrl = '/okr';

  // 目标管理
  async createObjective(data: CreateObjectiveRequest): Promise<OKRObjective> {
    console.log('🐛 [OKRService] createObjective called with:', data);
    const response = await api.post(`${this.baseUrl}/objectives`, data);
    console.log('🐛 [OKRService] createObjective response:', response);
    return response as OKRObjective;
  }

  async getObjectives(quarter?: string): Promise<OKRListResponse> {
    const params = quarter ? { quarter } : {};
    const response = await api.get(`${this.baseUrl}/objectives`, { params });
    return response as OKRListResponse;
  }

  async getObjective(id: number): Promise<OKRObjective> {
    const response = await api.get(`${this.baseUrl}/objectives/${id}`);
    return response as OKRObjective;
  }

  async updateObjective(id: number, data: UpdateObjectiveRequest): Promise<OKRObjective> {
    const response = await api.put(`${this.baseUrl}/objectives/${id}`, data);
    return response as OKRObjective;
  }

  async deleteObjective(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/objectives/${id}`);
  }

  // 关键结果管理
  async createKeyResult(objectiveId: number, data: Omit<KeyResult, 'id' | 'objectiveId' | 'createdAt' | 'updatedAt'>): Promise<KeyResult> {
    const response = await api.post(`${this.baseUrl}/objectives/${objectiveId}/key-results`, data);
    return response as KeyResult;
  }

  async updateKeyResult(id: number, data: UpdateKeyResultRequest): Promise<KeyResult> {
    const response = await api.put(`${this.baseUrl}/key-results/${id}`, data);
    return response as KeyResult;
  }

  async deleteKeyResult(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/key-results/${id}`);
  }

  // 统计数据
  async getOKRStats(quarter?: string): Promise<OKRStats> {
    const params = quarter ? { quarter } : {};
    const response = await api.get(`${this.baseUrl}/stats`, { params });
    return response as OKRStats;
  }

  // 进度日志
  async getObjectiveLogs(objectiveId: number, limit: number = 50): Promise<{ total: number; logs: any[] }> {
    const response = await api.get(`${this.baseUrl}/objectives/${objectiveId}/progress-logs`, { params: { limit } });
    // API 返回 { total, logs }
    return response as any;
  }

  async getKeyResultLogs(keyResultId: number, limit: number = 50): Promise<{ total: number; logs: any[] }> {
    const response = await api.get(`${this.baseUrl}/key-results/${keyResultId}/progress-logs`, { params: { limit } });
    return response as any;
  }

  // 季度管理
  async getAvailableQuarters(): Promise<string[]> {
    const response = await api.get(`${this.baseUrl}/quarters`);
    return (response as any)?.quarters || [];
  }

  // 工具方法
  getCurrentQuarter(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return `${year}-Q${quarter}`;
  }

  getQuarterDates(quarter: string): { startDate: Date; endDate: Date } {
    const [year, q] = quarter.split('-Q');
    const yearNum = parseInt(year, 10);
    const quarterNum = parseInt(q, 10);

    const startMonth = (quarterNum - 1) * 3;
    const endMonth = quarterNum * 3 - 1;

    const startDate = new Date(yearNum, startMonth, 1);
    const endDate = new Date(yearNum, endMonth + 1, 0); // Last day of the quarter

    return { startDate, endDate };
  }

  getRemainingDaysInQuarter(quarter: string): number {
    const { endDate } = this.getQuarterDates(quarter);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return '#52c41a';
      case 'active': return '#1890ff';
      case 'at_risk': return '#faad14';
      case 'cancelled': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'completed': return '已完成';
      case 'active': return '进行中';
      case 'at_risk': return '风险';
      case 'cancelled': return '已取消';
      case 'draft': return '草稿';
      default: return '未知';
    }
  }

  getKRStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'processing';
      case 'at_risk': return 'warning';
      case 'not_started': return 'default';
      default: return 'default';
    }
  }

  getKRStatusText(status: string): string {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'at_risk': return '风险';
      case 'not_started': return '未开始';
      default: return '未知';
    }
  }

  // ==================== Task-KeyResult Association Methods ====================

  // 创建任务-关键结果关联
  async createTaskKRAssociation(taskId: number, keyResultId: number, data: Partial<CreateTaskKRAssociationRequest>): Promise<TaskKeyResultAssociation> {
    const response = await api.post(`${this.baseUrl}/tasks/${taskId}/key-results/${keyResultId}/associate`, {
      taskId,
      keyResultId,
      weight: data.weight || 100,
      syncMode: data.syncMode || 'auto'
    });
    return response as TaskKeyResultAssociation;
  }

  // 获取任务的OKR关联
  async getTaskKRAssociations(taskId: number): Promise<TaskKRAssociationWithKR[]> {
    const response = await api.get(`${this.baseUrl}/tasks/${taskId}/associations`);
    return (response as any)?.associations || [];
  }

  // 获取关键结果的任务关联
  async getKeyResultTaskAssociations(keyResultId: number): Promise<TaskKRAssociationWithTask[]> {
    const response = await api.get(`${this.baseUrl}/key-results/${keyResultId}/tasks`);
    return (response as any)?.tasks || [];
  }

  // 同步关键结果进度
  async syncKeyResultProgress(keyResultId: number): Promise<{ oldProgress: number; newProgress: number; keyResult: KeyResult }> {
    const response = await api.post(`${this.baseUrl}/key-results/${keyResultId}/sync-progress`);
    return response as { oldProgress: number; newProgress: number; keyResult: KeyResult };
  }

  // 删除任务-关键结果关联
  async deleteTaskKRAssociation(associationId: number): Promise<void> {
    await api.delete(`${this.baseUrl}/task-associations/${associationId}`);
  }
}

export default new OKRService();
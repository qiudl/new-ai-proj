import { DocumentRelation } from '../types/document';

const BASE_URL = '/api/v1/document-relations';

// Request interfaces
export interface AddDocumentRelationRequest {
  document_id: number;
  entity_type: 'customer' | 'project' | 'task';
  entity_id: number;
  relation_type: string;
  description?: string;
}

export interface UpdateDocumentRelationRequest {
  relation_type?: string;
  description?: string;
  display_order?: number;
}

export interface DocumentRelationsResponse {
  customer_relations: DocumentCustomerRelation[];
  project_relations: DocumentProjectRelation[];
  task_relations: DocumentTaskRelation[];
  total_count: number;
}

export interface DocumentCustomerRelation {
  id: number;
  document_id: number;
  customer_id: number;
  relation_type: string;
  description?: string;
  created_by: number;
  created_at: string;
  document_title?: string;
  customer_name?: string;
  creator_name?: string;
}

export interface DocumentProjectRelation {
  id: number;
  document_id: number;
  project_id: number;
  relation_type: string;
  description?: string;
  created_by: number;
  created_at: string;
  document_title?: string;
  project_name?: string;
  creator_name?: string;
}

export interface DocumentTaskRelation {
  id: number;
  document_id: number;
  task_id: number;
  relation_type: string;
  description?: string;
  display_order?: number;
  created_by: number;
  created_at: string;
  document_title?: string;
  task_title?: string;
  creator_name?: string;
}

export interface EntityRelationsResponse {
  relations: DocumentRelation[];
  total_count: number;
  has_more: boolean;
}

export interface RelationStatsResponse {
  customer_relations: number;
  project_relations: number;
  task_relations: number;
  by_relation_type: Record<string, number>;
  recent_activity: DocumentRelation[];
}

class DocumentRelationService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Create relations
  async createCustomerRelation(data: {
    document_id: number;
    customer_id: number;
    relation_type: string;
    description?: string;
  }): Promise<DocumentCustomerRelation> {
    return this.request(`${BASE_URL}/customer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createProjectRelation(data: {
    document_id: number;
    project_id: number;
    relation_type: string;
    description?: string;
  }): Promise<DocumentProjectRelation> {
    return this.request(`${BASE_URL}/project`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createTaskRelation(data: {
    document_id: number;
    task_id: number;
    relation_type: string;
    description?: string;
    display_order?: number;
  }): Promise<DocumentTaskRelation> {
    return this.request(`${BASE_URL}/task`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get relations
  async getDocumentRelations(documentId: number): Promise<DocumentRelationsResponse> {
    return this.request(`${BASE_URL}/document/${documentId}`);
  }

  async getEntityRelations(
    entityType: 'customer' | 'project' | 'task',
    entityId: number,
    params?: {
      relation_type?: string;
      created_by?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<EntityRelationsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.relation_type) queryParams.append('relation_type', params.relation_type);
    if (params?.created_by) queryParams.append('created_by', params.created_by.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const url = `${BASE_URL}/${entityType}/${entityId}${queryString ? `?${queryString}` : ''}`;
    
    return this.request(url);
  }

  // Update relations
  async updateCustomerRelation(
    relationId: number,
    data: UpdateDocumentRelationRequest
  ): Promise<DocumentCustomerRelation> {
    return this.request(`${BASE_URL}/customer/${relationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateProjectRelation(
    relationId: number,
    data: UpdateDocumentRelationRequest
  ): Promise<DocumentProjectRelation> {
    return this.request(`${BASE_URL}/project/${relationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateTaskRelation(
    relationId: number,
    data: UpdateDocumentRelationRequest
  ): Promise<DocumentTaskRelation> {
    return this.request(`${BASE_URL}/task/${relationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete relations
  async deleteRelation(entityType: 'customer' | 'project' | 'task', relationId: number): Promise<void> {
    await this.request(`${BASE_URL}/${entityType}/${relationId}`, {
      method: 'DELETE',
    });
  }

  // Statistics
  async getRelationStats(documentId?: number): Promise<RelationStatsResponse> {
    const queryParams = new URLSearchParams();
    if (documentId) queryParams.append('document_id', documentId.toString());
    
    const queryString = queryParams.toString();
    const url = `${BASE_URL}/stats${queryString ? `?${queryString}` : ''}`;
    
    return this.request(url);
  }

  // Bulk operations
  async bulkCreateRelations(relations: AddDocumentRelationRequest[]): Promise<void> {
    await this.request(`${BASE_URL}/bulk`, {
      method: 'POST',
      body: JSON.stringify(relations),
    });
  }

  // Helper methods for getting entity options
  async getCustomerOptions(): Promise<Array<{ id: number; name: string }>> {
    // TODO: This should call the customers API
    // For now, return mock data
    return [
      { id: 1, name: 'ABC科技有限公司' },
      { id: 2, name: 'XYZ集团' },
      { id: 3, name: '创新科技公司' },
    ];
  }

  async getProjectOptions(): Promise<Array<{ id: number; name: string }>> {
    // TODO: This should call the projects API
    // For now, return mock data
    return [
      { id: 1, name: 'AI项目管理系统' },
      { id: 2, name: '智能客服平台' },
      { id: 3, name: '数据分析平台' },
    ];
  }

  async getTaskOptions(): Promise<Array<{ id: number; name: string }>> {
    // TODO: This should call the tasks API
    // For now, return mock data
    return [
      { id: 1, name: '实现用户认证模块' },
      { id: 2, name: '设计数据库架构' },
      { id: 3, name: '开发API接口' },
    ];
  }
}

// Export a singleton instance
export const documentRelationService = new DocumentRelationService();
export default documentRelationService;
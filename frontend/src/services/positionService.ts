import api from './api';

// 岗位数据类型定义
export interface Position {
  id: number;
  name: string;
  department_id: number;
  department_name: string;
  level: number;
  category: string;
  description: string;
  requirements: string[];
  salary_min?: number;
  salary_max?: number;
  employee_count: number;
  status: 'active' | 'inactive' | 'recruiting';
  created_at: string;
  updated_at: string;
}

// 技能要求类型
export interface SkillRequirement {
  id: number;
  name: string;
  level: number; // 1-5级
  required: boolean;
  category: string;
}

// 员工岗位分配类型
export interface EmployeePosition {
  id: number;
  employee_name: string;
  position_name: string;
  department_name: string;
  start_date: string;
  is_primary: boolean;
  status: string;
}

// 创建岗位请求类型
export interface CreatePositionRequest {
  name: string;
  department_id: number;
  level?: number;
  category?: string;
  description?: string;
  requirements?: string[];
  salary_min?: number;
  salary_max?: number;
  status?: 'active' | 'inactive' | 'recruiting';
}

// 更新岗位请求类型
export interface UpdatePositionRequest extends Partial<CreatePositionRequest> {}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class PositionService {
  private readonly API_BASE_URL = '/organization/positions';

  // 统一的 API 响应处理函数
  private handleApiResponse<T>(response: any): T {
    
    if (!response) {
      return {
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      } as T;
    }

    // 处理标准API响应格式 {success: true, data: ...}
    if (response.success && response.data !== undefined) {
      return response.data as T;
    }

    // 处理分页响应格式（拦截器已解包response.data）
    if (response && Array.isArray(response.data) && response.pagination) {
      return {
        data: response.data,
        pagination: response.pagination
      } as T;
    }

    // 如果直接是数据数组
    if (Array.isArray(response)) {
      return response as T;
    }

    return response as T;
  }

  // 获取岗位列表
  async getPositions(): Promise<Position[]> {
    try {
      const response = await api.get(`${this.API_BASE_URL}`);
      const result = this.handleApiResponse<Position[]>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取岗位列表失败:', error);
      throw error;
    }
  }

  // 获取单个岗位详情
  async getPosition(id: number): Promise<Position> {
    try {
      const response = await api.get(`${this.API_BASE_URL}/${id}`);
      const result = this.handleApiResponse<Position>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取岗位详情失败:', error);
      throw error;
    }
  }

  // 创建岗位
  async createPosition(position: CreatePositionRequest): Promise<Position> {
    try {
      const response = await api.post(`${this.API_BASE_URL}`, position);
      const result = this.handleApiResponse<Position>(response);
      return result;
    } catch (error) {
      console.error('❌ 创建岗位失败:', error);
      throw error;
    }
  }

  // 更新岗位
  async updatePosition(id: number, position: UpdatePositionRequest): Promise<Position> {
    try {
      const response = await api.put(`${this.API_BASE_URL}/${id}`, position);
      const result = this.handleApiResponse<Position>(response);
      return result;
    } catch (error) {
      console.error('❌ 更新岗位失败:', error);
      throw error;
    }
  }

  // 删除岗位
  async deletePosition(id: number): Promise<void> {
    try {
      await api.delete(`${this.API_BASE_URL}/${id}`);
    } catch (error) {
      console.error('❌ 删除岗位失败:', error);
      throw error;
    }
  }

  // 获取岗位的员工分配列表
  async getPositionEmployees(positionId?: number): Promise<EmployeePosition[]> {
    try {
      const url = positionId 
        ? `${this.API_BASE_URL}/${positionId}/employees`
        : `/organization/employee-positions`;
      
      const response = await api.get(url);
      const result = this.handleApiResponse<EmployeePosition[]>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取岗位员工分配列表失败:', error);
      throw error;
    }
  }

  // 获取可用的部门列表（用于岗位创建时选择）
  async getAvailableDepartments(): Promise<{id: number; name: string}[]> {
    try {
      const response = await api.get('/organization/departments/simple');
      const result = this.handleApiResponse<{id: number; name: string}[]>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取可用部门列表失败:', error);
      throw error;
    }
  }

  // 获取技能要求列表（预定义的技能库）
  async getSkillRequirements(): Promise<SkillRequirement[]> {
    try {
      const response = await api.get('/organization/skills');
      const result = this.handleApiResponse<SkillRequirement[]>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取技能要求列表失败:', error);
      // 返回默认技能列表
      return [];
    }
  }

  // 获取岗位统计信息
  async getPositionStats(): Promise<{
    totalPositions: number;
    totalEmployees: number;
    recruitingPositions: number;
    avgSalaryRange: { min: number; max: number };
    categoryStats: { category: string; count: number }[];
  }> {
    try {
      const response = await api.get(`${this.API_BASE_URL}/stats`);
      const result = this.handleApiResponse<{
        totalPositions: number;
        totalEmployees: number;
        recruitingPositions: number;
        avgSalaryRange: { min: number; max: number };
        categoryStats: { category: string; count: number }[];
      }>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取岗位统计信息失败:', error);
      // 返回默认统计信息
      return {
        totalPositions: 0,
        totalEmployees: 0,
        recruitingPositions: 0,
        avgSalaryRange: { min: 0, max: 0 },
        categoryStats: []
      };
    }
  }

  // 分配员工到岗位
  async assignEmployeeToPosition(employeeId: number, positionId: number, isPrimary: boolean = false): Promise<void> {
    try {
      const response = await api.post('/organization/employee-positions', {
        employee_id: employeeId,
        position_id: positionId,
        is_primary: isPrimary
      });
    } catch (error) {
      console.error('❌ 分配员工到岗位失败:', error);
      throw error;
    }
  }

  // 移除员工岗位分配
  async removeEmployeeFromPosition(assignmentId: number): Promise<void> {
    try {
      await api.delete(`/organization/employee-positions/${assignmentId}`);
    } catch (error) {
      console.error('❌ 移除员工岗位分配失败:', error);
      throw error;
    }
  }
}

export default new PositionService();
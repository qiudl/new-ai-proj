import api from './api';

// 部门数据类型定义
export interface Department {
  id: number;
  company_id: number;
  name: string;
  parent_id?: number;
  manager_id?: number;
  manager_name?: string;
  description?: string;
  level: number;
  employee_count: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  children?: Department[];
}

// 员工数据类型
export interface Employee {
  id: number;
  name: string;
  position: string;
  department_id: number;
  department_name: string;
  email?: string;
  phone?: string;
  status: string;
}

// 创建部门请求类型
export interface CreateDepartmentRequest {
  name: string;
  parent_id?: number;
  manager_id?: number;
  description?: string;
  status?: 'active' | 'inactive';
}

// 更新部门请求类型
export interface UpdateDepartmentRequest extends Partial<CreateDepartmentRequest> {}

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

class OrganizationService {
  private readonly API_BASE_URL = '/organization';
  private companyId: number = 2; // 默认企业ID，后续可从用户上下文获取

  // 设置当前企业ID
  setCompanyId(companyId: number): void {
    this.companyId = companyId;
  }

  // 获取当前企业ID
  getCompanyId(): number {
    return this.companyId;
  }

  // 统一的 API 响应处理函数
  private handleApiResponse<T>(response: any): T {
    
    if (!response) {
      console.warn('API返回空响应，使用默认值');
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

    // 处理分页响应格式
    if (response.data && Array.isArray(response.data) && response.pagination) {
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

  // 获取部门列表（树形结构）
  async getDepartments(companyId?: number): Promise<Department[]> {
    try {
      const cid = companyId || this.companyId;
      console.log('🔍 获取部门列表 - 企业ID:', cid);
      
      const raw = await api.get(`${this.API_BASE_URL}/departments`, {
        params: { company_id: cid }
      });
      
      // 兼容 axios 响应拦截器已解包的返回值或原始响应结构
      let result: any = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      
      // API实际返回格式为 {response: Array, result: ...}
      if (result && (result as any).response && Array.isArray((result as any).response)) {
        result = (result as any).response;
      }
      // 备选格式 {data: [...], success: true}
      else if (result && (result as any).success && (result as any).data) {
        result = (result as any).data;
      }
      
      // 确保返回数组格式
      if (Array.isArray(result)) {
        return result as Department[];
      } else {
        // 非致命：记录调试信息并返回空数组，避免控制台出现警告
        console.debug('部门数据不是数组格式，使用空数组作为兜底:', result);
        return [];
      }
    } catch (error) {
      console.error('❌ 获取部门列表失败:', error);
      throw error;
    }
  }

  // 获取单个部门详情
  async getDepartment(id: number, companyId?: number): Promise<Department> {
    try {
      const cid = companyId || this.companyId;
      const raw = await api.get(`${this.API_BASE_URL}/departments/${id}`, {
        params: { company_id: cid }
      });
      const result: any = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      return result as Department;
    } catch (error) {
      console.error('❌ 获取部门详情失败:', error);
      throw error;
    }
  }

  // 创建部门
  async createDepartment(department: CreateDepartmentRequest, companyId?: number): Promise<Department> {
    try {
      const cid = companyId || this.companyId;
      console.log('➕ 创建部门请求:', { department, companyId: cid });
      
      const raw = await api.post(`${this.API_BASE_URL}/departments?company_id=${cid}`, department);
      
      console.log('✅ 部门创建响应:', raw);
      
      let result: any = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      
      // 处理API响应格式
      if (result && (result as any).success && (result as any).data) {
        result = (result as any).data;
        console.log('✅ 解析后的创建部门数据:', result);
      }
      
      return result as Department;
    } catch (error) {
      console.error('❌ 创建部门失败:', error);
      throw error;
    }
  }

  // 更新部门
  async updateDepartment(id: number, department: UpdateDepartmentRequest, companyId?: number): Promise<Department> {
    try {
      const cid = companyId || this.companyId;
      const raw = await api.put(`${this.API_BASE_URL}/departments/${id}?company_id=${cid}`, department);
      const result: any = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      return result as Department;
    } catch (error) {
      console.error('❌ 更新部门失败:', error);
      throw error;
    }
  }

  // 删除部门
  async deleteDepartment(id: number, companyId?: number): Promise<void> {
    try {
      const cid = companyId || this.companyId;
      await api.delete(`${this.API_BASE_URL}/departments/${id}?company_id=${cid}`);
    } catch (error) {
      console.error('❌ 删除部门失败:', error);
      throw error;
    }
  }

  // 获取部门员工列表
  async getDepartmentEmployees(departmentId?: number): Promise<Employee[]> {
    try {
      const url = departmentId 
        ? `${this.API_BASE_URL}/departments/${departmentId}/employees`
        : `${this.API_BASE_URL}/employees`;
      
      const raw = await api.get(url);
      const result: any = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      return Array.isArray(result) ? (result as Employee[]) : [];
    } catch (error) {
      console.error('❌ 获取员工列表失败:', error);
      throw error;
    }
  }

  // 获取可用的经理列表（用于部门管理选择）
  async getAvailableManagers(): Promise<Employee[]> {
    try {
      const raw = await api.get(`${this.API_BASE_URL}/managers`);
      const result: any = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      return Array.isArray(result) ? (result as Employee[]) : [];
    } catch (error) {
      console.error('❌ 获取可用经理列表失败:', error);
      throw error;
    }
  }

  // 获取部门统计信息
  async getDepartmentStats(companyId?: number): Promise<{
    totalDepartments: number;
    totalEmployees: number;
    maxLevel: number;
    activeDepartments: number;
  }> {
    try {
      const cid = companyId || this.companyId;
      const raw = await api.get(`${this.API_BASE_URL}/stats`, {
        params: { company_id: cid }
      });
      
      let result: any = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      
      // API实际返回格式为 {response: {...}, result: ...}
      if (result && (result as any).response && typeof (result as any).response === 'object') {
        result = (result as any).response;
      }
      // 备选格式 {data: {...}, success: true}
      else if (result && (result as any).success && (result as any).data) {
        result = (result as any).data;
      }
      
      // 确保result存在且有效，否则使用默认值
      if (!result || typeof result !== 'object') {
        // 非致命：记录调试信息并返回默认统计，避免控制台出现警告
        console.debug('部门统计数据无效，使用默认统计:', result);
        return {
          totalDepartments: 0,
          totalEmployees: 0,
          maxLevel: 0,
          activeDepartments: 0
        };
      }
      
      // 确保返回正确的数据结构
      return {
        totalDepartments: (result as any).totalDepartments || 0,
        totalEmployees: (result as any).totalEmployees || 0,
        maxLevel: (result as any).maxLevel || 0,
        activeDepartments: (result as any).activeDepartments || 0
      };
    } catch (error) {
      console.error('❌ 获取部门统计信息失败:', error);
      // 返回默认统计信息
      return {
        totalDepartments: 0,
        totalEmployees: 0,
        maxLevel: 0,
        activeDepartments: 0
      };
    }
  }
}

export default new OrganizationService();
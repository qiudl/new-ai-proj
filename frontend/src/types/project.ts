export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  project_number?: string; // 项目编号，格式如 "P101", "P102"
  company_id?: number; // 主客户ID（保持向后兼容）
  company_name?: string; // 主客户名称（保持向后兼容）
  companies?: ProjectCompany[]; // 多客户关联
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  start_date?: string;
  end_date?: string;
  progress?: number; // 项目进度百分比
  created_at: string;
  updated_at: string;
}

export interface ProjectRequest {
  project_number?: string; // 项目编号
  name: string;
  description?: string;
  company_id?: number; // 主客户ID（保持向后兼容）
  company_ids?: number[]; // 多客户ID列表
  user_ids?: number[]; // 项目用户ID列表
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  start_date?: string;
  end_date?: string;
  progress?: number; // 项目进度百分比
}

export interface ProjectResponse extends Project {
  // Add any additional response-specific fields if needed
}

// 项目用户角色类型
export type ProjectUserRole = 'customer' | 'consultant' | 'developer' | 'manager' | 'designer';

// 项目用户接口
export interface ProjectUser {
  id: number;
  user_id: number;
  project_id: number;
  role: ProjectUserRole;
  role_name: string;
  user_name: string;
  user_email?: string;
  user_avatar?: string;
  department?: string;
  phone?: string;
  joined_at: string;
  is_primary?: boolean; // 是否为主要负责人
}

// 项目动态类型
export type ProjectActivityType = 'created' | 'updated' | 'user_added' | 'user_removed' | 'task_created' | 'task_completed' | 'milestone_reached' | 'status_changed';

// 项目动态接口
export interface ProjectActivity {
  id: number;
  project_id: number;
  type: ProjectActivityType;
  title: string;
  description?: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
  metadata?: Record<string, any>; // 额外的活动数据
}

// 导入客户类型（使用现有的Company类型但适配字段名）
export interface Company {
  id: number;
  companyName: string; // 与company.ts保持一致
  name?: string; // 兼容性字段
  companyCode?: string;
  industry?: string;
  address?: string;
  mainPhone?: string;
  mainEmail?: string;
  status?: 'active' | 'inactive' | 'potential' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

// 项目客户关联接口
export interface ProjectCompany {
  id: number;
  project_id: number;
  company_id: number;
  company: Company;
  role?: string; // 在项目中的角色（如“主客户”、“合作伙伴”等）
  is_primary?: boolean; // 是否为主客户
  created_at: string;
}

// 客户用户接口（适配现有类型）
export interface CompanyUser {
  id: number;
  customerId: number; // 与company.ts保持一致
  company_id?: number; // 兼容性字段
  name: string;
  user_name?: string; // 兼容性字段
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  avatar?: string;
  role?: 'primary_contact' | 'technical_contact' | 'decision_maker' | 'finance_contact' | 'normal';
  status?: 'active' | 'inactive' | 'left';
  is_active?: boolean; // 兼容性字段
  createdAt: string;
  updatedAt: string;
  created_at?: string; // 兼容性字段
  updated_at?: string; // 兼容性字段
}

// 项目详情接口（包含完整信息）
export interface ProjectDetail extends Project {
  users: ProjectUser[];
  activities: ProjectActivity[];
  task_count?: number;
  completed_task_count?: number;
}
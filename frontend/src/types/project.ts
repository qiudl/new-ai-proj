export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  project_number?: string; // 项目编号，格式如 "P101", "P102"
  enterprise_id?: number; // 企业ID（新架构）
  enterprise_name?: string; // 企业名称（新架构）
  company_name?: string; // 公司名称（别名，向后兼容）
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  start_date?: string;
  end_date?: string;
  progress?: number; // 项目进度百分比
  task_count?: number; // 任务数量
  member_count?: number; // 成员数量
  created_at: string;
  updated_at: string;
}

export interface ProjectRequest {
  project_number?: string; // 项目编号
  name: string;
  description?: string;
  enterprise_id?: number; // 企业ID（新架构）
  company_id?: number; // ✅ FIXED - 兼容旧的company架构 (TS2353)
  company_ids?: number[]; // ✅ FIXED - 兼容旧的company架构（批量） (TS2353)
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


// 项目详情接口（包含完整信息）
export interface ProjectDetail extends Project {
  users: ProjectUser[];
  activities: ProjectActivity[];
  task_count?: number;
  completed_task_count?: number;
}
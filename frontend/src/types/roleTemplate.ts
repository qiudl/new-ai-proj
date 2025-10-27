// 角色模板相关类型定义
export interface RoleTemplate {
  id: number;
  template_code: string;
  template_name: string;
  template_description?: string;
  category: TemplateCategory;
  industry?: string;
  department?: string;
  level: number;
  parent_template_id?: number;
  is_system_template: boolean;
  is_active: boolean;
  configuration?: Record<string, any>;
  metadata?: Record<string, any>;
  version: number;
  created_by?: number;
  created_at: string;
  updated_at: string;

  // 关联数据（可选，用于详细视图）
  permissions?: RoleTemplatePermission[];
  tags?: RoleTemplateTag[];
  parent_template?: RoleTemplate;
  child_templates?: RoleTemplate[];
  usage_count?: number;
}

// 模板分类枚举
export type TemplateCategory = 'system' | 'business' | 'custom';

// 模板权限关联
export interface RoleTemplatePermission {
  id: number;
  template_id: number;
  permission_id: number;
  is_required: boolean;
  is_default: boolean;
  priority: number;
  conditions?: Record<string, any>;
  created_at: string;

  // 权限详细信息（关联查询时使用）
  permission?: {
    id: number;
    permission_code: string;
    permission_name: string;
    description?: string;
    category?: string;
  };
}

// 模板标签
export interface RoleTemplateTag {
  id: number;
  template_id: number;
  tag_name: string;
  tag_category: TagCategory;
  created_at: string;
}

// 标签分类枚举
export type TagCategory = 'industry' | 'department' | 'function' | 'custom';

// 模板继承关系
export interface RoleTemplateInheritance {
  id: number;
  parent_template_id: number;
  child_template_id: number;
  inheritance_type: InheritanceType;
  inherited_fields?: Record<string, any>;
  created_at: string;

  // 关联模板信息
  parent_template?: RoleTemplate;
  child_template?: RoleTemplate;
}

// 继承类型枚举
export type InheritanceType = 'full' | 'partial' | 'override';

// 模板使用记录
export interface RoleTemplateUsage {
  id: number;
  template_id: number;
  role_id: number;
  usage_type: TemplateUsageType;
  customizations?: Record<string, any>;
  applied_by?: number;
  applied_at: string;
  is_current_template: boolean;

  // 关联信息
  template?: RoleTemplate;
  role?: {
    id: number;
    role_code: string;
    role_name: string;
    enterprise_id: number;
  };
  applied_by_user?: {
    id: number;
    username: string;
    name?: string;
  };
}

// 使用类型枚举
export type TemplateUsageType = 'created' | 'updated' | 'applied';

// 模板版本
export interface RoleTemplateVersion {
  id: number;
  template_id: number;
  version: number;
  template_name: string;
  template_description?: string;
  configuration?: Record<string, any>;
  permission_snapshot?: Record<string, any>;
  change_log?: string;
  created_by?: number;
  created_at: string;

  // 关联信息
  template?: RoleTemplate;
  created_by_user?: {
    id: number;
    username: string;
    name?: string;
  };
}

// API 请求类型
export interface CreateRoleTemplateRequest {
  template_code: string;
  template_name: string;
  template_description?: string;
  category: TemplateCategory;
  industry?: string;
  department?: string;
  parent_template_id?: number;
  configuration?: Record<string, any>;
  metadata?: Record<string, any>;
  permissions?: number[]; // 权限ID列表
  tags?: string[]; // 标签名称列表
}

export interface UpdateRoleTemplateRequest {
  template_name?: string;
  template_description?: string;
  category?: TemplateCategory;
  industry?: string;
  department?: string;
  is_active?: boolean;
  configuration?: Record<string, any>;
  metadata?: Record<string, any>;
  permissions?: number[]; // 权限ID列表
  tags?: string[]; // 标签名称列表
  change_log?: string; // 更新日志
}

export interface ApplyTemplateToRoleRequest {
  role_id: number;
  customizations?: Record<string, any>;
  override_existing?: boolean; // 是否覆盖现有权限
}

export interface CloneTemplateRequest {
  new_template_code: string;
  new_template_name: string;
  template_description?: string;
  category?: TemplateCategory;
  inherit_permissions?: boolean; // 是否继承权限
  inherit_tags?: boolean; // 是否继承标签
  customizations?: Record<string, any>;
}

// API 响应类型
export interface RoleTemplateResponse {
  success: boolean;
  message?: string;
  data?: RoleTemplate;
  error?: string;
}

export interface RoleTemplateListResponse {
  success: boolean;
  message?: string;
  data?: {
    templates: RoleTemplate[];
    total: number;
    page: number;
    page_size: number;
  };
  error?: string;
}

export interface TemplatePermissionsResponse {
  success: boolean;
  message?: string;
  data?: {
    template: RoleTemplate;
    permissions: RoleTemplatePermission[];
    available_permissions: any[]; // 可选权限列表
  };
  error?: string;
}

// 查询参数类型
export interface RoleTemplateListParams {
  page?: number;
  page_size?: number;
  category?: TemplateCategory;
  industry?: string;
  department?: string;
  is_active?: boolean;
  is_system_template?: boolean;
  search?: string; // 搜索模板名称或描述
  tags?: string[]; // 标签过滤
  level?: number; // 模板级别
  parent_template_id?: number; // 父模板过滤
}

// 模板统计数据类型
export interface RoleTemplateStats {
  total_templates: number;
  system_templates: number;
  business_templates: number;
  custom_templates: number;
  active_templates: number;
  inactive_templates: number;
  template_usage_count: number;
  most_used_templates: Array<{
    template: RoleTemplate;
    usage_count: number;
  }>;
  templates_by_category: Record<TemplateCategory, number>;
  templates_by_level: Record<number, number>;
}

// UI 相关类型
export interface RoleTemplateFormData {
  template_code: string;
  template_name: string;
  template_description: string;
  category: TemplateCategory;
  industry: string;
  department: string;
  parent_template_id: number | null;
  configuration: Record<string, any>;
  metadata: Record<string, any>;
  selectedPermissions: number[];
  tags: string[];
}

export interface RoleTemplateFilters {
  category: TemplateCategory | '';
  industry: string;
  department: string;
  is_active: boolean | null;
  is_system_template: boolean | null;
  search: string;
  tags: string[];
  level: number | null;
}

// 表格列配置
export interface RoleTemplateTableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  sorter?: boolean;
  filterable?: boolean;
  render?: (value: any, record: RoleTemplate) => React.ReactNode;
}

// 权限选择器相关类型
export interface PermissionGroup {
  category: string;
  permissions: Array<{
    id: number;
    permission_code: string;
    permission_name: string;
    description?: string;
    is_required?: boolean;
    is_default?: boolean;
  }>;
}

// 模板应用结果
export interface TemplateApplyResult {
  success: boolean;
  message?: string;
  applied_permissions: number;
  skipped_permissions: number;
  conflicts?: Array<{
    permission_id: number;
    permission_name: string;
    reason: string;
  }>;
}

export default RoleTemplate;
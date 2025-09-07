// Enterprise types based on the new Enterprise API system

// Base Enterprise interface
export interface Enterprise {
  id: number;
  name: string;
  code: string;
  description?: string;
  industry_type?: string;
  industry_type_text?: string;
  business_type: 'individual' | 'partnership' | 'corporation' | 'llc';
  business_type_text: string;
  registration_number?: string;
  tax_id?: string;
  legal_representative?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  website?: string;
  status: 'active' | 'inactive' | 'suspended';
  status_text: string;
  user_count?: number;
  department_count?: number;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

// Enterprise request for create operations
export interface EnterpriseRequest {
  name: string;
  code: string;
  description?: string;
  industry_type?: string;
  business_type: 'individual' | 'partnership' | 'corporation' | 'llc';
  registration_number?: string;
  tax_id?: string;
  legal_representative?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  website?: string;
  status: 'active' | 'inactive' | 'suspended';
}

// Enterprise update request (all fields optional)
export interface EnterpriseUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  industry_type?: string;
  business_type?: 'individual' | 'partnership' | 'corporation' | 'llc';
  registration_number?: string;
  tax_id?: string;
  legal_representative?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  website?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

// Enterprise User interface
export interface EnterpriseUser {
  id: number;
  enterprise_id: number;
  username: string;
  email?: string;
  name: string;
  phone?: string;
  position?: string;
  department_id?: number;
  department_name?: string;
  is_primary_contact: boolean;
  access_level: number;
  status: 'active' | 'inactive' | 'suspended';
  status_text: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Enterprise User request
export interface EnterpriseUserRequest {
  username: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department_id?: number;
  is_primary_contact?: boolean;
  access_level?: number;
  status?: 'active' | 'inactive' | 'suspended';
}

// Enterprise Department interface
export interface EnterpriseDepartment {
  id: number;
  enterprise_id: number;
  name: string;
  code?: string;
  description?: string;
  parent_id?: number;
  parent_name?: string;
  level: number;
  path?: string;
  status: 'active' | 'inactive';
  status_text: string;
  user_count: number;
  created_at: string;
  updated_at: string;
  children?: EnterpriseDepartment[];
}

// Enterprise Department request
export interface EnterpriseDepartmentRequest {
  name: string;
  code?: string;
  description?: string;
  parent_id?: number;
  status?: 'active' | 'inactive';
}

// Enterprise statistics
export interface EnterpriseStats {
  total_enterprises: number;
  active_enterprises: number;
  inactive_enterprises: number;
  suspended_enterprises: number;
  total_users: number;
  total_departments: number;
  enterprises_by_business_type: Array<{
    business_type: string;
    count: number;
  }>;
  enterprises_by_industry: Array<{
    industry_type: string;
    count: number;
  }>;
}

// Pagination interface
export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

// Filter interfaces
export interface EnterpriseFilter {
  status?: string;
  business_type?: string;
  industry_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface EnterpriseUserFilter {
  status?: string;
  access_level?: number;
  department_id?: number;
  is_primary_contact?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface EnterpriseDepartmentFilter {
  status?: string;
  parent_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

// Form data interfaces for UI forms
export interface EnterpriseFormData extends Omit<EnterpriseRequest, ''> {
  // All fields already optional or required as needed
}

export interface EnterpriseUserFormData extends EnterpriseUserRequest {
  // Add any UI-specific fields if needed
}

export interface EnterpriseDepartmentFormData extends EnterpriseDepartmentRequest {
  // Add any UI-specific fields if needed
}

// Select options for dropdowns
export interface SelectOption {
  value: string | number;
  label: string;
}

// Business type options
export const BUSINESS_TYPE_OPTIONS: SelectOption[] = [
  { value: 'individual', label: '个人' },
  { value: 'partnership', label: '合伙制' },
  { value: 'corporation', label: '股份制' },
  { value: 'llc', label: '有限责任公司' }
];

// Status options
export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '非活跃' },
  { value: 'suspended', label: '暂停' }
];

// User status options
export const USER_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '非活跃' },
  { value: 'suspended', label: '暂停' }
];

// Access level options
export const ACCESS_LEVEL_OPTIONS: SelectOption[] = [
  { value: 1, label: '基础权限' },
  { value: 2, label: '一般权限' },
  { value: 3, label: '中级权限' },
  { value: 4, label: '高级权限' },
  { value: 5, label: '最高权限' }
];

// Department status options
export const DEPARTMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '非活跃' }
];

// Enterprise table display interface
export interface EnterpriseTableData extends Enterprise {
  business_type_display?: string;
  status_display?: string;
  user_count_display?: string;
  department_count_display?: string;
  created_at_display?: string;
  updated_at_display?: string;
}

// Enterprise user table display interface
export interface EnterpriseUserTableData extends EnterpriseUser {
  access_level_display?: string;
  status_display?: string;
  last_login_display?: string;
  created_at_display?: string;
}

// Enterprise department table display interface
export interface EnterpriseDepartmentTableData extends EnterpriseDepartment {
  level_display?: string;
  status_display?: string;
  user_count_display?: string;
  created_at_display?: string;
}

// Common industry types (can be extended)
export const INDUSTRY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'technology', label: '科技' },
  { value: 'finance', label: '金融' },
  { value: 'healthcare', label: '医疗健康' },
  { value: 'education', label: '教育' },
  { value: 'manufacturing', label: '制造业' },
  { value: 'retail', label: '零售' },
  { value: 'real_estate', label: '房地产' },
  { value: 'consulting', label: '咨询' },
  { value: 'media', label: '媒体' },
  { value: 'other', label: '其他' }
];

// Response types for specific operations
export interface CreateEnterpriseUserResponse {
  user: EnterpriseUser;
  generated_password?: string;
}

export interface BatchOperationResult {
  success_count: number;
  error_count: number;
  errors: string[];
}

// Error handling
export interface EnterpriseApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Enterprise context for React context
export interface EnterpriseContextType {
  currentEnterprise: Enterprise | null;
  setCurrentEnterprise: (enterprise: Enterprise | null) => void;
  enterprises: Enterprise[];
  loading: boolean;
  error: string | null;
  refreshEnterprises: () => Promise<void>;
}
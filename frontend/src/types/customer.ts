// Base customer interface
export interface Customer {
  id: number;
  name: string;
  company: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  status: 'active' | 'inactive' | 'potential' | 'closed';
  priority: 'high' | 'medium' | 'low';
  contractValue?: number;
  startDate?: string;
  endDate?: string;
  customFields?: Record<string, any>;
  createdBy: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// Customer request for create/update operations
export interface CustomerRequest {
  name: string;
  company: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  status: 'active' | 'inactive' | 'potential' | 'closed';
  priority: 'high' | 'medium' | 'low';
  contractValue?: number;
  startDate?: string;
  endDate?: string;
  customFields?: Record<string, any>;
}

// Customer user association
export interface CustomerUser {
  id: number;
  customerId: number;
  userId: number;
  role: 'contact' | 'manager' | 'viewer' | 'admin';
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

// Customer user request
export interface CustomerUserRequest {
  userId: number;
  role: 'contact' | 'manager' | 'viewer' | 'admin';
  isPrimary?: boolean;
  permissions?: Record<string, any>;
  accessLevel?: number;
}

// Customer contact record
export interface CustomerContact {
  id: number;
  customerId: number;
  contactType: 'email' | 'phone' | 'meeting' | 'visit' | 'other';
  subject?: string;
  content?: string;
  contactDate: string;
  nextContactDate?: string;
  status: 'planned' | 'completed' | 'cancelled';
  result?: string;
  contactedBy?: number;
  createdAt: string;
  updatedAt: string;
}

// Customer contact request
export interface CustomerContactRequest {
  contactType: 'email' | 'phone' | 'meeting' | 'visit' | 'other';
  subject?: string;
  content?: string;
  contactDate?: string;
  nextContactDate?: string;
  status: 'planned' | 'completed' | 'cancelled';
  result?: string;
}

// Customer filter options
export interface CustomerFilter {
  status?: string;
  priority?: string;
  industry?: string;
  search?: string;
}

// Customer statistics
export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  potentialCustomers: number;
  closedCustomers: number;
  highPriorityCustomers: number;
  mediumPriorityCustomers: number;
  lowPriorityCustomers: number;
  totalContractValue: number;
  averageContractValue: number;
  byIndustry: Array<{
    industry: string;
    count: number;
    percentage: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byPriority: Array<{
    priority: string;
    count: number;
    percentage: number;
  }>;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// Pagination metadata
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T;
  pagination: Pagination;
}

// Generic API response
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string>;
}

// Customer form data for forms
export interface CustomerFormData extends Omit<CustomerRequest, 'startDate' | 'endDate' | 'contractValue'> {
  startDate?: Date | null;
  endDate?: Date | null;
  contractValue?: number | null;
}

// Customer table data for display
export interface CustomerTableData extends Customer {
  contractValueFormatted?: string;
  statusLabel?: string;
  priorityLabel?: string;
  daysSinceCreated?: number;
  daysToEndDate?: number;
}
// Company interfaces for enterprise customer model

// Base company interface
export interface Company {
  id: number;
  companyName: string;
  companyCode?: string;
  industry?: string;
  companyType: 'limited_company' | 'joint_stock' | 'individual' | 'partnership';
  companyTypeText: string;
  businessLicense?: string;
  taxNumber?: string;
  legalRepresentative?: string;
  
  // Contact information
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  website?: string;
  mainPhone?: string;
  mainEmail?: string;
  
  // Business information
  status: 'active' | 'inactive' | 'potential' | 'suspended';
  statusText: string;
  priority: 'high' | 'medium' | 'low';
  priorityText: string;
  annualContractValue?: number;
  totalContractValue?: number;
  startDate?: string;
  
  // Company scale
  employeeCount?: number;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  companySizeText?: string;
  
  // Metadata
  createdBy: number;
  createdByName?: string;
  updatedBy?: number;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  userCount?: number;
  projectCount?: number;
  contractCount?: number;
  lastContactDate?: string;
}

// Company request for create/update operations
export interface CompanyRequest {
  companyName: string;
  companyCode?: string;
  industry?: string;
  companyType: 'limited_company' | 'joint_stock' | 'individual' | 'partnership';
  businessLicense?: string;
  taxNumber?: string;
  legalRepresentative?: string;
  
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  website?: string;
  mainPhone?: string;
  mainEmail?: string;
  
  status: 'active' | 'inactive' | 'potential' | 'suspended';
  priority: 'high' | 'medium' | 'low';
  annualContractValue?: number;
  startDate?: string;
  
  employeeCount?: number;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
}

// Company user (employees within the company)
export interface CompanyUser {
  id: number;
  customerId: number;
  companyName?: string;
  
  name: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  workPhone?: string;
  
  role: 'primary_contact' | 'technical_contact' | 'decision_maker' | 'finance_contact' | 'normal';
  roleText: string;
  isPrimaryContact: boolean;
  canMakeDecisions: boolean;
  accessLevel: number;
  accessLevelText: string;
  
  status: 'active' | 'inactive' | 'left';
  statusText: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Company user request
export interface CompanyUserRequest {
  customerId: number;
  name: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  workPhone?: string;
  
  role: 'primary_contact' | 'technical_contact' | 'decision_maker' | 'finance_contact' | 'normal';
  isPrimaryContact: boolean;
  canMakeDecisions: boolean;
  accessLevel: number;
  
  status: 'active' | 'inactive' | 'left';
  notes?: string;
}

// Company contact record
export interface CompanyContact {
  id: number;
  customerId: number;
  companyUserID?: number;
  
  contactType: 'email' | 'phone' | 'meeting' | 'visit' | 'video_call' | 'other';
  subject?: string;
  content?: string;
  
  contactDate: string;
  nextContactDate?: string;
  
  status: 'planned' | 'completed' | 'cancelled' | 'rescheduled';
  result?: 'positive' | 'neutral' | 'negative' | 'no_response' | 'follow_up_needed';
  followUpRequired: boolean;
  
  relatedProjectId?: number;
  relatedContractId?: number;
  
  contactedBy?: number;
  createdAt: string;
  updatedAt: string;
  
  // Related data for display
  companyUserName?: string;
  contactedByName?: string;
}

// Company contact request
export interface CompanyContactRequest {
  customerId: number;
  companyUserID?: number;
  
  contactType: 'email' | 'phone' | 'meeting' | 'visit' | 'video_call' | 'other';
  subject?: string;
  content?: string;
  
  contactDate?: string;
  nextContactDate?: string;
  
  status: 'planned' | 'completed' | 'cancelled' | 'rescheduled';
  result?: 'positive' | 'neutral' | 'negative' | 'no_response' | 'follow_up_needed';
  followUpRequired: boolean;
  
  relatedProjectId?: number;
  relatedContractId?: number;
}

// Company filter options
export interface CompanyFilter {
  status?: string;
  priority?: string;
  industry?: string;
  search?: string;
}

// Industry statistics
export interface IndustryStats {
  industry: string;
  count: number;
  percentage: number;
  revenue: number;
}

// Status statistics
export interface StatusStats {
  status: string;
  count: number;
  percentage: number;
}

// Priority statistics
export interface PriorityStats {
  priority: string;
  count: number;
  percentage: number;
}

// Company size statistics
export interface CompanySizeStats {
  companySize: string;
  count: number;
  percentage: number;
}

// Company statistics
export interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  potentialCompanies: number;
  suspendedCompanies: number;
  highPriorityCompanies: number;
  mediumPriorityCompanies: number;
  lowPriorityCompanies: number;
  totalAnnualContractValue: number;
  averageAnnualContractValue: number;
  byIndustry: IndustryStats[];
  byStatus: StatusStats[];
  byPriority: PriorityStats[];
  byCompanySize: CompanySizeStats[];
}

// Company form data for forms
export interface CompanyFormData extends Omit<CompanyRequest, 'startDate' | 'annualContractValue'> {
  startDate?: Date | null;
  annualContractValue?: number | null;
}

// Company table data for display
export interface CompanyTableData extends Company {
  annualContractValueFormatted?: string;
  statusLabel?: string;
  priorityLabel?: string;
  companySizeLabel?: string;
  daysSinceCreated?: number;
  daysToStartDate?: number;
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

// Company response types
export type CompanyResponse = Company;
export type CompanyUserResponse = CompanyUser;
export type CompanyContactResponse = CompanyContact;
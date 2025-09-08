/**
 * 测试数据工厂
 * 提供一致的Mock数据生成方法
 */

// 基础类型工厂
export const createMockId = () => Math.floor(Math.random() * 10000) + 1;
export const createMockDate = (daysAgo = 0) => 
  new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

// 用户数据工厂
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: createMockId(),
  username: 'testuser',
  email: 'test@example.com',
  name: '测试用户',
  role: 'user',
  status: 'active',
  created_at: createMockDate(30),
  updated_at: createMockDate(0),
  ...overrides
});

// 项目数据工厂
export const createMockProject = (overrides: Partial<any> = {}) => ({
  id: createMockId(),
  name: '测试项目',
  description: '项目描述',
  status: 'active',
  created_by: createMockId(),
  created_at: createMockDate(7),
  updated_at: createMockDate(0),
  due_date: createMockDate(-30),
  ...overrides
});

// 任务数据工厂
export const createMockTask = (overrides: Partial<any> = {}) => ({
  id: createMockId(),
  project_id: createMockId(),
  title: '测试任务',
  description: '任务描述',
  status: 'todo',
  priority: 'medium',
  assignee_id: createMockId(),
  created_by: createMockId(),
  created_at: createMockDate(3),
  updated_at: createMockDate(0),
  due_date: createMockDate(-7),
  estimated_hours: 8,
  actual_hours: 0,
  parent_id: null,
  task_level: 1,
  sort_order: 0,
  tags: ['测试', '开发'],
  custom_fields: {},
  ...overrides
});

// 企业数据工厂
export const createMockEnterprise = (overrides: Partial<any> = {}) => ({
  id: createMockId(),
  name: '测试企业',
  code: 'TEST_CORP',
  description: '测试企业描述',
  industry_type: 'technology',
  business_type: 'saas',
  status: 'active',
  contact_person: '联系人',
  contact_phone: '13800138000',
  contact_email: 'contact@test.com',
  address: '测试地址',
  created_at: createMockDate(30),
  updated_at: createMockDate(0),
  ...overrides
});

// 文档数据工厂
export const createMockDocument = (overrides: Partial<any> = {}) => ({
  id: createMockId(),
  title: '测试文档',
  content: '# 测试文档内容\n\n这是一个测试文档。',
  project_id: createMockId(),
  task_id: createMockId(),
  created_by: createMockId(),
  created_at: createMockDate(1),
  updated_at: createMockDate(0),
  status: 'draft',
  version: 1,
  ...overrides
});

// JWT Token工厂
export const createMockJWT = (payload: any = {}) => {
  const defaultPayload = {
    user_id: createMockId(),
    username: 'testuser',
    role: 'user',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
    iat: Math.floor(Date.now() / 1000),
    ...payload
  };
  
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = btoa(JSON.stringify(defaultPayload));
  const signature = 'mock-signature';
  
  return `${header}.${payloadEncoded}.${signature}`;
};

// API响应工厂
export const createMockApiResponse = <T>(data: T, overrides: Partial<any> = {}) => ({
  success: true,
  message: 'Success',
  data,
  timestamp: new Date().toISOString(),
  ...overrides
});

export const createMockApiError = (message = 'Error occurred', code = 'GENERAL_ERROR') => ({
  success: false,
  message,
  error: {
    code,
    message,
    timestamp: new Date().toISOString()
  }
});

// 分页响应工厂
export const createMockPaginatedResponse = <T>(
  items: T[], 
  page = 1, 
  pageSize = 10, 
  total?: number
) => ({
  data: items,
  pagination: {
    page,
    pageSize,
    total: total ?? items.length,
    totalPages: Math.ceil((total ?? items.length) / pageSize)
  }
});

// 批量数据生成
export const createMockArray = <T>(
  factory: (overrides?: any) => T,
  count: number,
  overridesArray?: any[]
): T[] => {
  return Array.from({ length: count }, (_, index) => 
    factory(overridesArray?.[index] || {})
  );
};
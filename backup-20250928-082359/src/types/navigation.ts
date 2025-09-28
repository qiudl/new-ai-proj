// 导航菜单管理相关类型定义

export interface MenuItem {
  id: string;
  key: string;
  icon?: string;
  label: string;
  path?: string;
  parent_id?: string;
  sort_order: number;
  is_visible: boolean;
  is_enabled: boolean;
  permission?: string;
  component?: string;
  children?: MenuItem[];
  created_at?: string;
  updated_at?: string;
}

export interface MenuItemRequest {
  key: string;
  icon?: string;
  label: string;
  path?: string;
  parent_id?: string;
  sort_order: number;
  is_visible: boolean;
  is_enabled: boolean;
  permission?: string;
  component?: string;
}

export interface MenuGroup {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  menu_items: MenuItem[];
  created_at?: string;
  updated_at?: string;
}

export interface RouteConfig {
  id: string;
  path: string;
  component: string;
  exact?: boolean;
  menu_item_id?: string;
  is_protected: boolean;
  permission?: string;
  redirect?: string;
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface MenuPermission {
  id: string;
  menu_item_id: string;
  role: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NavigationConfig {
  menus: MenuGroup[];
  routes: RouteConfig[];
  permissions: MenuPermission[];
}

// 图标配置
export interface IconOption {
  name: string;
  component: string;
  category: string;
}

// 预设的图标选项
export const ICON_OPTIONS: IconOption[] = [
  // 基础图标
  { name: 'DashboardOutlined', component: 'DashboardOutlined', category: '基础' },
  { name: 'ProjectOutlined', component: 'ProjectOutlined', category: '基础' },
  { name: 'UserOutlined', component: 'UserOutlined', category: '基础' },
  { name: 'TeamOutlined', component: 'TeamOutlined', category: '基础' },
  { name: 'SettingOutlined', component: 'SettingOutlined', category: '基础' },
  
  // 文件相关
  { name: 'FileTextOutlined', component: 'FileTextOutlined', category: '文件' },
  { name: 'FolderOutlined', component: 'FolderOutlined', category: '文件' },
  { name: 'FileOutlined', component: 'FileOutlined', category: '文件' },
  { name: 'FilePdfOutlined', component: 'FilePdfOutlined', category: '文件' },
  { name: 'FileImageOutlined', component: 'FileImageOutlined', category: '文件' },
  
  // 工具相关
  { name: 'ToolOutlined', component: 'ToolOutlined', category: '工具' },
  { name: 'BugOutlined', component: 'BugOutlined', category: '工具' },
  { name: 'CodeOutlined', component: 'CodeOutlined', category: '工具' },
  { name: 'ApiOutlined', component: 'ApiOutlined', category: '工具' },
  { name: 'DatabaseOutlined', component: 'DatabaseOutlined', category: '工具' },
  
  // 业务相关
  { name: 'ShopOutlined', component: 'ShopOutlined', category: '业务' },
  { name: 'CustomerServiceOutlined', component: 'CustomerServiceOutlined', category: '业务' },
  { name: 'MoneyCollectOutlined', component: 'MoneyCollectOutlined', category: '业务' },
  { name: 'CreditCardOutlined', component: 'CreditCardOutlined', category: '业务' },
  
  // 系统相关
  { name: 'SafetyOutlined', component: 'SafetyOutlined', category: '系统' },
  { name: 'SecurityScanOutlined', component: 'SecurityScanOutlined', category: '系统' },
  { name: 'AuditOutlined', component: 'AuditOutlined', category: '系统' },
  { name: 'DeleteOutlined', component: 'DeleteOutlined', category: '系统' },
  { name: 'RobotOutlined', component: 'RobotOutlined', category: '系统' },
  
  // 操作相关
  { name: 'PlusOutlined', component: 'PlusOutlined', category: '操作' },
  { name: 'EditOutlined', component: 'EditOutlined', category: '操作' },
  { name: 'SaveOutlined', component: 'SaveOutlined', category: '操作' },
  { name: 'ImportOutlined', component: 'ImportOutlined', category: '操作' },
  { name: 'ExportOutlined', component: 'ExportOutlined', category: '操作' },
  
  // 时间相关
  { name: 'CalendarOutlined', component: 'CalendarOutlined', category: '时间' },
  { name: 'ClockCircleOutlined', component: 'ClockCircleOutlined', category: '时间' },
  { name: 'HistoryOutlined', component: 'HistoryOutlined', category: '时间' },
  
  // 列表相关
  { name: 'UnorderedListOutlined', component: 'UnorderedListOutlined', category: '列表' },
  { name: 'OrderedListOutlined', component: 'OrderedListOutlined', category: '列表' },
  { name: 'AppstoreOutlined', component: 'AppstoreOutlined', category: '列表' },
  { name: 'TableOutlined', component: 'TableOutlined', category: '列表' },
];

// 组件配置
export interface ComponentOption {
  name: string;
  path: string;
  description: string;
  category: string;
}

// 预设的组件选项
export const COMPONENT_OPTIONS: ComponentOption[] = [
  // 页面组件
  { name: 'DashboardPage', path: './pages/DashboardPage', description: '仪表板页面', category: '主页面' },
  { name: 'ProjectsPage', path: './pages/ProjectsPage', description: '项目列表页面', category: '主页面' },
  { name: 'TasksPage', path: './pages/TasksPage', description: '任务列表页面', category: '主页面' },
  { name: 'UserManagementPage', path: './pages/UserManagementPage', description: '用户管理页面', category: '主页面' },
  { name: 'CompanyListPage', path: './pages/CompanyListPage', description: '企业列表页面', category: '主页面' },
  
  // 管理页面
  { name: 'PermissionManagementPage', path: './pages/PermissionManagementPage', description: '权限管理页面', category: '管理' },
  { name: 'AIConfigPage', path: './pages/AIConfigPage', description: 'AI配置页面', category: '管理' },
  { name: 'RecycleBinPage', path: './pages/RecycleBinPage', description: '回收站页面', category: '管理' },
  { name: 'AuditLogPage', path: './pages/AuditLogPage', description: '审计日志页面', category: '管理' },
  
  // 文档相关
  { name: 'DocumentManagerPage', path: './pages/DocumentManagerPage', description: '文档管理页面', category: '文档' },
  { name: 'TaskDocumentListPage', path: './pages/TaskDocumentListPage', description: '任务文档页面', category: '文档' },
  { name: 'DocumentEditorPage', path: './pages/DocumentEditorPage', description: '文档编辑页面', category: '文档' },
  
  // 报表相关
  { name: 'TimeWeeklyReportPage', path: './pages/TimeWeeklyReportPage', description: '时间周报页面', category: '报表' },
  { name: 'TaskDashboardPage', path: './pages/TaskDashboardPage', description: '任务周报页面', category: '报表' },
  { name: 'TimeAnalysisPage', path: './pages/TimeAnalysisPage', description: '时间分析页面', category: '报表' },
  
  // 工具页面
  { name: 'BulkImportPage', path: './pages/BulkImportPage', description: '批量导入页面', category: '工具' },
  { name: 'UserProfilePage', path: './pages/UserProfilePage', description: '用户资料页面', category: '工具' },
];

// 权限级别
export const PERMISSION_LEVELS = [
  { value: 'public', label: '公开访问', description: '所有用户都可以访问' },
  { value: 'authenticated', label: '登录用户', description: '需要登录才能访问' },
  { value: 'admin', label: '管理员', description: '仅管理员可以访问' },
  { value: 'super_admin', label: '超级管理员', description: '仅超级管理员可以访问' },
  { value: 'custom', label: '自定义权限', description: '根据具体权限配置' },
];

// 菜单类型
export const MENU_TYPES = [
  { value: 'page', label: '页面菜单', description: '链接到具体页面' },
  { value: 'group', label: '分组菜单', description: '包含子菜单的分组' },
  { value: 'link', label: '外部链接', description: '跳转到外部URL' },
  { value: 'action', label: '操作菜单', description: '触发特定操作' },
];
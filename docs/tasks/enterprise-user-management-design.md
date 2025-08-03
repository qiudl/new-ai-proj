# 企业客户用户管理功能设计文档（简化版）

## 1. 业务背景

### 1.1 业务场景
本项目管理平台为甲方企业客户提供项目管理服务。企业用户是委托项目的甲方客户，用于：
- 查看项目进展和状态
- 查看/下载项目相关文档  
- 创建任务并指派给乙方项目经理
- 监控项目时间统计

### 1.2 用户角色
**系统用户（乙方团队）：**
- `admin`：系统管理员
- `project_manager`：项目经理  
- `developer`：开发工程师

**企业用户（甲方客户）：**
- `company_admin`：企业用户（统一角色），拥有企业项目的完整访问权限

## 2. 企业用户权限

### 2.1 company_admin 权限范围
- ✅ 查看企业所有项目的进展和详情
- ✅ 查看/下载所有项目文档
- ✅ 创建任务并指派给项目经理
- ✅ 查看项目时间统计和进度报告
- ✅ 接收项目关键节点通知

## 3. 数据库设计

### 3.1 用户表扩展（基于现有users表）

```sql
-- 扩展现有users表，添加企业用户相关字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS
    contact_person_name VARCHAR(100),        -- 联系人真实姓名
    contact_phone VARCHAR(50),               -- 联系电话
    department_title VARCHAR(100),           -- 职务/部门
    is_primary_contact BOOLEAN DEFAULT FALSE, -- 是否企业主要联系人
    account_expires_at TIMESTAMPTZ,          -- 账号过期时间
    last_project_access TIMESTAMPTZ,         -- 最后访问项目时间
    notes TEXT;                              -- 备注信息

-- 添加约束：企业用户必须关联企业
ALTER TABLE users ADD CONSTRAINT users_company_check 
CHECK (
    (user_type = 'system' AND company_id IS NULL) OR
    (user_type = 'company' AND company_id IS NOT NULL AND role = 'company_admin')
);
```

## 4. API接口设计

### 4.1 企业用户管理接口

#### 创建企业用户
```http
POST /admin/company-users
Content-Type: application/json

{
    "company_id": 1,
    "username": "client_user1",
    "email": "user@company.com",
    "contact_person_name": "张三",
    "contact_phone": "13800138000", 
    "department_title": "技术总监",
    "is_primary_contact": true,
    "account_expires_at": "2024-12-31T23:59:59Z",
    "notes": "主要技术对接人"
}
```

#### 获取企业用户列表
```http
GET /admin/company-users?company_id=1&status=active

Response:
{
    "data": [
        {
            "id": 10,
            "username": "client_user1",
            "email": "user@company.com",
            "contact_person_name": "张三",
            "contact_phone": "13800138000",
            "department_title": "技术总监", 
            "is_primary_contact": true,
            "status": "active",
            "company_id": 1,
            "company_name": "ABC科技有限公司",
            "last_login_at": "2024-01-15T10:30:00Z",
            "created_at": "2024-01-01T09:00:00Z"
        }
    ],
    "total": 3,
    "page": 1,
    "page_size": 20
}
```

#### 更新企业用户
```http
PUT /admin/company-users/{user_id}
Content-Type: application/json

{
    "contact_person_name": "张三",
    "contact_phone": "13800138001",
    "department_title": "CTO",
    "is_primary_contact": true,
    "account_expires_at": "2025-12-31T23:59:59Z",
    "status": "active",
    "notes": "更新后的备注"
}
```

#### 停用/启用企业用户
```http
PUT /admin/company-users/{user_id}/status
Content-Type: application/json

{
    "status": "inactive"  // active | inactive
}
```

## 5. 前端界面设计

### 5.1 企业用户管理页面

#### 页面结构
```
企业用户管理
├── 操作栏
│   ├── 新建用户按钮
│   └── 搜索框
├── 筛选器
│   ├── 企业选择器
│   └── 状态筛选
└── 用户列表表格
    ├── 用户信息列（姓名、用户名、邮箱）
    ├── 联系方式列（电话、职务）
    ├── 企业信息列（企业名称、主要联系人）
    ├── 状态列（活跃状态、最后登录）
    └── 操作列（编辑、停用/启用）
```

### 5.2 企业用户表单组件

```typescript
interface CompanyUserForm {
    // 基本信息
    companyId: number;
    username: string;
    email: string;
    
    // 联系信息  
    contactPersonName: string;
    contactPhone: string;
    departmentTitle: string;
    isPrimaryContact: boolean;
    
    // 账号设置
    accountExpiresAt?: string;
    notes?: string;
}
```

### 5.3 企业用户列表组件

```typescript
interface CompanyUser {
    id: number;
    username: string;
    email: string;
    contactPersonName: string;
    contactPhone: string;
    departmentTitle: string;
    isPrimaryContact: boolean;
    status: 'active' | 'inactive';
    companyId: number;
    companyName: string;
    lastLoginAt?: string;
    accountExpiresAt?: string;
    createdAt: string;
}

interface CompanyUserList {
    users: CompanyUser[];
    total: number;
    onEdit: (userId: number) => void;
    onToggleStatus: (userId: number, status: string) => void;
    onDelete: (userId: number) => void;
}
```

## 6. 业务流程

### 6.1 企业用户创建流程
1. **选择企业**：从现有企业列表选择
2. **填写用户信息**：用户名、邮箱、联系方式、职务
3. **账号设置**：设置有效期、备注信息
4. **创建账号**：系统生成初始密码并发送通知邮件
5. **首次登录**：企业用户登录后强制修改密码

### 6.2 日常管理流程
1. **查看用户列表**：按企业查看所有企业用户
2. **更新用户信息**：修改联系方式、职务等信息
3. **状态管理**：根据项目情况启用/停用账号
4. **权限确认**：企业用户自动拥有该企业所有项目的访问权限

### 6.3 项目协作流程
1. **项目启动**：企业用户自动获得项目访问权限
2. **查看进展**：登录系统查看项目进度和任务状态
3. **创建任务**：发现新需求时创建任务指派给项目经理
4. **文档查看**：查看和下载项目相关文档
5. **项目完成**：项目结束后保留查看权限用于验收

## 7. 后端实现要点

### 7.1 Service层实现

```go
// CompanyUserService 企业用户服务
type CompanyUserService struct {
    userRepo    *database.UserRepository
    companyRepo *database.CompanyRepository
}

// CreateCompanyUser 创建企业用户
func (s *CompanyUserService) CreateCompanyUser(ctx context.Context, req *models.CompanyUserCreateRequest) (*models.User, error) {
    // 1. 验证企业是否存在
    company, err := s.companyRepo.GetByID(ctx, req.CompanyID)
    if err != nil {
        return nil, fmt.Errorf("company not found: %w", err)
    }
    
    // 2. 生成初始密码
    initialPassword := generateRandomPassword()
    passwordHash, err := bcrypt.GenerateFromPassword([]byte(initialPassword), bcrypt.DefaultCost)
    if err != nil {
        return nil, fmt.Errorf("failed to hash password: %w", err)
    }
    
    // 3. 创建用户
    user := &models.User{
        Username:           req.Username,
        Email:              req.Email,
        PasswordHash:       string(passwordHash),
        UserType:           "company",
        CompanyID:          &req.CompanyID,
        Role:               "company_admin",
        Status:             "active",
        ContactPersonName:  req.ContactPersonName,
        ContactPhone:       req.ContactPhone,
        DepartmentTitle:    req.DepartmentTitle,
        IsPrimaryContact:   req.IsPrimaryContact,
        AccountExpiresAt:   req.AccountExpiresAt,
        Notes:              req.Notes,
    }
    
    createdUser, err := s.userRepo.Create(ctx, user)
    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }
    
    // 4. 发送通知邮件
    err = s.sendWelcomeEmail(createdUser, initialPassword)
    if err != nil {
        // 记录日志，但不影响创建流程
        log.Printf("Failed to send welcome email: %v", err)
    }
    
    return createdUser, nil
}
```

### 7.2 权限验证中间件

```go
// CompanyUserPermissionMiddleware 企业用户权限验证
func CompanyUserPermissionMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := getUserIDFromToken(c)
        user, err := getUserByID(userID)
        if err != nil {
            c.JSON(401, gin.H{"error": "Unauthorized"})
            c.Abort()
            return
        }
        
        // 企业用户只能访问自己企业的项目
        if user.UserType == "company" {
            projectID := getProjectIDFromPath(c)
            if projectID > 0 {
                if !checkCompanyProjectAccess(user.CompanyID, projectID) {
                    c.JSON(403, gin.H{"error": "Access denied"})
                    c.Abort()
                    return
                }
            }
        }
        
        c.Set("current_user", user)
        c.Next()
    }
}
```

## 8. 前端实现要点

### 8.1 企业用户管理页面组件

```typescript
const CompanyUserManagement: React.FC = () => {
    const [users, setUsers] = useState<CompanyUser[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    // 获取用户列表
    const fetchUsers = async (companyId?: number) => {
        setLoading(true);
        try {
            const params = companyId ? { company_id: companyId } : {};
            const response = await CompanyUserService.getList(params);
            setUsers(response.data);
        } catch (error) {
            message.error('获取用户列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 表格列定义
    const columns = [
        {
            title: '用户信息',
            key: 'userInfo',
            render: (record: CompanyUser) => (
                <div>
                    <div>{record.contactPersonName}</div>
                    <div className="text-gray-500">{record.username}</div>
                    <div className="text-gray-500">{record.email}</div>
                </div>
            ),
        },
        {
            title: '联系方式',
            key: 'contact',
            render: (record: CompanyUser) => (
                <div>
                    <div>{record.contactPhone}</div>
                    <div className="text-gray-500">{record.departmentTitle}</div>
                </div>
            ),
        },
        {
            title: '企业信息',
            key: 'company',
            render: (record: CompanyUser) => (
                <div>
                    <div>{record.companyName}</div>
                    {record.isPrimaryContact && (
                        <Tag color="blue">主要联系人</Tag>
                    )}
                </div>
            ),
        },
        {
            title: '状态',
            key: 'status',
            render: (record: CompanyUser) => (
                <div>
                    <Badge 
                        status={record.status === 'active' ? 'success' : 'default'}
                        text={record.status === 'active' ? '正常' : '停用'}
                    />
                    {record.lastLoginAt && (
                        <div className="text-gray-500 text-xs">
                            最后登录: {formatTimeAgo(record.lastLoginAt)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: '操作',
            key: 'actions',
            render: (record: CompanyUser) => (
                <Space>
                    <Button 
                        type="link" 
                        onClick={() => handleEdit(record)}
                    >
                        编辑
                    </Button>
                    <Button 
                        type="link" 
                        onClick={() => handleToggleStatus(record)}
                    >
                        {record.status === 'active' ? '停用' : '启用'}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Card title="企业用户管理">
            <div className="mb-4 flex justify-between">
                <Space>
                    <Select
                        placeholder="选择企业"
                        style={{ width: 200 }}
                        value={selectedCompany}
                        onChange={(value) => {
                            setSelectedCompany(value);
                            fetchUsers(value);
                        }}
                        allowClear
                    >
                        {companies.map(company => (
                            <Option key={company.id} value={company.id}>
                                {company.name}
                            </Option>
                        ))}
                    </Select>
                </Space>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalVisible(true)}
                >
                    新建用户
                </Button>
            </div>
            
            <Table
                columns={columns}
                dataSource={users}
                loading={loading}
                rowKey="id"
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                }}
            />
        </Card>
    );
};
```

## 9. 实施计划

### 9.1 第一阶段：核心功能（1-2周）
- ✅ 扩展用户表结构
- ✅ 实现企业用户CRUD接口
- ✅ 开发用户管理界面
- ✅ 权限验证中间件

### 9.2 第二阶段：完善功能（1周）
- ✅ 用户状态管理
- ✅ 批量操作功能
- ✅ 邮件通知机制
- ✅ 操作日志记录

### 9.3 第三阶段：优化测试（0.5周）
- ✅ 界面优化和测试
- ✅ 性能优化
- ✅ 文档完善

---

这个简化版设计去除了复杂的权限管理，企业用户统一使用 company_admin 角色，自动拥有其企业所有项目的访问权限，大大简化了管理复杂度。
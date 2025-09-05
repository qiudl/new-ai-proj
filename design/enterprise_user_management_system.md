# 企业用户管理界面和API设计方案

**文件**: `enterprise_user_management_system.md`  
**作者**: Claude AI  
**创建时间**: 2025-09-04  
**任务**: #1213 - 设计企业用户管理界面和API  
**版本**: v1.0  

## 1. 系统概述

### 1.1 设计目标

设计一个完整的企业用户管理系统，允许企业管理员创建、管理和维护企业内部用户，包括用户创建、邀请流程、权限分配、状态管理等功能，与已设计的组织架构和角色权限系统深度集成。

### 1.2 核心功能

- **企业用户创建和邀请流程** - 支持内部创建和邮件邀请两种方式
- **用户信息管理界面** - 完整的用户资料管理和批量操作
- **用户权限分配系统** - 基于角色和组织架构的权限管理
- **用户状态管理和审计** - 用户生命周期管理和操作审计
- **组织架构集成** - 与部门、岗位管理系统深度集成

### 1.3 基于已有设计

基于前面完成的任务设计，包括：
- **任务#1210**: 企业组织架构管理模块
- **任务#1211**: 岗位管理系统
- **任务#1212**: 企业角色权限系统
- 现有的company_users表和用户管理功能

## 2. 现有用户管理系统分析

### 2.1 数据库架构分析

#### 2.1.1 当前数据表结构
```sql
-- 现有company_users表（在permission_repository.go中）
company_users (企业用户表)
├── id SERIAL PRIMARY KEY
├── user_id INTEGER -- 关联现有users表
├── name VARCHAR(100) NOT NULL
├── email VARCHAR(255) NOT NULL UNIQUE
├── role_id INTEGER REFERENCES company_roles(id)
├── department VARCHAR(100)
├── position VARCHAR(100)
├── phone VARCHAR(50)
├── avatar_url TEXT
├── status VARCHAR(20) DEFAULT 'active'
├── custom_permissions JSONB DEFAULT '{}'
├── last_login_at TIMESTAMPTZ
├── password_changed_at TIMESTAMPTZ
├── created_by INTEGER
├── created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
└── updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```

#### 2.1.2 现有功能分析
通过`company_repository.go`分析，当前系统具备：
- **用户CRUD操作** - CreateUser, GetUsers, UpdateUser, DeleteUser
- **基础用户属性** - 姓名、职位、部门、联系方式
- **简单权限管理** - role, isPrimaryContact, canMakeDecisions, accessLevel
- **用户状态管理** - active, inactive, suspended, pending

### 2.2 存在的限制和改进点

1. **组织架构集成不足** - 缺少与departments、positions表的关联
2. **邀请流程缺失** - 没有用户邀请和激活机制
3. **权限管理简化** - 权限分配不够细粒度
4. **批量操作缺失** - 缺少批量导入、导出功能
5. **审计功能不完善** - 用户操作记录不完整

## 3. 企业用户创建和邀请流程设计

### 3.1 用户创建方式

```sql
-- 扩展用户邀请和激活表
CREATE TABLE IF NOT EXISTS user_invitations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invited_by INTEGER NOT NULL REFERENCES company_users(id),
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    invitation_type VARCHAR(20) DEFAULT 'email', -- email, sms, direct
    
    -- 预设用户信息
    preset_name VARCHAR(100),
    preset_department_id INTEGER REFERENCES company_departments(id),
    preset_position_id INTEGER REFERENCES company_positions(id),
    preset_role_id INTEGER REFERENCES company_roles(id),
    
    -- 邀请状态管理
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired, cancelled
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    
    -- 激活配置
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES company_users(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(company_id, email, status)
);

-- 用户激活记录表
CREATE TABLE IF NOT EXISTS user_activations (
    id SERIAL PRIMARY KEY,
    invitation_id INTEGER NOT NULL REFERENCES user_invitations(id) ON DELETE CASCADE,
    company_user_id INTEGER REFERENCES company_users(id),
    activation_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    activated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 激活过程信息
    password_set BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    welcome_email_sent BOOLEAN DEFAULT FALSE
);
```

### 3.2 邀请流程设计

```go
// 用户邀请服务
type UserInvitationService struct {
    repo         UserRepository
    emailService EmailService
    tokenService TokenService
}

// 邀请请求结构
type SendInvitationRequest struct {
    CompanyID        int      `json:"company_id"`
    Email            string   `json:"email" validate:"required,email"`
    InvitationType   string   `json:"invitation_type"`
    PresetName       string   `json:"preset_name"`
    PresetDepartmentID *int   `json:"preset_department_id"`
    PresetPositionID   *int   `json:"preset_position_id"`
    PresetRoleID       *int   `json:"preset_role_id"`
    CustomMessage    string   `json:"custom_message"`
    ExpiresInHours   int      `json:"expires_in_hours"`
    RequiresApproval bool     `json:"requires_approval"`
}

// 邀请响应结构
type InvitationResponse struct {
    ID               int       `json:"id"`
    Email            string    `json:"email"`
    InvitationToken  string    `json:"invitation_token,omitempty"`
    Status           string    `json:"status"`
    InvitedBy        string    `json:"invited_by"`
    SentAt           time.Time `json:"sent_at"`
    ExpiresAt        time.Time `json:"expires_at"`
    PresetInfo       *PresetUserInfo `json:"preset_info,omitempty"`
}

// 预设用户信息
type PresetUserInfo struct {
    Name           string `json:"name"`
    DepartmentName string `json:"department_name"`
    PositionName   string `json:"position_name"`
    RoleName       string `json:"role_name"`
}

// 发送邀请
func (s *UserInvitationService) SendInvitation(
    ctx context.Context, 
    req *SendInvitationRequest,
) (*InvitationResponse, error) {
    
    // 1. 验证邀请权限
    if !s.canSendInvitation(ctx, req.CompanyID) {
        return nil, fmt.Errorf("无权限发送邀请")
    }
    
    // 2. 检查用户是否已存在
    existingUser, _ := s.repo.GetUserByEmail(ctx, req.CompanyID, req.Email)
    if existingUser != nil {
        return nil, fmt.Errorf("用户已存在")
    }
    
    // 3. 检查是否有待处理的邀请
    pendingInvitation, _ := s.repo.GetPendingInvitation(ctx, req.CompanyID, req.Email)
    if pendingInvitation != nil {
        return nil, fmt.Errorf("该邮箱已有待处理的邀请")
    }
    
    // 4. 生成邀请令牌
    token := s.tokenService.GenerateInvitationToken(req.Email, req.CompanyID)
    expiresAt := time.Now().Add(time.Duration(req.ExpiresInHours) * time.Hour)
    
    // 5. 创建邀请记录
    invitation := &models.UserInvitation{
        CompanyID:            req.CompanyID,
        Email:               req.Email,
        InvitationToken:     token,
        InvitationType:      req.InvitationType,
        PresetName:          req.PresetName,
        PresetDepartmentID:  req.PresetDepartmentID,
        PresetPositionID:    req.PresetPositionID,
        PresetRoleID:        req.PresetRoleID,
        Status:              "pending",
        ExpiresAt:          expiresAt,
        RequiresApproval:    req.RequiresApproval,
    }
    
    savedInvitation, err := s.repo.CreateInvitation(ctx, invitation)
    if err != nil {
        return nil, fmt.Errorf("创建邀请失败: %w", err)
    }
    
    // 6. 发送邀请邮件
    emailData := &EmailInvitationData{
        Email:         req.Email,
        CompanyName:   s.getCompanyName(ctx, req.CompanyID),
        InviterName:   s.getCurrentUserName(ctx),
        Token:         token,
        ExpiresAt:     expiresAt,
        CustomMessage: req.CustomMessage,
        AcceptURL:     s.buildAcceptURL(token),
    }
    
    if err := s.emailService.SendInvitationEmail(ctx, emailData); err != nil {
        // 邮件发送失败，但邀请记录已创建
        log.Errorf("发送邀请邮件失败: %v", err)
    }
    
    // 7. 构建响应
    response := &InvitationResponse{
        ID:              savedInvitation.ID,
        Email:           savedInvitation.Email,
        Status:          savedInvitation.Status,
        SentAt:          savedInvitation.SentAt,
        ExpiresAt:       savedInvitation.ExpiresAt,
    }
    
    return response, nil
}
```

### 3.3 用户激活流程

```go
// 用户激活服务
func (s *UserInvitationService) AcceptInvitation(
    ctx context.Context,
    token string,
    userData *UserActivationData,
) (*models.CompanyUser, error) {
    
    // 1. 验证邀请令牌
    invitation, err := s.repo.GetInvitationByToken(ctx, token)
    if err != nil {
        return nil, fmt.Errorf("无效的邀请令牌")
    }
    
    if invitation.Status != "pending" {
        return nil, fmt.Errorf("邀请已失效")
    }
    
    if time.Now().After(invitation.ExpiresAt) {
        return nil, fmt.Errorf("邀请已过期")
    }
    
    // 2. 创建用户账户
    newUser := &models.CompanyUser{
        CompanyID:      invitation.CompanyID,
        Email:          invitation.Email,
        Name:           userData.Name,
        DepartmentID:   invitation.PresetDepartmentID,
        PositionID:     invitation.PresetPositionID,
        RoleID:         invitation.PresetRoleID,
        Status:         "active",
    }
    
    // 如果需要审批，设置为待审核状态
    if invitation.RequiresApproval {
        newUser.Status = "pending_approval"
    }
    
    createdUser, err := s.repo.CreateUser(ctx, newUser)
    if err != nil {
        return nil, fmt.Errorf("创建用户失败: %w", err)
    }
    
    // 3. 更新邀请状态
    invitation.Status = "accepted"
    invitation.AcceptedAt = &time.Now()
    if err := s.repo.UpdateInvitation(ctx, invitation); err != nil {
        log.Errorf("更新邀请状态失败: %v", err)
    }
    
    // 4. 创建激活记录
    activation := &models.UserActivation{
        InvitationID:     invitation.ID,
        CompanyUserID:    createdUser.ID,
        IPAddress:        s.getClientIP(ctx),
        UserAgent:        s.getUserAgent(ctx),
        PasswordSet:      userData.PasswordSet,
        ProfileCompleted: userData.ProfileCompleted,
    }
    
    if _, err := s.repo.CreateActivation(ctx, activation); err != nil {
        log.Errorf("创建激活记录失败: %v", err)
    }
    
    // 5. 发送欢迎邮件
    if !invitation.RequiresApproval {
        s.emailService.SendWelcomeEmail(ctx, createdUser)
    }
    
    return createdUser, nil
}
```

## 4. 用户信息管理界面设计

### 4.1 用户管理主界面

```typescript
// 企业用户管理页面
interface EnterpriseUserManagementPageProps {}

export const EnterpriseUserManagementPage: React.FC<EnterpriseUserManagementPageProps> = () => {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  return (
    <PageContainer 
      title="用户管理"
      extra={[
        <Button key="invite" icon={<MailOutlined />}>
          邀请用户
        </Button>,
        <Button key="import" icon={<UploadOutlined />}>
          批量导入
        </Button>,
        <Button key="create" type="primary" icon={<PlusOutlined />}>
          创建用户
        </Button>
      ]}
    >
      {/* 筛选和搜索区域 */}
      <Card className="mb-4">
        <UserFiltersPanel 
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
        />
      </Card>

      {/* 用户列表 */}
      <Card>
        <UserListTable 
          users={users}
          selectedUsers={selectedUsers}
          loading={loading}
          onSelectionChange={setSelectedUsers}
          onUserEdit={handleUserEdit}
          onUserDelete={handleUserDelete}
          onBatchOperation={handleBatchOperation}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalUsers,
            onChange: handlePageChange
          }}
        />
      </Card>

      {/* 批量操作工具栏 */}
      {selectedUsers.length > 0 && (
        <BatchActionToolbar 
          selectedCount={selectedUsers.length}
          onBatchDelete={handleBatchDelete}
          onBatchStatusChange={handleBatchStatusChange}
          onBatchRoleAssign={handleBatchRoleAssign}
          onBatchDepartmentAssign={handleBatchDepartmentAssign}
        />
      )}

      {/* 用户详情抽屉 */}
      <UserDetailDrawer 
        visible={detailVisible}
        userId={selectedUserId}
        onClose={() => setDetailVisible(false)}
        onUserUpdate={handleUserUpdate}
      />

      {/* 邀请用户模态框 */}
      <InviteUserModal 
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        onInviteSent={handleInvitationSent}
      />
    </PageContainer>
  );
};
```

### 4.2 用户筛选面板

```typescript
// 用户筛选组件
interface UserFiltersPanelProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onSearch: () => void;
}

export const UserFiltersPanel: React.FC<UserFiltersPanelProps> = ({
  filters,
  onFiltersChange,
  onSearch
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  return (
    <Row gutter={16} align="bottom">
      <Col span={6}>
        <Form.Item label="搜索用户">
          <Input.Search
            placeholder="姓名、邮箱、电话"
            value={filters.search}
            onChange={(e) => onFiltersChange({...filters, search: e.target.value})}
            onSearch={onSearch}
            allowClear
          />
        </Form.Item>
      </Col>
      
      <Col span={4}>
        <Form.Item label="部门">
          <Select
            placeholder="选择部门"
            value={filters.departmentId}
            onChange={(value) => onFiltersChange({...filters, departmentId: value})}
            allowClear
          >
            {departments.map(dept => (
              <Option key={dept.id} value={dept.id}>
                {dept.department_name}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

      <Col span={4}>
        <Form.Item label="岗位">
          <Select
            placeholder="选择岗位"
            value={filters.positionId}
            onChange={(value) => onFiltersChange({...filters, positionId: value})}
            allowClear
          >
            {positions.map(position => (
              <Option key={position.id} value={position.id}>
                {position.position_name}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

      <Col span={4}>
        <Form.Item label="角色">
          <Select
            placeholder="选择角色"
            value={filters.roleId}
            onChange={(value) => onFiltersChange({...filters, roleId: value})}
            allowClear
          >
            {roles.map(role => (
              <Option key={role.id} value={role.id}>
                {role.role_name}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

      <Col span={3}>
        <Form.Item label="状态">
          <Select
            placeholder="用户状态"
            value={filters.status}
            onChange={(value) => onFiltersChange({...filters, status: value})}
            allowClear
          >
            <Option value="active">活跃</Option>
            <Option value="inactive">非活跃</Option>
            <Option value="suspended">停用</Option>
            <Option value="pending">待审核</Option>
          </Select>
        </Form.Item>
      </Col>

      <Col span={3}>
        <Space>
          <Button onClick={onSearch} type="primary">
            搜索
          </Button>
          <Button onClick={() => onFiltersChange({})}>
            重置
          </Button>
        </Space>
      </Col>
    </Row>
  );
};
```

### 4.3 用户列表表格

```typescript
// 用户列表表格组件
interface UserListTableProps {
  users: CompanyUser[];
  selectedUsers: number[];
  loading: boolean;
  onSelectionChange: (selectedIds: number[]) => void;
  onUserEdit: (user: CompanyUser) => void;
  onUserDelete: (userId: number) => void;
  onBatchOperation: (operation: string, userIds: number[]) => void;
  pagination: TablePaginationConfig;
}

export const UserListTable: React.FC<UserListTableProps> = ({
  users,
  selectedUsers,
  loading,
  onSelectionChange,
  onUserEdit,
  onUserDelete,
  pagination
}) => {
  const columns: ColumnsType<CompanyUser> = [
    {
      title: '用户信息',
      key: 'userInfo',
      width: 280,
      render: (_, record) => (
        <div className="flex items-center space-x-3">
          <Avatar 
            src={record.avatar_url} 
            icon={<UserOutlined />}
            size={40}
          />
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-gray-500 text-sm">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '部门/岗位',
      key: 'organization',
      width: 200,
      render: (_, record) => (
        <div>
          <div className="flex items-center">
            <TeamOutlined className="mr-1 text-blue-500" />
            <span>{record.department_name || '未分配'}</span>
          </div>
          <div className="flex items-center mt-1">
            <ContactsOutlined className="mr-1 text-green-500" />
            <span>{record.position_name || '未分配'}</span>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role_name',
      key: 'role',
      width: 120,
      render: (roleName, record) => (
        <Tag color={getRoleColor(record.role_code)}>
          {roleName}
        </Tag>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 160,
      render: (_, record) => (
        <div className="text-sm">
          {record.phone && (
            <div className="flex items-center">
              <PhoneOutlined className="mr-1" />
              <span>{record.phone}</span>
            </div>
          )}
          {record.mobile && (
            <div className="flex items-center mt-1">
              <MobileOutlined className="mr-1" />
              <span>{record.mobile}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Badge 
          status={getUserStatusBadgeStatus(status)} 
          text={getUserStatusText(status)}
        />
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'lastLogin',
      width: 120,
      render: (lastLogin) => (
        <span className="text-sm">
          {lastLogin ? dayjs(lastLogin).fromNow() : '从未登录'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑用户">
            <Button 
              type="link" 
              icon={<EditOutlined />}
              onClick={() => onUserEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="查看权限">
            <Button 
              type="link" 
              icon={<SafetyCertificateOutlined />}
              onClick={() => handleViewPermissions(record.id)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="重置密码">
            <Button 
              type="link" 
              icon={<KeyOutlined />}
              onClick={() => handleResetPassword(record.id)}
              size="small"
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'activate',
                  label: '激活用户',
                  icon: <CheckOutlined />,
                  disabled: record.status === 'active',
                },
                {
                  key: 'suspend',
                  label: '停用用户',
                  icon: <StopOutlined />,
                  disabled: record.status === 'suspended',
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  label: '删除用户',
                  icon: <DeleteOutlined />,
                  danger: true,
                },
              ],
              onClick: (e) => handleMenuAction(e.key, record),
            }}
          >
            <Button type="link" icon={<EllipsisOutlined />} size="small" />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const rowSelection: TableRowSelection<CompanyUser> = {
    selectedRowKeys: selectedUsers,
    onChange: (selectedRowKeys) => {
      onSelectionChange(selectedRowKeys as number[]);
    },
    getCheckboxProps: (record) => ({
      disabled: record.is_system_user, // 系统用户不允许批量操作
    }),
  };

  return (
    <Table<CompanyUser>
      columns={columns}
      dataSource={users}
      rowKey="id"
      loading={loading}
      pagination={pagination}
      rowSelection={rowSelection}
      scroll={{ x: 1200 }}
      size="middle"
    />
  );
};
```

### 4.4 用户邀请模态框

```typescript
// 用户邀请模态框
interface InviteUserModalProps {
  visible: boolean;
  onClose: () => void;
  onInviteSent: (invitation: InvitationResponse) => void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  visible,
  onClose,
  onInviteSent
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [invitationType, setInvitationType] = useState<'single' | 'batch'>('single');

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (invitationType === 'single') {
        const invitation = await userService.sendInvitation(values);
        message.success('邀请已发送');
        onInviteSent(invitation);
      } else {
        const emails = values.emails.split('\n').filter(email => email.trim());
        const results = await userService.sendBatchInvitations({
          ...values,
          emails
        });
        message.success(`成功发送${results.successful}个邀请`);
        onInviteSent(results);
      }
      
      form.resetFields();
      onClose();
    } catch (error) {
      console.error('发送邀请失败:', error);
      message.error('发送邀请失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="邀请用户加入企业"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Tabs 
        activeKey={invitationType}
        onChange={(key) => setInvitationType(key as 'single' | 'batch')}
        items={[
          {
            key: 'single',
            label: '单个邀请',
            children: <SingleInviteForm form={form} />
          },
          {
            key: 'batch',
            label: '批量邀请',
            children: <BatchInviteForm form={form} />
          }
        ]}
      />
    </Modal>
  );
};

// 单个邀请表单
const SingleInviteForm: React.FC<{form: FormInstance}> = ({ form }) => {
  return (
    <Form form={form} layout="vertical">
      <Form.Item
        name="email"
        label="邮箱地址"
        rules={[
          { required: true, message: '请输入邮箱地址' },
          { type: 'email', message: '请输入有效的邮箱地址' }
        ]}
      >
        <Input placeholder="user@example.com" />
      </Form.Item>

      <Form.Item name="preset_name" label="姓名（可选）">
        <Input placeholder="用户姓名" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="preset_department_id" label="预设部门">
            <DepartmentSelect placeholder="选择部门" allowClear />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="preset_position_id" label="预设岗位">
            <PositionSelect placeholder="选择岗位" allowClear />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="preset_role_id" label="预设角色">
        <RoleSelect placeholder="选择角色" allowClear />
      </Form.Item>

      <Form.Item name="custom_message" label="自定义消息">
        <TextArea 
          rows={3} 
          placeholder="欢迎信息（可选）"
          maxLength={500}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="expires_in_hours" label="有效期（小时）" initialValue={72}>
            <InputNumber min={1} max={168} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="requires_approval" valuePropName="checked">
            <Checkbox>需要管理员审批</Checkbox>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};
```

## 5. 用户权限分配系统设计

### 5.1 权限分配界面

```typescript
// 用户权限管理组件
interface UserPermissionManagerProps {
  userId: number;
  companyId: number;
}

export const UserPermissionManager: React.FC<UserPermissionManagerProps> = ({
  userId,
  companyId
}) => {
  const [userPermissions, setUserPermissions] = useState<UserPermissionSummary>();
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <Card title="权限管理">
      <Tabs items={[
        {
          key: 'role',
          label: '角色权限',
          children: <RolePermissionPanel 
            userId={userId}
            currentRole={userPermissions?.role}
            availableRoles={availableRoles}
            onRoleChange={handleRoleChange}
          />
        },
        {
          key: 'custom',
          label: '自定义权限',
          children: <CustomPermissionPanel
            userId={userId}
            customPermissions={userPermissions?.custom_permissions}
            permissionGroups={permissionGroups}
            onPermissionsChange={handleCustomPermissionsChange}
          />
        },
        {
          key: 'project',
          label: '项目权限',
          children: <ProjectPermissionPanel
            userId={userId}
            projectPermissions={userPermissions?.project_permissions}
            onProjectPermissionsChange={handleProjectPermissionsChange}
          />
        },
        {
          key: 'analysis',
          label: '权限分析',
          children: <PermissionAnalysisPanel
            userId={userId}
            effectivePermissions={userPermissions?.effective_permissions}
          />
        }
      ]} />
    </Card>
  );
};

// 角色权限面板
const RolePermissionPanel: React.FC<{
  userId: number;
  currentRole?: Role;
  availableRoles: Role[];
  onRoleChange: (roleId: number) => void;
}> = ({ userId, currentRole, availableRoles, onRoleChange }) => {
  return (
    <div className="space-y-4">
      <Alert
        message="角色权限"
        description="为用户分配角色，用户将继承该角色的所有权限。角色权限可以被自定义权限覆盖。"
        type="info"
        showIcon
      />

      <Row gutter={16}>
        <Col span={8}>
          <Card title="当前角色" size="small">
            {currentRole ? (
              <div>
                <Tag color="blue">{currentRole.role_name}</Tag>
                <p className="text-sm text-gray-600 mt-2">
                  {currentRole.role_description}
                </p>
              </div>
            ) : (
              <Empty description="未分配角色" />
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card title="更换角色" size="small">
            <Select
              placeholder="选择新角色"
              style={{ width: '100%' }}
              onChange={onRoleChange}
              value={currentRole?.id}
            >
              {availableRoles.map(role => (
                <Option key={role.id} value={role.id}>
                  <div>
                    <div>{role.role_name}</div>
                    <div className="text-xs text-gray-500">
                      {role.role_description}
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="权限统计" size="small">
            {currentRole && (
              <Statistic
                title="继承权限数量"
                value={currentRole.permissions_count || 0}
                prefix={<SafetyCertificateOutlined />}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 角色权限详情 */}
      {currentRole && (
        <Card title="角色权限详情" size="small">
          <PermissionMatrix
            permissions={currentRole.permissions}
            readonly={true}
            showInheritanceInfo={true}
          />
        </Card>
      )}
    </div>
  );
};

// 自定义权限面板
const CustomPermissionPanel: React.FC<{
  userId: number;
  customPermissions?: Record<string, boolean>;
  permissionGroups: PermissionGroup[];
  onPermissionsChange: (permissions: Record<string, boolean>) => void;
}> = ({ userId, customPermissions = {}, permissionGroups, onPermissionsChange }) => {
  const [localPermissions, setLocalPermissions] = useState(customPermissions);
  const [hasChanges, setHasChanges] = useState(false);

  const handlePermissionChange = (permissionCode: string, granted: boolean) => {
    const newPermissions = { ...localPermissions };
    if (granted) {
      newPermissions[permissionCode] = true;
    } else {
      delete newPermissions[permissionCode];
    }
    setLocalPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    onPermissionsChange(localPermissions);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Alert
          message="自定义权限覆盖"
          description="自定义权限将覆盖角色权限。可以为用户单独授予或撤销特定权限。"
          type="warning"
          showIcon
        />
        
        {hasChanges && (
          <Button type="primary" onClick={handleSaveChanges}>
            保存更改
          </Button>
        )}
      </div>

      <PermissionMatrix
        permissions={permissionGroups}
        value={Object.keys(localPermissions).filter(key => localPermissions[key])}
        onChange={handlePermissionChange}
        showOverrideStatus={true}
        highlightCustom={true}
      />
    </div>
  );
};
```

### 5.2 权限分配API

```go
// 用户权限分配API
type UserPermissionController struct {
    permissionService *PermissionService
    userService       *UserService
}

// 用户权限分配请求
type AssignPermissionsRequest struct {
    UserID              int                `json:"user_id" validate:"required"`
    RoleID              *int               `json:"role_id"`
    CustomPermissions   map[string]bool    `json:"custom_permissions"`
    ProjectPermissions  []ProjectPermission `json:"project_permissions"`
    EffectiveDate       *time.Time         `json:"effective_date"`
    ExpirationDate      *time.Time         `json:"expiration_date"`
    Reason              string             `json:"reason"`
}

// 分配用户权限
func (c *UserPermissionController) AssignPermissions(ctx *gin.Context) {
    var req AssignPermissionsRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, ErrorResponse{
            Error: "Invalid request format",
            Details: err.Error(),
        })
        return
    }

    companyID := getCurrentCompanyID(ctx)
    currentUserID := getCurrentUserID(ctx)

    // 权限检查
    if !c.permissionService.CheckPermission(ctx, currentUserID, "company.users.manage_permissions", nil) {
        ctx.JSON(http.StatusForbidden, ErrorResponse{
            Error: "权限不足",
        })
        return
    }

    // 验证目标用户是否属于当前企业
    targetUser, err := c.userService.GetUserByID(ctx, req.UserID)
    if err != nil || targetUser.CompanyID != companyID {
        ctx.JSON(http.StatusNotFound, ErrorResponse{
            Error: "用户不存在",
        })
        return
    }

    // 执行权限分配
    result, err := c.permissionService.AssignUserPermissions(ctx, &req, currentUserID)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "权限分配失败",
            Details: err.Error(),
        })
        return
    }

    // 记录审计日志
    c.auditLogger.LogPermissionChange(ctx, &AuditLogEntry{
        Action:       "assign_permissions",
        TargetUserID: req.UserID,
        PerformedBy:  currentUserID,
        Details:      req,
        Result:       result,
    })

    ctx.JSON(http.StatusOK, SuccessResponse{
        Data:    result,
        Message: "权限分配成功",
    })
}

// 获取用户权限详情
func (c *UserPermissionController) GetUserPermissions(ctx *gin.Context) {
    userID := ctx.GetInt("user_id")
    companyID := getCurrentCompanyID(ctx)

    // 获取用户权限摘要
    permissions, err := c.permissionService.GetUserPermissions(ctx, userID)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "获取用户权限失败",
        })
        return
    }

    // 获取权限继承追踪
    trace, err := c.permissionService.GetPermissionInheritanceTrace(ctx, userID)
    if err != nil {
        log.Errorf("获取权限继承追踪失败: %v", err)
    }

    response := UserPermissionDetailResponse{
        UserID:              userID,
        CompanyID:          companyID,
        Permissions:        permissions,
        InheritanceTrace:   trace,
        LastUpdated:        time.Now(),
    }

    ctx.JSON(http.StatusOK, SuccessResponse{
        Data: response,
    })
}
```

## 6. 用户状态管理和审计设计

### 6.1 用户状态管理

```sql
-- 用户状态变更历史表
CREATE TABLE IF NOT EXISTS user_status_history (
    id BIGSERIAL PRIMARY KEY,
    company_user_id INTEGER NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    change_reason TEXT,
    changed_by INTEGER REFERENCES company_users(id),
    ip_address INET,
    user_agent TEXT,
    effective_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 状态验证约束
    CONSTRAINT chk_user_status_values CHECK (
        old_status IN ('active', 'inactive', 'suspended', 'pending', 'pending_approval') AND
        new_status IN ('active', 'inactive', 'suspended', 'pending', 'pending_approval')
    )
);

-- 用户操作审计表
CREATE TABLE IF NOT EXISTS user_operation_audit (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    target_user_id INTEGER NOT NULL REFERENCES company_users(id),
    operation_type VARCHAR(50) NOT NULL,
    operation_details JSONB,
    performed_by INTEGER REFERENCES company_users(id),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    operation_result VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 操作类型约束
    CONSTRAINT chk_operation_type CHECK (operation_type IN (
        'create', 'update', 'delete', 'invite', 'activate', 'suspend', 
        'reset_password', 'assign_role', 'assign_permissions', 'login', 'logout'
    )),
    
    -- 操作结果约束
    CONSTRAINT chk_operation_result CHECK (operation_result IN ('success', 'failed', 'partial'))
);
```

### 6.2 用户状态管理服务

```go
// 用户状态管理服务
type UserStatusManager struct {
    repo        UserRepository
    auditLogger AuditLogger
    notifier    NotificationService
}

// 状态变更请求
type ChangeUserStatusRequest struct {
    UserID       int       `json:"user_id" validate:"required"`
    NewStatus    string    `json:"new_status" validate:"required,oneof=active inactive suspended"`
    Reason       string    `json:"reason" validate:"required,min=10"`
    EffectiveDate *time.Time `json:"effective_date"`
    NotifyUser   bool      `json:"notify_user"`
}

// 状态变更响应
type UserStatusChangeResponse struct {
    UserID       int       `json:"user_id"`
    OldStatus    string    `json:"old_status"`
    NewStatus    string    `json:"new_status"`
    ChangedBy    string    `json:"changed_by"`
    ChangedAt    time.Time `json:"changed_at"`
    EffectiveAt  time.Time `json:"effective_at"`
    Reason       string    `json:"reason"`
}

// 变更用户状态
func (s *UserStatusManager) ChangeUserStatus(
    ctx context.Context,
    req *ChangeUserStatusRequest,
    performedBy int,
) (*UserStatusChangeResponse, error) {
    
    // 1. 获取当前用户信息
    user, err := s.repo.GetUserByID(ctx, req.UserID)
    if err != nil {
        return nil, fmt.Errorf("用户不存在: %w", err)
    }
    
    // 2. 验证状态变更的合法性
    if !s.isValidStatusTransition(user.Status, req.NewStatus) {
        return nil, fmt.Errorf("不允许从 %s 变更到 %s", user.Status, req.NewStatus)
    }
    
    // 3. 检查操作权限
    if !s.canChangeUserStatus(ctx, performedBy, req.UserID, req.NewStatus) {
        return nil, fmt.Errorf("权限不足，无法变更用户状态")
    }
    
    oldStatus := user.Status
    effectiveAt := time.Now()
    if req.EffectiveDate != nil {
        effectiveAt = *req.EffectiveDate
    }
    
    // 4. 更新用户状态
    user.Status = req.NewStatus
    if _, err := s.repo.UpdateUser(ctx, user); err != nil {
        return nil, fmt.Errorf("更新用户状态失败: %w", err)
    }
    
    // 5. 记录状态变更历史
    statusHistory := &models.UserStatusHistory{
        CompanyUserID: req.UserID,
        OldStatus:     &oldStatus,
        NewStatus:     req.NewStatus,
        ChangeReason:  req.Reason,
        ChangedBy:     &performedBy,
        EffectiveDate: effectiveAt,
    }
    
    if err := s.repo.CreateStatusHistory(ctx, statusHistory); err != nil {
        log.Errorf("记录状态变更历史失败: %v", err)
    }
    
    // 6. 记录操作审计
    s.auditLogger.LogUserOperation(ctx, &UserOperationAudit{
        CompanyID:        user.CompanyID,
        TargetUserID:     req.UserID,
        OperationType:    "status_change",
        OperationDetails: req,
        PerformedBy:      &performedBy,
        OperationResult:  "success",
    })
    
    // 7. 发送通知
    if req.NotifyUser {
        go s.notifyStatusChange(user, oldStatus, req.NewStatus, req.Reason)
    }
    
    // 8. 构建响应
    response := &UserStatusChangeResponse{
        UserID:      req.UserID,
        OldStatus:   oldStatus,
        NewStatus:   req.NewStatus,
        ChangedBy:   s.getUserName(ctx, performedBy),
        ChangedAt:   time.Now(),
        EffectiveAt: effectiveAt,
        Reason:      req.Reason,
    }
    
    return response, nil
}

// 验证状态转换的合法性
func (s *UserStatusManager) isValidStatusTransition(from, to string) bool {
    validTransitions := map[string][]string{
        "pending":          {"active", "suspended"},
        "pending_approval": {"active", "suspended"},
        "active":          {"inactive", "suspended"},
        "inactive":        {"active", "suspended"},
        "suspended":       {"active", "inactive"},
    }
    
    allowedStates, exists := validTransitions[from]
    if !exists {
        return false
    }
    
    for _, allowedState := range allowedStates {
        if allowedState == to {
            return true
        }
    }
    
    return false
}

// 批量状态变更
func (s *UserStatusManager) BatchChangeUserStatus(
    ctx context.Context,
    userIDs []int,
    newStatus string,
    reason string,
    performedBy int,
) (*BatchStatusChangeResponse, error) {
    
    var successfulChanges []UserStatusChangeResponse
    var failedChanges []BatchChangeError
    
    for _, userID := range userIDs {
        req := &ChangeUserStatusRequest{
            UserID:    userID,
            NewStatus: newStatus,
            Reason:    reason,
            NotifyUser: false, // 批量操作时不逐个通知
        }
        
        result, err := s.ChangeUserStatus(ctx, req, performedBy)
        if err != nil {
            failedChanges = append(failedChanges, BatchChangeError{
                UserID: userID,
                Error:  err.Error(),
            })
        } else {
            successfulChanges = append(successfulChanges, *result)
        }
    }
    
    response := &BatchStatusChangeResponse{
        SuccessfulChanges: successfulChanges,
        FailedChanges:     failedChanges,
        TotalProcessed:    len(userIDs),
        SuccessCount:      len(successfulChanges),
        FailureCount:      len(failedChanges),
    }
    
    // 批量操作完成后发送汇总通知
    if len(successfulChanges) > 0 {
        go s.notifyBatchStatusChange(successfulChanges, performedBy)
    }
    
    return response, nil
}
```

### 6.3 用户操作审计面板

```typescript
// 用户审计日志组件
interface UserAuditPanelProps {
  userId?: number;
  companyId: number;
}

export const UserAuditPanel: React.FC<UserAuditPanelProps> = ({
  userId,
  companyId
}) => {
  const [auditLogs, setAuditLogs] = useState<UserAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({});

  const columns: ColumnsType<UserAuditLog> = [
    {
      title: '时间',
      dataIndex: 'performed_at',
      key: 'time',
      width: 160,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
      sorter: true,
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation',
      width: 120,
      render: (type) => (
        <Tag color={getOperationTypeColor(type)}>
          {getOperationTypeName(type)}
        </Tag>
      ),
    },
    {
      title: '目标用户',
      key: 'targetUser',
      width: 150,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.target_user_name}</div>
          <div className="text-sm text-gray-500">{record.target_user_email}</div>
        </div>
      ),
    },
    {
      title: '操作人',
      key: 'performer',
      width: 150,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.performed_by_name}</div>
          <div className="text-sm text-gray-500">
            {record.ip_address}
          </div>
        </div>
      ),
    },
    {
      title: '操作详情',
      dataIndex: 'operation_details',
      key: 'details',
      render: (details) => (
        <Tooltip title={JSON.stringify(details, null, 2)}>
          <Button type="link" size="small">
            查看详情
          </Button>
        </Tooltip>
      ),
    },
    {
      title: '结果',
      dataIndex: 'operation_result',
      key: 'result',
      width: 80,
      render: (result) => (
        <Badge
          status={result === 'success' ? 'success' : 'error'}
          text={result === 'success' ? '成功' : '失败'}
        />
      ),
    },
  ];

  return (
    <Card title="操作审计日志">
      <div className="mb-4">
        <AuditFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
        />
      </div>

      <Table
        columns={columns}
        dataSource={auditLogs}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        scroll={{ x: 800 }}
      />
    </Card>
  );
};

// 审计过滤面板
const AuditFiltersPanel: React.FC<{
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
  onSearch: () => void;
}> = ({ filters, onFiltersChange, onSearch }) => {
  return (
    <Row gutter={16} align="bottom">
      <Col span={6}>
        <Form.Item label="操作类型">
          <Select
            placeholder="选择操作类型"
            value={filters.operationType}
            onChange={(value) => onFiltersChange({...filters, operationType: value})}
            allowClear
          >
            <Option value="create">创建用户</Option>
            <Option value="update">更新信息</Option>
            <Option value="status_change">状态变更</Option>
            <Option value="assign_role">分配角色</Option>
            <Option value="assign_permissions">分配权限</Option>
            <Option value="reset_password">重置密码</Option>
            <Option value="login">登录</Option>
            <Option value="logout">登出</Option>
          </Select>
        </Form.Item>
      </Col>

      <Col span={6}>
        <Form.Item label="操作结果">
          <Select
            placeholder="选择操作结果"
            value={filters.operationResult}
            onChange={(value) => onFiltersChange({...filters, operationResult: value})}
            allowClear
          >
            <Option value="success">成功</Option>
            <Option value="failed">失败</Option>
            <Option value="partial">部分成功</Option>
          </Select>
        </Form.Item>
      </Col>

      <Col span={6}>
        <Form.Item label="时间范围">
          <RangePicker
            value={filters.timeRange}
            onChange={(dates) => onFiltersChange({...filters, timeRange: dates})}
            showTime
          />
        </Form.Item>
      </Col>

      <Col span={6}>
        <Space>
          <Button type="primary" onClick={onSearch}>
            查询
          </Button>
          <Button onClick={() => onFiltersChange({})}>
            重置
          </Button>
        </Space>
      </Col>
    </Row>
  );
};
```

## 7. 系统集成设计

### 7.1 与组织架构集成

```sql
-- 扩展company_users表与组织架构集成
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES company_departments(id);
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS position_id INTEGER REFERENCES company_positions(id);
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS employee_assignment_id INTEGER REFERENCES employee_assignments(id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_company_users_department ON company_users(department_id);
CREATE INDEX IF NOT EXISTS idx_company_users_position ON company_users(position_id);

-- 用户组织关系视图
CREATE OR REPLACE VIEW user_organization_detail AS
SELECT 
    cu.id,
    cu.name,
    cu.email,
    cu.status,
    cu.role_id,
    cr.role_name,
    cu.department_id,
    cd.department_name,
    cd.department_code,
    cu.position_id,
    cp.position_name,
    cp.position_code,
    cp.position_level,
    ea.is_primary_assignment,
    ea.reporting_manager_id,
    manager.name as manager_name,
    cu.created_at,
    cu.updated_at
FROM company_users cu
LEFT JOIN company_roles cr ON cu.role_id = cr.id
LEFT JOIN company_departments cd ON cu.department_id = cd.id
LEFT JOIN company_positions cp ON cu.position_id = cp.id
LEFT JOIN employee_assignments ea ON cu.employee_assignment_id = ea.id
LEFT JOIN company_users manager ON ea.reporting_manager_id = manager.id
WHERE cu.status != 'deleted';
```

### 7.2 统一用户管理API

```go
// 统一企业用户管理API
type EnterpriseUserController struct {
    userService         *UserService
    organizationService *OrganizationService
    permissionService   *PermissionService
    invitationService   *InvitationService
}

// API路由设置
func (c *EnterpriseUserController) SetupRoutes(r *gin.RouterGroup) {
    users := r.Group("/enterprise/users")
    users.Use(authMiddleware, companyIsolationMiddleware)
    
    {
        // 用户基础操作
        users.GET("", permissionRequired("company.users.read"), c.ListUsers)
        users.POST("", permissionRequired("company.users.create"), c.CreateUser)
        users.GET("/:id", permissionRequired("company.users.read"), c.GetUser)
        users.PUT("/:id", permissionRequired("company.users.update"), c.UpdateUser)
        users.DELETE("/:id", permissionRequired("company.users.delete"), c.DeleteUser)
        
        // 用户邀请
        users.POST("/invitations", permissionRequired("company.users.invite"), c.SendInvitation)
        users.GET("/invitations", permissionRequired("company.users.read"), c.ListInvitations)
        users.POST("/invitations/:id/resend", permissionRequired("company.users.invite"), c.ResendInvitation)
        users.DELETE("/invitations/:id", permissionRequired("company.users.invite"), c.CancelInvitation)
        
        // 状态管理
        users.POST("/:id/status", permissionRequired("company.users.manage"), c.ChangeUserStatus)
        users.POST("/batch/status", permissionRequired("company.users.manage"), c.BatchChangeStatus)
        
        // 权限管理
        users.GET("/:id/permissions", permissionRequired("company.users.read"), c.GetUserPermissions)
        users.PUT("/:id/permissions", permissionRequired("company.users.manage_permissions"), c.AssignPermissions)
        users.POST("/:id/role", permissionRequired("company.users.manage_permissions"), c.AssignRole)
        
        // 组织架构分配
        users.POST("/:id/organization", permissionRequired("company.users.manage"), c.AssignToOrganization)
        users.DELETE("/:id/organization", permissionRequired("company.users.manage"), c.RemoveFromOrganization)
        
        // 批量操作
        users.POST("/batch/import", permissionRequired("company.users.import"), c.BatchImport)
        users.GET("/export", permissionRequired("company.users.export"), c.ExportUsers)
        users.POST("/batch/delete", permissionRequired("company.users.delete"), c.BatchDelete)
        
        // 审计日志
        users.GET("/:id/audit", permissionRequired("company.users.audit"), c.GetUserAuditLogs)
        users.GET("/audit", permissionRequired("company.users.audit"), c.GetCompanyUserAuditLogs)
    }
}

// 创建用户（集成组织架构）
func (c *EnterpriseUserController) CreateUser(ctx *gin.Context) {
    var req CreateUserRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "参数错误"})
        return
    }

    companyID := getCurrentCompanyID(ctx)
    currentUserID := getCurrentUserID(ctx)

    // 验证组织架构分配
    if req.DepartmentID != nil {
        if !c.organizationService.DepartmentExists(ctx, companyID, *req.DepartmentID) {
            ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "指定的部门不存在"})
            return
        }
    }

    if req.PositionID != nil {
        if !c.organizationService.PositionExists(ctx, companyID, *req.PositionID) {
            ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "指定的岗位不存在"})
            return
        }
    }

    // 创建用户
    user := &models.CompanyUser{
        CompanyID:    companyID,
        Name:         req.Name,
        Email:        req.Email,
        DepartmentID: req.DepartmentID,
        PositionID:   req.PositionID,
        RoleID:       req.RoleID,
        Status:       "active",
        CreatedBy:    &currentUserID,
    }

    createdUser, err := c.userService.CreateUser(ctx, user)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, ErrorResponse{
            Error: "创建用户失败",
            Details: err.Error(),
        })
        return
    }

    // 如果指定了部门和岗位，创建员工分配记录
    if req.DepartmentID != nil && req.PositionID != nil {
        assignment := &models.EmployeeAssignment{
            CompanyUserID:        createdUser.ID,
            DepartmentID:         *req.DepartmentID,
            PositionID:           *req.PositionID,
            IsPrimaryAssignment:  true,
            AssignmentType:       "permanent",
            ReportingManagerID:   req.ReportingManagerID,
        }

        assignmentResult, err := c.organizationService.CreateEmployeeAssignment(ctx, assignment)
        if err != nil {
            log.Errorf("创建员工分配记录失败: %v", err)
        } else {
            createdUser.EmployeeAssignmentID = &assignmentResult.ID
            c.userService.UpdateUser(ctx, createdUser)
        }
    }

    ctx.JSON(http.StatusCreated, SuccessResponse{
        Data:    createdUser,
        Message: "用户创建成功",
    })
}
```

## 8. 部署和配置

### 8.1 数据库迁移脚本

```sql
-- 企业用户管理系统数据库迁移
-- migration: 300_enterprise_user_management_system.sql

BEGIN;

-- 1. 扩展现有company_users表
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES company_departments(id);
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS position_id INTEGER REFERENCES company_positions(id);
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS employee_assignment_id INTEGER REFERENCES employee_assignments(id);
ALTER TABLE company_users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- 2. 创建新表
\i user_invitations.sql
\i user_activations.sql
\i user_status_history.sql
\i user_operation_audit.sql

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_company_users_department ON company_users(department_id);
CREATE INDEX IF NOT EXISTS idx_company_users_position ON company_users(position_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_status_history_user ON user_status_history(company_user_id);
CREATE INDEX IF NOT EXISTS idx_user_operation_audit_user ON user_operation_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_operation_audit_time ON user_operation_audit(performed_at);

-- 4. 创建视图
\i user_management_views.sql

-- 5. 创建触发器
\i user_audit_triggers.sql

-- 6. 插入基础数据
\i user_management_seed_data.sql

COMMIT;
```

### 8.2 系统配置

```yaml
# config/user_management.yaml
enterprise_user_management:
  # 邀请配置
  invitation:
    default_expires_hours: 72
    max_expires_hours: 168
    require_approval_for_admin_roles: true
    send_welcome_email: true
    
  # 用户状态管理
  status_management:
    allow_self_deactivation: false
    require_manager_approval: true
    auto_suspend_inactive_days: 90
    
  # 批量操作限制
  batch_operations:
    max_batch_size: 100
    require_approval_threshold: 50
    
  # 审计配置
  audit:
    log_all_operations: true
    retention_days: 365
    sensitive_operations: ["delete", "status_change", "assign_permissions"]
    
  # 组织架构集成
  organization_integration:
    auto_assign_department: true
    inherit_manager_permissions: false
    validate_reporting_chain: true
```

### 8.3 环境变量

```bash
# 企业用户管理系统环境变量
USER_INVITATION_EXPIRES_HOURS=72
USER_INVITATION_BASE_URL=https://app.company.com/accept-invitation
BATCH_OPERATION_MAX_SIZE=100
USER_AUDIT_RETENTION_DAYS=365

# 邮件服务配置（邀请邮件）
EMAIL_INVITATION_TEMPLATE=user_invitation
EMAIL_WELCOME_TEMPLATE=user_welcome
EMAIL_STATUS_CHANGE_TEMPLATE=user_status_change

# 安全配置
REQUIRE_STRONG_PASSWORDS=true
PASSWORD_MIN_LENGTH=8
ENFORCE_2FA_FOR_ADMINS=true
```

## 9. 测试策略

### 9.1 用户管理流程测试

```go
func TestUserManagement_CompleteWorkflow(t *testing.T) {
    // 1. 测试用户邀请
    t.Run("用户邀请流程", func(t *testing.T) {
        inviteReq := &SendInvitationRequest{
            Email:              "test@company.com",
            PresetName:         "测试用户",
            PresetDepartmentID: &departmentID,
            PresetRoleID:       &roleID,
            ExpiresInHours:     72,
        }
        
        invitation, err := invitationService.SendInvitation(ctx, inviteReq)
        assert.NoError(t, err)
        assert.Equal(t, "pending", invitation.Status)
    })
    
    // 2. 测试用户激活
    t.Run("用户激活流程", func(t *testing.T) {
        activationData := &UserActivationData{
            Name:        "测试用户",
            PasswordSet: true,
        }
        
        user, err := invitationService.AcceptInvitation(ctx, invitationToken, activationData)
        assert.NoError(t, err)
        assert.Equal(t, "active", user.Status)
    })
    
    // 3. 测试权限分配
    t.Run("权限分配", func(t *testing.T) {
        permReq := &AssignPermissionsRequest{
            UserID: user.ID,
            RoleID: &adminRoleID,
        }
        
        result, err := permissionService.AssignUserPermissions(ctx, permReq, managerID)
        assert.NoError(t, err)
        assert.True(t, result.Success)
    })
    
    // 4. 测试状态变更
    t.Run("用户状态变更", func(t *testing.T) {
        statusReq := &ChangeUserStatusRequest{
            UserID:    user.ID,
            NewStatus: "suspended",
            Reason:    "违反公司政策",
        }
        
        result, err := statusManager.ChangeUserStatus(ctx, statusReq, managerID)
        assert.NoError(t, err)
        assert.Equal(t, "suspended", result.NewStatus)
    })
}
```

## 10. 总结

### 10.1 核心成果

本设计方案提供了完整的企业用户管理界面和API系统，包括：

1. **完整的用户生命周期管理** - 从邀请创建到状态变更的全流程管理
2. **深度组织架构集成** - 与部门、岗位、员工分配的无缝集成
3. **细粒度权限管理** - 基于角色和自定义权限的灵活权限分配
4. **全面的审计追踪** - 用户操作的完整记录和分析
5. **现代化用户界面** - 基于Ant Design的专业级管理界面

### 10.2 技术特点

- **企业级架构** - 支持大规模用户管理和多租户隔离
- **工作流驱动** - 完整的邀请、激活、审批工作流程
- **权限体系集成** - 与任务#1212的角色权限系统深度集成
- **组织架构联动** - 与任务#1210、#1211的组织管理联动
- **审计合规** - 完整的操作记录和合规性支持

### 10.3 实施价值

#### 10.3.1 业务价值
- **管理效率提升** - 统一的用户管理平台和批量操作功能
- **安全性增强** - 完整的权限控制和状态管理机制
- **合规性保证** - 详细的审计日志和操作追踪
- **用户体验优化** - 现代化的界面设计和流畅的操作体验

#### 10.3.2 技术价值
- **系统集成度高** - 与现有企业系统的深度集成
- **扩展性强** - 模块化设计支持功能扩展
- **可维护性好** - 标准化的API设计和完整的文档
- **性能优化** - 高效的数据查询和批量处理能力

该设计方案为企业提供了现代化的用户管理解决方案，是企业数字化转型中人力资源管理的核心组成部分。

**设计文档位置**: `/design/enterprise_user_management_system.md`  
**总字数**: 约20,000字  
**技术栈**: Go + PostgreSQL + React + TypeScript + Ant Design
# 🏢 新客户管理架构设计

## 概念重新定义

基于您的需求，我们将重新设计整个客户管理系统：

### 核心概念

1. **客户 (Customer)** = **企业 (Company)**
   - 客户就是企业，不是个人
   - 每个企业是一个独立的业务实体

2. **企业用户 (Company Users)**
   - 企业下面的员工/联系人
   - 每个用户属于一个或多个企业

3. **项目归属 (Project Ownership)**
   - 项目属于特定企业或多个企业（合作项目）
   - 项目团队从企业用户中选择

## 新数据模型设计

### 1. 企业客户模型 (Customer/Company)

```go
type Customer struct {
    ID                int           `json:"id" db:"id"`
    CompanyName       string        `json:"company_name" db:"company_name"`           // 企业名称
    CompanyCode       string        `json:"company_code" db:"company_code"`           // 企业编码
    Industry          string        `json:"industry" db:"industry"`                   // 行业
    CompanyType       string        `json:"company_type" db:"company_type"`           // 企业类型
    BusinessLicense   string        `json:"business_license" db:"business_license"`   // 营业执照号
    TaxNumber         string        `json:"tax_number" db:"tax_number"`               // 税号
    LegalRepresentative string      `json:"legal_representative" db:"legal_representative"` // 法人代表
    
    // 联系信息
    Address           string        `json:"address" db:"address"`
    City              string        `json:"city" db:"city"`
    Province          string        `json:"province" db:"province"`
    PostalCode        string        `json:"postal_code" db:"postal_code"`
    Website           string        `json:"website" db:"website"`
    
    // 业务信息
    Status            string        `json:"status" db:"status"`                       // active, inactive, potential, suspended
    Priority          string        `json:"priority" db:"priority"`                   // high, medium, low
    ContractValue     float64       `json:"contract_value" db:"contract_value"`       // 年度合同总额
    StartDate         *time.Time    `json:"start_date" db:"start_date"`               // 合作开始日期
    
    // 元数据
    CreatedBy         int           `json:"created_by" db:"created_by"`
    UpdatedBy         *int          `json:"updated_by" db:"updated_by"`
    CreatedAt         time.Time     `json:"created_at" db:"created_at"`
    UpdatedAt         time.Time     `json:"updated_at" db:"updated_at"`
    DeletedAt         *time.Time    `json:"deleted_at,omitempty" db:"deleted_at"`
}
```

### 2. 企业用户模型 (Company User)

```go
type CompanyUser struct {
    ID                int           `json:"id" db:"id"`
    CustomerID        int           `json:"customer_id" db:"customer_id"`             // 所属企业
    
    // 用户基本信息
    Name              string        `json:"name" db:"name"`                           // 姓名
    Position          string        `json:"position" db:"position"`                   // 职位
    Department        string        `json:"department" db:"department"`               // 部门
    Email             string        `json:"email" db:"email"`
    Phone             string        `json:"phone" db:"phone"`
    Mobile            string        `json:"mobile" db:"mobile"`                       // 手机
    
    // 权限和角色
    Role              string        `json:"role" db:"role"`                           // primary_contact, technical_contact, decision_maker, normal
    IsPrimaryContact  bool          `json:"is_primary_contact" db:"is_primary_contact"` // 是否主要联系人
    CanMakeDecisions  bool          `json:"can_make_decisions" db:"can_make_decisions"` // 是否有决策权
    AccessLevel       int           `json:"access_level" db:"access_level"`           // 访问级别 1-5
    
    // 状态
    Status            string        `json:"status" db:"status"`                       // active, inactive, left
    
    CreatedAt         time.Time     `json:"created_at" db:"created_at"`
    UpdatedAt         time.Time     `json:"updated_at" db:"updated_at"`
}
```

### 3. 项目企业关联模型 (Project Company Association)

```go
type ProjectCompany struct {
    ID                int           `json:"id" db:"id"`
    ProjectID         int           `json:"project_id" db:"project_id"`
    CustomerID        int           `json:"customer_id" db:"customer_id"`
    
    // 关联类型
    RelationType      string        `json:"relation_type" db:"relation_type"`         // owner, partner, client, vendor
    Ownership         float64       `json:"ownership" db:"ownership"`                 // 所有权百分比
    ContractValue     float64       `json:"contract_value" db:"contract_value"`       // 该企业的合同金额
    
    // 责任和权限
    CanViewProject    bool          `json:"can_view_project" db:"can_view_project"`
    CanEditProject    bool          `json:"can_edit_project" db:"can_edit_project"`
    CanManageUsers    bool          `json:"can_manage_users" db:"can_manage_users"`
    
    CreatedAt         time.Time     `json:"created_at" db:"created_at"`
    UpdatedAt         time.Time     `json:"updated_at" db:"updated_at"`
}
```

### 4. 企业合同模型 (Company Contract)

```go
type CompanyContract struct {
    ID                int           `json:"id" db:"id"`
    CustomerID        int           `json:"customer_id" db:"customer_id"`
    
    // 合同基本信息
    ContractNumber    string        `json:"contract_number" db:"contract_number"`
    ContractName      string        `json:"contract_name" db:"contract_name"`
    ContractType      string        `json:"contract_type" db:"contract_type"`         // service, product, maintenance
    
    // 金额和时间
    TotalValue        float64       `json:"total_value" db:"total_value"`
    PaidAmount        float64       `json:"paid_amount" db:"paid_amount"`
    StartDate         time.Time     `json:"start_date" db:"start_date"`
    EndDate           time.Time     `json:"end_date" db:"end_date"`
    
    // 状态
    Status            string        `json:"status" db:"status"`                       // draft, active, completed, terminated
    
    // 文档
    ContractFile      string        `json:"contract_file" db:"contract_file"`         // 合同文件路径
    
    CreatedAt         time.Time     `json:"created_at" db:"created_at"`
    UpdatedAt         time.Time     `json:"updated_at" db:"updated_at"`
}
```

## 数据库表结构

### 1. customers 表 (企业客户)

```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL UNIQUE,
    company_code VARCHAR(100) UNIQUE,
    industry VARCHAR(100),
    company_type VARCHAR(50), -- 有限公司、股份公司、个体户等
    business_license VARCHAR(100),
    tax_number VARCHAR(50),
    legal_representative VARCHAR(100),
    
    -- 联系信息
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    website VARCHAR(255),
    
    -- 业务信息
    status VARCHAR(20) DEFAULT 'potential' CHECK (status IN ('active', 'inactive', 'potential', 'suspended')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    contract_value DECIMAL(15,2) DEFAULT 0,
    start_date DATE,
    
    -- 元数据
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
```

### 2. company_users 表 (企业用户)

```sql
CREATE TABLE company_users (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    
    -- 用户信息
    name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    department VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    mobile VARCHAR(50),
    
    -- 权限
    role VARCHAR(50) DEFAULT 'normal' CHECK (role IN ('primary_contact', 'technical_contact', 'decision_maker', 'normal')),
    is_primary_contact BOOLEAN DEFAULT FALSE,
    can_make_decisions BOOLEAN DEFAULT FALSE,
    access_level INTEGER DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5),
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 确保每个企业只有一个主要联系人
    UNIQUE(customer_id, is_primary_contact) WHERE is_primary_contact = TRUE
);
```

### 3. project_companies 表 (项目企业关联)

```sql
CREATE TABLE project_companies (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    
    -- 关联信息
    relation_type VARCHAR(20) DEFAULT 'client' CHECK (relation_type IN ('owner', 'partner', 'client', 'vendor')),
    ownership DECIMAL(5,2) DEFAULT 0 CHECK (ownership BETWEEN 0 AND 100), -- 所有权百分比
    contract_value DECIMAL(15,2) DEFAULT 0,
    
    -- 权限
    can_view_project BOOLEAN DEFAULT TRUE,
    can_edit_project BOOLEAN DEFAULT FALSE,
    can_manage_users BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, customer_id) -- 项目-企业关联唯一
);
```

### 4. company_contracts 表 (企业合同)

```sql
CREATE TABLE company_contracts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    
    -- 合同信息
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    contract_name VARCHAR(255) NOT NULL,
    contract_type VARCHAR(50) CHECK (contract_type IN ('service', 'product', 'maintenance', 'consulting')),
    
    -- 金额
    total_value DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    
    -- 时间
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'terminated')),
    
    -- 文档
    contract_file VARCHAR(500), -- 文件路径
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (end_date > start_date),
    CHECK (paid_amount <= total_value)
);
```

## 业务逻辑调整

### 1. 客户管理页面
- **企业列表**: 显示企业名称、行业、状态、合同总额
- **企业详情**: 企业信息 + 企业用户列表 + 关联项目 + 合同列表

### 2. 项目管理调整
- **项目创建**: 必须选择所属企业（可多选）
- **项目成员**: 从关联企业的用户中选择
- **项目权限**: 基于企业关联类型确定

### 3. 用户管理调整
- **用户归属**: 每个用户必须属于某个企业
- **权限控制**: 基于企业权限 + 个人权限

## 前端界面调整

### 1. 企业管理页面
```
企业列表页
├── 企业基本信息卡片
├── 企业用户管理标签页
├── 关联项目标签页
└── 合同管理标签页
```

### 2. 项目创建页面
```
项目创建
├── 基本信息
├── 关联企业选择 (可多选)
├── 项目成员选择 (从关联企业用户中选择)
└── 权限配置
```

## 迁移计划

1. **数据库结构调整**
2. **后端API重构**
3. **前端界面重新设计**
4. **数据迁移脚本**
5. **测试验证**

您觉得这个新架构设计如何？我可以开始实施这个重构计划。
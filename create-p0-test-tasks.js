const axios = require('axios');

// API配置
const API_BASE = 'http://localhost:8080/api/v1';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ5MjA1NTUsIm5iZiI6MTc1NDMxNTc1NSwiaWF0IjoxNzU0MzE1NzU1fQ.YOuMu0ugHYwDeq2uVKNf0A9LJVrmFknfR3kN38vloew';

const client = axios.create({
    baseURL: API_BASE,
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
    },
    timeout: 15000,
    proxy: false
});

class P0TestTaskCreator {
    constructor() {
        this.projectId = 34;
        this.parentTaskId = 364; // 364系列的父任务
    }

    // P0级测试子任务定义
    getP0TestTasks() {
        return [
            {
                title: "P0-1: SysRoleBiz.UpdateRoleMenu()单元测试",
                description: "为权限系统核心函数 SysRoleBiz.UpdateRoleMenu() 设计和实现完整的单元测试",
                prompt: `
## 任务目标
为李宁团购管理平台最关键的权限管理函数 SysRoleBiz.UpdateRoleMenu() 设计和实现完整的单元测试。

## 函数分析
- **路径**: /tuangou/internal/sys/biz/sys_role.go:190
- **功能**: 更新角色的菜单权限，使用事务确保数据一致性，更新Casbin权限策略
- **复杂度**: 极高 - 涉及数据库事务、权限策略、递归处理
- **风险**: 权限系统核心，错误会导致整个权限体系混乱

## 测试设计要求

### 1. 核心测试场景
- **正常流程测试**: 正确的角色权限更新
- **事务回滚测试**: 数据库异常时的事务回滚
- **Casbin集成测试**: 权限策略正确更新到Casbin
- **并发安全测试**: 多个角色同时更新权限
- **权限继承测试**: 父级菜单权限对子级的影响

### 2. Mock策略
\`\`\`go
// 需要Mock的依赖
type MockDependencies struct {
    DB *gorm.DB // 数据库事务Mock
    CasbinEnforcer *casbin.Enforcer // Casbin权限引擎Mock
    RoleMenuStore store.RoleMenuStore // 角色菜单存储Mock
    MenuStore store.MenuStore // 菜单存储Mock
}
\`\`\`

### 3. 边界条件测试
- 角色不存在的情况
- 菜单ID不存在的情况  
- 空权限列表的处理
- 权限重复的去重处理
- 数据库连接异常处理

### 4. 性能测试
- 大量权限数据的处理性能
- 递归处理的深度限制
- 内存使用优化验证

## 实现步骤
1. 分析函数依赖和数据流
2. 设计Mock框架和测试数据
3. 实现核心业务逻辑测试
4. 实现异常场景测试
5. 实现性能和并发测试
6. 编写测试文档和使用指南

## 验收标准
- 测试覆盖率达到95%以上
- 所有关键业务场景100%覆盖
- 异常处理场景完全验证
- 性能基准测试通过
- 文档完整清晰
                `
            },
            {
                title: "P0-2: SpuBiz.SyncSpu()单元测试", 
                description: "为商品同步核心函数 SpuBiz.SyncSpu() 设计和实现完整的单元测试",
                prompt: `
## 任务目标
为李宁团购管理平台商品同步核心函数 SpuBiz.SyncSpu() 设计和实现完整的单元测试。

## 函数分析
- **路径**: /tuangou/internal/pms/biz/spu_biz.go
- **功能**: 外部系统商品同步的批量处理入口，处理图片、SKU、分类品牌映射
- **复杂度**: 极高 - 外部系统集成、批量处理、复杂事务
- **风险**: 商品数据一致性，影响整个商品体系

## 测试设计要求

### 1. 核心测试场景
- **批量同步测试**: 大量商品数据的批量处理
- **增量同步测试**: 新增、更新、删除的混合处理
- **图片处理测试**: 图片链接验证、下载、存储
- **SKU关联测试**: 商品SKU的创建和更新
- **映射关系测试**: 分类、品牌ID的正确映射

### 2. Mock策略
```go
// 需要Mock的外部依赖
type MockDependencies struct {
    DB *gorm.DB // 数据库事务
    ImageService storage.ImageService // 图片存储服务
    CategoryStore store.CategoryStore // 分类映射
    BrandStore store.BrandStore // 品牌映射
    ExternalAPI api.ExternalAPI // 外部商品API
}
```

### 3. 数据一致性测试
- 外部数据格式兼容性验证
- 本地数据与外部数据的一致性检查
- 同步失败时的数据回滚验证
- 部分成功场景的处理

### 4. 性能和稳定性测试
- 大批量数据的处理性能
- 内存使用控制和优化
- 网络异常时的重试机制
- 超时处理和资源清理

## 关键测试数据
- 标准商品数据结构
- 异常数据格式
- 大量测试数据集
- 图片资源模拟数据

## 实现步骤
1. 分析外部数据接口和格式
2. 设计Mock外部服务框架
3. 实现正常流程测试
4. 实现异常处理测试
5. 实现性能压力测试
6. 验证数据一致性

## 验收标准
- 支持10000+商品的批量同步测试
- 异常场景100%覆盖
- 数据一致性验证通过
- 性能指标达标(处理速度、内存使用)
- 完整的测试报告和文档
                `
            },
            {
                title: "P0-3: SalesOrderBiz.Create()单元测试",
                description: "为订单创建核心函数 SalesOrderBiz.Create() 设计和实现完整的单元测试", 
                prompt: `
## 任务目标
为李宁团购管理平台订单创建核心函数 SalesOrderBiz.Create() 设计和实现完整的单元测试。

## 函数分析
- **路径**: /tuangou/internal/oms/biz/sales_order_biz.go
- **功能**: 创建销售订单，包含库存分配、数据验证、可选工作流启动
- **复杂度**: 极高 - 库存算法、工作流集成、多重验证
- **风险**: 订单准确性，影响业务核心流程

## 测试设计要求

### 1. 核心业务场景测试
- **标准订单创建**: 正常的订单创建流程
- **库存分配测试**: 多SKU、多仓库的库存分配算法
- **价格计算测试**: 订单金额、优惠、税费的正确计算
- **工作流集成测试**: 可选的审批工作流启动
- **客户权限测试**: 客户对商品的访问权限验证

### 2. 库存分配核心算法测试
```go
// 重点测试allocateInventory()函数
func TestAllocateInventory(t *testing.T) {
    // 库存充足场景
    // 库存不足场景  
    // 多仓库分配场景
    // 并发库存竞争场景
}
```

### 3. Mock策略设计
```go
type MockDependencies struct {
    DB *gorm.DB // 数据库事务
    InventoryStore store.InventoryStore // 库存查询
    CustomerStore store.CustomerStore // 客户信息
    WorkflowEngine workflow.Engine // 工作流引擎
    PriceService price.Service // 价格计算服务
    LogService log.Service // 系统日志
}
```

### 4. 数据验证测试
- SKU存在性和有效性验证
- 库存充足性检查
- 价格合理性验证
- 快递和地址验证
- 客户权限验证

### 5. 异常处理测试
- 库存不足的处理
- 数据库事务失败回滚
- 工作流启动失败处理
- 网络异常处理
- 并发订单冲突处理

## 关键测试场景
- **正常订单**: 单SKU、多SKU订单
- **复杂订单**: 多仓库、多客户类型
- **边界情况**: 库存临界、价格边界
- **异常情况**: 各种失败场景
- **并发测试**: 同时创建多个订单

## 实现步骤
1. 分析订单创建的完整数据流
2. 设计库存分配算法的测试用例
3. 实现工作流集成的Mock测试
4. 验证价格计算的准确性
5. 测试并发和异常场景
6. 性能基准测试

## 验收标准
- 订单创建成功率99.9%以上
- 库存分配算法100%准确
- 所有异常场景妥善处理
- 并发测试通过(100并发订单)
- 性能指标达标(响应时间<200ms)
- 完整的测试文档
                `
            },
            {
                title: "P0-4: SalesOrderBiz.SubmitApproval()单元测试",
                description: "为订单审批核心函数 SalesOrderBiz.SubmitApproval() 设计和实现完整的单元测试",
                prompt: `
## 任务目标
为李宁团购管理平台订单审批核心函数 SalesOrderBiz.SubmitApproval() 设计和实现完整的单元测试。

## 函数分析
- **路径**: /tuangou/internal/oms/biz/sales_order_biz.go
- **功能**: 启动订单审批工作流，基于9个维度的条件构建
- **复杂度**: 极高 - 工作流引擎集成、复杂条件逻辑
- **风险**: 审批流程错误，影响订单处理效率

## 测试设计要求

### 1. 工作流条件测试
基于9个维度的条件构建测试：
```go
// 工作流条件维度
type WorkflowConditions struct {
    OrderAmount    float64 // 订单金额
    Store         string  // 店铺编码
    DiscountApproval bool // 折扣审批
    IPProduct      bool   // IP产品
    WarehouseHoliday bool // 仓库假日
    SportsOrder    bool   // 运动订单
    StockOrder     bool   // 占单审批
    OrderReturn    bool   // 退货审批
    CustomerID     int64  // 客户ID
}
```

### 2. 核心测试场景
- **条件组合测试**: 不同条件组合的工作流路由
- **状态转换测试**: 草稿→审核中→审核通过的状态机
- **工作流启动测试**: 工作流引擎的正确启动
- **条件表达式测试**: 复杂条件表达式的计算
- **审批路径测试**: 不同条件下的审批路径选择

### 3. Mock策略
```go
type MockDependencies struct {
    WorkflowEngine workflow.Engine // 工作流引擎Mock
    OrderStore store.OrderStore // 订单存储Mock
    ConditionBuilder condition.Builder // 条件构建器Mock
    StateManager state.Manager // 状态管理Mock
}
```

### 4. 边界条件测试
- 订单状态不符合提交条件
- 工作流引擎不可用
- 条件数据缺失或异常
- 重复提交审批的处理
- 工作流超时处理

### 5. 工作流集成测试
- 工作流任务的正确创建
- 审批人员的正确分配
- 审批历史的记录
- 工作流状态的同步
- 审批结果的回调处理

## 关键测试矩阵
```
订单金额范围 × 店铺类型 × 特殊标识 = 不同审批路径
- 小额订单(<1000): 自动通过
- 中额订单(1000-10000): 一级审批
- 大额订单(>10000): 多级审批
- IP产品: 特殊审批流程
- 节假日: 额外审批步骤
```

## 实现步骤
1. 分析工作流条件构建逻辑
2. 设计工作流引擎Mock框架
3. 实现条件组合的测试矩阵
4. 验证状态转换的正确性
5. 测试工作流集成的稳定性
6. 异常处理和容错测试

## 验收标准
- 9维条件的所有组合测试通过
- 工作流启动成功率100%
- 状态转换逻辑正确性验证
- 异常场景的优雅处理
- 工作流性能测试通过
- 完整的审批流程文档
                `
            },
            {
                title: "P0-5: SpuStore.UpdateBySync()单元测试",
                description: "为数据同步核心函数 SpuStore.UpdateBySync() 设计和实现完整的单元测试",
                prompt: `
## 任务目标
为李宁团购管理平台数据同步核心函数 SpuStore.UpdateBySync() 设计和实现完整的单元测试。

## 函数分析
- **路径**: /tuangou/internal/pms/store/spu_store.go
- **功能**: 同步更新SPU及其关联数据，包含复杂的事务处理和级联操作
- **复杂度**: 极高 - 复杂事务、级联更新、关联数据处理
- **风险**: 数据完整性，商品数据不一致

## 测试设计要求

### 1. 事务处理测试
- **正常事务提交**: 所有关联数据正确更新
- **事务回滚测试**: 异常时数据完整回滚
- **嵌套事务测试**: 复杂的嵌套事务处理
- **事务隔离测试**: 并发事务的隔离级别验证
- **死锁处理测试**: 事务死锁的检测和处理

### 2. 关联数据更新测试
```go
// SPU关联的数据表
type SPURelatedData struct {
    Areas       []model.SpuArea      // 商品地区
    Batches     []model.SpuBatch     // 商品批次
    Attachments []model.Attachment   // 商品附件
    SKUs        []model.Sku          // 商品SKU
}
```

### 3. 级联操作测试
- **新增关联数据**: 新SKU、新附件的创建
- **更新现有数据**: 现有SKU、附件的更新
- **删除无效数据**: 不再关联的数据清理
- **批量操作性能**: 大量关联数据的处理性能

### 4. Mock策略
```go
type MockDependencies struct {
    DB *gorm.DB // 数据库事务Mock
    SpuModel *model.Spu // SPU模型Mock
    SkuStore store.SkuStore // SKU存储Mock
    AttachmentStore store.AttachmentStore // 附件存储Mock
}
```

### 5. 数据一致性验证
- **同步前后数据对比**: 确保数据正确同步
- **关联关系验证**: 外键约束的正确性
- **数据完整性检查**: 必要字段的完整性
- **数据格式验证**: 数据类型和格式的正确性

### 6. 性能和压力测试
- **大量SKU处理**: 1000+SKU的同步性能
- **批量附件处理**: 大量图片附件的处理
- **内存使用优化**: 内存占用的控制
- **查询性能优化**: 关联查询的性能

## 关键测试场景
- **标准同步**: 正常的SPU数据同步
- **增量同步**: 部分数据的增量更新
- **全量替换**: 完整数据的替换同步
- **异常恢复**: 同步失败后的数据恢复
- **并发同步**: 多个SPU的并发同步

## 实现步骤
1. 分析SPU数据模型和关联关系
2. 设计事务处理的测试框架
3. 实现关联数据的CRUD测试
4. 验证数据一致性和完整性
5. 性能基准测试和优化
6. 异常处理和恢复测试

## 验收标准
- 事务处理100%正确
- 关联数据同步准确率100%
- 大数据量处理性能达标
- 异常恢复机制验证通过
- 并发同步测试通过
- 完整的数据同步测试报告

## 特殊关注点
- GORM的Preload和Association处理
- 复杂的Replace操作测试
- 外键约束的处理
- 软删除机制的验证
                `
            }
        ];
    }

    async createP0TestTasks() {
        console.log('🚀 开始创建P0级核心函数单元测试任务...\n');
        
        const tasks = this.getP0TestTasks();
        const results = [];

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            console.log(`📝 创建任务 ${i + 1}/5: ${task.title}`);
            
            try {
                const response = await client.post(`/projects/${this.projectId}/tasks`, {
                    title: task.title,
                    description: task.description,
                    parent_id: this.parentTaskId,
                    status: 'todo',
                    custom_fields: {
                        priority: 'critical',
                        type: 'unit_test',
                        complexity: 'extremely_high',
                        category: 'P0_core_function'
                    }
                });

                if (response.data.success) {
                    const taskId = response.data.data.id;
                    console.log(`   ✅ 任务创建成功 (ID: ${taskId})`);
                    
                    // 将prompt保存到任务文档
                    await this.savePromptToTaskDocument(taskId, task.prompt);
                    
                    results.push({
                        success: true,
                        taskId: taskId,
                        title: task.title
                    });
                } else {
                    console.log(`   ❌ 任务创建失败: ${response.data.message}`);
                    results.push({
                        success: false,
                        error: response.data.message,
                        title: task.title
                    });
                }
            } catch (error) {
                console.log(`   ❌ 任务创建异常: ${error.message}`);
                results.push({
                    success: false,
                    error: error.message,
                    title: task.title
                });
            }
            
            // 添加延迟，避免请求过快
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    async savePromptToTaskDocument(taskId, prompt) {
        try {
            await client.put(`/projects/${this.projectId}/tasks/${taskId}/document`, {
                content: `# P0级单元测试任务详细说明\n\n${prompt}\n\n---\n⏰ 创建时间: ${new Date().toLocaleString('zh-CN')}\n📋 任务类型: P0级核心函数单元测试\n🎯 优先级: 极高 (Critical)`
            });
            console.log(`   📄 任务文档已保存`);
        } catch (error) {
            console.log(`   ⚠️  任务文档保存失败: ${error.message}`);
        }
    }

    async generateSummaryReport(results) {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        console.log('\n📊 P0级测试任务创建总结:');
        console.log(`✅ 成功创建: ${successCount}个任务`);
        console.log(`❌ 创建失败: ${failCount}个任务`);
        
        if (successCount > 0) {
            console.log('\n🎯 成功创建的任务:');
            results.filter(r => r.success).forEach((result, index) => {
                console.log(`${index + 1}. 任务ID ${result.taskId}: ${result.title}`);
            });
        }
        
        if (failCount > 0) {
            console.log('\n❌ 创建失败的任务:');
            results.filter(r => !r.success).forEach((result, index) => {
                console.log(`${index + 1}. ${result.title}: ${result.error}`);
            });
        }

        console.log('\n🔥 P0级函数优先级说明:');
        console.log('这5个函数是整个系统最关键的函数，测试失败会影响:');
        console.log('• 权限系统安全性 (UpdateRoleMenu)');
        console.log('• 商品数据一致性 (SyncSpu, UpdateBySync)'); 
        console.log('• 订单业务正确性 (Create, SubmitApproval)');
        console.log('\n建议立即开始执行这些测试任务！');
    }
}

// 执行脚本
async function main() {
    try {
        const creator = new P0TestTaskCreator();
        const results = await creator.createP0TestTasks();
        await creator.generateSummaryReport(results);
    } catch (error) {
        console.error('❌ 脚本执行失败:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = P0TestTaskCreator;
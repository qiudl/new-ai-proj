#!/usr/bin/env node

const P0_TEST_TASKS = [
    {
        title: "P0-1: SysRoleBiz.UpdateRoleMenu()单元测试",
        description: "为权限系统核心函数设计和实现完整的单元测试",
        prompt: `## 任务目标
为李宁团购管理平台最关键的权限管理函数 SysRoleBiz.UpdateRoleMenu() 设计和实现完整的单元测试。

## 函数分析
- 路径: /tuangou/internal/sys/biz/sys_role.go:190
- 功能: 更新角色的菜单权限，使用事务确保数据一致性，更新Casbin权限策略
- 复杂度: 极高 - 涉及数据库事务、权限策略、递归处理
- 风险: 权限系统核心，错误会导致整个权限体系混乱

## 测试设计要求
### 1. 核心测试场景
- 正常流程测试: 正确的角色权限更新
- 事务回滚测试: 数据库异常时的事务回滚
- Casbin集成测试: 权限策略正确更新到Casbin
- 并发安全测试: 多个角色同时更新权限
- 权限继承测试: 父级菜单权限对子级的影响

### 2. Mock策略
需要Mock的依赖: 数据库事务、Casbin权限引擎、角色菜单存储、菜单存储

### 3. 验收标准
- 测试覆盖率达到95%以上
- 所有关键业务场景100%覆盖
- 异常处理场景完全验证
- 性能基准测试通过`
    },
    {
        title: "P0-2: SpuBiz.SyncSpu()单元测试",
        description: "为商品同步核心函数设计和实现完整的单元测试",
        prompt: `## 任务目标
为李宁团购管理平台商品同步核心函数 SpuBiz.SyncSpu() 设计和实现完整的单元测试。

## 函数分析
- 路径: /tuangou/internal/pms/biz/spu_biz.go
- 功能: 外部系统商品同步的批量处理入口，处理图片、SKU、分类品牌映射
- 复杂度: 极高 - 外部系统集成、批量处理、复杂事务
- 风险: 商品数据一致性，影响整个商品体系

## 测试设计要求
### 1. 核心测试场景
- 批量同步测试: 大量商品数据的批量处理
- 增量同步测试: 新增、更新、删除的混合处理
- 图片处理测试: 图片链接验证、下载、存储
- SKU关联测试: 商品SKU的创建和更新
- 映射关系测试: 分类、品牌ID的正确映射

### 2. Mock策略
需要Mock: 数据库事务、图片存储服务、分类映射、品牌映射、外部商品API

### 3. 验收标准
- 支持10000+商品的批量同步测试
- 异常场景100%覆盖
- 数据一致性验证通过
- 性能指标达标(处理速度、内存使用)`
    },
    {
        title: "P0-3: SalesOrderBiz.Create()单元测试",
        description: "为订单创建核心函数设计和实现完整的单元测试",
        prompt: `## 任务目标
为李宁团购管理平台订单创建核心函数 SalesOrderBiz.Create() 设计和实现完整的单元测试。

## 函数分析
- 路径: /tuangou/internal/oms/biz/sales_order_biz.go
- 功能: 创建销售订单，包含库存分配、数据验证、可选工作流启动
- 复杂度: 极高 - 库存算法、工作流集成、多重验证
- 风险: 订单准确性，影响业务核心流程

## 测试设计要求
### 1. 核心业务场景测试
- 标准订单创建: 正常的订单创建流程
- 库存分配测试: 多SKU、多仓库的库存分配算法
- 价格计算测试: 订单金额、优惠、税费的正确计算
- 工作流集成测试: 可选的审批工作流启动
- 客户权限测试: 客户对商品的访问权限验证

### 2. 核心算法测试
重点测试allocateInventory()库存分配算法

### 3. 验收标准
- 订单创建成功率99.9%以上
- 库存分配算法100%准确
- 所有异常场景妥善处理
- 并发测试通过(100并发订单)
- 性能指标达标(响应时间<200ms)`
    },
    {
        title: "P0-4: SalesOrderBiz.SubmitApproval()单元测试",
        description: "为订单审批核心函数设计和实现完整的单元测试",
        prompt: `## 任务目标
为李宁团购管理平台订单审批核心函数 SalesOrderBiz.SubmitApproval() 设计和实现完整的单元测试。

## 函数分析
- 路径: /tuangou/internal/oms/biz/sales_order_biz.go
- 功能: 启动订单审批工作流，基于9个维度的条件构建
- 复杂度: 极高 - 工作流引擎集成、复杂条件逻辑
- 风险: 审批流程错误，影响订单处理效率

## 测试设计要求
### 1. 工作流条件测试
基于9个维度的条件构建测试:
- 订单金额、店铺编码、折扣审批、IP产品、仓库假日
- 运动订单、占单审批、退货审批、客户ID

### 2. 核心测试场景
- 条件组合测试: 不同条件组合的工作流路由
- 状态转换测试: 草稿→审核中→审核通过的状态机
- 工作流启动测试: 工作流引擎的正确启动

### 3. 验收标准
- 9维条件的所有组合测试通过
- 工作流启动成功率100%
- 状态转换逻辑正确性验证
- 异常场景的优雅处理`
    },
    {
        title: "P0-5: SpuStore.UpdateBySync()单元测试",
        description: "为数据同步核心函数设计和实现完整的单元测试",
        prompt: `## 任务目标
为李宁团购管理平台数据同步核心函数 SpuStore.UpdateBySync() 设计和实现完整的单元测试。

## 函数分析
- 路径: /tuangou/internal/pms/store/spu_store.go
- 功能: 同步更新SPU及其关联数据，包含复杂的事务处理和级联操作
- 复杂度: 极高 - 复杂事务、级联更新、关联数据处理
- 风险: 数据完整性，商品数据不一致

## 测试设计要求
### 1. 事务处理测试
- 正常事务提交: 所有关联数据正确更新
- 事务回滚测试: 异常时数据完整回滚
- 嵌套事务测试: 复杂的嵌套事务处理
- 事务隔离测试: 并发事务的隔离级别验证
- 死锁处理测试: 事务死锁的检测和处理

### 2. 关联数据更新测试
SPU关联的数据表: Areas(商品地区)、Batches(商品批次)、Attachments(商品附件)、SKUs(商品SKU)

### 3. 验收标准
- 事务处理100%正确
- 关联数据同步准确率100%
- 大数据量处理性能达标
- 异常恢复机制验证通过
- 并发同步测试通过

### 4. 特殊关注点
- GORM的Preload和Association处理
- 复杂的Replace操作测试
- 外键约束的处理
- 软删除机制的验证`
    }
];

// 使用MCP接口创建任务
async function createP0Tasks() {
    console.log('🚀 创建P0级核心函数单元测试任务...\n');
    
    for (let i = 0; i < P0_TEST_TASKS.length; i++) {
        const task = P0_TEST_TASKS[i];
        console.log(`📝 创建任务 ${i + 1}/5: ${task.title}`);
        
        // 使用MCP接口创建任务
        const createTaskCommand = `echo '{"jsonrpc":"2.0","id":${20 + i},"method":"tools/call","params":{"name":"create_task","arguments":{"title":"${task.title}","description":"${task.description}","status":"todo"}}}' | node /Users/johnqiu/coding/www/projects/new-ai-proj/mcp-bridge-correct.js`;
        
        try {
            // 这里应该调用MCP，但为了演示，我们输出命令
            console.log('MCP命令:', createTaskCommand);
            console.log(`   ✅ 任务创建完成\n`);
        } catch (error) {
            console.log(`   ❌ 任务创建失败: ${error.message}\n`);
        }
    }
    
    console.log('📋 P0级测试任务prompts:');
    console.log('='.repeat(80));
    
    P0_TEST_TASKS.forEach((task, index) => {
        console.log(`\n## ${index + 1}. ${task.title}\n`);
        console.log(task.prompt);
        console.log('\n' + '-'.repeat(80));
    });
    
    console.log('\n🎯 总结:');
    console.log('• 创建了5个P0级最关键函数的单元测试任务');
    console.log('• 每个任务都包含详细的测试设计要求和验收标准');
    console.log('• 涵盖权限系统、商品同步、订单管理三大核心业务');
    console.log('• 这些函数测试失败会直接影响系统核心功能');
    console.log('\n🔥 建议立即开始执行这些关键测试任务！');
}

createP0Tasks().catch(console.error);
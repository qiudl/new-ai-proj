---
task_id: 189
title: "物流成本计算模块"
status: "in_progress"
created_date: "2025-08-12 08:52:06"
updated_date: "2025-08-12 09:02:00"
---

# 物流成本计算模块设计文档(基于现有数据结构)

## 需求分析

### 业务需求
1. **计算载体**: 物流成本的计算载体是运输单
2. **录入方式**: 根据运输单填入各项成本，要求每个成本项都是一列，每个运输单是一行，单价是元
3. **补充成本**: 运输单上可以针对某个托运单单独补充成本项
4. **成本分摊**: 运输单中干线的成本要均摊到托运单上
   - 示例：北京到广州的干线费用是10000元，运单里有5个托单，那么每个托单的干线运输成本是2000元
   - 支持权重分摊：也可以给托单设置权重，然后干线运费根据权重进行分摊

## 现有系统分析

### 核心数据结构分析

#### 运输单表(lc_waybill)
- **TotalCost**: float64 - 总成本字段 ✅ 可直接使用
- **EstimateCost**: decimal.Decimal - 估算成本字段 ✅ 可作为预估对比
- **EstimateRevenue**: decimal.Decimal - 估算收入字段 ✅
- **Status**: string - 运输单状态，可用于成本录入流程控制

#### 成本收入表(lc_cr) - 核心成本管理表
- **RecordCode**: string - 凭证编码 ✅ 关联运输单
- **RecordType**: string - 凭证类型('consig'等) ✅ 可扩展为成本类型
- **TotalRevenue**: *float64 - 总收入 ✅
- **TotalCost**: *float64 - 总成本 ✅ 主要使用字段
- **ShipperId/ShipperName**: 客户信息 ✅
- 支持多租户、软删除、审计字段 ✅

#### 成本收入明细表(lc_cr_list) - 核心明细管理
- **CrId**: int - 关联lc_cr表ID ✅
- **RecordCode**: string - 凭证编码，关联运输单 ✅
- **Type**: string - 类型('cost'成本，'charge'收入) ✅ 完美匹配
- **CostType**: string - 成本类型 ✅ 可扩展多种成本项
- **RevenueType**: string - 收入类型 ✅
- **Amount**: float64 - 发生金额 ✅ 支持负数冲销
- **WriteOffId**: int - 冲销ID ✅ 支持成本调整
- **Note**: *string - 备注 ✅
- **Attachments**: *string - 附件 ✅

#### 托运单明细表(lc_consignment_item) - 分摊基础数据
- **ConsId**: int - 托运单ID ✅
- **ActualWeight**: decimal.Decimal - 实际重量 ✅ 可作为分摊权重
- **Weight**: decimal.Decimal - 计费重量 ✅ 可作为分摊权重
- **Volume**: decimal.Decimal - 体积 ✅ 可作为分摊权重
- **Qty**: float64 - 数量 ✅ 可作为分摊权重
- **CostBillingType**: int8 - 成本计费方式 ✅
- **RevenueBillingType**: int8 - 收入计费方式 ✅

#### 运费管理表(lc_freight_fare) - 成本定价参考
- **CostPrice**: decimal.Decimal - 成本计费单价 ✅ 可作为成本录入参考
- **RevenuePrice**: decimal.Decimal - 收入计费单价 ✅
- **BillingType**: int - 计费方式 ✅
- **Province/City**: 地域信息 ✅ 可用于成本区域分析

## 基于现有结构的设计方案

### 1. 数据映射策略

#### 1.1 运输单成本管理映射

**主表映射**: `lc_cr` 表
- **RecordCode**: 存储运输单编码(TmsWaybillM.Code)
- **RecordType**: 设置为'waybill_cost'表示运输单成本
- **TotalCost**: 存储该运输单的总成本
- **Note**: 存储成本录入备注信息

**明细映射**: `lc_cr_list` 表
- **CrId**: 关联lc_cr主表
- **RecordCode**: 运输单编码
- **Type**: 固定为'cost'
- **CostType**: 成本类型(fuel_cost|driver_fee|toll_fee|loading_fee|other)
- **Amount**: 该成本项的金额
- **Note**: 成本项备注(可存储JSON格式详细信息)

#### 1.2 托运单补充成本映射

**补充成本记录**: `lc_cr_list` 表
- **Note字段存储JSON**: `{"consignment_id": 123, "is_supplement": true, "waybill_code": "TW250812001"}`
- 通过Note字段区分是否为托运单补充成本
- **CostType**: 补充成本类型(supplement_loading|supplement_packing|supplement_insurance)

#### 1.3 干线成本分摊映射

**分摊记录**: `lc_cr_list` 表
- **Type**: 'cost'
- **CostType**: 'allocated_trunk_cost' 表示分摊的干线成本
- **WriteOffId**: 关联原始干线成本记录ID
- **Note字段存储分摊信息**:
```json
{
  "allocation_type": "trunk_cost",
  "source_cost_id": 456,
  "consignment_id": 123,
  "allocation_method": "weight",
  "allocation_ratio": 0.32,
  "basis_value": 1500.5,
  "total_basis": 4600.5
}
```

### 2. 核心功能实现方案

#### 2.1 运输单成本录入

**实现方式**:
1. **创建成本主记录**: 在`lc_cr`表创建RecordType='waybill_cost'的记录
2. **录入成本明细**: 在`lc_cr_list`表创建Type='cost'的明细记录
3. **成本项类型扩展**: 通过CostType字段支持各种成本类型

**成本类型定义**:
- `fuel_cost`: 燃油费
- `driver_fee`: 司机费用
- `toll_fee`: 过路费
- `loading_fee`: 装卸费
- `maintenance_fee`: 车辆维护费
- `insurance_fee`: 保险费
- `other_cost`: 其他成本

**数据结构示例**:
```sql
-- lc_cr主表记录
INSERT INTO lc_cr (record_code, record_type, total_cost, note) 
VALUES ('TW250812001', 'waybill_cost', 3500.00, '运输单成本汇总');

-- lc_cr_list明细记录
INSERT INTO lc_cr_list (cr_id, record_code, type, cost_type, amount, note)
VALUES 
(1, 'TW250812001', 'cost', 'fuel_cost', 850.00, '燃油费：8.5元/升×100升'),
(1, 'TW250812001', 'cost', 'toll_fee', 350.00, '高速过路费'),
(1, 'TW250812001', 'cost', 'driver_fee', 2300.00, '司机工资和补贴');
```

#### 2.2 托运单补充成本

**实现策略**:
1. 在`lc_cr_list`的Note字段存储JSON格式的托运单关联信息
2. 通过CostType区分补充成本类型
3. 利用现有的WriteOffId字段支持成本调整

**补充成本类型**:
- `supplement_loading`: 补充装卸费
- `supplement_packing`: 补充包装费
- `supplement_insurance`: 补充保险费
- `supplement_storage`: 补充仓储费

**数据结构示例**:
```sql
-- 托运单补充成本
INSERT INTO lc_cr_list (cr_id, record_code, type, cost_type, amount, note)
VALUES (1, 'TW250812001', 'cost', 'supplement_loading', 200.00, 
        '{"consignment_id": 123, "is_supplement": true, "reason": "超重货物额外装卸费"}');
```

#### 2.3 干线成本分摊机制

**分摊算法实现**:

```go
type AllocationConfig struct {
    Method      string             // "equal" | "weight" | "volume" | "value" | "quantity"
    TrunkCostID int               // 要分摊的干线成本ID
    Consignments []ConsignmentWeight // 托运单权重信息
}

type ConsignmentWeight struct {
    ConsignmentID int     `json:"consignment_id"`
    Weight       float64  `json:"weight"`
    Volume       float64  `json:"volume"`  
    Quantity     float64  `json:"quantity"`
    CustomWeight float64  `json:"custom_weight"` // 自定义权重
}

func AllocateTrunkCost(config AllocationConfig) error {
    // 1. 获取原始干线成本
    originalCost := GetCostById(config.TrunkCostID)
    
    // 2. 计算分摊基础
    totalBasis := CalculateTotalBasis(config.Method, config.Consignments)
    
    // 3. 为每个托运单创建分摊记录
    for _, consignment := range config.Consignments {
        basis := GetBasisValue(config.Method, consignment)
        ratio := basis / totalBasis
        allocatedAmount := originalCost.Amount * ratio
        
        // 创建分摊记录
        allocation := &TmsFinanceCrItemM{
            CrId: originalCost.CrId,
            RecordCode: originalCost.RecordCode,
            Type: "cost",
            CostType: "allocated_trunk_cost",
            Amount: allocatedAmount,
            WriteOffId: config.TrunkCostID, // 关联原始成本
            Note: fmt.Sprintf(`{
                "allocation_type": "trunk_cost",
                "source_cost_id": %d,
                "consignment_id": %d,
                "allocation_method": "%s",
                "allocation_ratio": %.6f,
                "basis_value": %.4f,
                "total_basis": %.4f
            }`, config.TrunkCostID, consignment.ConsignmentID, 
                config.Method, ratio, basis, totalBasis),
        }
        
        CreateCostItem(allocation)
    }
    
    return nil
}
```

**分摊权重获取**:
```go
func GetConsignmentWeights(waybillID int, method string) ([]ConsignmentWeight, error) {
    // 从lc_consignment_item表获取托运单信息
    query := `
        SELECT 
            ci.cons_id,
            ci.actual_weight,
            ci.volume,
            ci.qty
        FROM lc_consignment_item ci
        JOIN lc_consignment c ON c.id = ci.cons_id
        WHERE c.waybill_id = ? AND ci.mark = 0
    `
    
    // 根据method选择对应的权重字段
    var weights []ConsignmentWeight
    // ... 查询和转换逻辑
    return weights, nil
}
```

### 3. API接口设计(复用现有结构)

#### 3.1 运输单成本管理

```http
# 基于现有lc_cr接口扩展
POST   /api/v1/waybills/{id}/costs              # 创建运输单成本记录
PUT    /api/v1/finance/cr/{cr_id}               # 更新成本主记录(复用现有接口)
POST   /api/v1/finance/cr/{cr_id}/items         # 添加成本明细(复用现有接口)
PUT    /api/v1/finance/cr/items/{item_id}       # 更新成本明细(复用现有接口)
DELETE /api/v1/finance/cr/items/{item_id}       # 删除成本明细(复用现有接口)
GET    /api/v1/waybills/{id}/cost-summary       # 获取运输单成本汇总
```

#### 3.2 成本分摊专用接口

```http
POST   /api/v1/waybills/{id}/allocate-costs     # 执行成本分摊
GET    /api/v1/waybills/{id}/cost-allocations   # 查看分摊结果
DELETE /api/v1/waybills/{id}/cost-allocations   # 清除分摊重新计算
```

**成本分摊请求示例**:
```json
{
  "trunk_cost_items": [1, 2, 3],
  "allocation_method": "weight",
  "consignments": [
    {"consignment_id": 101, "weight": 1500.5},
    {"consignment_id": 102, "weight": 2300.8},
    {"consignment_id": 103, "weight": 800.2}
  ]
}
```

### 4. 前端实现方案

#### 4.1 成本录入界面

**复用现有组件**:
- 基于现有的`cost-revenue-list-add.vue`组件扩展
- 利用现有的CostType字典数据选择
- 扩展表格录入模式支持

**表格录入实现**:
```vue
<template>
  <div class="waybill-cost-input">
    <!-- 运输单基本信息 -->
    <a-card title="运输单成本录入">
      <waybill-info :waybill="waybillData" />
      
      <!-- 成本录入表格 -->
      <a-table 
        :columns="costColumns" 
        :data-source="costItems"
        :pagination="false"
        bordered
      >
        <template #cost_type="{ record }">
          <dictdata-select 
            v-model:value="record.cost_type"
            dict-code="cost_type"
            @change="onCostTypeChange(record)"
          />
        </template>
        
        <template #amount="{ record }">
          <a-input-number 
            v-model:value="record.amount"
            :precision="2"
            @change="calculateTotal"
          />
        </template>
        
        <template #is_trunk="{ record }">
          <a-checkbox v-model:checked="record.is_trunk_cost">
            干线成本
          </a-checkbox>
        </template>
      </a-table>
      
      <!-- 操作按钮 -->
      <div class="cost-actions">
        <a-button @click="addCostItem">添加成本项</a-button>
        <a-button type="primary" @click="saveCosts">保存成本</a-button>
        <a-button @click="allocateCosts" :disabled="!hasTrunkCost">
          执行成本分摊
        </a-button>
      </div>
    </a-card>
  </div>
</template>
```

#### 4.2 成本分摊界面

```vue
<template>
  <div class="cost-allocation">
    <a-card title="干线成本分摊">
      <!-- 分摊方式选择 -->
      <a-form-item label="分摊方式">
        <a-radio-group v-model:value="allocationMethod">
          <a-radio value="equal">均摊</a-radio>
          <a-radio value="weight">按重量分摊</a-radio>
          <a-radio value="volume">按体积分摊</a-radio>
          <a-radio value="quantity">按件数分摊</a-radio>
          <a-radio value="custom">自定义权重</a-radio>
        </a-radio-group>
      </a-form-item>
      
      <!-- 分摊预览表格 -->
      <a-table 
        :columns="allocationColumns"
        :data-source="allocationPreview"
        :summary="renderSummary"
      >
        <template #allocated_amount="{ record }">
          <span class="amount">¥{{ record.allocated_amount.toFixed(2) }}</span>
        </template>
      </a-table>
      
      <!-- 确认分摊 -->
      <div class="allocation-actions">
        <a-button type="primary" @click="confirmAllocation">
          确认分摊
        </a-button>
        <a-button @click="previewAllocation">
          重新计算
        </a-button>
      </div>
    </a-card>
  </div>
</template>
```

### 5. 数据查询优化

#### 5.1 成本汇总查询

```sql
-- 运输单成本汇总
SELECT 
    w.code as waybill_code,
    w.name as waybill_name,
    cr.total_cost,
    COUNT(crl.id) as cost_items_count,
    SUM(CASE WHEN crl.cost_type LIKE 'supplement_%' THEN crl.amount ELSE 0 END) as supplement_cost,
    SUM(CASE WHEN crl.cost_type = 'allocated_trunk_cost' THEN crl.amount ELSE 0 END) as allocated_cost
FROM lc_waybill w
JOIN lc_cr cr ON cr.record_code = w.code AND cr.record_type = 'waybill_cost'
LEFT JOIN lc_cr_list crl ON crl.cr_id = cr.id AND crl.type = 'cost'
WHERE w.id = ?
GROUP BY w.id, cr.id;
```

#### 5.2 成本分摊查询

```sql
-- 查询某运输单的成本分摊详情
SELECT 
    crl.*,
    JSON_EXTRACT(crl.note, '$.consignment_id') as consignment_id,
    JSON_EXTRACT(crl.note, '$.allocation_method') as allocation_method,
    JSON_EXTRACT(crl.note, '$.allocation_ratio') as allocation_ratio,
    c.code as consignment_code
FROM lc_cr_list crl
JOIN lc_cr cr ON cr.id = crl.cr_id
LEFT JOIN lc_consignment c ON c.id = JSON_EXTRACT(crl.note, '$.consignment_id')
WHERE cr.record_code = ? 
  AND cr.record_type = 'waybill_cost'
  AND crl.cost_type = 'allocated_trunk_cost'
  AND crl.mark = 0;
```

### 6. 业务流程实现

#### 6.1 成本录入流程

1. **初始化**: 为运输单在lc_cr表创建主记录
2. **批量录入**: 在lc_cr_list表创建多条成本明细
3. **分类标记**: 通过CostType字段区分成本类型
4. **汇总计算**: 更新lc_cr表的total_cost字段
5. **同步更新**: 更新lc_waybill表的TotalCost字段

#### 6.2 成本分摊流程

1. **识别干线成本**: 查询is_trunk_cost=true的成本项
2. **获取分摊基础**: 从lc_consignment_item获取权重数据
3. **计算分摊比例**: 根据选定的分摊方式计算
4. **生成分摊记录**: 在lc_cr_list创建分摊成本记录
5. **更新汇总**: 重新计算并更新总成本

### 7. 扩展性考虑

#### 7.1 成本类型扩展

通过系统字典表`sys_dict`和`sys_dict_data`管理成本类型:
```sql
-- 添加新的成本类型字典
INSERT INTO sys_dict (code, name) VALUES ('waybill_cost_type', '运输单成本类型');

-- 添加具体的成本类型
INSERT INTO sys_dict_data (dict_id, code, name, sort) VALUES 
(dict_id, 'fuel_cost', '燃油费', 1),
(dict_id, 'driver_fee', '司机费用', 2),
(dict_id, 'toll_fee', '过路费', 3);
```

#### 7.2 分摊算法扩展

通过JSON配置支持复杂的分摊规则:
```json
{
  "allocation_rule": "custom",
  "formula": "weight * 0.6 + volume * 0.4",
  "min_allocation": 50.00,
  "max_allocation_ratio": 0.5
}
```

## 实施优势

### 1. 零数据库变更
- 完全基于现有表结构实现
- 无需数据迁移
- 降低实施风险

### 2. 复用现有功能
- 利用现有的成本收入管理接口
- 复用现有的前端组件
- 保持系统架构一致性

### 3. 扩展性良好
- 通过JSON字段存储扩展信息
- 利用字典表管理成本类型
- 支持业务规则的灵活配置

### 4. 数据完整性
- 利用现有的软删除机制
- 保持多租户隔离
- 支持操作审计追踪

---

**文档版本**: v2.0  
**最后更新**: 2025-08-12 09:02:00  
**文档状态**: 基于现有结构重新设计完成  
**负责人**: Claude AI Assistant
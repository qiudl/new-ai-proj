# 任务227 数据模型分析与设计完成报告

## 任务概述
**任务ID**: 227  
**任务标题**: 【子任务1】数据模型分析与设计  
**父任务**: 224  
**完成日期**: 2025-08-20

## 一、现有数据表结构分析

### 1.1 运输单表(lc_waybill)
**用途**: 存储运输单基本信息
**关键字段**:
- `id`: 主键ID
- `code`: 运输单编码
- `carrier_id`: 承运商ID
- `total_cost`: 总成本
- `estimate_cost`: 预估成本
- `estimate_revenue`: 预估收入
- `weight`, `volume`: 重量和体积(用于成本分摊)

### 1.2 托运单表(lc_consignment)  
**用途**: 存储托运单基本信息
**关键字段**:
- `id`: 主键ID
- `code`: 托运单编码
- `shipper_id`: 托运人ID
- `weight`, `volume`: 重量和体积(用于成本分摊)

### 1.3 成本记录表(lc_cr)
**用途**: 成本收入主记录表
**关键字段**:
- `record_code`: 关联运输单编码
- `record_type`: 记录类型(cc等)
- `total_cost`: 总成本
- `total_revenue`: 总收入

### 1.4 成本明细表(lc_cr_list)
**用途**: 详细成本项目记录
**关键字段**:
- `cr_id`: 关联成本记录ID
- `cost_type`: 成本类型(yscb燃油费, shf设备费等)
- `revenue_type`: 收入类型(yf运费等)
- `amount`: 金额

### 1.5 托运单项目表(lc_cr_consignment_item)
**用途**: 成本分摊到具体托运单项目
**关键字段**:
- `cr_id`: 成本记录ID
- `cons_id`: 托运单ID
- `total_cost`: 分摊后总成本
- `cost`: 单位成本

## 二、新增成本模板表设计

### 2.1 运输单成本模板主表(tms_waybill_cost_template)
```sql
CREATE TABLE `tms_waybill_cost_template` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL DEFAULT '0',
  `name` varchar(64) NOT NULL COMMENT '模板名称',
  `code` varchar(32) NOT NULL COMMENT '模板编码', 
  `description` varchar(255) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  -- 审计字段...
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_code` (`tenant_id`,`code`,`mark`)
);
```

### 2.2 运输单成本模板项目表(tms_waybill_cost_template_item)
```sql
CREATE TABLE `tms_waybill_cost_template_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL COMMENT '模板ID',
  `cost_type` varchar(32) NOT NULL COMMENT '成本类型',
  `cost_name` varchar(64) NOT NULL COMMENT '成本名称',
  `default_value` decimal(11,2) DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `sort` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_template_id` (`template_id`)
);
```

## 三、成本类型分类体系

### 3.1 运输成本(transport)
- `fuel`: 燃油费 - 按重量分摊
- `toll`: 过路过桥费 - 按重量分摊  
- `driver`: 司机费用 - 混合分摊
- `vehicle`: 车辆使用费 - 按重量分摊

### 3.2 装卸成本(loading)
- `unload`: 装卸货费 - 按数量分摊
- `equipment`: 装卸设备费 - 按体积分摊
- `labor`: 装卸人工费 - 按数量分摊
- `special`: 特殊装卸费 - 混合分摊

### 3.3 仓储成本(warehouse)
- `storage`: 仓储费 - 按体积分摊
- `handling`: 仓库作业费 - 按数量分摊
- `manage`: 仓库管理费 - 混合分摊

### 3.4 其他成本(other)
- `customs`: 报关费 - 混合分摊
- `inspect`: 商检费 - 混合分摊
- `docs`: 单证费 - 混合分摊
- `misc`: 杂费 - 混合分摊

## 四、成本分摊规则与算法

### 4.1 分摊方法
1. **按重量分摊(weight)**: 成本按托运单重量比例分配
2. **按体积分摊(volume)**: 成本按托运单体积比例分配  
3. **按数量分摊(quantity)**: 成本按托运单件数比例分配
4. **混合分摊(mixed)**: 综合重量、体积、数量的复合分摊

### 4.2 分摊计算逻辑
```javascript
// 重量分摊示例
consignment_cost = (consignment_weight / total_weight) * total_cost

// 体积分摊示例  
consignment_cost = (consignment_volume / total_volume) * total_cost

// 混合分摊示例
weight_ratio = 0.4, volume_ratio = 0.4, quantity_ratio = 0.2
consignment_cost = total_cost * (
  weight_ratio * (consignment_weight / total_weight) +
  volume_ratio * (consignment_volume / total_volume) + 
  quantity_ratio * (consignment_quantity / total_quantity)
)
```

## 五、数据存储策略

### 5.1 成本录入策略
1. **主记录**: 在`lc_cr`表创建成本记录，`record_type`='waybill'
2. **明细记录**: 在`lc_cr_list`表存储各成本类型明细
3. **分摊记录**: 在`lc_cr_consignment_item`表存储分摊结果

### 5.2 模板应用策略  
1. 用户选择模板后，从`tms_waybill_cost_template_item`读取默认成本项目
2. 前端展示成本录入表单，预填默认值
3. 用户调整后提交，写入实际成本记录

### 5.3 JSON扩展字段利用
运输单表的`note`字段可存储JSON格式的扩展信息:
```json
{
  "cost_breakdown": {
    "fuel": 500.00,
    "toll": 200.00,
    "driver": 300.00
  },
  "allocation_method": "weight",
  "template_id": 1
}
```

## 六、API设计规范

### 6.1 运输单成本模板API
- `GET /api/v1/tms/waybill-cost-templates` - 分页查询模板
- `GET /api/v1/tms/waybill-cost-templates/{id}` - 获取模板详情
- `POST /api/v1/tms/waybill-cost-templates` - 创建模板
- `PUT /api/v1/tms/waybill-cost-templates/{id}` - 更新模板
- `DELETE /api/v1/tms/waybill-cost-templates/{id}` - 删除模板

### 6.2 运输单成本录入API
- `GET /api/v1/tms/waybill-costs` - 分页查询成本记录
- `GET /api/v1/tms/waybill-costs/{id}` - 获取成本详情
- `POST /api/v1/tms/waybill-costs` - 创建成本记录
- `PUT /api/v1/tms/waybill-costs/{id}` - 更新成本记录
- `POST /api/v1/tms/waybill-costs/allocate` - 执行成本分摊

## 七、实现状态总结

### 7.1 已完成部分 ✅
- [x] 数据库表结构设计(waybill_cost_template.sql)
- [x] 成本类型配置体系(cost-type-config.ts)
- [x] 后端API控制器实现(waybill_cost_template.go)
- [x] 前端成本管理界面(/src/views/tms/waybillCost/)
- [x] 成本模板管理功能
- [x] 成本录入编辑功能
- [x] 成本分摊计算功能
- [x] 成本报表图表展示

### 7.2 技术架构
- **后端**: Go + Gin + GORM + MySQL
- **前端**: Vue 3 + TypeScript + Ant Design Vue
- **数据库**: MySQL 8.0，支持JSON字段
- **架构模式**: 清洁架构，Controller -> Biz -> Store

## 八、结论

经过详细分析，运输单成本管理的数据模型设计已经完成并实现。系统采用了灵活的成本类型配置体系，支持多种分摊算法，具备完整的模板管理功能。数据存储策略合理，充分利用了现有表结构，同时扩展了专门的成本模板表。

**任务227已完成** ✅

---
**文档创建时间**: 2025-08-20  
**创建人**: Claude Code Assistant  
**最后更新**: 2025-08-20
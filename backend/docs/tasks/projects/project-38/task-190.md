---
task_id: 190
title: "MVP1.0-1: 数据模型适配和基础配置"
status: "todo"
created_date: "2025-08-12 09:07:58"
updated_date: "2025-08-12 09:07:58"
---

# MVP1.0-1: 数据模型适配和基础配置

## 任务描述
## 任务目标
扩展现有数据结构支持物流成本计算功能，不修改数据库表结构。

## 具体任务
### 后端适配
1. **扩展lc_cr表用途**: 在现有成本收入表基础上支持RecordType=waybill_cost类型
2. **扩展lc_cr_list用途**: 支持运输单成本明细，CostType字段支持新的成本类型
3. **成本类型字典配置**: 在sys_dict表中配置waybill_cost_type字典
   - fuel_cost: 燃油费
   - driver_fee: 司机费用  
   - toll_fee: 过路费
   - loading_fee: 装卸费
   - maintenance_fee: 维护费
   - other_cost: 其他成本

### 业务逻辑层
1. **创建成本管理业务层**: internal/twms/biz/waybill_cost/
2. **扩展现有Store接口**: 为lc_cr和lc_cr_list添加运输单成本相关查询方法
3. **运输单成本汇总计算**: 实现成本汇总到lc_waybill.total_cost字段的逻辑

## 验收标准
- [ ] 字典数据配置完成，前端能正确获取成本类型选项
- [ ] 能在lc_cr表创建RecordType=waybill_cost的记录
- [ ] 能在lc_cr_list表创建Type=cost的成本明细记录
- [ ] 成本汇总计算逻辑测试通过

## 技术要求
- 完全基于现有表结构，不创建新表
- 保持多租户隔离和软删除机制
- 使用decimal类型确保金额计算精度
- 添加单元测试覆盖新增逻辑

## 详细内容
请在这里添加任务的详细内容...

---
*最后更新: 2025-08-12 09:07:58*
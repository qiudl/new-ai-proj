# CSV需求导入 - 快速参考

## 一键导入命令

```bash
# 1. 设置Token
export API_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}' | jq -r '.token')

# 2. 预览导入(推荐先执行)
python3 scripts/import_requirements_from_csv.py \
  /Users/johnqiu/Desktop/团购系统需求记录.csv --dry-run

# 3. 正式导入
python3 scripts/import_requirements_from_csv.py \
  /Users/johnqiu/Desktop/团购系统需求记录.csv
```

## 字段映射速查

| CSV | 系统字段 | 类型 |
|-----|---------|------|
| 需求名称 | title | 标准 |
| 功能模块 | category | 标准 |
| 进度状态 | status | 映射 |
| 提出时间 | created_at | 解析 |
| 其他21个 | custom_fields | JSONB |

## 状态映射

```
已上线 → converted
开发中 → approved
不开发 → rejected
排期中 → pending
```

## 验证导入

```bash
# 查看导入结果
curl -H "Authorization: Bearer $API_TOKEN" \
  "http://localhost:8080/api/v1/requirements?project_id=156" | jq

# 查看custom_fields
curl -H "Authorization: Bearer $API_TOKEN" \
  "http://localhost:8080/api/v1/requirements/1001" | jq '.custom_fields'
```

## 文档链接

- 详细指南: `docs/CSV_IMPORT_GUIDE.md`
- 字段映射: `docs/CSV_FIELD_MAPPING.md`
- 方案总结: `docs/CSV_IMPORT_SUMMARY.md`

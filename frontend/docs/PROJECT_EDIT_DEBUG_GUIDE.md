# 项目编辑页面调试指南

## 问题描述

用户报告：修改客户选择并保存时失败。

## 最新修复 (Commit: 0d27670a)

### 修复内容

1. **改为从 form values 读取数据**（之前从 React state 读取）
   - 确保 form values 作为数据的单一来源
   - 避免 state 和 form 不一致导致的问题

2. **添加详细的调试日志**
   - 提交时打印所有相关数据
   - 便于排查问题根源

3. **改进错误处理**
   - 显示具体的 API 错误信息
   - 便于定位失败原因

---

## 测试步骤

### 1. 打开项目编辑页面

访问：http://localhost:3000/projects/35/edit

### 2. 打开浏览器开发者工具

- **Chrome/Edge**: 按 `F12` 或 `Ctrl+Shift+I` (Mac: `Cmd+Option+I`)
- 切换到 **Console** 标签

### 3. 修改客户选择

1. 在页面上修改"关联客户"或"关联企业"
2. 观察 Console 中是否有相关日志

### 4. 点击保存

点击"保存更改"按钮，观察 Console 输出。

---

## Console 日志解读

### 正常情况下的日志

```
📝 [ProjectEdit] 提交表单数据: {
  project_number: "P135",
  name: "项目名称",
  description: "...",
  enterprise_id: 1,       // 或 undefined
  company_ids: [1, 2],    // 或 []
  user_keys: ["101_1"],   // 或 []
  status: "active",
  priority: "medium",
  progress: 50,
  date_range: [dayjs, dayjs]
}

📝 [ProjectEdit] 当前state: {
  selectedEnterprise: 1,
  selectedCompanies: [1, 2],
  selectedUsers: ["101_1"]
}

📤 [ProjectEdit] 发送到API的数据: {
  project_number: "P135",
  name: "项目名称",
  description: "...",
  enterprise_id: 1,
  company_id: undefined,
  company_ids: undefined,
  user_ids: [101],
  status: "active",
  priority: "medium",
  progress: 50,
  start_date: "2024-01-01",
  end_date: "2024-12-31"
}
```

### 失败情况下的日志

```
❌ [ProjectEdit] 保存项目失败: Error: Request failed with status code 400

❌ [ProjectEdit] 错误详情: {
  message: "Request failed with status code 400",
  response: {
    message: "具体的错误信息",
    errors: {...}
  },
  status: 400
}
```

---

## 常见问题排查

### 问题 1: 客户数据未传递到 API

**症状**：
```
📤 [ProjectEdit] 发送到API的数据: {
  enterprise_id: undefined,
  company_id: undefined,
  company_ids: undefined,
  ...
}
```

**可能原因**：
1. 表单隐藏字段未正确同步
2. onChange 处理器未触发

**检查点**：
- 查看"提交表单数据"日志中的 `enterprise_id` 和 `company_ids`
- 确认选择客户时是否调用了 `form.setFieldsValue`

**解决方案**：
```tsx
// 检查 onChange 处理器是否正确
onChange={(value) => {
  setSelectedCompanies(value);
  form.setFieldsValue({ company_ids: value });  // 必须同步到 form
  console.log('✅ 已设置 company_ids:', value);  // 添加日志验证
}}
```

---

### 问题 2: API 返回 400 错误

**症状**：
```
❌ [ProjectEdit] 错误详情: {
  status: 400,
  response: {
    message: "Invalid request"
  }
}
```

**可能原因**：
1. 必填字段缺失
2. 数据格式不正确
3. 后端验证失败

**检查点**：
- 查看 Network 标签中的请求详情
- 检查 Request Payload
- 查看 Response 中的具体错误信息

**解决方案**：
打开 **Network** 标签 → 找到失败的请求（红色） → 点击查看：
- **Headers**: 检查请求 URL 和方法
- **Payload**: 检查发送的数据
- **Preview**: 查看服务器返回的错误详情

---

### 问题 3: Form values 和 state 不一致

**症状**：
```
📝 [ProjectEdit] 提交表单数据: {
  company_ids: []  // Form 中为空
}

📝 [ProjectEdit] 当前state: {
  selectedCompanies: [1, 2]  // State 中有值
}
```

**可能原因**：
- onChange 处理器未同步
- 初始化时未同步

**解决方案**：
检查以下位置的代码：

1. **初始化时同步** (loadProject 函数):
```tsx
setSelectedCompanies(companyIds);
form.setFieldsValue({ company_ids: companyIds });
```

2. **选择时同步** (onChange):
```tsx
onChange={(value) => {
  setSelectedCompanies(value);
  form.setFieldsValue({ company_ids: value });
}}
```

---

### 问题 4: 用户 ID 处理错误

**症状**：
```
📤 [ProjectEdit] 发送到API的数据: {
  user_ids: []  // 应该有值但为空
}
```

**可能原因**：
- user_keys 格式不正确
- 拆分逻辑错误

**检查点**：
查看"提交表单数据"中的 `user_keys` 格式：
```
user_keys: ["101_1", "102_1"]  // ✅ 正确格式
user_keys: [101, 102]           // ❌ 错误格式
```

**解决方案**：
确保 Transfer onChange 正确设置：
```tsx
onChange={(targetKeys) => {
  if (Array.isArray(targetKeys)) {
    const filteredKeys = targetKeys.filter(key => typeof key === 'string');
    setSelectedUsers(filteredKeys);
    form.setFieldsValue({ user_keys: filteredKeys });
  }
}}
```

---

## 完整测试检查清单

### 编辑模式测试

- [ ] 打开编辑页面，客户信息正确显示
- [ ] 修改企业选择，观察 Console 日志
- [ ] 修改公司选择，观察 Console 日志
- [ ] 修改用户选择，观察 Console 日志
- [ ] 点击保存，查看 Console 三个日志是否正常
- [ ] 保存成功后刷新页面，确认修改已保存

### 创建模式测试

- [ ] 访问 /projects/create
- [ ] 填写基本信息
- [ ] 选择客户/企业
- [ ] 选择用户
- [ ] 点击保存，查看 Console 日志
- [ ] 保存成功后查看项目详情

### 切换模式测试

- [ ] 先选择企业，公司选择应被禁用
- [ ] 清除企业选择，公司选择应启用
- [ ] 观察 form values 是否正确更新

---

## 获取更多帮助

如果问题仍未解决，请提供以下信息：

1. **完整的 Console 日志**（包括三个日志块）
2. **Network 请求详情**：
   - Request URL
   - Request Method
   - Request Payload
   - Response Status
   - Response Body

3. **操作步骤**：
   - 具体修改了什么
   - 点击保存后发生了什么

4. **页面截图**（如果有）

---

## 相关文档

- [PROJECT_EDIT_FIELD_FIX.md](./PROJECT_EDIT_FIELD_FIX.md) - 初始修复文档
- [FORM_STATE_SYNC_AUDIT_REPORT.md](./FORM_STATE_SYNC_AUDIT_REPORT.md) - 审计报告

---

**更新时间**：2025-10-24
**最新修复**：Commit 0d27670a
**状态**：等待用户测试反馈

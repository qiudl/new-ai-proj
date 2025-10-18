# ProjectEditPageStandard - Phase 1 优化状态

## ✅ 已完成部分

### 1. 状态合并优化
已成功将分散的loading和modal状态合并：

```typescript
// ✅ 完成：合并loading相关状态
const [loadingStates, setLoadingStates] = useState({
  page: false,
  company: false,
  enterprise: false,
  user: false
});

// ✅ 完成：合并modal相关状态
const [modalStates, setModalStates] = useState({
  showAddUserModal: false,
  selectedCompanyForUser: null as number | null,
  showRoleModal: false,
  currentUserForRole: null as string | null
});
```

### 2. useCallback优化
已完成 `loadProject` 函数的useCallback包装：

```typescript
// ✅ 完成：loadProject函数已用useCallback包装
const loadProject = useCallback(async () => {
  // ... 函数实现
}, [projectId, form, navigate]);
```

## ⚠️ 待完成部分

### 1. 更新所有对旧状态变量的引用

需要全局替换以下变量引用：

#### Loading State引用
```typescript
// ❌ 待修复：setCompanyLoading(true)
// ✅ 应改为：setLoadingStates(prev => ({ ...prev, company: true }))

// ❌ 待修复：setEnterpriseLoading(true)
// ✅ 应改为：setLoadingStates(prev => ({ ...prev, enterprise: true }))

// ❌ 待修复：setUserLoading(true)
// ✅ 应改为：setLoadingStates(prev => ({ ...prev, user: true }))

// ❌ 待修复：if (loading)
// ✅ 应改为：if (loadingStates.page)

// ❌ 待修复：loading={companyLoading}
// ✅ 应改为：loading={loadingStates.company}

// ❌ 待修复：loading={enterpriseLoading}
// ✅ 应改为：loading={loadingStates.enterprise}

// ❌ 待修复：spinning={userLoading}
// ✅ 应改为：spinning={loadingStates.user}
```

#### Modal State引用
```typescript
// ❌ 待修复：setShowAddUserModal(true/false)
// ✅ 应改为：setModalStates(prev => ({ ...prev, showAddUserModal: true/false }))

// ❌ 待修复：setSelectedCompanyForUser(id/null)
// ✅ 应改为：setModalStates(prev => ({ ...prev, selectedCompanyForUser: id/null }))

// ❌ 待修复：setShowRoleModal(true/false)
// ✅ 应改为：setModalStates(prev => ({ ...prev, showRoleModal: true/false }))

// ❌ 待修复：setCurrentUserForRole(key/null)
// ✅ 应改为：setModalStates(prev => ({ ...prev, currentUserForRole: key/null }))

// ❌ 待修复：if (showAddUserModal)
// ✅ 应改为：if (modalStates.showAddUserModal)

// ❌ 待修复：{selectedCompanyForUser && ...}
// ✅ 应改为：{modalStates.selectedCompanyForUser && ...}
```

### 2. 剩余函数的useCallback包装

需要用useCallback包装以下函数：

1. ✅ loadProject - 已完成
2. ❌ loadCompanies - 待包装
3. ❌ loadEnterprises - 待包装
4. ❌ loadEnterpriseUsers - 待包装
5. ❌ loadCompanyUsers - 待包装
6. ❌ handleSubmit - 待包装
7. ❌ handleCancel - 待包装
8. ❌ handleAddUserSuccess - 待包装
9. ❌ handleAddUserForCompany - 待包装
10. ❌ handleSetUserRole - 待包装
11. ❌ renderUserItem - 待包装

### 3. useEffect依赖修复

第二个useEffect需要添加缺失的依赖：

```typescript
// ❌ 当前有警告
useEffect(() => {
  if (selectedEnterprise) {
    loadEnterpriseUsers();
  } else if (selectedCompanies && selectedCompanies.length > 0) {
    loadCompanyUsers();
  }
  // ...
}, [selectedCompanies, selectedEnterprise]);

// ✅ 修复后应该是
}, [selectedCompanies, selectedEnterprise, loadEnterpriseUsers, loadCompanyUsers]);
```

## 📝 实施建议

由于该文件有1413行且有大量的状态引用，建议按以下顺序进行：

### 优先级1：修复编译错误（高）
1. 全局查找替换所有 `setCompanyLoading`、`setEnterpriseLoading`、`setUserLoading`
2. 全局查找替换所有 `setShowAddUserModal`、`setSelectedCompanyForUser`、`setShowRoleModal`、`setCurrentUserForRole`
3. 更新所有对这些变量的读取引用

### 优先级2：函数useCallback包装（中）
1. 包装所有load函数
2. 包装所有handle函数
3. 修复useEffect依赖警告

### 优先级3：测试验证（高）
1. TypeScript编译检查
2. 运行时功能测试
3. 性能对比测试

## ⏱️ 预计剩余时间

- 全局替换状态引用：15-20分钟
- 函数useCallback包装：25-30分钟
- 测试验证：15-20分钟

**总计：约55-70分钟**

## 🎯 下一步行动

1. 使用批量查找替换更新所有旧状态变量引用
2. 逐个包装剩余函数（使用useCallback）
3. 运行TypeScript编译检查
4. 功能测试确保没有破坏现有功能

---

**当前Phase 1进度**: 20% (已完成状态定义和1个函数优化)

**剩余工作**: 需要完成大量的变量引用更新和函数包装

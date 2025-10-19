# 性能优化测试指南

## 快速测试步骤

### 1. 准备工作

确保开发服务器正在运行：
```bash
cd frontend
npm start
```

如果服务器已经在运行，webpack HMR会自动加载新代码。

### 2. 清除浏览器缓存

1. 打开浏览器开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"（Empty Cache and Hard Reload）
4. 或者在控制台执行：
   ```javascript
   // 清除IndexedDB缓存
   indexedDB.deleteDatabase('TaskDocumentCache')
   ```

### 3. 测试任务2683

1. **打开任务详情页**
   - 访问: `http://localhost:3000/projects/1/tasks/2683`
   - 等待页面完全加载

2. **检查控制台日志**（500ms后）

   **预期看到组件预加载日志**:
   ```
   ✅ [Performance] Main document component preloaded successfully in XXXms
   ```
   - ✅ 如果时间 <2000ms: 正常（开发模式）
   - ⚠️ 如果时间 >5000ms: 可能有问题

   **预期看到数据预取日志**:
   ```
   📥 [Performance] Prefetching document data for task 2683...
   📡 [CACHE-PREFETCH] 调用API: /projects/1/tasks/2683/documents/all
   📦 [CACHE-PREFETCH] API响应: {...}
   📊 [CACHE-PREFETCH] 解析数据: {
     hasDocuments: true/false,
     hasWorkNotes: true/false,
     hasUploadedFiles: true/false,
     documentsLength: X,
     workNotesLength: Y,
     uploadedFilesLength: Z
   }
   📄 [CACHE-PREFETCH] 合并后总文档数: N
   💾 [CACHE-L1] 保存到内存缓存: docs:1:2683:single (N docs)
   💿 [CACHE-L2] 保存到IndexedDB: docs:1:2683:single (N docs)
   ✅ [CACHE-PREFETCH] 预取完成: docs:1:2683:single (N docs)
   ✅ [Performance] Document data prefetched successfully in XXXms
   ```

3. **点击"文档"Tab**

   **预期看到缓存命中日志**:
   ```
   💨 [CACHE-L1] 内存缓存命中: docs:1:2683:single (N docs)
   ⚡ [CACHE] L1命中，耗时: X.XXms
   ```
   - ✅ 如果耗时 <10ms: 完美！缓存命中
   - ⚠️ 如果看到API调用日志: 缓存未命中，需要检查

4. **测试文档加载速度**
   - 第一次点击"文档"Tab应该 <1秒加载完成
   - 第二次点击应该 <100ms（几乎即时）

### 4. 错误检查

如果看到以下错误，说明有问题：

**TypeError错误**:
```
❌ [CACHE-PREFETCH] 预取失败: docs:1:2683:single TypeError: Cannot read properties of undefined (reading 'documents')
```
- **原因**: API响应格式不正确或API调用失败
- **检查**: 查看 `📦 [CACHE-PREFETCH] API响应` 日志

**无限循环警告**:
```
Warning: Maximum update depth exceeded
```
- **原因**: useEffect依赖数组配置错误
- **检查**: TaskDetailContent组件的useEffect

**组件加载超时**:
```
⚠️ [Performance] Failed to preload main document component: [error details]
```
- **原因**: webpack编译错误或网络问题
- **检查**: 控制台Network标签，查看chunk加载情况

### 5. 性能基准测试

| 操作 | 开发模式目标 | 生产模式目标 |
|------|------------|------------|
| 组件预加载 | <2秒 | <500ms |
| 数据预取 | <1秒 | <500ms |
| 首次打开Tab | <2秒 | <1秒 |
| 二次打开Tab | <100ms | <100ms |
| 缓存命中 | <10ms | <10ms |

### 6. 对比测试

**测试右侧Widget (对照组)**:
1. 刷新页面
2. 观察右侧"任务文档"Widget
3. 应该几乎即时显示（<100ms）

**测试Tab文档 (实验组)**:
1. 等待预加载完成（500ms + 800ms）
2. 点击"文档"Tab
3. 应该快速加载（<1秒）

## 高级调试

### 查看缓存状态

在浏览器控制台执行：
```javascript
// 导入服务（需要先打开任务详情页）
import('/services/documentCacheService').then(module => {
  const stats = module.documentCacheService.getStats();
  console.log('缓存统计:', stats);
});
```

### 手动清除缓存

```javascript
// 清除特定任务的缓存
documentCacheService.clear(1, 2683);

// 清除所有缓存
documentCacheService.clear();
```

### 手动预取

```javascript
// 手动触发预取
documentCacheService.prefetch(1, 2683, false)
  .then(() => console.log('预取成功'))
  .catch(err => console.error('预取失败:', err));
```

### 查看IndexedDB

1. 打开开发者工具
2. 切换到"Application"标签
3. 展开"IndexedDB"
4. 查看"TaskDocumentCache"数据库
5. 查看"documents"对象存储

## 常见问题

### Q1: 为什么开发模式下预加载需要1-2秒？

**A**: Webpack HMR在开发模式下需要编译模块，生产build会快得多。

### Q2: 缓存多久过期？

**A**: 默认5分钟TTL，可在documentCacheService配置中修改。

### Q3: 为什么有时候缓存未命中？

**A**: 可能的原因：
- 缓存已过期（>5分钟）
- 浏览器内存不足，L1缓存被清理
- IndexedDB存储被清除
- 任务ID或参数不匹配

### Q4: 如何测试生产环境性能？

**A**:
```bash
npm run build
npx serve -s build -p 3000
```
然后访问 `http://localhost:3000` 进行测试。

### Q5: 为什么只预加载主组件？

**A**: 预加载全部6个组件在开发模式下耗时15秒，只预加载主组件可以降低到1-2秒，同时保持懒加载的好处。

## 成功标准

✅ **优化成功的标志**:
1. 组件预加载 <2秒（开发模式）
2. 数据预取成功，无TypeError
3. 首次Tab打开 <2秒
4. 二次Tab打开 <100ms
5. L1缓存命中率 >80%
6. 用户感受流畅，无明显卡顿

❌ **需要进一步调试的情况**:
1. 组件预加载 >5秒
2. 数据预取失败或报错
3. Tab打开 >3秒
4. 缓存从不命中
5. 控制台有错误或警告

---

*更新时间: 2025-10-19*

---
task_id: 429
title: "修复TaskDetailPageNew调试信息显示问题 - 解决空值问题"
status: "in_progress"
created_date: "2025-08-05 02:41:40"
updated_date: "2025-08-05 02:41:40"
---

# 修复TaskDetailPageNew调试信息显示问题 - 解决空值问题

## 任务描述
# 调试信息显示修复技术方案

## 🎯 问题描述

用户报告TaskDetailPageNew.tsx页面右上角的调试信息显示但内容为空：
- "窗口宽度: px" - 窗口宽度值缺失
- "左栏z-index: " - 左栏z-index值缺失  
- "右栏z-index: " - 右栏z-index值缺失
- "Modal z-index: " - Modal z-index值缺失

## 🔍 根本原因分析

1. **选择器失效**: 原始代码中的DOM选择器无法正确找到目标元素
   - `.debug-column:first-child` 选择器不够精确
   - `.info-sidebar` 选择器在某些时候找不到元素

2. **时序问题**: useEffect在DOM完全渲染前就尝试获取元素样式

3. **容错机制不足**: 当元素不存在时没有合理的默认值

## 🛠️ 解决方案实施

### 技术修复点
**文件**: /frontend/src/pages/TaskDetailPageNew.tsx (第360-429行)

### 关键修改内容

1. **改进选择器策略**:
```javascript
// 使用多重选择器fallback策略
const leftCol = document.querySelector(".ant-col.debug-column:first-of-type") || 
                document.querySelector("[class*='debug-column']:first-child");
const rightCol = document.querySelector(".info-sidebar") || 
                 document.querySelector(".ant-col.debug-column:last-of-type");
```

2. **增强容错机制**:
```javascript
// 提供更好的默认值和错误处理
debugWidth.textContent = window.innerWidth ? window.innerWidth.toString() : "未知";
debugLeftZ.textContent = leftStyle.zIndex || "1"; // 提供默认值
debugRightZ.textContent = rightStyle.zIndex || "2";
debugModalZ.textContent = modalStyle.zIndex || "无Modal";
```

3. **解决时序问题**:
```javascript
// 延迟初始更新，确保DOM完全渲染
const initialUpdate = () => {
  setTimeout(updateDebugInfo, 100);
};

// 添加MutationObserver监听DOM变化
const observer = new MutationObserver(updateDebugInfo);
observer.observe(document.body, { childList: true, subtree: true });
```

## ✅ 验证结果

### 预期效果
- ✅ 窗口宽度正确显示像素值
- ✅ 左栏z-index显示实际计算值或默认值"1"
- ✅ 右栏z-index显示实际计算值或默认值"2"  
- ✅ Modal z-index在有Modal时显示值，无Modal时显示"无Modal"
- ✅ 在单列手机模式下调试信息正常可见
- ✅ 调试信息实时更新（窗口resize时）

### 技术优势
- **容错性强**: 多重选择器fallback确保找到元素
- **实时性好**: MutationObserver确保DOM变化时及时更新
- **用户友好**: 提供有意义的默认值而非空白
- **性能优化**: 合理的延迟和事件监听清理

## 🚀 部署状态

- **代码修改**: ✅ 已完成
- **前端编译**: 🔄 正在进行
- **容器重启**: 🔄 等待编译完成
- **功能验证**: ⏳ 待编译完成后测试

## 📝 技术细节

- **主要文件**: TaskDetailPageNew.tsx
- **修改行数**: 第360-429行的useEffect调试代码
- **涉及技术**: DOM操作、CSS样式计算、MutationObserver API
- **兼容性**: 现代浏览器完全支持

---

**完成状态**: 🔄 代码已修复，等待部署验证
**技术方案**: DOM选择器优化 + 容错机制 + 实时监听
**预期解决**: 调试信息空值显示问题

## 详细内容
请在这里添加任务的详细内容...

---
*最后更新: 2025-08-05 02:41:40*
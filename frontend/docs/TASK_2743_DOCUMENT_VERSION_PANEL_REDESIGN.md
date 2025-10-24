# 重构任务详情页文档管理组件 - 显示版本更新记录摘要

**任务ID**: 2743
**项目**: ai-proj
**创建时间**: 2025-10-24
**预计工期**: 5-7天

---

## 📋 任务概述

重新设计任务详情页右侧的文档管理组件，从显示完整文档正文改为显示版本更新记录的时间线摘要。

## 🎯 背景与目标

### 当前问题

任务详情页右侧的文档管理组件目前显示的是完整的文档正文内容，这导致：

1. **界面占用空间过大** - 右侧区域被长文档内容占满
2. **信息重复** - 与左侧主内容区的文档编辑器功能重复
3. **版本追溯困难** - 用户难以快速了解文档的变更历史
4. **用户体验不佳** - 信息密度过高，视觉层级不清晰

### 业务目标

- 优化任务详情页的信息架构，提高页面空间利用率
- 让用户能够快速了解文档的版本演变历史
- 提升文档变更的可追溯性和透明度
- 改善整体用户体验，降低认知负担

### 技术目标

- 重构右侧文档管理组件的展示逻辑
- 集成版本历史API数据（已实现）
- 实现版本更新记录的时间线展示
- 保持与现有文档编辑功能的协调

---

## 📐 范围定义

### ✅ 在范围内

#### 前端改造

1. **重新设计右侧文档管理组件UI**
   - 替换当前的文档正文展示
   - 设计版本时间线布局
   - 优化视觉层级和间距

2. **实现版本更新记录时间线展示**
   - 版本号（v1, v2, v3...）
   - 更新时间（相对时间 + 绝对时间）
   - 更新人（用户名 + 头像）
   - 变更摘要（200字以内）
   - 变更标签（major/minor/patch/auto）

3. **提供快速操作**
   - 查看完整版本详情（弹窗/抽屉）
   - 对比版本差异（Diff视图）
   - 恢复到历史版本（需二次确认）
   - 复制版本链接（分享）

#### 交互优化

1. 点击版本记录展开详情
2. 悬停显示更多信息（Tooltip）
3. 添加版本筛选功能（按时间、人员、类型）
4. 支持版本搜索（关键词）
5. 滚动加载更多版本（分页）

#### API集成

1. 调用版本历史API：
   ```
   GET /api/v1/projects/:id/tasks/:taskId/documents/:docId/versions
   ```
2. 获取版本统计信息
3. 实时更新版本列表（WebSocket或轮询）

### ❌ 不在范围内

1. 文档编辑功能的修改（保持现有编辑器不变）
2. 版本对比算法的优化（使用现有API）
3. 文档权限控制的修改
4. 后端版本管理逻辑的变更
5. 其他页面的文档组件改造
6. 移动端适配（后续Phase 2）

---

## ✅ 验收标准

### 功能验收

**AC-1**: 右侧组件显示版本时间线
- **Given**: 用户打开任务详情页
- **When**: 查看右侧文档管理区域
- **Then**: 应该看到版本更新记录列表，而非完整文档内容

**AC-2**: 版本记录显示完整关键信息
- **Given**: 版本时间线已加载
- **When**: 查看任意版本记录
- **Then**: 应该显示：版本号、更新时间、更新人、变更摘要、变更类型

**AC-3**: 支持查看版本详情
- **Given**: 版本记录列表
- **When**: 点击某个版本记录
- **Then**: 应该弹出或展开显示该版本的完整内容

**AC-4**: 支持版本对比功能
- **Given**: 选中两个版本
- **When**: 点击"对比"按钮
- **Then**: 应该显示两个版本的差异对比（高亮变更部分）

**AC-5**: 支持恢复历史版本
- **Given**: 查看历史版本
- **When**: 点击"恢复"按钮并确认
- **Then**: 应该将文档恢复到该版本，并创建新版本记录

**AC-6**: 实时更新版本列表
- **Given**: 文档被更新
- **When**: 版本自动创建
- **Then**: 右侧版本列表应该自动刷新显示新版本

### 性能验收

- **Perf-1**: 版本列表初次加载时间 < 500ms
- **Perf-2**: 版本详情展开响应时间 < 200ms
- **Perf-3**: 支持虚拟滚动，处理100+版本无卡顿
- **Perf-4**: 版本对比计算时间 < 1s

### UI/UX验收

- **UX-1**: 版本时间线清晰易读，视觉层级分明
- **UX-2**: 交互反馈及时（loading、success、error状态明确）
- **UX-3**: 与整体设计风格保持一致
- **UX-4**: 支持键盘导航（可选）

---

## 🔗 依赖与风险

### 依赖项

**内部依赖**:

1. ✅ **版本历史API** - 已实现（commit 5bfeb07c）
   - `GET /api/v1/projects/:id/tasks/:taskId/documents/:docId/versions`
   - 返回完整版本列表和统计信息

2. ✅ **版本自动创建功能** - 正常工作
   - 文档更新时自动创建版本快照

3. ⚠️ **版本对比API** - 需要确认是否已实现
   - `GET /api/v1/projects/:id/tasks/:taskId/documents/:docId/versions/compare?from=1&to=2`

4. ⚠️ **版本恢复API** - 需要确认是否已实现
   - `POST /api/v1/projects/:id/tasks/:taskId/documents/:docId/versions/:versionNumber/restore`

**外部依赖**:

1. Vue 3 Composition API
2. 可能需要的库：
   - `diff` - 版本对比算法
   - `dayjs` - 时间格式化
   - `virtual-scroller` - 虚拟滚动（如果版本数量大）

### 风险与对策

| 风险 | 影响 | 概率 | 对策 |
|-----|-----|-----|-----|
| **版本数据量过大** | 加载缓慢、UI卡顿 | 中 | 分页加载 + 虚拟滚动 + 版本筛选 |
| **UI改动影响现有功能** | 破坏文档编辑功能 | 低 | 充分测试 + 回滚方案 + 金丝雀发布 |
| **用户习惯改变** | 用户不适应新交互 | 中 | 功能引导 + 保留查看完整文档入口 |
| **版本对比/恢复API未实现** | 部分功能无法实现 | 待确认 | 优先确认API状态 + 后端协同开发 |
| **性能问题** | 大量版本导致卡顿 | 低 | 性能测试 + 优化策略 |

---

## 📅 里程碑计划

### M1: 设计和API确认（1天）

**时间**: Day 1
**目标**: 完成UI设计和技术方案

**交付物**:
- [ ] UI设计稿（Figma/手绘草图）
- [ ] 组件结构设计文档
- [ ] API可用性确认报告
- [ ] 技术方案评审通过

**关键活动**:
- 与设计师对齐UI方案
- 确认版本对比/恢复API状态
- 评估技术实现难度
- 准备开发环境

---

### M2: 基础功能开发（2-3天）

**时间**: Day 2-4
**目标**: 实现核心版本时间线展示

**交付物**:
- [ ] `DocumentVersionPanel.vue` 组件
- [ ] `VersionTimeline.vue` 子组件
- [ ] `VersionCard.vue` 版本卡片组件
- [ ] API集成代码（版本列表）
- [ ] 基础样式实现

**关键活动**:
- 创建新组件文件
- 实现版本列表数据获取
- 实现版本卡片展示
- 添加分页加载逻辑
- 处理加载和错误状态

---

### M3: 交互功能完善（2天）

**时间**: Day 5-6
**目标**: 实现版本详情、对比、恢复功能

**交付物**:
- [ ] `VersionDetailModal.vue` 版本详情弹窗
- [ ] `VersionCompareModal.vue` 版本对比组件
- [ ] `VersionRestoreConfirm.vue` 恢复确认对话框
- [ ] 版本筛选和搜索功能
- [ ] 交互动效和过渡效果

**关键活动**:
- 实现版本详情查看
- 实现版本对比逻辑
- 实现版本恢复流程
- 添加筛选和搜索
- 优化交互体验

---

### M4: 测试和优化（1天）

**时间**: Day 7
**目标**: 全面测试和性能优化

**交付物**:
- [ ] 功能测试报告（覆盖所有AC）
- [ ] 性能测试报告
- [ ] Bug修复列表
- [ ] 代码优化记录

**关键活动**:
- 执行功能测试
- 性能测试和优化
- 修复发现的Bug
- 代码Review

---

### M5: 发布上线（0.5天）

**时间**: Day 7下午
**目标**: 部署到生产环境

**交付物**:
- [ ] 发布说明文档
- [ ] 用户操作指南
- [ ] 监控配置
- [ ] 上线检查表

**关键活动**:
- 部署到测试环境
- UAT测试
- 部署到生产环境
- 监控上线效果

**总计**: 7天（约1个开发周）

---

## 📊 成功指标

### 定量指标

| 指标 | 测量口径 | 目标值 | 测量方法 |
|-----|---------|--------|---------|
| **版本列表加载时间** | 从API请求到渲染完成 | < 500ms | 性能监控 |
| **版本详情展开响应** | 点击到显示完成 | < 200ms | 用户体验监控 |
| **页面空间利用率** | 右侧组件高度占比 | 减少60%+ | UI测量 |
| **用户交互次数** | 查看版本历史的点击 | 提升50%+ | 埋点统计 |
| **版本查询成功率** | API成功率 | > 99% | 监控系统 |

### 定性指标

- [ ] 用户反馈正面（满意度 > 80%）
- [ ] UI设计获得设计师和产品认可
- [ ] 代码质量通过技术Review
- [ ] 无P0/P1级别Bug遗留

---

## 🎨 设计方案

### 布局结构

```
┌────────────────────────────────────────────────┐
│  任务详情页                                      │
├─────────────────────┬──────────────────────────┤
│                     │  📄 文档版本历史          │
│  主内容区            │  ┌──────────────────┐   │
│  ┌────────────┐     │  │ 🔵 v10 (Latest)  │   │
│  │ 任务描述    │     │  │ 2h ago • Admin   │   │
│  └────────────┘     │  │ 修复GET/PUT错误   │   │
│  ┌────────────┐     │  │ [详情] [对比]     │   │
│  │ 文档编辑器  │     │  └──────────────────┘   │
│  │            │     │  ┌──────────────────┐   │
│  │            │     │  │ 🟢 v9            │   │
│  └────────────┘     │  │ 4h ago • Admin   │   │
│  ┌────────────┐     │  │ 验证修复完成      │   │
│  │ 评论区      │     │  │ [详情] [对比]     │   │
│  └────────────┘     │  └──────────────────┘   │
│                     │  ┌──────────────────┐   │
│                     │  │ 🟡 v8            │   │
│                     │  │ 1d ago • Admin   │   │
│                     │  │ 测试内容更新      │   │
│                     │  │ [详情] [对比]     │   │
│                     │  └──────────────────┘   │
│                     │  [加载更多...]         │
└─────────────────────┴──────────────────────────┘
```

### 版本卡片设计

```
┌──────────────────────────────────────┐
│ 🔵 v10 (Latest) 🏷️ major            │
│ ────────────────────────────────────│
│ ⏰ 2025-10-24 14:18 (2 hours ago)   │
│ 👤 Admin                             │
│ ────────────────────────────────────│
│ 📋 完整端到端测试                     │
│    ✅ GET功能正常                     │
│    ✅ PUT功能正常                     │
│    ✅ 版本自动创建                    │
│ ────────────────────────────────────│
│ [📄 查看详情] [🔍 对比] [↩️ 恢复]     │
└──────────────────────────────────────┘

状态指示器：
🔵 Latest (最新版本)
🟢 Recent (最近7天)
🟡 Normal (普通版本)
⚪ Old (历史版本)
```

### 交互流程

```
用户操作流程：

1. 进入任务详情页
   ↓
2. 右侧自动加载最近10个版本
   ↓
3. 查看版本卡片信息
   ├→ 点击"查看详情" → 弹出完整内容 → Modal/Drawer
   ├→ 选择两个版本 → 点击"对比" → Diff视图
   └→ 点击"恢复" → 二次确认 → 恢复并刷新

4. 滚动到底部
   ↓
5. 自动加载更多版本（分页）
   ↓
6. 继续查看或操作
```

---

## 🛠️ 技术实现

### 组件结构

```
TaskDetailPage.vue
├── TaskContent.vue (左侧主内容)
│   ├── TaskDescription.vue
│   ├── DocumentEditor.vue
│   └── CommentSection.vue
└── DocumentVersionPanel.vue (右侧版本面板) ⭐ 新组件
    ├── VersionPanelHeader.vue
    │   ├── VersionStats.vue (版本统计)
    │   └── VersionFilter.vue (筛选器)
    ├── VersionTimeline.vue (版本时间线)
    │   └── VersionCard.vue (版本卡片) ×N
    ├── VersionDetailModal.vue (版本详情)
    ├── VersionCompareModal.vue (版本对比)
    └── VersionRestoreConfirm.vue (恢复确认)
```

### 数据流

```typescript
// 1. 版本列表数据获取
interface VersionListParams {
  projectId: number;
  taskId: number;
  documentId: number;
  limit?: number;        // 默认20
  offset?: number;       // 默认0
  includeContent?: boolean; // 列表模式false
}

// 2. 版本详情数据
interface VersionDetail {
  id: number;
  documentId: number;
  versionNumber: number;
  title: string;
  content: string;       // 完整内容
  fileSze: number;
  changeSummary: string;
  createdBy: number;
  createdAt: string;
  isMajorVersion: boolean;
  tags: string[];
  metadata: Record<string, any>;
}

// 3. 版本对比数据
interface VersionCompare {
  from: VersionDetail;
  to: VersionDetail;
  diff: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}
```

### API集成

```typescript
// services/documentVersionService.ts

export class DocumentVersionService {
  // 获取版本列表
  async getVersionList(params: VersionListParams): Promise<VersionListResponse> {
    return api.get(`/api/v1/projects/${params.projectId}/tasks/${params.taskId}/documents/${params.documentId}/versions`, {
      params: {
        limit: params.limit || 20,
        offset: params.offset || 0,
        include_content: params.includeContent || false
      }
    });
  }

  // 获取版本详情
  async getVersionDetail(projectId: number, taskId: number, documentId: number, versionNumber: number): Promise<VersionDetail> {
    return api.get(`/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${versionNumber}`);
  }

  // 版本对比
  async compareVersions(projectId: number, taskId: number, documentId: number, from: number, to: number): Promise<VersionCompare> {
    return api.get(`/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/compare`, {
      params: { from, to }
    });
  }

  // 恢复版本
  async restoreVersion(projectId: number, taskId: number, documentId: number, versionNumber: number): Promise<void> {
    return api.post(`/api/v1/projects/${projectId}/tasks/${taskId}/documents/${documentId}/versions/${versionNumber}/restore`);
  }
}
```

### 状态管理

```typescript
// stores/documentVersionStore.ts

interface DocumentVersionState {
  versions: VersionDetail[];      // 版本列表
  selectedVersions: number[];     // 选中的版本（用于对比）
  currentVersion: number;         // 当前版本号
  loading: boolean;               // 加载状态
  hasMore: boolean;               // 是否有更多
  total: number;                  // 总版本数
  filterOptions: VersionFilterOptions; // 筛选选项
}

export const useDocumentVersionStore = defineStore('documentVersion', {
  state: (): DocumentVersionState => ({
    versions: [],
    selectedVersions: [],
    currentVersion: 0,
    loading: false,
    hasMore: true,
    total: 0,
    filterOptions: {
      timeRange: 'all',
      createdBy: null,
      versionType: 'all'
    }
  }),

  actions: {
    async loadVersions(params: VersionListParams) {
      this.loading = true;
      try {
        const response = await versionService.getVersionList(params);
        this.versions = response.data.versions;
        this.total = response.data.stats.total_versions;
        this.currentVersion = response.data.stats.current_version;
        this.hasMore = this.versions.length < this.total;
      } finally {
        this.loading = false;
      }
    },

    async loadMore(params: VersionListParams) {
      if (!this.hasMore || this.loading) return;

      const offset = this.versions.length;
      const response = await versionService.getVersionList({
        ...params,
        offset
      });

      this.versions.push(...response.data.versions);
      this.hasMore = this.versions.length < this.total;
    },

    toggleVersionSelection(versionNumber: number) {
      const index = this.selectedVersions.indexOf(versionNumber);
      if (index > -1) {
        this.selectedVersions.splice(index, 1);
      } else {
        if (this.selectedVersions.length >= 2) {
          this.selectedVersions.shift();
        }
        this.selectedVersions.push(versionNumber);
      }
    }
  }
});
```

### 性能优化

```typescript
// 1. 虚拟滚动（版本数量>50时）
import { useVirtualList } from '@vueuse/core';

const { list, containerProps, wrapperProps } = useVirtualList(
  versions,
  { itemHeight: 120 }
);

// 2. 防抖加载更多
import { useDebounceFn } from '@vueuse/core';

const loadMore = useDebounceFn(() => {
  store.loadMore(params);
}, 300);

// 3. 缓存版本详情
const versionCache = new Map<number, VersionDetail>();

async function getVersionDetail(versionNumber: number) {
  if (versionCache.has(versionNumber)) {
    return versionCache.get(versionNumber);
  }

  const detail = await versionService.getVersionDetail(...);
  versionCache.set(versionNumber, detail);
  return detail;
}
```

---

## 📝 开发检查清单

### 前期准备

- [ ] 确认后端版本历史API文档完整性
- [ ] 确认版本对比API是否可用（如未实现，协调后端开发）
- [ ] 确认版本恢复API是否可用（如未实现，协调后端开发）
- [ ] 与设计师对齐UI设计方案
- [ ] 与产品确认交互细节和优先级
- [ ] 准备开发环境和依赖库

### 开发阶段

**组件开发**:
- [ ] 创建`DocumentVersionPanel.vue`主组件
- [ ] 创建`VersionTimeline.vue`时间线组件
- [ ] 创建`VersionCard.vue`版本卡片组件
- [ ] 创建`VersionDetailModal.vue`详情弹窗
- [ ] 创建`VersionCompareModal.vue`对比弹窗
- [ ] 创建`VersionRestoreConfirm.vue`恢复确认

**功能实现**:
- [ ] 实现版本列表数据获取
- [ ] 实现版本卡片信息展示
- [ ] 实现分页加载更多
- [ ] 实现版本详情查看
- [ ] 实现版本对比功能
- [ ] 实现版本恢复功能
- [ ] 实现版本筛选
- [ ] 实现版本搜索

**状态处理**:
- [ ] 添加Loading状态
- [ ] 添加Error处理
- [ ] 添加Empty状态
- [ ] 添加Success反馈

**样式和动效**:
- [ ] 实现响应式布局
- [ ] 添加过渡动画
- [ ] 添加加载骨架屏
- [ ] 优化移动端体验

**测试**:
- [ ] 添加单元测试
- [ ] 添加集成测试
- [ ] E2E测试用例

### 测试阶段

**功能测试**:
- [ ] AC-1: 版本时间线展示
- [ ] AC-2: 版本信息完整性
- [ ] AC-3: 版本详情查看
- [ ] AC-4: 版本对比
- [ ] AC-5: 版本恢复
- [ ] AC-6: 实时更新

**性能测试**:
- [ ] 版本列表加载时间 < 500ms
- [ ] 版本详情展开 < 200ms
- [ ] 虚拟滚动性能（100+版本）
- [ ] 内存占用检查

**兼容性测试**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**边界条件**:
- [ ] 无版本数据
- [ ] 单个版本
- [ ] 大量版本（100+）
- [ ] 网络错误
- [ ] 权限不足

### 发布阶段

- [ ] 代码Review通过
- [ ] 合并到主分支
- [ ] 部署到测试环境
- [ ] UAT测试
- [ ] 性能监控配置
- [ ] 部署到生产环境
- [ ] 灰度发布（10% → 50% → 100%）
- [ ] 监控上线效果
- [ ] 收集用户反馈

---

## 🔄 后续优化方向 (Phase 2)

### 高级功能

1. **版本标签系统**
   - 为版本打标签（bug-fix, feature, refactor, docs等）
   - 按标签筛选版本
   - 标签统计和可视化

2. **版本评论功能**
   - 在版本上添加评论
   - 讨论版本变更
   - @提醒相关人员

3. **版本分支管理**
   - 支持文档分支（类似Git）
   - 版本合并功能
   - 分支可视化

4. **智能推荐**
   - 推荐重要版本
   - 推荐相关版本
   - 版本关系图谱

5. **导出功能**
   - 导出版本历史报告（PDF/Excel）
   - 导出版本对比结果
   - 导出特定版本

### 用户体验优化

1. **快捷键支持**
   - `j/k` 上下导航
   - `Enter` 查看详情
   - `Esc` 关闭弹窗

2. **个性化设置**
   - 自定义显示字段
   - 自定义排序方式
   - 自定义分页大小

3. **移动端优化**
   - 手势操作（滑动查看详情）
   - 底部Sheet展示详情
   - 触摸友好的操作按钮

---

## 📚 参考资料

### 产品设计参考

- **GitHub**: Pull Request Timeline
- **GitLab**: Merge Request Activity
- **Notion**: Page History
- **Google Docs**: Version History
- **Confluence**: Page History

### 技术实现参考

- Vue 3 Composition API文档
- VueUse工具库
- 虚拟滚动实现原理
- Diff算法（Myers算法）
- 无限滚动最佳实践

### 项目文档

- [文档API修复验证报告](../backend/docs/DOCUMENT_API_FIX_VALIDATION.md)
- [API综合测试报告](../backend/docs/API_COMPREHENSIVE_TEST_REPORT.md)
- [后端版本历史API文档](../backend/docs/API_VERSION_HISTORY.md)

---

**文档版本**: v1.0
**创建时间**: 2025-10-24 23:05
**最后更新**: 2025-10-24 23:05
**作者**: Claude Code AI
**审核状态**: 待审核

# TaskDetail Module

## 📋 Overview

This module is the refactored version of `TaskDetailPageNew.tsx`, split into smaller, focused components for better maintainability, performance, and testability.

## 🏗️ Architecture

### Directory Structure

```
TaskDetail/
├── index.tsx                    # Route-level entry point
├── TaskDetailPage.tsx          # Main page container
├── context/                    # Context providers and state management
├── components/                 # UI components
│   ├── Header/                # Page header components
│   ├── Tabs/                  # Tab content components
│   ├── Sidebar/               # Sidebar components
│   ├── Modals/                # Modal components
│   └── shared/                # Shared/common components
├── hooks/                     # Custom React hooks
│   ├── data/                  # Data-fetching hooks
│   ├── ui/                    # UI state hooks
│   ├── operations/            # Business logic hooks
│   └── performance/           # Performance optimization hooks
├── services/                  # API service layer
├── types/                     # TypeScript type definitions
├── utils/                     # Utility functions
├── constants/                 # Constants and configurations
└── __tests__/                 # Test files

```

## 🚀 Quick Start

### Using the TaskDetail Component

```tsx
import TaskDetail from '@/pages/TaskDetail';

// In your routing configuration
<Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetail />} />
```

### Key Components

#### TaskDetailProvider
Manages the global state for the task detail page.

```tsx
import { TaskDetailProvider } from './context';

<TaskDetailProvider projectId={1} taskId={1}>
  {/* Your components */}
</TaskDetailProvider>
```

#### Custom Hooks

```tsx
import { useTaskDetail } from './hooks/data';
import { useTaskDetailUI } from './hooks/ui';

const MyComponent = () => {
  const { task, loading, error } = useTaskDetail();
  const { activeTab, setActiveTab } = useTaskDetailUI();
  
  // Component logic
};
```

## 📝 Type Definitions

All TypeScript interfaces and types are defined in the `types/` directory:

- `task.types.ts` - Task-related types
- `document.types.ts` - Document-related types
- `ui.types.ts` - UI state types
- `api.types.ts` - API response types

## 🧪 Testing

Run tests specific to this module:

```bash
npm run test:task-detail
```

Watch mode for development:

```bash
npm run test:task-detail:watch
```

## 🔧 Development

### Available Scripts

- `npm run dev:task-detail` - Start development server
- `npm run build:task-detail` - Build production bundle
- `npm run lint:task-detail` - Run ESLint
- `npm run type-check:task-detail` - Run TypeScript type checking

### Code Quality Standards

1. **Component Size**: Max 300 lines per component
2. **Function Complexity**: Max cyclomatic complexity of 10
3. **TypeScript**: Strict mode enabled, no `any` types
4. **Testing**: Minimum 80% coverage for new code

## 📊 Performance Metrics

Target performance goals:

- Initial Load: < 1.5 seconds
- Re-renders: 70% reduction from original
- Bundle Size: < 200KB (gzipped)
- Memory Usage: 20% reduction

## 🤝 Contributing

1. Follow the established directory structure
2. Write tests for new components/hooks
3. Update type definitions when adding new features
4. Document complex logic with JSDoc comments

## 📚 Documentation

- [Component Architecture](./docs/architecture.md)
- [State Management](./docs/state-management.md)
- [API Integration](./docs/api-integration.md)
- [Testing Guide](./docs/testing-guide.md)

## 🔄 Migration from TaskDetailPageNew

This module replaces the monolithic `TaskDetailPageNew.tsx` component. The migration is designed to be incremental:

1. **Phase 1**: Basic infrastructure (current)
2. **Phase 2**: Core components
3. **Phase 3**: Advanced features
4. **Phase 4**: Testing and optimization
5. **Phase 5**: Full replacement

## 📞 Support

For questions or issues related to this module, contact the frontend team or create an issue in the project repository.

---

Last updated: 2025-09-28
# AI-Proj-iOS Project Structure

**Created**: 2024-10-14
**Architecture**: Clean Architecture + MVVM + Phased Development

---

## Directory Structure

```
AI-Proj-iOS/
├── Models/                            # Phase 1: Data Models
│   ├── TaskModel.swift               # Task entity (⚠️ Model suffix to avoid conflict)
│   ├── DocumentModel.swift           # Document entity
│   ├── TimerModel.swift              # Timer entity
│   ├── UserModel.swift               # User entity
│   ├── ProjectModel.swift            # Project entity
│   └── DTOs/                         # Data Transfer Objects
│       ├── TaskListResponse.swift
│       ├── DocumentListResponse.swift
│       └── ... (API response models)
│
├── Core/                              # Phase 1: Core Services
│   ├── Network/
│   │   ├── NetworkService.swift      # HTTP client (URLSession + async/await)
│   │   ├── APIEndpoints.swift        # API endpoint definitions
│   │   ├── NetworkError.swift        # Network error types
│   │   └── RequestBuilder.swift      # Request configuration
│   ├── Database/
│   │   ├── DatabaseService.swift     # Local persistence
│   │   ├── CacheManager.swift        # Memory/Disk cache
│   │   └── StorageKeys.swift         # UserDefaults keys
│   ├── Auth/
│   │   ├── AuthService.swift         # JWT token management
│   │   ├── TokenStorage.swift        # Secure token storage
│   │   └── AuthError.swift           # Auth error types
│   └── DependencyInjection/
│       ├── DIContainer.swift         # Dependency injection container
│       └── ServiceProtocols.swift    # Service interfaces
│
├── Architecture/                      # Phase 1: App Architecture
│   ├── AppCoordinator.swift          # Navigation coordinator
│   ├── ViewModelProtocol.swift       # Base ViewModel protocol
│   └── AppState.swift                # Global app state
│
├── Features/                          # Phase 2: Feature Modules (Parallel Dev)
│   ├── Tasks/
│   │   ├── Views/
│   │   │   ├── TaskListView.swift
│   │   │   ├── TaskDetailView.swift
│   │   │   └── TaskEditView.swift
│   │   └── ViewModels/
│   │       ├── TaskListViewModel.swift
│   │       └── TaskDetailViewModel.swift
│   ├── Documents/
│   │   ├── Views/
│   │   │   ├── DocumentListView.swift
│   │   │   └── DocumentDetailView.swift
│   │   └── ViewModels/
│   │       └── DocumentListViewModel.swift
│   ├── Timer/
│   │   ├── Views/
│   │   │   └── TimerView.swift
│   │   └── ViewModels/
│   │       └── TimerViewModel.swift
│   └── Profile/
│       ├── Views/
│       │   ├── ProfileView.swift
│       │   └── SettingsView.swift
│       └── ViewModels/
│           └── ProfileViewModel.swift
│
├── UI/                                # Phase 1: UI Foundation
│   ├── Components/
│   │   ├── PrimaryButton.swift       # Reusable button
│   │   ├── LoadingView.swift         # Loading indicator
│   │   ├── ErrorView.swift           # Error display
│   │   └── EmptyStateView.swift      # Empty state
│   └── Themes/
│       ├── AppTheme.swift            # Theme configuration
│       ├── Colors.swift              # Color palette
│       └── Typography.swift          # Font styles
│
├── Tests/                             # Unit & Integration Tests
│   ├── ModelsTests/
│   │   └── TaskModelTests.swift
│   ├── CoreTests/
│   │   ├── NetworkServiceTests.swift
│   │   └── AuthServiceTests.swift
│   └── FeaturesTests/
│       └── TaskListViewModelTests.swift
│
└── Resources/                         # App Resources
    ├── Assets.xcassets/              # Images, colors, etc.
    ├── Info.plist                    # App configuration
    └── Localizable.strings           # Localization
```

---

## Layer Responsibilities

### Models Layer (Phase 1)
**Purpose**: Define all data structures

**Rules**:
- ✅ Pure data structures (struct)
- ✅ Conform to Codable, Identifiable, Hashable
- ✅ Use `Model` suffix to avoid naming conflicts
- ❌ No business logic
- ❌ No network/database code

**Example**:
```swift
struct TaskModel: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let status: TaskStatus
}
```

### Core Layer (Phase 1)
**Purpose**: Provide fundamental services

**Rules**:
- ✅ Implement as protocols (testable)
- ✅ Handle errors gracefully
- ✅ Use async/await for async operations
- ❌ No UI code
- ❌ No Feature-specific logic

**Example**:
```swift
protocol NetworkServiceProtocol {
    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T
}
```

### Architecture Layer (Phase 1)
**Purpose**: Define app-wide patterns

**Rules**:
- ✅ Coordinator for navigation
- ✅ Protocol-oriented design
- ✅ Dependency injection
- ❌ No concrete Feature implementations

### Features Layer (Phase 2)
**Purpose**: Implement user-facing functionality

**Rules**:
- ✅ MVVM pattern (View + ViewModel)
- ✅ Only depend on Foundation layers (Models, Core, Architecture)
- ✅ Use @Published for state
- ✅ Use @EnvironmentObject for DI
- ❌ No dependencies on other Features
- ❌ No direct networking (use NetworkService)

**Example**:
```swift
class TaskListViewModel: ObservableObject {
    @Published var tasks: [TaskModel] = []

    private let networkService: NetworkServiceProtocol

    init(networkService: NetworkServiceProtocol) {
        self.networkService = networkService
    }

    func loadTasks() async {
        // Use NetworkService, not direct API calls
        tasks = try? await networkService.request(.taskList)
    }
}
```

### UI Layer (Phase 1)
**Purpose**: Reusable UI components

**Rules**:
- ✅ Generic, reusable components
- ✅ No business logic
- ✅ Themeable
- ❌ No networking
- ❌ No state management (that's ViewModel's job)

---

## Dependency Flow

```
┌─────────────────────────────────────┐
│         Features Layer              │
│  • TaskListView                     │
│  • TaskListViewModel                │
│  • DocumentListView                 │
│  • ...                              │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│       Foundation Layer              │
│  ┌─────────────────────────────┐   │
│  │ Models                      │   │
│  │  • TaskModel                │   │
│  │  • DocumentModel            │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Core Services               │   │
│  │  • NetworkService           │   │
│  │  • AuthService              │   │
│  │  • DatabaseService          │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Architecture                │   │
│  │  • DIContainer              │   │
│  │  • AppCoordinator           │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Key Principles**:
1. Features → Foundation (allowed)
2. Foundation → Features (forbidden)
3. Feature A → Feature B (forbidden)

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Model | `<Name>Model.swift` | `TaskModel.swift` |
| DTO | `<Name>Response.swift` | `TaskListResponse.swift` |
| Service | `<Name>Service.swift` | `NetworkService.swift` |
| Protocol | `<Name>Protocol.swift` | `NetworkServiceProtocol.swift` |
| View | `<Feature><Type>View.swift` | `TaskListView.swift` |
| ViewModel | `<Feature><Type>ViewModel.swift` | `TaskListViewModel.swift` |
| Component | `<Name>.swift` | `PrimaryButton.swift` |

---

## Git Branching Strategy

### Phase 1: Sequential Development
```
main
└── foundation/phase-1
    ├── models
    ├── core-services
    ├── architecture
    └── ui-components
```

All Foundation work happens in `foundation/phase-1` branch, reviewed and merged to `main`.

### Phase 2: Parallel Development
```
main (with complete Foundation)
├── feature/task-management    (AI #1)
├── feature/document-management (AI #2)
├── feature/timer               (AI #3)
└── feature/profile             (AI #4)
```

Each Feature branch:
1. Branches from `main` (after Phase 1 merge)
2. Only adds files in `Features/<FeatureName>/`
3. Merges back to `main` independently

---

## Development Phases

### Phase 1 Checklist (Single AI - Sequential)

Foundation Layer:
- [ ] Models/ - All data models with Model suffix
- [ ] Core/Network/ - NetworkService with async/await
- [ ] Core/Database/ - Local storage and caching
- [ ] Core/Auth/ - JWT authentication
- [ ] Core/DependencyInjection/ - DIContainer
- [ ] Architecture/ - AppCoordinator, protocols
- [ ] UI/ - Reusable components and themes
- [ ] Tests/ - Unit tests for all services
- [ ] Documentation - API docs for Foundation layer

Acceptance Criteria:
- ✅ Project compiles without errors
- ✅ All models encode/decode correctly
- ✅ NetworkService can make API calls
- ✅ DIContainer properly injects dependencies
- ✅ UI components render correctly
- ✅ Unit tests pass (>80% coverage)

### Phase 2 Checklist (Multi AI - Parallel)

Feature Branches:
- [ ] feature/task-management
  - [ ] TaskListView
  - [ ] TaskDetailView
  - [ ] TaskListViewModel
  - [ ] Unit tests

- [ ] feature/document-management
  - [ ] DocumentListView
  - [ ] DocumentDetailView
  - [ ] DocumentViewModel
  - [ ] Unit tests

- [ ] feature/timer
  - [ ] TimerView
  - [ ] TimerViewModel
  - [ ] Unit tests

- [ ] feature/profile
  - [ ] ProfileView
  - [ ] SettingsView
  - [ ] ProfileViewModel
  - [ ] Unit tests

Acceptance Criteria (per feature):
- ✅ Feature compiles independently
- ✅ Only uses Foundation APIs
- ✅ No dependencies on other Features
- ✅ Follows MVVM pattern
- ✅ Includes unit tests
- ✅ PR approved by code review

---

## Common Pitfalls to Avoid

### ❌ Don't: Define models in Features
```swift
// Features/Tasks/Views/TaskListView.swift
struct Task { // ❌ Wrong! Model should be in Models/
    let id: Int
    let title: String
}
```

### ✅ Do: Use Models from Foundation
```swift
// Features/Tasks/Views/TaskListView.swift
import Models

struct TaskListView: View {
    let task: TaskModel // ✅ Correct!
}
```

### ❌ Don't: Direct API calls in ViewModels
```swift
class TaskListViewModel: ObservableObject {
    func loadTasks() async {
        let url = URL(string: "http://api...")! // ❌ Wrong!
        // direct URLSession code
    }
}
```

### ✅ Do: Use NetworkService
```swift
class TaskListViewModel: ObservableObject {
    private let networkService: NetworkServiceProtocol

    func loadTasks() async {
        tasks = try? await networkService.request(.taskList) // ✅ Correct!
    }
}
```

### ❌ Don't: Feature-to-Feature dependencies
```swift
// Features/Documents/DocumentView.swift
import Features.Tasks // ❌ Wrong!

struct DocumentView: View {
    @State var tasks: [TaskModel] // Coupling!
}
```

### ✅ Do: Only depend on Foundation
```swift
// Features/Documents/DocumentView.swift
import Models // ✅ Correct!

struct DocumentView: View {
    @State var tasks: [TaskModel] // Use shared model
}
```

---

## Testing Strategy

### Unit Tests (Phase 1)
- Models: Encoding/Decoding tests
- Services: Mock-based tests
- ViewModels: Business logic tests

### Integration Tests (Phase 2)
- Feature flows (e.g., create task → save → display)
- Navigation tests
- Error handling tests

### UI Tests (Optional)
- Critical user flows
- Accessibility tests

---

## Next Steps

1. ✅ Create project structure
2. ⏭️  Implement Foundation layer (Phase 1)
3. ⏭️  Parallel Feature development (Phase 2)
4. ⏭️  Integration and testing

---

**Reference**: See `README.md` for detailed development guidelines and API documentation.

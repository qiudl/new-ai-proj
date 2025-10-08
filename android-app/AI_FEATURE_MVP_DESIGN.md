# Android App AI功能MVP设计方案

## 📋 项目概述

**目标**: 在Android App中实现AI辅助创建任务文档、子任务和任务描述的功能，提升用户创建和管理任务的效率。

**原则**: MVP（Minimum Viable Product）- 最小可行产品
- 功能完整但不追求复杂
- 用户体验流畅
- 代码架构清晰易维护
- 后端API完全复用，不做任何修改

---

## 🎯 功能范围

### MVP核心功能（P0）

#### 1. AI生成任务文档
- ✅ 选择文档类型（技术设计、需求规格、测试计划、API文档）
- ✅ 选择AI模型（GPT-4o、DeepSeek等）
- ✅ 自定义提示词（可选）
- ✅ 实时生成预览
- ✅ 保存文档到任务

#### 2. AI生成任务描述
- ✅ 基于任务标题自动生成描述
- ✅ 查看多个描述建议
- ✅ 一键应用描述
- ✅ 编辑后保存

#### 3. AI生成子任务
- ✅ 基于父任务自动拆解子任务
- ✅ 预览子任务列表（带预估工时）
- ✅ 编辑子任务后批量创建
- ✅ 显示统计信息

### 延后功能（P1/P2）

- ❌ 批量操作（批量生成描述）
- ❌ 历史记录查询
- ❌ 自定义模板管理
- ❌ 离线缓存生成结果

---

## 🏗️ 技术架构

### 架构模式: MVVM + Repository

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer                         │
│  (Screens & Components - Jetpack Compose)          │
│  ├─ AIDocumentGenerateScreen                       │
│  ├─ AISubtaskGenerateScreen                        │
│  └─ AIDescriptionSuggestionsDialog                 │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  ViewModel Layer                    │
│  ├─ AIDocumentViewModel                            │
│  ├─ AISubtaskViewModel                             │
│  └─ AIDescriptionViewModel                         │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                 Repository Layer                    │
│  ├─ AIDocumentRepository                           │
│  ├─ AISubtaskRepository                            │
│  └─ AIDescriptionRepository                        │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                   API Layer                         │
│  ├─ AIDocumentApi (Retrofit)                       │
│  ├─ AISubtaskApi (Retrofit)                        │
│  └─ AIDescriptionApi (Retrofit)                    │
└─────────────────────────────────────────────────────┘
```

---

## 📡 后端API接口映射

### 1. AI文档生成相关

| 功能 | 方法 | 端点 | 参数 |
|------|------|------|------|
| 获取文档类型 | GET | `/api/v1/ai/document-types` | - |
| 获取文档模板 | GET | `/api/v1/ai/document-templates` | - |
| 生成文档 | POST | `/api/v1/ai/generate-document` | task_id, model, document_type, custom_prompt?, options? |
| 保存文档 | POST | `/api/v1/ai/save-document` | task_id, title, content, project_id? |

### 2. AI任务描述相关

| 功能 | 方法 | 端点 | 参数 |
|------|------|------|------|
| 生成描述 | POST | `/api/v1/tasks/:id/ai/generate-description` | model, custom_prompt? |
| 更新描述 | POST | `/api/v1/tasks/:id/ai/update-description` | description |
| 获取描述建议 | GET | `/api/v1/tasks/:id/ai/description-suggestions` | model, count? |

### 3. AI子任务生成相关

| 功能 | 方法 | 端点 | 参数 |
|------|------|------|------|
| 生成子任务 | POST | `/api/v1/tasks/:id/ai-generate-subtasks` | model, custom_prompt?, context |
| 批量创建子任务 | POST | `/api/v1/tasks/batch-create-subtasks` | parent_id, subtasks[] |

---

## 🎨 UI设计 - 线框图

### 1. AI生成文档界面

```
┌─────────────────────────────────────────────────┐
│  ← AI生成任务文档                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  📄 任务: 实现用户登录功能                      │
│      #2941 · 待办                               │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 选择文档类型                             │   │
│  │ ○ 技术设计文档                          │   │
│  │ ○ 需求规格说明书                        │   │
│  │ ○ 测试计划文档                          │   │
│  │ ● API接口文档                           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ AI模型                   ▼ GPT-4o       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 自定义提示词（可选）                     │   │
│  │ 请根据RESTful规范设计...                │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ☑ 包含子任务信息                               │
│  ☑ 包含代码示例                                 │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         🤖 开始生成                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2. 文档生成结果预览

```
┌─────────────────────────────────────────────────┐
│  ← 生成结果预览                                 │
├─────────────────────────────────────────────────┤
│  ✅ 文档生成成功！                              │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📄 登录功能API接口文档                  │   │
│  │                                         │   │
│  │ ## 概述                                 │   │
│  │ 本文档描述用户登录相关的API接口...      │   │
│  │                                         │   │
│  │ ## 接口列表                             │   │
│  │                                         │   │
│  │ ### POST /api/v1/auth/login            │   │
│  │ **描述**: 用户登录                      │   │
│  │ **请求参数**:                           │   │
│  │ - username: string (必填)              │   │
│  │ - password: string (必填)              │   │
│  │                                         │   │
│  │ [继续滚动查看...]                       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  📊 统计:                                       │
│  • 字数: 1,234                                  │
│  • 章节: 5                                      │
│  • 代码块: 3                                    │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐              │
│  │   重新生成   │  │   保存文档   │              │
│  └─────────────┘  └─────────────┘              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3. AI生成子任务界面

```
┌─────────────────────────────────────────────────┐
│  ← AI生成子任务                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  📋 父任务: 实现用户登录功能                    │
│      #2941 · 待办 · 预估8小时                   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ AI模型              ▼ DeepSeek-V3       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 自定义提示词（可选）                     │   │
│  │ 请细化为前端、后端和测试任务...          │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  子任务选项:                                    │
│  ☑ 包含任务描述                                 │
│  ☐ 包含兄弟任务                                 │
│  最多生成: [10] 个子任务                        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         🤖 开始生成                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4. 子任务生成结果

```
┌─────────────────────────────────────────────────┐
│  ← 生成的子任务 (5个)                           │
├─────────────────────────────────────────────────┤
│  ✅ 子任务生成成功！                            │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ ☑ 1. 设计登录表单UI界面                 │   │
│  │    📝 创建登录页面组件...               │   │
│  │    ⏱️  预估: 2.0小时                    │   │
│  │    📊 优先级: medium   [编辑]           │   │
│  ├─────────────────────────────────────────┤   │
│  │ ☑ 2. 实现登录API接口                    │   │
│  │    📝 开发POST /login端点...            │   │
│  │    ⏱️  预估: 2.5小时                    │   │
│  │    📊 优先级: high     [编辑]           │   │
│  ├─────────────────────────────────────────┤   │
│  │ ☑ 3. 实现JWT令牌生成                    │   │
│  │    📝 集成JWT库...                      │   │
│  │    ⏱️  预估: 1.5小时                    │   │
│  │    📊 优先级: high     [编辑]           │   │
│  ├─────────────────────────────────────────┤   │
│  │ ☑ 4. 添加表单验证逻辑                   │   │
│  │    📝 验证邮箱格式、密码强度...         │   │
│  │    ⏱️  预估: 1.0小时                    │   │
│  │    📊 优先级: medium   [编辑]           │   │
│  ├─────────────────────────────────────────┤   │
│  │ ☑ 5. 编写登录功能测试                   │   │
│  │    📝 单元测试和集成测试...             │   │
│  │    ⏱️  预估: 1.0小时                    │   │
│  │    📊 优先级: medium   [编辑]           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  📊 统计:                                       │
│  • 总计: 5个子任务                              │
│  • 总工时: 8.0小时                              │
│  • 平均: 1.6小时/任务                           │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐              │
│  │   重新生成   │  │ 批量创建(5)  │              │
│  └─────────────┘  └─────────────┘              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5. AI描述建议弹窗（在任务编辑界面）

```
┌─────────────────────────────────────────────────┐
│  编辑任务 - #2941                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  标题: 实现用户登录功能                         │
│                                                 │
│  描述:                                          │
│  ┌─────────────────────────────────────────┐   │
│  │ [空白]                                  │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│  [🤖 AI生成建议]                                │
│                                                 │
│  ┌───────────────────────────────────────┐     │
│  │ 🤖 AI生成的描述建议                   │     │
│  ├───────────────────────────────────────┤     │
│  │                                       │     │
│  │ 建议 1 (推荐) ⭐                      │     │
│  │ ┌─────────────────────────────────┐   │     │
│  │ │ 开发用户登录功能，包括：         │   │     │
│  │ │ - 设计登录表单UI界面             │   │     │
│  │ │ - 实现登录API接口               │   │     │
│  │ │ - JWT令牌生成和验证             │   │     │
│  │ │ - 前端状态管理                  │   │     │
│  │ │ - 安全性考虑(防暴力破解等)       │   │     │
│  │ └─────────────────────────────────┘   │     │
│  │       [✓ 选择此建议]                  │     │
│  │                                       │     │
│  │ 建议 2                                │     │
│  │ ┌─────────────────────────────────┐   │     │
│  │ │ 实现完整的用户认证登录流程...    │   │     │
│  │ └─────────────────────────────────┘   │     │
│  │       [选择]                          │     │
│  │                                       │     │
│  │ 建议 3                                │     │
│  │ ┌─────────────────────────────────┐   │     │
│  │ │ 构建用户登录模块，涵盖...        │   │     │
│  │ └─────────────────────────────────┘   │     │
│  │       [选择]                          │     │
│  │                                       │     │
│  │ 🔄 重新生成      ✕ 关闭              │     │
│  └───────────────────────────────────────┘     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📦 数据模型

### Kotlin数据类定义

```kotlin
// AI文档类型
data class AIDocumentType(
    val type: String,           // design, requirements, test_plan, api_doc
    val name: String,
    val description: String
)

// AI文档生成请求
data class AIDocumentGenerateRequest(
    val taskId: Int,
    val model: String,
    val documentType: String,
    val customPrompt: String? = null,
    val options: DocumentGenOptions? = null
)

data class DocumentGenOptions(
    val includeSubtasks: Boolean = false,
    val includeCodeExamples: Boolean = false,
    val language: String = "zh"
)

// AI文档生成响应
data class AIDocumentGenerateResponse(
    val document: DocumentData,
    val modelUsed: String,
    val generatedAt: String
)

data class DocumentData(
    val title: String,
    val content: String,
    val metadata: DocumentMetadata
)

data class DocumentMetadata(
    val wordCount: Int,
    val sections: Int,
    val codeBlocks: Int
)

// AI子任务生成请求
data class AISubtaskGenerateRequest(
    val model: String,
    val customPrompt: String? = null,
    val context: SubtaskContext
)

data class SubtaskContext(
    val includeDescription: Boolean = true,
    val includeSiblings: Boolean = false,
    val maxSubtasks: Int = 10
)

// AI子任务生成响应
data class AISubtaskGenerateResponse(
    val subtasks: List<GeneratedSubtask>,
    val statistics: SubtaskStatistics
)

data class GeneratedSubtask(
    val title: String,
    val description: String,
    val estimatedHours: Float,
    val priority: String
)

data class SubtaskStatistics(
    val count: Int,
    val totalHours: Float,
    val avgHours: Float
)

// AI描述建议响应
data class AIDescriptionSuggestionsResponse(
    val suggestions: List<DescriptionSuggestion>
)

data class DescriptionSuggestion(
    val text: String,
    val score: Float? = null,
    val recommended: Boolean = false
)
```

---

## 🔄 用户交互流程

### 流程1: 生成任务文档

```
用户进入任务详情
    ↓
点击"AI生成文档"
    ↓
选择文档类型、模型、提示词
    ↓
点击"开始生成"
    ↓
显示加载状态(5-15秒)
    ↓
展示生成结果预览
    ↓
用户选择: [重新生成] or [保存文档]
    ↓
保存成功 → 返回任务详情(显示新文档)
```

### 流程2: 生成子任务

```
用户进入任务详情(父任务)
    ↓
点击"AI生成子任务"
    ↓
选择模型、配置选项
    ↓
点击"开始生成"
    ↓
显示加载状态(5-10秒)
    ↓
展示子任务列表预览
    ↓
用户可编辑单个子任务
    ↓
点击"批量创建"
    ↓
创建成功 → 返回任务详情(显示子任务列表)
```

### 流程3: 生成任务描述

```
用户创建新任务(输入标题)
    ↓
点击"AI生成描述建议"
    ↓
加载3个建议(2-5秒)
    ↓
弹窗展示建议列表
    ↓
用户选择一个建议
    ↓
自动填充到描述字段
    ↓
用户可继续编辑
    ↓
保存任务
```

---

## 🛠️ 实现要点

### 1. 网络层实现

```kotlin
// AIDocumentApi.kt
interface AIDocumentApi {
    @GET("ai/document-types")
    suspend fun getDocumentTypes(): Response<ApiResponse<DocumentTypesData>>

    @POST("ai/generate-document")
    suspend fun generateDocument(
        @Body request: AIDocumentGenerateRequest
    ): Response<ApiResponse<AIDocumentGenerateResponse>>

    @POST("ai/save-document")
    suspend fun saveDocument(
        @Body request: SaveDocumentRequest
    ): Response<ApiResponse<SaveDocumentResponse>>
}

// AISubtaskApi.kt
interface AISubtaskApi {
    @POST("tasks/{id}/ai-generate-subtasks")
    suspend fun generateSubtasks(
        @Path("id") taskId: Int,
        @Body request: AISubtaskGenerateRequest
    ): Response<ApiResponse<AISubtaskGenerateResponse>>

    @POST("tasks/batch-create-subtasks")
    suspend fun batchCreateSubtasks(
        @Body request: BatchCreateSubtasksRequest
    ): Response<ApiResponse<BatchCreateSubtasksResponse>>
}

// AIDescriptionApi.kt
interface AIDescriptionApi {
    @GET("tasks/{id}/ai/description-suggestions")
    suspend fun getDescriptionSuggestions(
        @Path("id") taskId: Int,
        @Query("model") model: String,
        @Query("count") count: Int = 3
    ): Response<ApiResponse<AIDescriptionSuggestionsResponse>>

    @POST("tasks/{id}/ai/update-description")
    suspend fun updateDescription(
        @Path("id") taskId: Int,
        @Body request: UpdateDescriptionRequest
    ): Response<ApiResponse<Unit>>
}
```

### 2. Repository层实现

```kotlin
class AIDocumentRepository(
    private val api: AIDocumentApi
) {
    suspend fun getDocumentTypes(): Result<List<AIDocumentType>> {
        return try {
            val response = api.getDocumentTypes()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data.types)
            } else {
                Result.failure(Exception("获取文档类型失败"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun generateDocument(
        request: AIDocumentGenerateRequest
    ): Result<AIDocumentGenerateResponse> {
        // 实现细节...
    }

    // 其他方法...
}
```

### 3. ViewModel层实现

```kotlin
class AIDocumentViewModel(
    private val repository: AIDocumentRepository,
    private val taskId: Int
) : ViewModel() {

    // UI State
    private val _uiState = MutableStateFlow<AIDocumentUiState>(AIDocumentUiState.Idle)
    val uiState: StateFlow<AIDocumentUiState> = _uiState.asStateFlow()

    // 文档类型列表
    private val _documentTypes = MutableStateFlow<List<AIDocumentType>>(emptyList())
    val documentTypes: StateFlow<List<AIDocumentType>> = _documentTypes.asStateFlow()

    // 选中的文档类型
    var selectedDocType by mutableStateOf("")
    var selectedModel by mutableStateOf("gpt-4o")
    var customPrompt by mutableStateOf("")

    init {
        loadDocumentTypes()
    }

    fun loadDocumentTypes() {
        viewModelScope.launch {
            repository.getDocumentTypes().onSuccess { types ->
                _documentTypes.value = types
            }
        }
    }

    fun generateDocument() {
        viewModelScope.launch {
            _uiState.value = AIDocumentUiState.Loading

            val request = AIDocumentGenerateRequest(
                taskId = taskId,
                model = selectedModel,
                documentType = selectedDocType,
                customPrompt = customPrompt.takeIf { it.isNotBlank() }
            )

            repository.generateDocument(request)
                .onSuccess { response ->
                    _uiState.value = AIDocumentUiState.Success(response.document)
                }
                .onFailure { error ->
                    _uiState.value = AIDocumentUiState.Error(
                        error.message ?: "生成失败"
                    )
                }
        }
    }

    fun saveDocument(title: String, content: String) {
        // 实现保存逻辑...
    }
}

// UI State定义
sealed class AIDocumentUiState {
    object Idle : AIDocumentUiState()
    object Loading : AIDocumentUiState()
    data class Success(val document: DocumentData) : AIDocumentUiState()
    data class Error(val message: String) : AIDocumentUiState()
}
```

### 4. UI层实现

```kotlin
@Composable
fun AIDocumentGenerateScreen(
    taskId: Int,
    viewModel: AIDocumentViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val documentTypes by viewModel.documentTypes.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI生成任务文档") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "返回")
                    }
                }
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is AIDocumentUiState.Loading -> {
                LoadingIndicator()
            }
            is AIDocumentUiState.Success -> {
                DocumentPreviewScreen(
                    document = state.document,
                    onSave = { viewModel.saveDocument(it.title, it.content) },
                    onRegenerate = { viewModel.generateDocument() }
                )
            }
            is AIDocumentUiState.Error -> {
                ErrorMessage(state.message)
            }
            else -> {
                DocumentGenerateForm(
                    documentTypes = documentTypes,
                    selectedDocType = viewModel.selectedDocType,
                    onDocTypeChange = { viewModel.selectedDocType = it },
                    selectedModel = viewModel.selectedModel,
                    onModelChange = { viewModel.selectedModel = it },
                    customPrompt = viewModel.customPrompt,
                    onPromptChange = { viewModel.customPrompt = it },
                    onGenerate = { viewModel.generateDocument() }
                )
            }
        }
    }
}
```

---

## ⚡ 性能优化

### 1. 加载状态优化
- 显示友好的加载动画
- 预估加载时间提示(5-15秒)
- 支持取消生成(如果API支持)

### 2. 缓存策略
- 文档类型列表缓存1小时
- 模型列表缓存1小时
- 生成结果不缓存(实时性要求)

### 3. 错误处理
- 网络超时: 30秒
- API限流: 显示友好提示
- 生成失败: 提供重试按钮

---

## 🧪 测试策略

### 单元测试
- ViewModel逻辑测试
- Repository数据转换测试
- API请求构建测试

### 集成测试
- 完整的生成流程测试
- 错误处理测试
- 限流场景测试

### UI测试
- 界面交互测试
- 状态切换测试
- 错误提示测试

---

## 📅 开发计划

### Phase 1: 基础架构 (2-3小时)
- [ ] 创建数据模型
- [ ] 实现API接口定义
- [ ] 实现Repository层
- [ ] 配置依赖注入

### Phase 2: AI文档生成 (3-4小时)
- [ ] 实现AIDocumentViewModel
- [ ] 实现文档生成界面
- [ ] 实现文档预览界面
- [ ] 实现保存功能

### Phase 3: AI子任务生成 (3-4小时)
- [ ] 实现AISubtaskViewModel
- [ ] 实现子任务生成界面
- [ ] 实现子任务预览和编辑
- [ ] 实现批量创建功能

### Phase 4: AI描述生成 (2-3小时)
- [ ] 实现AIDescriptionViewModel
- [ ] 实现描述建议弹窗
- [ ] 集成到任务编辑界面

### Phase 5: 测试和优化 (2-3小时)
- [ ] 编写单元测试
- [ ] 集成测试
- [ ] UI测试
- [ ] 性能优化
- [ ] Bug修复

**总计预估: 12-17小时**

---

## 🎯 成功标准

### 功能完整性
- ✅ 所有核心功能正常工作
- ✅ API调用成功率 > 95%
- ✅ 错误处理完善

### 用户体验
- ✅ 界面美观友好
- ✅ 加载状态清晰
- ✅ 操作流畅无卡顿

### 代码质量
- ✅ 架构清晰
- ✅ 代码注释完整
- ✅ 单元测试覆盖率 > 70%

---

## 📚 参考资料

- 后端API文档: `/backend/handlers/ai_document_handler.go`
- 后端路由定义: `/backend/routes/ai_document_routes.go`
- Android现有架构: `/android-app/app/src/main/java/com/aiproj/mobile/`

---

**版本**: 1.0
**创建时间**: 2025-10-06
**作者**: Claude AI
**状态**: 设计方案 - 待评审

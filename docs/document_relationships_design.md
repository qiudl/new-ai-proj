# 文档管理系统 - 关联关系设计

## 🎯 设计理念

文档作为独立实体存在，通过灵活的关联关系连接到客户、项目、任务等业务对象。用户可以通过文件夹自由组织文档，支持拖拽移动，不受业务层级限制。

## 📁 核心架构

### 1. 文档独立存储

```
文档系统
├── 文件夹结构 (用户自定义)
│   ├── 📁 客户资料
│   │   ├── 📁 ABC公司
│   │   └── 📁 XYZ公司
│   ├── 📁 项目文档
│   │   ├── 📁 电商平台
│   │   └── 📁 移动应用
│   ├── 📁 技术文档
│   ├── 📁 模板库
│   └── 📁 个人笔记
│
└── 关联关系 (多对多)
    ├── 文档 ↔ 客户
    ├── 文档 ↔ 项目  
    ├── 文档 ↔ 任务
    ├── 文档 ↔ 用户
    └── 文档 ↔ 标签
```

### 2. 数据库设计

```sql
-- ====================
-- 文档表：独立存储，不直接关联业务实体
-- ====================
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    
    -- 文件夹管理
    folder_id INTEGER REFERENCES document_folders(id) ON DELETE SET NULL,
    
    -- 基础信息
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'markdown' CHECK (
        type IN ('markdown', 'image', 'pdf', 'doc', 'xlsx', 'pptx', 'txt', 'html')
    ),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'published', 'archived', 'template')
    ),
    
    -- 文件信息
    file_url TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- 元数据
    description TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- 权限和可见性
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visibility VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (
        visibility IN ('private', 'team', 'public')
    ),
    
    -- 版本管理
    version INTEGER NOT NULL DEFAULT 1,
    parent_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 时间戳
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- 索引
    CONSTRAINT documents_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- ====================
-- 文件夹表：支持嵌套结构
-- ====================
CREATE TABLE document_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_folder_id INTEGER REFERENCES document_folders(id) ON DELETE CASCADE,
    
    -- 所有者和权限
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visibility VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (
        visibility IN ('private', 'team', 'public')
    ),
    
    -- 显示设置
    color VARCHAR(7), -- HEX颜色
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    
    -- 时间戳
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- 约束：防止循环引用
    CONSTRAINT check_no_self_reference CHECK (id != parent_folder_id)
);

-- ====================
-- 文档关联表：多对多关系
-- ====================

-- 文档-客户关联
CREATE TABLE document_customer_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'related' CHECK (
        relation_type IN ('contract', 'requirement', 'reference', 'deliverable', 'related')
    ),
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, customer_id, relation_type)
);

-- 文档-项目关联
CREATE TABLE document_project_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'related' CHECK (
        relation_type IN (
            'requirement',    -- 需求文档
            'design',         -- 设计文档
            'technical',      -- 技术文档
            'plan',          -- 计划文档
            'report',        -- 报告文档
            'deliverable',   -- 交付物
            'reference',     -- 参考文档
            'template',      -- 模板
            'related'        -- 一般关联
        )
    ),
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, project_id, relation_type)
);

-- 文档-任务关联
CREATE TABLE document_task_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'attachment' CHECK (
        relation_type IN (
            'attachment',     -- 附件
            'reference',      -- 参考文档
            'requirement',    -- 需求说明
            'specification',  -- 规格说明
            'deliverable',    -- 交付物
            'test_case',      -- 测试用例
            'bug_report',     -- 问题报告
            'note',          -- 工作笔记
            'template'       -- 模板
        )
    ),
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, task_id, relation_type)
);

-- 文档-用户关联（收藏、关注等）
CREATE TABLE document_user_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL CHECK (
        relation_type IN ('favorite', 'bookmark', 'watch', 'recent')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, user_id, relation_type)
);

-- ====================
-- 文档协作和权限
-- ====================

-- 文档协作者
CREATE TABLE document_collaborators (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL CHECK (
        permission_level IN ('read', 'comment', 'edit', 'admin')
    ),
    granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    UNIQUE(document_id, user_id)
);

-- 文件夹协作者
CREATE TABLE folder_collaborators (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER NOT NULL REFERENCES document_folders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL CHECK (
        permission_level IN ('read', 'edit', 'admin')
    ),
    granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    UNIQUE(folder_id, user_id)
);
```

## 🎨 前端组件设计

### 1. 文档管理器主界面

```typescript
// src/pages/DocumentManagerPage.tsx
interface DocumentManagerPageProps {}

const DocumentManagerPage: React.FC<DocumentManagerPageProps> = () => {
    const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'table'>('list');

    return (
        <div className="document-manager">
            {/* 顶部工具栏 */}
            <DocumentToolbar
                onCreateDocument={handleCreateDocument}
                onCreateFolder={handleCreateFolder}
                onUpload={handleUpload}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            <div className="document-manager-content">
                {/* 左侧文件夹树 */}
                <DocumentFolderTree
                    folders={folders}
                    selectedFolder={selectedFolder}
                    onFolderSelect={setSelectedFolder}
                    onFolderCreate={handleCreateFolder}
                    onFolderRename={handleRenameFolder}
                    onFolderDelete={handleDeleteFolder}
                    onFolderMove={handleMoveFolder}
                />

                {/* 主要内容区 */}
                <div className="document-content">
                    {/* 面包屑导航 */}
                    <DocumentBreadcrumb
                        currentFolder={selectedFolder}
                        folders={folders}
                        onNavigate={setSelectedFolder}
                    />

                    {/* 文档列表 */}
                    <DocumentList
                        documents={documents}
                        folders={folders}
                        viewMode={viewMode}
                        onDocumentSelect={handleDocumentSelect}
                        onDocumentMove={handleDocumentMove}
                        onFolderMove={handleMoveFolder}
                        enableDragDrop={true}
                    />
                </div>

                {/* 右侧详情面板 */}
                <DocumentDetailPanel
                    document={selectedDocument}
                    onUpdateRelations={handleUpdateRelations}
                    onUpdateMetadata={handleUpdateMetadata}
                />
            </div>
        </div>
    );
};
```

### 2. 拖拽文件夹树组件

```typescript
// src/components/DocumentFolderTree.tsx
import { DndProvider, useDrag, useDrop } from 'react-dnd';

interface DocumentFolderTreeProps {
    folders: DocumentFolder[];
    selectedFolder: number | null;
    onFolderSelect: (folderId: number | null) => void;
    onFolderMove: (folderId: number, targetFolderId: number | null) => void;
    onFolderCreate: (parentId: number | null, name: string) => void;
    onFolderRename: (folderId: number, newName: string) => void;
    onFolderDelete: (folderId: number) => void;
}

const DocumentFolderTree: React.FC<DocumentFolderTreeProps> = ({
    folders,
    selectedFolder,
    onFolderSelect,
    onFolderMove,
    onFolderCreate,
    onFolderRename,
    onFolderDelete
}) => {
    const folderTree = buildFolderTree(folders);

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="folder-tree">
                <div className="folder-tree-header">
                    <h3>文档文件夹</h3>
                    <Button 
                        size="sm" 
                        icon={<PlusIcon />}
                        onClick={() => onFolderCreate(null, '新建文件夹')}
                    >
                        新建
                    </Button>
                </div>

                <div className="folder-tree-content">
                    {/* 根目录 */}
                    <FolderTreeNode
                        folder={null}
                        label="所有文档"
                        isSelected={selectedFolder === null}
                        onSelect={() => onFolderSelect(null)}
                        onMove={onFolderMove}
                        acceptDrop={true}
                    />

                    {/* 文件夹树 */}
                    {folderTree.map(folder => (
                        <FolderTreeNode
                            key={folder.id}
                            folder={folder}
                            isSelected={selectedFolder === folder.id}
                            onSelect={() => onFolderSelect(folder.id)}
                            onMove={onFolderMove}
                            onRename={onFolderRename}
                            onDelete={onFolderDelete}
                            onCreateChild={onFolderCreate}
                        />
                    ))}
                </div>
            </div>
        </DndProvider>
    );
};

// 文件夹节点组件
const FolderTreeNode: React.FC<FolderTreeNodeProps> = ({
    folder,
    label,
    isSelected,
    onSelect,
    onMove,
    onRename,
    onDelete,
    onCreateChild,
    acceptDrop = false
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(folder?.name || label);

    // 拖拽源
    const [{ isDragging }, drag] = useDrag({
        type: 'FOLDER',
        item: { id: folder?.id, name: folder?.name },
        canDrag: () => folder !== null,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // 拖拽目标
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ['FOLDER', 'DOCUMENT'],
        drop: (item: any) => {
            if (item.type === 'FOLDER' && item.id !== folder?.id) {
                onMove(item.id, folder?.id || null);
            } else if (item.type === 'DOCUMENT') {
                // 处理文档拖拽到文件夹
                handleDocumentMove(item.id, folder?.id || null);
            }
        },
        canDrop: (item: any) => {
            return acceptDrop || (folder && item.id !== folder.id);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    const handleRename = () => {
        if (folder && editName.trim() && editName !== folder.name) {
            onRename(folder.id, editName.trim());
        }
        setIsEditing(false);
    };

    return (
        <div
            ref={(node) => drag(drop(node))}
            className={`folder-node ${isSelected ? 'selected' : ''} ${
                isDragging ? 'dragging' : ''
            } ${isOver && canDrop ? 'drop-target' : ''}`}
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            <div className="folder-node-content" onClick={onSelect}>
                {folder && folder.children && folder.children.length > 0 && (
                    <Button
                        size="xs"
                        variant="text"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    </Button>
                )}

                <FolderIcon 
                    className="folder-icon" 
                    style={{ color: folder?.color || '#1890ff' }}
                />

                {isEditing ? (
                    <Input
                        size="sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onPressEnter={handleRename}
                        onBlur={handleRename}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                    />
                ) : (
                    <span className="folder-name">{folder?.name || label}</span>
                )}

                {folder && (
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'rename',
                                    label: '重命名',
                                    icon: <EditIcon />,
                                    onClick: () => setIsEditing(true),
                                },
                                {
                                    key: 'create',
                                    label: '新建子文件夹',
                                    icon: <PlusIcon />,
                                    onClick: () => onCreateChild?.(folder.id, '新建文件夹'),
                                },
                                { type: 'divider' },
                                {
                                    key: 'delete',
                                    label: '删除',
                                    icon: <DeleteIcon />,
                                    danger: true,
                                    onClick: () => onDelete?.(folder.id),
                                },
                            ],
                        }}
                        trigger={['contextMenu']}
                    >
                        <div className="folder-actions">
                            <MoreIcon />
                        </div>
                    </Dropdown>
                )}
            </div>

            {/* 子文件夹 */}
            {folder && isExpanded && folder.children && (
                <div className="folder-children">
                    {folder.children.map(child => (
                        <FolderTreeNode
                            key={child.id}
                            folder={child}
                            isSelected={selectedFolder === child.id}
                            onSelect={() => onFolderSelect(child.id)}
                            onMove={onMove}
                            onRename={onRename}
                            onDelete={onDelete}
                            onCreateChild={onCreateChild}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
```

### 3. 文档列表拖拽组件

```typescript
// src/components/DocumentList.tsx
const DocumentList: React.FC<DocumentListProps> = ({
    documents,
    folders,
    viewMode,
    onDocumentSelect,
    onDocumentMove,
    onFolderMove,
    enableDragDrop = true
}) => {
    // 拖拽目标（整个列表区域）
    const [{ isOver }, drop] = useDrop({
        accept: ['DOCUMENT', 'FOLDER'],
        drop: (item: any, monitor) => {
            if (!monitor.didDrop()) {
                // 拖拽到空白区域，移动到当前文件夹
                if (item.type === 'DOCUMENT') {
                    onDocumentMove(item.id, currentFolderId);
                } else if (item.type === 'FOLDER') {
                    onFolderMove(item.id, currentFolderId);
                }
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
        }),
    });

    return (
        <div 
            ref={enableDragDrop ? drop : undefined}
            className={`document-list ${viewMode} ${isOver ? 'drop-zone' : ''}`}
        >
            {viewMode === 'list' && (
                <div className="document-list-content">
                    {/* 当前文件夹的子文件夹 */}
                    {folders.map(folder => (
                        <DraggableFolderItem
                            key={`folder-${folder.id}`}
                            folder={folder}
                            onMove={onFolderMove}
                            enableDrag={enableDragDrop}
                        />
                    ))}

                    {/* 当前文件夹的文档 */}
                    {documents.map(document => (
                        <DraggableDocumentItem
                            key={`doc-${document.id}`}
                            document={document}
                            onSelect={onDocumentSelect}
                            onMove={onDocumentMove}
                            enableDrag={enableDragDrop}
                        />
                    ))}
                </div>
            )}

            {viewMode === 'grid' && (
                <div className="document-grid">
                    {folders.map(folder => (
                        <DraggableFolderCard
                            key={`folder-${folder.id}`}
                            folder={folder}
                            onMove={onFolderMove}
                            enableDrag={enableDragDrop}
                        />
                    ))}
                    {documents.map(document => (
                        <DraggableDocumentCard
                            key={`doc-${document.id}`}
                            document={document}
                            onSelect={onDocumentSelect}
                            onMove={onDocumentMove}
                            enableDrag={enableDragDrop}
                        />
                    ))}
                </div>
            )}

            {documents.length === 0 && folders.length === 0 && (
                <div className="empty-state">
                    <DocumentIcon className="empty-icon" />
                    <h3>此文件夹为空</h3>
                    <p>拖拽文档到这里，或点击上方按钮创建新文档</p>
                </div>
            )}
        </div>
    );
};

// 可拖拽的文档项
const DraggableDocumentItem: React.FC<DraggableDocumentItemProps> = ({
    document,
    onSelect,
    onMove,
    enableDrag
}) => {
    const [{ isDragging }, drag] = useDrag({
        type: 'DOCUMENT',
        item: { type: 'DOCUMENT', id: document.id, title: document.title },
        canDrag: enableDrag,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [{ isOver }, drop] = useDrop({
        accept: 'DOCUMENT',
        drop: (item: any) => {
            if (item.id !== document.id) {
                // 文档排序逻辑
                handleDocumentReorder(item.id, document.id);
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    });

    return (
        <div
            ref={(node) => enableDrag ? drag(drop(node)) : node}
            className={`document-item ${isDragging ? 'dragging' : ''} ${
                isOver ? 'drop-indicator' : ''
            }`}
            onClick={() => onSelect(document)}
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            <div className="document-icon">
                <DocumentTypeIcon type={document.type} />
            </div>
            
            <div className="document-info">
                <h4 className="document-title">{document.title}</h4>
                <p className="document-meta">
                    {formatDate(document.updated_at)} · {document.owner_name}
                </p>
                
                {/* 关联信息 */}
                <div className="document-relations">
                    {document.relations?.map(relation => (
                        <Tag key={relation.id} size="sm">
                            {relation.entity_type}: {relation.entity_name}
                        </Tag>
                    ))}
                </div>
            </div>

            <div className="document-actions">
                <DocumentActions document={document} />
            </div>
        </div>
    );
};
```

## 🔗 关联关系管理

### 1. 关联关系 API

```go
// DocumentRelationService 文档关联服务
type DocumentRelationService struct {
    db *sql.DB
}

// AddDocumentRelation 添加文档关联
func (s *DocumentRelationService) AddDocumentRelation(
    ctx context.Context,
    req AddDocumentRelationRequest,
) error {
    switch req.EntityType {
    case "customer":
        return s.addCustomerRelation(ctx, req)
    case "project":
        return s.addProjectRelation(ctx, req)
    case "task":
        return s.addTaskRelation(ctx, req)
    default:
        return fmt.Errorf("unsupported entity type: %s", req.EntityType)
    }
}

// GetDocumentRelations 获取文档的所有关联
func (s *DocumentRelationService) GetDocumentRelations(
    ctx context.Context,
    documentID int,
) ([]DocumentRelation, error) {
    var relations []DocumentRelation

    // 查询客户关联
    customerRelations, err := s.getCustomerRelations(ctx, documentID)
    if err != nil {
        return nil, err
    }
    relations = append(relations, customerRelations...)

    // 查询项目关联
    projectRelations, err := s.getProjectRelations(ctx, documentID)
    if err != nil {
        return nil, err
    }
    relations = append(relations, projectRelations...)

    // 查询任务关联
    taskRelations, err := s.getTaskRelations(ctx, documentID)
    if err != nil {
        return nil, err
    }
    relations = append(relations, taskRelations...)

    return relations, nil
}

// 数据模型
type DocumentRelation struct {
    ID           int       `json:"id"`
    DocumentID   int       `json:"document_id"`
    EntityType   string    `json:"entity_type"`   // customer, project, task
    EntityID     int       `json:"entity_id"`
    EntityName   string    `json:"entity_name"`
    RelationType string    `json:"relation_type"`
    Description  string    `json:"description"`
    CreatedBy    int       `json:"created_by"`
    CreatedAt    time.Time `json:"created_at"`
}

type AddDocumentRelationRequest struct {
    DocumentID   int    `json:"document_id" validate:"required"`
    EntityType   string `json:"entity_type" validate:"required,oneof=customer project task"`
    EntityID     int    `json:"entity_id" validate:"required"`
    RelationType string `json:"relation_type" validate:"required"`
    Description  string `json:"description"`
}
```

### 2. 关联关系组件

```typescript
// src/components/DocumentRelationsPanel.tsx
interface DocumentRelationsPanelProps {
    documentId: number;
    relations: DocumentRelation[];
    onAddRelation: (relation: AddDocumentRelationRequest) => void;
    onRemoveRelation: (relationId: number) => void;
    onUpdateRelation: (relationId: number, data: Partial<DocumentRelation>) => void;
}

const DocumentRelationsPanel: React.FC<DocumentRelationsPanelProps> = ({
    documentId,
    relations,
    onAddRelation,
    onRemoveRelation,
    onUpdateRelation
}) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const groupedRelations = groupBy(relations, 'entity_type');

    return (
        <div className="document-relations-panel">
            <div className="relations-header">
                <h3>关联关系</h3>
                <Button
                    size="sm"
                    icon={<LinkIcon />}
                    onClick={() => setShowAddModal(true)}
                >
                    添加关联
                </Button>
            </div>

            <div className="relations-content">
                {/* 客户关联 */}
                {groupedRelations.customer && (
                    <RelationGroup
                        title="客户"
                        icon={<CustomerIcon />}
                        relations={groupedRelations.customer}
                        onRemove={onRemoveRelation}
                        onUpdate={onUpdateRelation}
                    />
                )}

                {/* 项目关联 */}
                {groupedRelations.project && (
                    <RelationGroup
                        title="项目"
                        icon={<ProjectIcon />}
                        relations={groupedRelations.project}
                        onRemove={onRemoveRelation}
                        onUpdate={onUpdateRelation}
                    />
                )}

                {/* 任务关联 */}
                {groupedRelations.task && (
                    <RelationGroup
                        title="任务"
                        icon={<TaskIcon />}
                        relations={groupedRelations.task}
                        onRemove={onRemoveRelation}
                        onUpdate={onUpdateRelation}
                    />
                )}

                {relations.length === 0 && (
                    <div className="empty-relations">
                        <p>暂无关联关系</p>
                        <Button onClick={() => setShowAddModal(true)}>
                            添加第一个关联
                        </Button>
                    </div>
                )}
            </div>

            {/* 添加关联模态框 */}
            <AddRelationModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={onAddRelation}
                documentId={documentId}
            />
        </div>
    );
};

// 关联组
const RelationGroup: React.FC<RelationGroupProps> = ({
    title,
    icon,
    relations,
    onRemove,
    onUpdate
}) => {
    return (
        <div className="relation-group">
            <div className="group-header">
                {icon}
                <span className="group-title">{title}</span>
                <Badge count={relations.length} />
            </div>

            <div className="group-content">
                {relations.map(relation => (
                    <RelationItem
                        key={relation.id}
                        relation={relation}
                        onRemove={() => onRemove(relation.id)}
                        onUpdate={(data) => onUpdate(relation.id, data)}
                    />
                ))}
            </div>
        </div>
    );
};

// 关联项
const RelationItem: React.FC<RelationItemProps> = ({
    relation,
    onRemove,
    onUpdate
}) => {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className="relation-item">
            <div className="relation-info">
                <span className="entity-name">{relation.entity_name}</span>
                <Tag size="sm" color={getRelationTypeColor(relation.relation_type)}>
                    {relation.relation_type}
                </Tag>
            </div>

            {relation.description && (
                <p className="relation-description">{relation.description}</p>
            )}

            <div className="relation-actions">
                <Button
                    size="xs"
                    variant="text"
                    icon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                />
                <Button
                    size="xs"
                    variant="text"
                    icon={<DeleteIcon />}
                    onClick={onRemove}
                    danger
                />
            </div>

            {/* 编辑模态框 */}
            <EditRelationModal
                visible={isEditing}
                relation={relation}
                onClose={() => setIsEditing(false)}
                onUpdate={onUpdate}
            />
        </div>
    );
};
```

## 📱 移动端拖拽适配

```typescript
// src/hooks/useMobileDragDrop.ts
export const useMobileDragDrop = () => {
    const [dragState, setDragState] = useState<{
        isDragging: boolean;
        dragItem: any;
        startPosition: { x: number; y: number };
    }>({
        isDragging: false,
        dragItem: null,
        startPosition: { x: 0, y: 0 }
    });

    const handleTouchStart = useCallback((e: TouchEvent, item: any) => {
        const touch = e.touches[0];
        setDragState({
            isDragging: true,
            dragItem: item,
            startPosition: { x: touch.clientX, y: touch.clientY }
        });
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!dragState.isDragging) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - dragState.startPosition.x;
        const deltaY = touch.clientY - dragState.startPosition.y;

        // 更新拖拽元素位置
        updateDragPreview(deltaX, deltaY);

        // 检测放置目标
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        updateDropTarget(elementBelow);
    }, [dragState]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (!dragState.isDragging) return;

        const touch = e.changedTouches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // 处理放置
        handleDrop(dragState.dragItem, elementBelow);

        setDragState({
            isDragging: false,
            dragItem: null,
            startPosition: { x: 0, y: 0 }
        });
    }, [dragState]);

    return {
        dragState,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
    };
};
```

## 🎯 核心优势

### 1. 灵活性
- ✅ 文档独立存储，不受业务层级限制
- ✅ 支持多对多关联关系
- ✅ 用户自定义文件夹组织结构
- ✅ 支持拖拽重新组织

### 2. 可扩展性
- ✅ 易于添加新的实体类型关联
- ✅ 关联关系类型可配置
- ✅ 支持复杂的文档工作流

### 3. 用户体验
- ✅ 直观的文件夹管理界面
- ✅ 流畅的拖拽操作
- ✅ 灵活的视图模式
- ✅ 强大的搜索和过滤功能

这种设计让文档管理更加灵活和用户友好，同时保持了与业务实体的松耦合关系。
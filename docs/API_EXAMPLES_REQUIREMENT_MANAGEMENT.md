# 需求管理系统 API 调用示例

本文档提供了需求管理系统 API 的多语言调用示例，包括 cURL、JavaScript、Python 和 Go。

## 目录

- [认证设置](#认证设置)
- [需求 CRUD 操作](#需求-crud-操作)
- [状态管理](#状态管理)
- [评论功能](#评论功能)
- [任务转换](#任务转换)
- [统计报表](#统计报表)

---

## 认证设置

所有 API 调用都需要 Bearer Token 认证。

### 获取 Token

#### cURL
```bash
curl -X POST "https://api.example.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

#### JavaScript (Fetch)
```javascript
const response = await fetch('https://api.example.com/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'your_username',
    password: 'your_password'
  })
});

const data = await response.json();
const token = data.data.token;
```

#### JavaScript (Axios)
```javascript
const axios = require('axios');

const response = await axios.post('https://api.example.com/api/v1/auth/login', {
  username: 'your_username',
  password: 'your_password'
});

const token = response.data.data.token;
```

#### Python (requests)
```python
import requests

response = requests.post('https://api.example.com/api/v1/auth/login', json={
    'username': 'your_username',
    'password': 'your_password'
})

data = response.json()
token = data['data']['token']
```

#### Go
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
)

type LoginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type LoginResponse struct {
    Success bool `json:"success"`
    Data    struct {
        Token string `json:"token"`
    } `json:"data"`
}

func getToken() (string, error) {
    loginReq := LoginRequest{
        Username: "your_username",
        Password: "your_password",
    }

    jsonData, _ := json.Marshal(loginReq)

    resp, err := http.Post(
        "https://api.example.com/api/v1/auth/login",
        "application/json",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    body, _ := ioutil.ReadAll(resp.Body)

    var loginResp LoginResponse
    json.Unmarshal(body, &loginResp)

    return loginResp.Data.Token, nil
}
```

---

## 需求 CRUD 操作

### 1. 创建需求

#### cURL
```bash
curl -X POST "https://api.example.com/api/v1/requirements" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "用户登录功能",
    "description": "实现用户登录功能，支持用户名密码登录",
    "project_id": 1,
    "priority": "high",
    "category": "feature",
    "business_value": "提高系统安全性",
    "expected_outcome": "用户可以安全登录系统",
    "acceptance_criteria": "1. 支持用户名密码登录\n2. 登录失败3次后锁定账号",
    "due_date": "2025-12-31T23:59:59Z"
  }'
```

#### JavaScript (Axios)
```javascript
const createRequirement = async (token) => {
  const response = await axios.post(
    'https://api.example.com/api/v1/requirements',
    {
      title: '用户登录功能',
      description: '实现用户登录功能，支持用户名密码登录',
      project_id: 1,
      priority: 'high',
      category: 'feature',
      business_value: '提高系统安全性',
      expected_outcome: '用户可以安全登录系统',
      acceptance_criteria: '1. 支持用户名密码登录\n2. 登录失败3次后锁定账号',
      due_date: '2025-12-31T23:59:59Z'
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.data;
};
```

#### Python (requests)
```python
def create_requirement(token):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    data = {
        'title': '用户登录功能',
        'description': '实现用户登录功能，支持用户名密码登录',
        'project_id': 1,
        'priority': 'high',
        'category': 'feature',
        'business_value': '提高系统安全性',
        'expected_outcome': '用户可以安全登录系统',
        'acceptance_criteria': '1. 支持用户名密码登录\n2. 登录失败3次后锁定账号',
        'due_date': '2025-12-31T23:59:59Z'
    }

    response = requests.post(
        'https://api.example.com/api/v1/requirements',
        json=data,
        headers=headers
    )

    return response.json()['data']
```

#### Go
```go
type CreateRequirementRequest struct {
    Title              string  `json:"title"`
    Description        *string `json:"description,omitempty"`
    ProjectID          *int    `json:"project_id,omitempty"`
    Priority           string  `json:"priority"`
    Category           *string `json:"category,omitempty"`
    BusinessValue      *string `json:"business_value,omitempty"`
    ExpectedOutcome    *string `json:"expected_outcome,omitempty"`
    AcceptanceCriteria *string `json:"acceptance_criteria,omitempty"`
    DueDate            *string `json:"due_date,omitempty"`
}

func createRequirement(token string) (*Requirement, error) {
    description := "实现用户登录功能，支持用户名密码登录"
    projectID := 1
    category := "feature"
    businessValue := "提高系统安全性"
    expectedOutcome := "用户可以安全登录系统"
    acceptanceCriteria := "1. 支持用户名密码登录\n2. 登录失败3次后锁定账号"
    dueDate := "2025-12-31T23:59:59Z"

    reqData := CreateRequirementRequest{
        Title:              "用户登录功能",
        Description:        &description,
        ProjectID:          &projectID,
        Priority:           "high",
        Category:           &category,
        BusinessValue:      &businessValue,
        ExpectedOutcome:    &expectedOutcome,
        AcceptanceCriteria: &acceptanceCriteria,
        DueDate:            &dueDate,
    }

    jsonData, _ := json.Marshal(reqData)

    req, _ := http.NewRequest(
        "POST",
        "https://api.example.com/api/v1/requirements",
        bytes.NewBuffer(jsonData),
    )

    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, _ := ioutil.ReadAll(resp.Body)

    var result struct {
        Success bool         `json:"success"`
        Data    *Requirement `json:"data"`
    }
    json.Unmarshal(body, &result)

    return result.Data, nil
}
```

---

### 2. 获取需求列表

#### cURL
```bash
# 基本查询
curl -X GET "https://api.example.com/api/v1/requirements?page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 带过滤条件的查询
curl -X GET "https://api.example.com/api/v1/requirements?page=1&page_size=20&status=pending&priority=high&search=登录" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### JavaScript (Axios)
```javascript
const getRequirements = async (token, filters = {}) => {
  const params = new URLSearchParams({
    page: filters.page || 1,
    page_size: filters.page_size || 20,
    ...(filters.search && { search: filters.search }),
    ...(filters.status && { status: filters.status }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.project_id && { project_id: filters.project_id }),
    ...(filters.sort_by && { sort_by: filters.sort_by }),
    ...(filters.sort_order && { sort_order: filters.sort_order })
  });

  const response = await axios.get(
    `https://api.example.com/api/v1/requirements?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return response.data;
};

// 使用示例
const result = await getRequirements(token, {
  page: 1,
  page_size: 20,
  status: 'pending',
  priority: 'high',
  search: '登录'
});
```

#### Python (requests)
```python
def get_requirements(token, filters=None):
    headers = {'Authorization': f'Bearer {token}'}

    params = {
        'page': filters.get('page', 1) if filters else 1,
        'page_size': filters.get('page_size', 20) if filters else 20
    }

    if filters:
        if 'search' in filters:
            params['search'] = filters['search']
        if 'status' in filters:
            params['status'] = filters['status']
        if 'priority' in filters:
            params['priority'] = filters['priority']
        if 'project_id' in filters:
            params['project_id'] = filters['project_id']

    response = requests.get(
        'https://api.example.com/api/v1/requirements',
        params=params,
        headers=headers
    )

    return response.json()

# 使用示例
result = get_requirements(token, {
    'page': 1,
    'page_size': 20,
    'status': 'pending',
    'priority': 'high',
    'search': '登录'
})
```

---

### 3. 更新需求

#### cURL
```bash
curl -X PUT "https://api.example.com/api/v1/requirements/123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "用户登录和注册功能",
    "priority": "critical",
    "description": "扩展为包含注册功能"
  }'
```

#### JavaScript (Axios)
```javascript
const updateRequirement = async (token, id, updates) => {
  const response = await axios.put(
    `https://api.example.com/api/v1/requirements/${id}`,
    updates,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.data;
};

// 使用示例
const updated = await updateRequirement(token, 123, {
  title: '用户登录和注册功能',
  priority: 'critical',
  description: '扩展为包含注册功能'
});
```

#### Python (requests)
```python
def update_requirement(token, requirement_id, updates):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    response = requests.put(
        f'https://api.example.com/api/v1/requirements/{requirement_id}',
        json=updates,
        headers=headers
    )

    return response.json()['data']

# 使用示例
updated = update_requirement(token, 123, {
    'title': '用户登录和注册功能',
    'priority': 'critical',
    'description': '扩展为包含注册功能'
})
```

---

### 4. 删除需求

#### cURL
```bash
curl -X DELETE "https://api.example.com/api/v1/requirements/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### JavaScript (Axios)
```javascript
const deleteRequirement = async (token, id) => {
  const response = await axios.delete(
    `https://api.example.com/api/v1/requirements/${id}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return response.data;
};
```

#### Python (requests)
```python
def delete_requirement(token, requirement_id):
    headers = {'Authorization': f'Bearer {token}'}

    response = requests.delete(
        f'https://api.example.com/api/v1/requirements/{requirement_id}',
        headers=headers
    )

    return response.json()
```

---

## 状态管理

### 1. 提交需求审核

#### cURL
```bash
curl -X POST "https://api.example.com/api/v1/requirements/123/submit" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "请审核此需求"
  }'
```

#### JavaScript (Axios)
```javascript
const submitRequirement = async (token, id, comment = null) => {
  const response = await axios.post(
    `https://api.example.com/api/v1/requirements/${id}/submit`,
    comment ? { comment } : {},
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};
```

#### Python (requests)
```python
def submit_requirement(token, requirement_id, comment=None):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    data = {'comment': comment} if comment else {}

    response = requests.post(
        f'https://api.example.com/api/v1/requirements/{requirement_id}/submit',
        json=data,
        headers=headers
    )

    return response.json()
```

---

### 2. 批准需求

#### cURL
```bash
curl -X POST "https://api.example.com/api/v1/requirements/123/approve" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "需求已批准，可以开始开发"
  }'
```

#### JavaScript (Axios)
```javascript
const approveRequirement = async (token, id, comment = null) => {
  const response = await axios.post(
    `https://api.example.com/api/v1/requirements/${id}/approve`,
    comment ? { comment } : {},
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};
```

#### Python (requests)
```python
def approve_requirement(token, requirement_id, comment=None):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    data = {'comment': comment} if comment else {}

    response = requests.post(
        f'https://api.example.com/api/v1/requirements/{requirement_id}/approve',
        json=data,
        headers=headers
    )

    return response.json()
```

---

### 3. 拒绝需求

#### cURL
```bash
curl -X POST "https://api.example.com/api/v1/requirements/123/reject" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "需求描述不清晰，请补充详细信息"
  }'
```

#### JavaScript (Axios)
```javascript
const rejectRequirement = async (token, id, comment) => {
  // 注意：拒绝时必须提供原因
  const response = await axios.post(
    `https://api.example.com/api/v1/requirements/${id}/reject`,
    { comment },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};
```

#### Python (requests)
```python
def reject_requirement(token, requirement_id, comment):
    # 注意：拒绝时必须提供原因
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    response = requests.post(
        f'https://api.example.com/api/v1/requirements/{requirement_id}/reject',
        json={'comment': comment},
        headers=headers
    )

    return response.json()
```

---

## 评论功能

### 1. 创建评论

#### cURL
```bash
# 普通评论
curl -X POST "https://api.example.com/api/v1/requirements/comments" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requirement_id": 123,
    "content": "这个需求很重要，建议优先处理",
    "comment_type": "general"
  }'

# 带@提及的评论
curl -X POST "https://api.example.com/api/v1/requirements/comments" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requirement_id": 123,
    "content": "请@张三 @李四 协助评审此需求",
    "comment_type": "general",
    "mentioned_user_ids": [10, 20]
  }'
```

#### JavaScript (Axios)
```javascript
const createComment = async (token, requirementId, content, options = {}) => {
  const response = await axios.post(
    'https://api.example.com/api/v1/requirements/comments',
    {
      requirement_id: requirementId,
      content: content,
      comment_type: options.type || 'general',
      ...(options.mentionedUserIds && { mentioned_user_ids: options.mentionedUserIds }),
      ...(options.parentCommentId && { parent_comment_id: options.parentCommentId }),
      ...(options.isInternal !== undefined && { is_internal: options.isInternal })
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.data;
};

// 使用示例 - 普通评论
await createComment(token, 123, '这个需求很重要');

// 使用示例 - 带@提及
await createComment(token, 123, '请@张三 @李四 协助评审', {
  mentionedUserIds: [10, 20]
});

// 使用示例 - 回复评论
await createComment(token, 123, '我同意你的观点', {
  parentCommentId: 456
});
```

#### Python (requests)
```python
def create_comment(token, requirement_id, content, **options):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    data = {
        'requirement_id': requirement_id,
        'content': content,
        'comment_type': options.get('type', 'general')
    }

    if 'mentioned_user_ids' in options:
        data['mentioned_user_ids'] = options['mentioned_user_ids']
    if 'parent_comment_id' in options:
        data['parent_comment_id'] = options['parent_comment_id']
    if 'is_internal' in options:
        data['is_internal'] = options['is_internal']

    response = requests.post(
        'https://api.example.com/api/v1/requirements/comments',
        json=data,
        headers=headers
    )

    return response.json()['data']

# 使用示例
comment = create_comment(
    token,
    123,
    '请@张三 @李四 协助评审',
    mentioned_user_ids=[10, 20]
)
```

---

### 2. 获取评论列表

#### cURL
```bash
# 基本查询
curl -X GET "https://api.example.com/api/v1/requirements/comments?requirement_id=123&page=1&page_size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 包含回复
curl -X GET "https://api.example.com/api/v1/requirements/comments?requirement_id=123&with_replies=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### JavaScript (Axios)
```javascript
const getComments = async (token, requirementId, options = {}) => {
  const params = new URLSearchParams({
    requirement_id: requirementId,
    page: options.page || 1,
    page_size: options.page_size || 20,
    ...(options.withReplies && { with_replies: 'true' })
  });

  const response = await axios.get(
    `https://api.example.com/api/v1/requirements/comments?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return response.data.data;
};
```

#### Python (requests)
```python
def get_comments(token, requirement_id, **options):
    headers = {'Authorization': f'Bearer {token}'}

    params = {
        'requirement_id': requirement_id,
        'page': options.get('page', 1),
        'page_size': options.get('page_size', 20)
    }

    if options.get('with_replies'):
        params['with_replies'] = 'true'

    response = requests.get(
        'https://api.example.com/api/v1/requirements/comments',
        params=params,
        headers=headers
    )

    return response.json()['data']
```

---

## 任务转换

### 转换需求为任务

#### cURL
```bash
curl -X POST "https://api.example.com/api/v1/requirements/123/convert-to-task" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "task_title": "实现用户登录功能",
    "description": "根据需求#123实现用户登录功能",
    "priority": "high",
    "assignee_id": 10,
    "due_date": "2025-12-31T23:59:59Z",
    "link_requirement": true,
    "create_subtasks": false
  }'
```

#### JavaScript (Axios)
```javascript
const convertToTask = async (token, requirementId, options) => {
  const response = await axios.post(
    `https://api.example.com/api/v1/requirements/${requirementId}/convert-to-task`,
    {
      project_id: options.projectId,
      task_title: options.taskTitle,
      description: options.description,
      priority: options.priority || 'medium',
      ...(options.assigneeId && { assignee_id: options.assigneeId }),
      ...(options.dueDate && { due_date: options.dueDate }),
      link_requirement: options.linkRequirement !== false,
      create_subtasks: options.createSubtasks || false
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.data;
};

// 使用示例
const task = await convertToTask(token, 123, {
  projectId: 1,
  taskTitle: '实现用户登录功能',
  description: '根据需求#123实现用户登录功能',
  priority: 'high',
  assigneeId: 10,
  dueDate: '2025-12-31T23:59:59Z',
  linkRequirement: true
});

console.log(`Created task ID: ${task.task_id}`);
```

#### Python (requests)
```python
def convert_to_task(token, requirement_id, options):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    data = {
        'project_id': options['project_id'],
        'task_title': options.get('task_title'),
        'description': options.get('description'),
        'priority': options.get('priority', 'medium'),
        'link_requirement': options.get('link_requirement', True),
        'create_subtasks': options.get('create_subtasks', False)
    }

    if 'assignee_id' in options:
        data['assignee_id'] = options['assignee_id']
    if 'due_date' in options:
        data['due_date'] = options['due_date']

    response = requests.post(
        f'https://api.example.com/api/v1/requirements/{requirement_id}/convert-to-task',
        json=data,
        headers=headers
    )

    return response.json()['data']

# 使用示例
task = convert_to_task(token, 123, {
    'project_id': 1,
    'task_title': '实现用户登录功能',
    'description': '根据需求#123实现用户登录功能',
    'priority': 'high',
    'assignee_id': 10,
    'due_date': '2025-12-31T23:59:59Z',
    'link_requirement': True
})

print(f"Created task ID: {task['task_id']}")
```

---

## 统计报表

### 获取需求统计

#### cURL
```bash
curl -X GET "https://api.example.com/api/v1/requirements/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### JavaScript (Axios)
```javascript
const getRequirementStats = async (token) => {
  const response = await axios.get(
    'https://api.example.com/api/v1/requirements/stats',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return response.data.data;
};

// 使用示例
const stats = await getRequirementStats(token);
console.log('按状态统计:', stats.by_status);
console.log('按优先级统计:', stats.by_priority);
console.log('总需求数:', stats.total);
```

#### Python (requests)
```python
def get_requirement_stats(token):
    headers = {'Authorization': f'Bearer {token}'}

    response = requests.get(
        'https://api.example.com/api/v1/requirements/stats',
        headers=headers
    )

    data = response.json()['data']

    print(f"按状态统计: {data['by_status']}")
    print(f"按优先级统计: {data['by_priority']}")
    print(f"总需求数: {data['total']}")

    return data
```

---

## 完整工作流示例

### JavaScript - 从创建到转任务的完整流程

```javascript
const axios = require('axios');

const API_BASE = 'https://api.example.com/api/v1';

async function completeRequirementWorkflow() {
  try {
    // 1. 登录获取token
    const loginResp = await axios.post(`${API_BASE}/auth/login`, {
      username: 'project_manager',
      password: 'password123'
    });
    const token = loginResp.data.data.token;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. 创建需求
    const createResp = await axios.post(`${API_BASE}/requirements`, {
      title: '用户权限管理功能',
      description: '实现基于角色的权限管理系统',
      project_id: 1,
      priority: 'high',
      category: 'feature',
      business_value: '提高系统安全性和灵活性',
      acceptance_criteria: '1. 支持角色管理\n2. 支持权限分配\n3. 支持权限检查'
    }, { headers });

    const requirementId = createResp.data.data.id;
    console.log(`✅ 需求已创建 (ID: ${requirementId})`);

    // 3. 提交审核
    await axios.post(`${API_BASE}/requirements/${requirementId}/submit`, {
      comment: '请审核此权限管理需求'
    }, { headers });
    console.log('✅ 需求已提交审核');

    // 4. 添加评论
    await axios.post(`${API_BASE}/requirements/comments`, {
      requirement_id: requirementId,
      content: '建议参考业界最佳实践实现RBAC',
      comment_type: 'suggestion'
    }, { headers });
    console.log('✅ 评论已添加');

    // 5. 批准需求
    await axios.post(`${API_BASE}/requirements/${requirementId}/approve`, {
      comment: '需求清晰，可以开始开发'
    }, { headers });
    console.log('✅ 需求已批准');

    // 6. 转换为任务
    const taskResp = await axios.post(
      `${API_BASE}/requirements/${requirementId}/convert-to-task`,
      {
        project_id: 1,
        task_title: '实现RBAC权限管理',
        priority: 'high',
        assignee_id: 15,
        link_requirement: true
      },
      { headers }
    );

    const taskId = taskResp.data.data.task_id;
    console.log(`✅ 已转换为任务 (Task ID: ${taskId})`);

    // 7. 查看统计
    const statsResp = await axios.get(`${API_BASE}/requirements/stats`, { headers });
    console.log('📊 需求统计:', statsResp.data.data);

    return {
      requirementId,
      taskId,
      stats: statsResp.data.data
    };

  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    throw error;
  }
}

// 执行工作流
completeRequirementWorkflow()
  .then(result => {
    console.log('\n🎉 工作流完成!');
    console.log('需求ID:', result.requirementId);
    console.log('任务ID:', result.taskId);
  })
  .catch(error => {
    console.error('工作流失败:', error);
  });
```

### Python - 批量处理需求

```python
import requests
from typing import List, Dict

API_BASE = 'https://api.example.com/api/v1'

class RequirementManager:
    def __init__(self, username: str, password: str):
        self.token = self._login(username, password)
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

    def _login(self, username: str, password: str) -> str:
        """登录并获取token"""
        response = requests.post(f'{API_BASE}/auth/login', json={
            'username': username,
            'password': password
        })
        return response.json()['data']['token']

    def batch_create_requirements(self, requirements: List[Dict]) -> List[int]:
        """批量创建需求"""
        created_ids = []

        for req_data in requirements:
            response = requests.post(
                f'{API_BASE}/requirements',
                json=req_data,
                headers=self.headers
            )

            if response.status_code == 201:
                req_id = response.json()['data']['id']
                created_ids.append(req_id)
                print(f"✅ 创建需求: {req_data['title']} (ID: {req_id})")
            else:
                print(f"❌ 创建失败: {req_data['title']}")

        return created_ids

    def batch_approve(self, requirement_ids: List[int], comment: str = None):
        """批量批准需求"""
        for req_id in requirement_ids:
            try:
                response = requests.post(
                    f'{API_BASE}/requirements/{req_id}/approve',
                    json={'comment': comment} if comment else {},
                    headers=self.headers
                )

                if response.status_code == 200:
                    print(f"✅ 批准需求 ID: {req_id}")
                else:
                    print(f"❌ 批准失败 ID: {req_id} - {response.json()}")
            except Exception as e:
                print(f"❌ 批准异常 ID: {req_id} - {str(e)}")

    def get_pending_requirements(self) -> List[Dict]:
        """获取待审核的需求"""
        response = requests.get(
            f'{API_BASE}/requirements',
            params={'status': 'pending', 'page_size': 100},
            headers=self.headers
        )

        return response.json()['data']

# 使用示例
if __name__ == '__main__':
    manager = RequirementManager('admin', 'admin123')

    # 批量创建需求
    requirements = [
        {
            'title': '用户注册功能',
            'description': '实现用户注册',
            'project_id': 1,
            'priority': 'high',
            'category': 'feature'
        },
        {
            'title': '邮件通知功能',
            'description': '实现邮件通知',
            'project_id': 1,
            'priority': 'medium',
            'category': 'feature'
        }
    ]

    created_ids = manager.batch_create_requirements(requirements)
    print(f"\n📝 共创建 {len(created_ids)} 个需求")

    # 获取待审核需求
    pending = manager.get_pending_requirements()
    print(f"\n⏳ 待审核需求: {len(pending)} 个")

    # 批量批准
    if created_ids:
        manager.batch_approve(created_ids, '批量批准')
```

---

## 错误处理

### JavaScript 错误处理示例

```javascript
const handleRequirementCreation = async (token, data) => {
  try {
    const response = await axios.post(
      'https://api.example.com/api/v1/requirements',
      data,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, data: response.data.data };

  } catch (error) {
    if (error.response) {
      // 服务器返回错误
      const errorData = error.response.data;

      switch (error.response.status) {
        case 400:
          return {
            success: false,
            error: '请求数据错误: ' + errorData.message
          };
        case 401:
          return {
            success: false,
            error: '未授权，请重新登录'
          };
        case 403:
          return {
            success: false,
            error: '无权限执行此操作'
          };
        case 404:
          return {
            success: false,
            error: '资源不存在'
          };
        case 500:
          return {
            success: false,
            error: '服务器内部错误'
          };
        default:
          return {
            success: false,
            error: '未知错误: ' + errorData.message
          };
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      return {
        success: false,
        error: '网络错误，请检查连接'
      };
    } else {
      // 其他错误
      return {
        success: false,
        error: error.message
      };
    }
  }
};
```

### Python 错误处理示例

```python
from requests.exceptions import RequestException

def safe_api_call(func):
    """API调用错误处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            response = func(*args, **kwargs)

            if response.status_code >= 400:
                error_data = response.json()
                error_msg = error_data.get('message', '未知错误')

                if response.status_code == 400:
                    print(f"❌ 请求数据错误: {error_msg}")
                elif response.status_code == 401:
                    print("❌ 未授权，请重新登录")
                elif response.status_code == 403:
                    print("❌ 无权限执行此操作")
                elif response.status_code == 404:
                    print("❌ 资源不存在")
                elif response.status_code == 500:
                    print("❌ 服务器内部错误")

                return None

            return response.json()

        except RequestException as e:
            print(f"❌ 网络错误: {str(e)}")
            return None
        except Exception as e:
            print(f"❌ 未知错误: {str(e)}")
            return None

    return wrapper

@safe_api_call
def create_requirement_safe(token, data):
    return requests.post(
        'https://api.example.com/api/v1/requirements',
        json=data,
        headers={'Authorization': f'Bearer {token}'}
    )
```

---

## 最佳实践

### 1. Token 管理

```javascript
// Token 自动刷新
class APIClient {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  async ensureToken() {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.login();
    }
  }

  async login() {
    const response = await axios.post('/api/v1/auth/login', {
      username: 'user',
      password: 'pass'
    });

    this.token = response.data.data.token;
    // Token有效期24小时，提前1小时刷新
    this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
  }

  async request(method, url, data = null) {
    await this.ensureToken();

    return axios({
      method,
      url,
      data,
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
  }
}
```

### 2. 请求重试

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
def create_requirement_with_retry(token, data):
    """带重试的需求创建"""
    response = requests.post(
        'https://api.example.com/api/v1/requirements',
        json=data,
        headers={'Authorization': f'Bearer {token}'}
    )
    response.raise_for_status()
    return response.json()
```

### 3. 批量操作优化

```javascript
// 并发控制 - 限制同时进行的请求数量
const pLimit = require('p-limit');

async function batchCreateRequirements(token, requirements, concurrency = 5) {
  const limit = pLimit(concurrency);

  const tasks = requirements.map(req =>
    limit(() => createRequirement(token, req))
  );

  const results = await Promise.allSettled(tasks);

  const succeeded = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  console.log(`成功: ${succeeded.length}, 失败: ${failed.length}`);

  return { succeeded, failed };
}
```

---

## 相关文档

- [需求管理系统 API 参考](./API_REQUIREMENT_MANAGEMENT.md)
- [需求管理系统用户手册](./USER_MANUAL_REQUIREMENT_MANAGEMENT.md)
- [Swagger API 文档](http://localhost:8080/docs)

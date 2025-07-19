// 将前面创建的TaskManager类代码复制到这里
const { v4: uuidv4 } = require('uuid');

class TaskManager {
  constructor(database = null) {
    this.tasks = new Map(); // 如果没有数据库，使用内存存储
    this.updates = new Map();
    this.timeline = new Map();
    this.projects = new Map();
    this.db = database; // 数据库连接对象
  }

  // =============================================
  // 1. 任务基础操作
  // =============================================

  /**
   * 创建任务
   * @param {Object} taskData - 任务数据
   * @param {string} parentId - 父任务ID (可选)
   * @returns {Object} 创建的任务
   */
  async createTask(taskData, parentId = null) {
    const now = new Date().toISOString();
    const taskId = uuidv4();
    
    // 计算任务层级
    let level = 0;
    if (parentId) {
      const parentTask = await this.getTask(parentId);
      if (!parentTask) {
        throw new Error(`父任务 ${parentId} 不存在`);
      }
      level = parentTask.level + 1;
    }

    const task = {
      id: taskId,
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'todo',
      assignee_id: taskData.assignee_id || null,
      created_at: now,
      updated_at: now,
      due_date: taskData.due_date || null,
      start_date: taskData.start_date || null,
      completed_at: null,
      parent_id: parentId,
      children: [],
      level: level,
      custom_fields: {
        priority: taskData.custom_fields?.priority || 'medium',
        estimated_hours: taskData.custom_fields?.estimated_hours || 0,
        actual_hours: 0,
        progress: 0,
        tags: taskData.custom_fields?.tags || [],
        category: taskData.custom_fields?.category || '',
        difficulty: taskData.custom_fields?.difficulty || 5
      }
    };

    if (this.db) {
      // 数据库存储逻辑
      await this.saveTaskToDatabase(task);
      if (parentId) {
        await this.updateParentChildren(parentId, taskId, 'add');
      }
    } else {
      // 内存存储
      this.tasks.set(taskId, task);
      if (parentId) {
        const parentTask = this.tasks.get(parentId);
        parentTask.children.push(taskId);
        this.tasks.set(parentId, parentTask);
      }
    }
    
    // 记录创建事件
    await this.addTimelineEvent(taskId, 'created', `创建任务：${task.title}`, {
      initial_status: task.status,
      assignee_id: task.assignee_id
    }, true);

    return task;
  }

  /**
   * 获取任务
   * @param {string} taskId - 任务ID
   * @returns {Object} 任务详情
   */
  async getTask(taskId) {
    let task;
    
    if (this.db) {
      task = await this.getTaskFromDatabase(taskId);
    } else {
      task = this.tasks.get(taskId);
    }
    
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }

    return this.enrichTask(task);
  }

  /**
   * 更新任务
   * @param {string} taskId - 任务ID
   * @param {Object} updates - 更新内容
   * @param {string} notes - 更新备注
   * @param {number} userId - 更新人ID
   * @returns {Object} 更新后的任务
   */
  async updateTask(taskId, updates, notes = '', userId = 1) {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }

    const batchId = uuidv4();
    const updateTime = new Date().toISOString();
    
    // 记录所有字段的更新
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = this.getFieldValue(task, field);
      
      if (oldValue !== newValue) {
        // 记录更新记录
        await this.recordUpdate(taskId, field, oldValue, newValue, notes, userId, batchId);
        
        // 应用更新
        this.setFieldValue(task, field, newValue);
        
        // 特殊处理
        if (field === 'status' && newValue === 'completed') {
          task.completed_at = updateTime;
          await this.addTimelineEvent(taskId, 'completed', `完成任务：${task.title}`, {
            completion_time: updateTime,
            notes: notes
          });
        }
      }
    }

    task.updated_at = updateTime;
    
    if (this.db) {
      await this.updateTaskInDatabase(task);
    } else {
      this.tasks.set(taskId, task);
    }

    // 更新父任务的进度
    if (task.parent_id) {
      await this.updateParentProgress(task.parent_id);
    }

    return this.enrichTask(task);
  }

  /**
   * 获取任务时间轴
   * @param {string} taskId - 任务ID
   * @param {Object} options - 查询选项
   * @returns {Array} 时间轴事件列表
   */
  async getTaskTimeline(taskId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      eventTypes = null,
      includeSubtasks = false
    } = options;

    let taskIds = [taskId];
    
    // 如果包含子任务，获取所有相关任务ID
    if (includeSubtasks) {
      taskIds = await this.getAllSubtaskIds(taskId);
    }

    let events = [];
    
    if (this.db) {
      events = await this.getTimelineFromDatabase(taskIds, options);
    } else {
      // 内存查询
      this.timeline.forEach(event => {
        if (taskIds.includes(event.task_id)) {
          events.push(event);
        }
      });
    }

    // 应用过滤条件
    if (startDate) {
      events = events.filter(event => event.event_date >= startDate);
    }
    if (endDate) {
      events = events.filter(event => event.event_date <= endDate);
    }
    if (eventTypes) {
      events = events.filter(event => eventTypes.includes(event.event_type));
    }

    // 按时间排序
    events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

    return events;
  }

  // =============================================
  // 数据库操作方法 (当使用数据库时)
  // =============================================

  async saveTaskToDatabase(task) {
    if (!this.db) return;
    
    const query = `
      INSERT INTO tasks (
        id, title, description, status, assignee_id, created_at, updated_at,
        due_date, start_date, completed_at, parent_id, level, custom_fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;
    
    const values = [
      task.id, task.title, task.description, task.status, task.assignee_id,
      task.created_at, task.updated_at, task.due_date, task.start_date,
      task.completed_at, task.parent_id, task.level, JSON.stringify(task.custom_fields)
    ];
    
    await this.db.query(query, values);
  }

  async getTaskFromDatabase(taskId) {
    if (!this.db) return null;
    
    const query = `
      SELECT t.*, 
             ARRAY(SELECT id FROM tasks WHERE parent_id = t.id) as children
      FROM tasks t 
      WHERE t.id = $1
    `;
    
    const result = await this.db.query(query, [taskId]);
    
    if (result.rows.length === 0) return null;
    
    const task = result.rows[0];
    task.custom_fields = JSON.parse(task.custom_fields || '{}');
    
    return task;
  }

  async updateTaskInDatabase(task) {
    if (!this.db) return;
    
    const query = `
      UPDATE tasks SET
        title = $2, description = $3, status = $4, assignee_id = $5,
        updated_at = $6, due_date = $7, start_date = $8, completed_at = $9,
        custom_fields = $10
      WHERE id = $1
    `;
    
    const values = [
      task.id, task.title, task.description, task.status, task.assignee_id,
      task.updated_at, task.due_date, task.start_date, task.completed_at,
      JSON.stringify(task.custom_fields)
    ];
    
    await this.db.query(query, values);
  }

  // =============================================
  // 辅助方法
  // =============================================

  enrichTask(task) {
    const enrichedTask = { ...task };
    
    // 这里可以添加计算字段
    enrichedTask.is_overdue = this.isTaskOverdue(task);
    enrichedTask.days_remaining = this.calculateDaysRemaining(task);
    
    return enrichedTask;
  }

  getFieldValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setFieldValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  isTaskOverdue(task) {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
  }

  calculateDaysRemaining(task) {
    if (!task.due_date) return null;
    const now = new Date();
    const dueDate = new Date(task.due_date);
    const diffTime = dueDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async recordUpdate(taskId, fieldName, oldValue, newValue, notes, userId, batchId) {
    const updateId = uuidv4();
    const update = {
      id: updateId,
      task_id: taskId,
      updated_by: userId,
      updated_at: new Date().toISOString(),
      update_type: this.getUpdateType(fieldName),
      old_value: oldValue,
      new_value: newValue,
      field_name: fieldName,
      notes: notes,
      batch_id: batchId
    };
    
    if (this.db) {
      await this.saveUpdateToDatabase(update);
    } else {
      this.updates.set(updateId, update);
    }
    
    // 添加时间轴事件
    await this.addTimelineEvent(taskId, 'updated', 
      `更新${this.getFieldDisplayName(fieldName)}：${oldValue} → ${newValue}`, 
      { field_changed: fieldName, old_value: oldValue, new_value: newValue }
    );
  }

  async addTimelineEvent(taskId, eventType, description, metadata = {}, isMilestone = false) {
    const eventId = uuidv4();
    const event = {
      id: eventId,
      task_id: taskId,
      event_type: eventType,
      event_date: new Date().toISOString(),
      user_id: 1, // 当前用户ID
      description: description,
      metadata: metadata,
      is_milestone: isMilestone
    };
    
    if (this.db) {
      await this.saveTimelineEventToDatabase(event);
    } else {
      this.timeline.set(eventId, event);
    }
  }

  getUpdateType(fieldName) {
    const typeMap = {
      'status': 'status',
      'description': 'description', 
      'assignee_id': 'assignee',
      'due_date': 'due_date',
      'custom_fields.progress': 'progress',
      'notes': 'notes'
    };
    return typeMap[fieldName] || 'custom_field';
  }

  getFieldDisplayName(fieldName) {
    const nameMap = {
      'status': '状态',
      'description': '描述',
      'assignee_id': '负责人',
      'due_date': '截止日期',
      'custom_fields.progress': '进度',
      'custom_fields.priority': '优先级'
    };
    return nameMap[fieldName] || fieldName;
  }

  async updateParentProgress(parentId) {
    // 更新父任务进度的逻辑
    const parentTask = await this.getTask(parentId);
    if (!parentTask) return;
    
    // 计算完成率等逻辑...
    // 这里需要根据子任务状态更新父任务
  }

  async getAllSubtaskIds(taskId) {
    const task = await this.getTask(taskId);
    if (!task) return [taskId];
    
    let allIds = [taskId];
    for (const childId of task.children || []) {
      const childIds = await this.getAllSubtaskIds(childId);
      allIds.push(...childIds);
    }
    return allIds;
  }

  // 其他数据库操作方法...
  async saveUpdateToDatabase(update) {
    // 实现更新记录保存到数据库
  }

  async saveTimelineEventToDatabase(event) {
    // 实现时间轴事件保存到数据库
  }

  async getTimelineFromDatabase(taskIds, options) {
    // 实现从数据库获取时间轴
    return [];
  }

  async updateParentChildren(parentId, childId, operation) {
    // 实现更新父任务的子任务列表
  }
}

module.exports = TaskManager;

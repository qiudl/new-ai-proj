# 任务计时功能MVP开发计划 - 1天完成

## 🎯 MVP目标
用最少的功能实现任务计时的核心体验：选择任务→开始计时→停止计时→记录时间。界面简洁实用，1天内完成开发。

---

## 📋 开发任务结构

### 阶段1: 后端最小实现 (预估: 3小时)

#### 会话1.1: 数据库快速扩展 (1小时)
- **任务1.1.1: 扩展users表 (20分钟)**
  ```sql
  ALTER TABLE users ADD COLUMN current_timing_task_id INT DEFAULT NULL;
  ALTER TABLE users ADD COLUMN timing_start_time TIMESTAMP DEFAULT NULL;
  ALTER TABLE users ADD COLUMN timing_status ENUM('stopped', 'running') DEFAULT 'stopped';
  ```

- **任务1.1.2: 创建简化计时日志表 (20分钟)**
  ```sql
  CREATE TABLE task_time_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      task_id INT NOT NULL,
      user_id INT NOT NULL,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NULL,
      duration_seconds INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  ```

- **任务1.1.3: 扩展tasks表 (20分钟)**
  ```sql
  ALTER TABLE tasks ADD COLUMN total_time_seconds INT DEFAULT 0;
  ```

#### 会话1.2: 核心API开发 (2小时)
- **任务1.2.1: 开始计时API (40分钟)**
  ```go
  POST /api/timer/start
  // 检查是否有进行中任务，停止后开始新任务
  // 更新user表的计时状态
  ```

- **任务1.2.2: 停止计时API (40分钟)**
  ```go
  POST /api/timer/stop
  // 计算时长，创建time_log记录
  // 更新task总时长，清除user计时状态
  ```

- **任务1.2.3: 获取当前计时状态API (40分钟)**
  ```go
  GET /api/timer/current
  // 返回当前计时任务和经过时间
  ```

### 阶段2: 前端MVP实现 (预估: 4小时)

#### 会话2.1: 首页计时器组件 (2小时)
- **任务2.1.1: 创建TimerCard组件 (60分钟)**
  - 显示当前计时任务或"选择任务开始计时"
  - 大号时间显示 (HH:MM:SS)
  - 开始/停止按钮
  - 使用localStorage暂存开始时间，避免刷新丢失

- **任务2.1.2: 任务选择器 (40分钟)**
  - 简单的下拉选择框，列出所有todo状态任务
  - 显示任务标题和项目名称
  - 选择后立即开始计时

- **任务2.1.3: 计时器逻辑 (20分钟)**
  - 每秒更新显示时间
  - 调用API开始/停止计时
  - 错误处理和loading状态

#### 会话2.2: 简化统计卡片 (1小时)
- **任务2.2.1: 今日工作时间卡片 (30分钟)**
  - 显示今日累计工作时间
  - 从API获取今日所有time_logs计算总时长

- **任务2.2.2: 任务进度卡片 (30分钟)**
  - 显示今日完成任务数
  - 显示进行中任务数（包括当前计时任务）

#### 会话2.3: 任务列表集成 (1小时)
- **任务2.3.1: 添加计时按钮 (30分钟)**
  - 在任务列表操作列添加"开始计时"按钮
  - 当前计时任务显示"计时中"标签

- **任务2.3.2: 最新任务展示 (30分钟)**
  - 首页显示最近5个任务
  - 点击任务可快速开始计时

### 阶段3: 集成调试 (预估: 1小时)

#### 会话3.1: 功能测试和修复 (1小时)
- **任务3.1.1: 基础功能测试 (30分钟)**
  - 测试开始计时→停止计时完整流程
  - 验证时间计算准确性
  - 测试任务切换功能

- **任务3.1.2: Bug修复和优化 (30分钟)**
  - 修复发现的问题
  - 优化用户体验
  - 添加必要的错误提示

---

## 📊 MVP功能范围

### ✅ 包含功能
- 选择任务开始计时
- 实时显示计时时间
- 停止计时并保存记录
- 任务切换计时
- 今日工作时间统计
- 最近任务快速计时

### ❌ 暂不包含功能
- 暂停/继续功能
- 复杂的统计图表
- 计时目标设置
- 详细的历史记录查看
- 多设备同步
- 键盘快捷键

---

## ⏱️ 时间规划 (总计8小时)

### 上午 (4小时)
- **09:00-10:00**: 数据库设计和迁移
- **10:00-12:00**: 后端API开发

### 下午 (4小时)  
- **13:00-15:00**: 前端计时器组件
- **15:00-16:00**: 统计卡片和列表集成
- **16:00-17:00**: 集成测试和修复

---

## 🎨 界面设计简化

### 首页布局
```
[计时器卡片 - 占据主要位置]
[今日时间] [完成任务] [进行中任务]
[最近任务列表]
```

### 计时器卡片状态
- **空闲状态**: "选择任务开始计时" + 任务选择器
- **计时状态**: 任务名称 + 大号计时器 + 停止按钮

---

## 🔧 技术实现要点

### 后端关键逻辑
```go
// 开始计时
func startTimer(userID, taskID int) {
    // 1. 停止当前计时任务(如果有)
    // 2. 更新user表设置新的计时任务
    // 3. 返回开始时间
}

// 停止计时
func stopTimer(userID int) {
    // 1. 计算工作时长
    // 2. 创建time_log记录
    // 3. 更新task总时长
    // 4. 清除user计时状态
}
```

### 前端关键逻辑
```tsx
// 计时器组件状态
const [currentTask, setCurrentTask] = useState(null);
const [startTime, setStartTime] = useState(null);
const [elapsedTime, setElapsedTime] = useState(0);

// 每秒更新计时器
useEffect(() => {
    if (startTime) {
        const interval = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }
}, [startTime]);
```

---

## 🎯 MVP验收标准

### 核心功能
- ✅ 可以选择任务并开始计时
- ✅ 计时器准确显示经过时间 (精确到秒)
- ✅ 可以停止计时并保存记录
- ✅ 可以切换到其他任务计时
- ✅ 显示今日工作时间统计

### 用户体验
- ✅ 界面简洁直观
- ✅ 操作响应迅速 (<500ms)
- ✅ 错误提示友好
- ✅ 刷新页面不丢失计时状态

### 数据准确性
- ✅ 时间计算准确
- ✅ 任务总时长正确更新
- ✅ 统计数据实时同步

---

## 🚀 部署和测试

### 快速部署
1. 执行数据库迁移脚本
2. 重启后端服务
3. 前端热更新
4. 快速功能验证

### 简单测试用例
1. 选择任务A开始计时 → 验证计时器运行
2. 计时5分钟后停止 → 验证记录保存
3. 立即开始任务B计时 → 验证任务切换
4. 刷新页面 → 验证状态恢复
5. 查看今日统计 → 验证数据准确

---

## 💡 后续迭代方向

### 版本2 (1-2天后)
- 添加暂停/继续功能
- 计时历史记录查看
- 更丰富的统计图表

### 版本3 (1周后)
- 计时目标设置
- 番茄工作法集成
- 移动端适配优化

**MVP目标**: 让用户今天就能用上基本的任务计时功能！
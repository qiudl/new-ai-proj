# 种子数据管理系统

本目录包含了项目的种子数据脚本和管理工具，用于系统初始化、测试数据创建和演示数据管理。

## 📁 目录结构

```
backend/scripts/
├── seed/                          # 种子数据SQL脚本目录
│   ├── 001_basic_seed_data.sql   # 基础种子数据（生产安全）
│   ├── 002_dev_test_data.sql     # 开发测试数据
│   ├── 003_demo_data.sql         # 演示数据
│   └── 999_cleanup_seed_data.sql # 数据清理脚本
├── seed_runner.sh                # 种子数据执行器
├── seed_config.env              # 配置文件
└── README.md                    # 说明文档（本文件）
```

## 🚀 快速开始

### 1. 基础用法

```bash
# 进入脚本目录
cd backend/scripts

# 在开发环境执行默认脚本
./seed_runner.sh

# 指定环境执行
./seed_runner.sh --env staging

# 执行特定脚本
./seed_runner.sh --script 001_basic_seed_data.sql
```

### 2. 环境配置

脚本会自动从以下位置加载配置：
1. `../../.env` - 项目根目录的环境文件
2. `seed_config.env` - 种子数据专用配置
3. 环境变量
4. 命令行参数

## 📋 脚本说明

### 001_basic_seed_data.sql
- **用途**: 生产环境安全的基础数据
- **包含**: 系统角色、权限、默认管理员用户
- **环境**: 所有环境
- **特点**: 幂等执行，不会影响现有数据

### 002_dev_test_data.sql  
- **用途**: 开发环境测试数据
- **包含**: 测试用户、企业、项目、任务
- **环境**: 仅开发/测试环境
- **特点**: 完整的业务场景数据

### 003_demo_data.sql
- **用途**: 演示环境数据
- **包含**: 真实业务场景、复杂项目结构
- **环境**: 演示/预发布环境
- **特点**: 高质量的演示数据

### 999_cleanup_seed_data.sql
- **用途**: 清理所有种子数据
- **包含**: 完整的数据清理逻辑
- **环境**: 非生产环境
- **特点**: 安全检查，支持重建

## 🔧 命令行选项

```bash
./seed_runner.sh [选项]

选项:
  -e, --env ENV          指定环境 (development|staging|production)
  -h, --host HOST        数据库主机
  -p, --port PORT        数据库端口
  -d, --database DB      数据库名称
  -u, --user USER        数据库用户
  -w, --password PASS    数据库密码
  -f, --force            强制执行，跳过确认
  -c, --cleanup          清理模式
  -r, --recreate         清理后重建基础数据
  -l, --list             列出可用脚本
  -s, --script SCRIPT    执行指定脚本
  -t, --test             测试数据库连接
  -v, --verbose          详细输出
  --help                 显示帮助信息
```

## 🌍 环境策略

### Production（生产环境）
```bash
./seed_runner.sh --env production
```
- **执行脚本**: `001_basic_seed_data.sql`
- **安全检查**: 需要输入确认短语
- **数据范围**: 仅基础系统数据

### Staging（预发布环境）
```bash
./seed_runner.sh --env staging
```
- **执行脚本**: `001_basic_seed_data.sql`, `003_demo_data.sql`
- **数据范围**: 基础数据 + 演示数据

### Development（开发环境）
```bash
./seed_runner.sh --env development
```
- **执行脚本**: 所有脚本
- **数据范围**: 完整的开发测试数据

## 🧪 使用场景

### 场景1: 新环境初始化
```bash
# 1. 测试数据库连接
./seed_runner.sh --test

# 2. 执行环境对应的种子数据
./seed_runner.sh --env development

# 3. 验证数据是否正确创建
./seed_runner.sh --list
```

### 场景2: 重置开发数据
```bash
# 1. 清理现有数据
./seed_runner.sh --cleanup --force

# 2. 重新创建测试数据
./seed_runner.sh --env development
```

### 场景3: 仅更新基础数据
```bash
# 执行特定脚本
./seed_runner.sh --script 001_basic_seed_data.sql --force
```

### 场景4: 演示环境准备
```bash
# 清理并重建完整演示数据
./seed_runner.sh --cleanup --recreate --env staging
```

## 🔒 安全注意事项

### 生产环境保护
- 生产环境需要输入确认短语 `CONFIRM-PRODUCTION`
- 禁止在生产环境执行清理操作
- 所有生产环境操作都会记录日志

### 数据保护
- 清理操作不可逆，请谨慎使用
- 建议在清理前创建数据库备份
- 种子数据不会覆盖现有的业务数据

### 密码安全
- 不要在配置文件中存储明文密码
- 使用环境变量传递敏感信息
- 种子数据中的密码仅用于测试

## 📊 数据概览

### 基础种子数据
- **用户**: 1个系统管理员
- **角色**: 6个标准系统角色  
- **权限**: 16个基础权限

### 开发测试数据
- **用户**: 8个测试用户（系统+企业）
- **企业**: 3个测试企业
- **项目**: 3个测试项目
- **任务**: 15+个测试任务
- **时间记录**: 若干工作记录

### 演示数据
- **用户**: 12个演示用户（完整用户画像）
- **企业**: 4个真实业务场景企业
- **项目**: 3个复杂演示项目
- **任务**: 50+个任务（包含复杂依赖关系）
- **时间记录**: 丰富的工作时间数据

## 🐛 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查Docker服务
docker-compose -f ../../docker-compose.dev.yml ps

# 启动数据库服务
docker-compose -f ../../docker-compose.dev.yml up -d postgres-master

# 测试连接
./seed_runner.sh --test
```

#### 2. 脚本执行失败
```bash
# 启用详细输出查看错误详情
./seed_runner.sh --verbose

# 检查数据库日志
docker-compose -f ../../docker-compose.dev.yml logs postgres-master
```

#### 3. 权限不足
```bash
# 给脚本执行权限
chmod +x seed_runner.sh

# 检查数据库用户权限
./seed_runner.sh --test
```

#### 4. 环境变量问题
```bash
# 检查当前环境变量
./seed_runner.sh --verbose

# 手动设置数据库密码
export DB_PASSWORD=your_password
./seed_runner.sh
```

### 调试技巧

```bash
# 1. 启用调试模式
export DEBUG=true
./seed_runner.sh --verbose

# 2. 测试单个脚本
./seed_runner.sh --script 001_basic_seed_data.sql --test

# 3. 查看可用脚本
./seed_runner.sh --list

# 4. 强制执行跳过确认
./seed_runner.sh --force
```

## 🔄 维护和更新

### 添加新的种子数据脚本

1. **创建脚本文件**
   ```bash
   cp seed/001_basic_seed_data.sql seed/004_new_feature_data.sql
   ```

2. **更新脚本内容**
   - 修改文件头部注释
   - 实现具体的数据逻辑
   - 添加环境检查和幂等性处理

3. **更新执行器配置**
   ```bash
   # 编辑 seed_config.env
   DEVELOPMENT_SCRIPTS="001_basic_seed_data.sql,002_dev_test_data.sql,003_demo_data.sql,004_new_feature_data.sql"
   ```

4. **测试新脚本**
   ```bash
   ./seed_runner.sh --script 004_new_feature_data.sql --test
   ```

### 更新现有脚本

1. **备份现有数据**（推荐）
2. **修改脚本文件**
3. **在测试环境验证**
4. **部署到其他环境**

### 版本管理

- 所有脚本都包含在Git版本控制中
- 重要变更需要创建Pull Request
- 生产环境变更需要经过代码审查

## 📈 最佳实践

### 脚本编写原则

1. **幂等性**: 脚本可以安全地重复执行
2. **环境感知**: 根据环境执行不同逻辑
3. **错误处理**: 充分的错误检查和回滚机制
4. **文档化**: 详细的注释和说明
5. **测试**: 在多个环境中验证

### 数据设计原则

1. **真实性**: 测试数据应该模拟真实业务场景
2. **完整性**: 包含必要的关联关系和依赖
3. **可识别**: 种子数据应该容易识别和清理
4. **安全性**: 不包含真实的敏感信息

### 执行建议

1. **渐进式**: 先在开发环境测试，再推广到其他环境
2. **监控**: 关注脚本执行时间和系统资源使用
3. **备份**: 在生产环境执行前创建备份
4. **验证**: 执行后验证数据完整性和业务功能

## 🤝 贡献指南

如果你需要修改或添加种子数据：

1. Fork项目并创建特性分支
2. 按照现有脚本格式编写新脚本
3. 在开发环境充分测试
4. 更新相关文档
5. 提交Pull Request

## 📞 支持

如有问题或建议，请：

1. 查阅本文档的故障排除部分
2. 检查项目的Issue列表
3. 创建新的Issue描述问题
4. 联系项目维护人员

---

**注意**: 本工具涉及数据库操作，请在使用前充分了解相关风险，并在非生产环境进行充分测试。
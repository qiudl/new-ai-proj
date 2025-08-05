# 508.4 易用性专项测试用例设计详细文档

## 📋 任务概述
**任务ID**: 508.4 (对应系统ID: 585)  
**任务标题**: 易用性专项测试用例设计 - 李宁团购管理平台  
**优先级**: P1 (中优先级)  
**状态**: 设计完成  
**创建时间**: 2025-08-05  

## 🎯 测试目标
验证李宁团购管理平台的用户体验设计是否符合易用性原则，确保不同技能水平的用户都能高效、愉悦地完成购物和管理任务，提升用户满意度和转化率。

## 🌟 核心易用性指标
- **任务完成率**: 核心购物流程95%成功完成率
- **任务完成时间**: 首次购物流程<5分钟完成
- **用户错误率**: 操作错误率<5%
- **用户满意度**: SUS可用性评分>80分
- **学习曲线**: 新用户3次使用后熟练操作

## 🏗️ 易用性测试框架

基于ISO 9241-11可用性标准和Nielsen十大可用性原则，建立多维度易用性测试框架：

### 1. 可学习性测试 (Learnability)
- **首次使用体验**: 新用户引导流程
- **操作直觉性**: 界面元素认知负担
- **帮助系统**: 在线帮助和提示信息
- **渐进式披露**: 复杂功能的分步引导

### 2. 效率性测试 (Efficiency)
- **任务执行速度**: 熟练用户操作效率
- **快捷操作**: 快捷键和快速入口
- **批量操作**: 多选和批量处理功能
- **智能推荐**: 个性化内容推荐

### 3. 可记忆性测试 (Memorability)
- **界面一致性**: 设计模式的统一性
- **操作流程**: 相似功能的操作一致性
- **视觉识别**: 图标和色彩的记忆点
- **习惯保持**: 用户偏好设置记忆

### 4. 错误预防与恢复测试 (Error Prevention & Recovery)
- **输入验证**: 实时数据验证和提示
- **确认机制**: 重要操作的确认对话框
- **撤销功能**: 操作可逆性设计
- **错误处理**: 友好的错误信息和解决方案

### 5. 用户满意度测试 (Satisfaction)
- **视觉设计**: 界面美观度和专业性
- **交互反馈**: 操作响应和状态提示
- **情感化设计**: 微交互和愉悦体验
- **个性化体验**: 用户偏好和定制化

## 📝 详细测试用例

### TC_USABILITY_001: 新用户首次使用体验测试

**测试目的**: 验证新用户能否在没有培训的情况下顺利完成首次购物流程

#### 子测试1: 用户注册流程易用性测试
```yaml
测试场景设置:
  测试用户: 15名未使用过该平台的用户
  年龄分布: 20-50岁，涵盖不同年龄段
  技术背景: 基础、中等、熟练各5人
  测试环境: 桌面端 + 移动端
  
任务流程:
  1. 访问网站首页
  2. 找到注册入口
  3. 完成注册表单填写
  4. 进行手机/邮箱验证
  5. 完善个人信息
  6. 首次登录系统

观察指标:
  - 注册入口发现时间: <30秒
  - 注册流程完成时间: <3分钟
  - 表单填写错误次数: <2次
  - 用户主观困难评分: <3分(5分制)
```

**测试执行脚本**:
```javascript
describe('新用户注册流程易用性测试', () => {
    let testResults = [];
    
    beforeEach(() => {
        // 清除浏览器数据，模拟新用户环境
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.visit('https://tuangou.com');
    });
    
    it('注册入口可发现性测试', () => {
        const startTime = Date.now();
        
        // 记录用户查找注册按钮的行为
        cy.get('body').then(() => {
            // 模拟用户视觉扫描过程
            cy.get('[data-testid="register-btn"]', { timeout: 30000 })
              .should('be.visible')
              .then(() => {
                const discoveryTime = Date.now() - startTime;
                expect(discoveryTime).to.be.lessThan(30000);
                
                // 记录发现时间
                testResults.push({
                    metric: 'register_button_discovery_time',
                    value: discoveryTime,
                    target: 30000,
                    passed: discoveryTime < 30000
                });
              });
        });
    });
    
    it('注册表单填写体验测试', () => {
        cy.get('[data-testid="register-btn"]').click();
        
        const formStartTime = Date.now();
        let errorCount = 0;
        
        // 监听表单验证错误
        cy.window().then((win) => {
            win.addEventListener('form-validation-error', () => {
                errorCount++;
            });
        });
        
        // 填写注册表单
        cy.get('#username').type('testuser123');
        cy.get('#email').type('test@example.com');
        cy.get('#phone').type('13800138000');
        cy.get('#password').type('MySecure@Pass123');
        cy.get('#confirmPassword').type('MySecure@Pass123');
        
        // 检查实时验证反馈
        cy.get('.form-validation-feedback').should('be.visible');
        cy.get('.password-strength-indicator').should('be.visible');
        
        // 提交表单
        cy.get('#register-submit').click();
        
        // 等待提交完成
        cy.url().should('include', '/verify', { timeout: 10000 });
        
        const formCompletionTime = Date.now() - formStartTime;
        expect(formCompletionTime).to.be.lessThan(180000); // 3分钟
        expect(errorCount).to.be.lessThan(2);
        
        testResults.push({
            metric: 'form_completion_time',
            value: formCompletionTime,
            errors: errorCount
        });
    });
    
    it('验证流程指导清晰性测试', () => {
        // 验证页面应有清晰的指导信息
        cy.contains('验证码已发送到您的手机').should('be.visible');
        cy.get('.verification-help-text').should('be.visible');
        cy.get('.resend-code-btn').should('be.visible');
        
        // 输入验证码
        cy.get('#verification-code').type('123456');
        cy.get('#verify-submit').click();
        
        // 验证成功后的引导
        cy.get('.welcome-message').should('be.visible');
        cy.get('.next-steps-guide').should('be.visible');
    });
});
```

#### 子测试2: 商品浏览体验测试
```yaml
测试任务:
  主要任务:
    1. 浏览商品分类
    2. 使用搜索功能
    3. 查看商品详情
    4. 对比商品功能
    5. 添加商品到购物车

可用性评估指标:
  导航清晰度:
    - 分类结构理解时间: <1分钟
    - 面包屑导航使用率: >80%
    - 返回上级操作成功率: >95%
    
  搜索功能效率:
    - 搜索框发现时间: <15秒
    - 搜索结果相关性满意度: >4分
    - 筛选功能使用率: >60%
    
  商品详情信息充分性:
    - 商品信息理解时间: <2分钟
    - 规格选择错误率: <10%
    - 购买决策信心度: >4分
```

#### 子测试3: 购物车和结算流程测试
```javascript
describe('购物车和结算流程易用性', () => {
    beforeEach(() => {
        // 准备测试环境：已登录用户，购物车中有商品
        cy.login('testuser', 'password');
        cy.addProductToCart('PROD_001', 2);
        cy.addProductToCart('PROD_002', 1);
    });
    
    it('购物车操作直观性测试', () => {
        cy.visit('/cart');
        
        // 测试购物车信息清晰度
        cy.get('.cart-item').should('have.length', 2);
        cy.get('.cart-total').should('be.visible');
        cy.get('.item-price').should('be.visible');
        
        // 测试数量修改操作
        cy.get('[data-testid="quantity-increase"]').first().click();
        cy.get('.cart-total').should('contain', '更新后的总价');
        
        // 测试商品删除操作
        cy.get('[data-testid="remove-item"]').first().click();
        cy.get('.confirm-dialog').should('be.visible');
        cy.get('.confirm-yes').click();
        cy.get('.cart-item').should('have.length', 1);
    });
    
    it('结算流程顺畅性测试', () => {
        cy.visit('/cart');
        const checkoutStartTime = Date.now();
        
        // 开始结算
        cy.get('#checkout-btn').click();
        
        // 地址选择步骤
        cy.get('.address-selector').should('be.visible');
        cy.get('.default-address').click();
        cy.get('#next-step').click();
        
        // 支付方式选择
        cy.get('.payment-methods').should('be.visible');
        cy.get('[data-payment="wechat"]').click();
        cy.get('#next-step').click();
        
        // 订单确认
        cy.get('.order-summary').should('be.visible');
        cy.get('.total-amount').should('be.visible');
        cy.get('#place-order').click();
        
        // 支付页面
        cy.url().should('include', '/payment');
        
        const checkoutTime = Date.now() - checkoutStartTime;
        expect(checkoutTime).to.be.lessThan(120000); // 2分钟内完成
    });
});
```

### TC_USABILITY_002: 界面一致性和认知负担测试

**测试目的**: 验证系统界面设计的一致性，减少用户认知负担

#### 子测试1: 设计模式一致性测试
```yaml
一致性检查项目:
  按钮设计一致性:
    - 主要按钮: 统一的颜色、尺寸、圆角
    - 次要按钮: 统一的边框样式和颜色
    - 危险操作按钮: 统一的警告色彩
    - 禁用状态: 统一的灰色调和不可点击状态
    
  表单元素一致性:
    - 输入框样式: 边框、内边距、字体大小
    - 标签位置: 统一的标签和输入框对齐方式
    - 验证提示: 统一的错误和成功提示样式
    - 必填标识: 统一的必填字段标记方式
    
  导航元素一致性:
    - 菜单样式: 主导航和侧边栏导航风格
    - 面包屑: 分隔符、链接样式、当前页标识
    - 分页组件: 页码样式、前后翻页按钮
    - Tab标签: 选中状态、悬停效果
```

**一致性自动化检测**:
```javascript
describe('界面一致性自动化检测', () => {
    const pages = [
        '/products',
        '/cart', 
        '/orders',
        '/profile',
        '/admin/users',
        '/admin/products'
    ];
    
    pages.forEach(page => {
        it(`${page} 页面设计一致性检查`, () => {
            cy.visit(page);
            
            // 检查主要按钮样式一致性
            cy.get('.btn-primary').each(($btn) => {
                cy.wrap($btn)
                  .should('have.css', 'background-color', 'rgb(24, 144, 255)')
                  .should('have.css', 'border-radius', '6px')
                  .should('have.css', 'padding', '8px 16px');
            });
            
            // 检查输入框样式一致性
            cy.get('input[type="text"], input[type="email"]').each(($input) => {
                cy.wrap($input)
                  .should('have.css', 'border', '1px solid rgb(217, 217, 217)')
                  .should('have.css', 'border-radius', '4px')
                  .should('have.css', 'padding', '8px 12px');
            });
            
            // 检查表单验证信息样式
            cy.get('.form-error-message').each(($error) => {
                cy.wrap($error)
                  .should('have.css', 'color', 'rgb(255, 77, 79)')
                  .should('have.css', 'font-size', '14px');
            });
        });
    });
    
    it('图标使用一致性检查', () => {
        const iconPages = ['/products', '/orders', '/admin'];
        
        iconPages.forEach(page => {
            cy.visit(page);
            
            // 检查编辑图标一致性
            cy.get('[data-icon="edit"]').each(($icon) => {
                cy.wrap($icon)
                  .should('have.attr', 'width', '16')
                  .should('have.attr', 'height', '16');
            });
            
            // 检查删除图标颜色一致性
            cy.get('[data-icon="delete"]').each(($icon) => {
                cy.wrap($icon)
                  .should('have.css', 'color', 'rgb(255, 77, 79)');
            });
        });
    });
});
```

#### 子测试2: 信息架构清晰度测试
```yaml
信息架构评估:
  导航结构测试:
    - 菜单层级深度: 不超过3级
    - 每级菜单项数量: 5-9个选项(7±2原则)
    - 菜单分组逻辑: 功能相关性分组
    - 菜单标签含义: 用户理解度>90%
    
  内容组织测试:
    - 页面信息层次: F型或Z型视觉流程
    - 重要信息优先级: 关键信息视觉突出
    - 内容分块: 相关内容合理分组
    - 空白空间利用: 适当的留白提升可读性
    
  标签和术语一致性:
    - 功能标签: 整个系统使用统一术语
    - 状态描述: 订单状态、支付状态等统一表达
    - 操作动词: "添加"vs"新增", "删除"vs"移除"
    - 错误信息: 统一的错误提示语言风格
```

### TC_USABILITY_003: 操作效率和快捷方式测试

**测试目的**: 验证熟练用户的操作效率和快捷操作支持

#### 子测试1: 键盘快捷键支持测试
```javascript
describe('键盘快捷键易用性测试', () => {
    beforeEach(() => {
        cy.login('poweruser', 'password');
    });
    
    it('全局快捷键功能测试', () => {
        cy.visit('/admin/products');
        
        // 测试搜索快捷键 (Ctrl+F 或 Cmd+F)
        cy.get('body').type('{cmd}f');
        cy.get('#search-input').should('be.focused');
        
        // 测试新建快捷键 (Ctrl+N)
        cy.get('body').type('{cmd}n');
        cy.get('.create-product-modal').should('be.visible');
        cy.get('.modal-close').click();
        
        // 测试保存快捷键 (Ctrl+S)
        cy.get('[data-testid="product-item"]').first().click();
        cy.get('#product-name').clear().type('修改后的商品名称');
        cy.get('body').type('{cmd}s');
        cy.get('.save-success-message').should('be.visible');
        
        // 测试ESC关闭模态框
        cy.get('#help-btn').click();
        cy.get('.help-modal').should('be.visible');
        cy.get('body').type('{esc}');
        cy.get('.help-modal').should('not.exist');
    });
    
    it('表单导航快捷键测试', () => {
        cy.visit('/admin/products/create');
        
        // Tab键顺序导航测试
        cy.get('#product-name').focus();
        cy.get('#product-name').tab();
        cy.get('#product-category').should('be.focused');
        
        cy.get('#product-category').tab();
        cy.get('#product-price').should('be.focused');
        
        // Shift+Tab反向导航测试
        cy.get('#product-price').tab({ shift: true });
        cy.get('#product-category').should('be.focused');
        
        // Enter提交表单测试
        cy.get('#product-name').type('测试商品');
        cy.get('#product-category').select('运动鞋');
        cy.get('#product-price').type('299.99');
        cy.get('#submit-btn').focus().type('{enter}');
        
        cy.get('.form-submitted').should('be.visible');
    });
});
```

#### 子测试2: 批量操作效率测试
```yaml
批量操作测试场景:
  商品管理批量操作:
    - 全选/反选功能
    - 批量删除确认流程
    - 批量修改状态
    - 批量导出数据
    
  订单管理批量操作:
    - 批量发货处理
    - 批量状态更新
    - 批量打印单据
    - 批量退款处理
    
  用户管理批量操作:
    - 批量启用/禁用账户
    - 批量分配角色
    - 批量发送通知
    - 批量导入用户

效率评估指标:
  - 批量选择操作时间: <30秒(100项)
  - 批量操作确认时间: <10秒
  - 批量处理进度可见性: 实时进度条
  - 批量操作撤销支持: 重要操作可撤销
```

### TC_USABILITY_004: 错误预防和恢复测试

**测试目的**: 验证系统的错误预防机制和用户友好的错误恢复支持

#### 子测试1: 输入验证和实时反馈测试
```javascript
describe('输入验证和实时反馈测试', () => {
    it('实时表单验证反馈', () => {
        cy.visit('/register');
        
        // 邮箱格式实时验证
        cy.get('#email').type('invalid-email');
        cy.get('.email-validation-error')
          .should('be.visible')
          .should('contain', '请输入有效的邮箱地址');
        
        cy.get('#email').clear().type('valid@example.com');
        cy.get('.email-validation-success')
          .should('be.visible');
        
        // 密码强度实时提示
        cy.get('#password').type('weak');
        cy.get('.password-strength')
          .should('contain', '密码强度：弱')
          .should('have.class', 'strength-weak');
        
        cy.get('#password').type('MySecure@Pass123');
        cy.get('.password-strength')
          .should('contain', '密码强度：强')
          .should('have.class', 'strength-strong');
        
        // 确认密码一致性检查
        cy.get('#confirm-password').type('different-password');
        cy.get('.confirm-password-error')
          .should('be.visible')
          .should('contain', '两次输入的密码不一致');
    });
    
    it('数值输入范围验证', () => {
        cy.visit('/admin/products/create');
        
        // 价格范围验证
        cy.get('#price').type('-10');
        cy.get('.price-validation-error')
          .should('contain', '价格不能为负数');
        
        cy.get('#price').clear().type('999999');
        cy.get('.price-validation-warning')
          .should('contain', '价格过高，请确认');
        
        // 库存数量验证
        cy.get('#stock').type('abc');
        cy.get('.stock-validation-error')
          .should('contain', '请输入有效的数字');
        
        cy.get('#stock').clear().type('100');
        cy.get('.stock-validation-success').should('be.visible');
    });
});
```

#### 子测试2: 操作确认和撤销机制测试
```yaml
确认机制测试:
  危险操作确认:
    - 删除商品: 二次确认对话框
    - 批量删除: 输入确认文本
    - 账户禁用: 详细后果说明
    - 数据清除: 多步骤确认流程
    
  确认信息质量:
    - 操作后果描述清晰
    - 确认按钮文案明确
    - 取消操作突出显示
    - 不可逆操作特别标注

撤销机制测试:
  可撤销操作:
    - 商品状态修改: 30秒内可撤销
    - 批量操作: 提供撤销选项
    - 表单提交: 编辑模式支持
    - 内容发布: 发布后可撤回
    
  撤销体验:
    - 撤销提示明显: Toast消息显示
    - 撤销时间限制: 清晰的倒计时
    - 撤销操作简单: 一键撤销
    - 撤销结果反馈: 操作结果确认
```

### TC_USABILITY_005: 可访问性和包容性设计测试

**测试目的**: 验证系统对不同能力用户的可访问性支持

#### 子测试1: 键盘导航可访问性测试
```javascript
describe('键盘导航可访问性测试', () => {
    it('完整键盘导航支持', () => {
        cy.visit('/products');
        
        // 测试焦点顺序逻辑性
        cy.get('body').tab();
        cy.focused().should('have.attr', 'data-testid', 'skip-to-content');
        
        cy.focused().tab();
        cy.focused().should('match', '.main-nav a:first');
        
        // 测试所有交互元素可达性
        const interactiveElements = [
            'button', 'a[href]', 'input', 'select', 
            'textarea', '[tabindex]:not([tabindex="-1"])'
        ];
        
        interactiveElements.forEach(selector => {
            cy.get(selector).each(($el) => {
                cy.wrap($el).focus();
                cy.focused().should('be.visible');
            });
        });
    });
    
    it('焦点指示器可见性测试', () => {
        cy.visit('/login');
        
        // 测试焦点指示器样式
        cy.get('#username').focus();
        cy.get('#username').should('have.css', 'outline-width', '2px');
        cy.get('#username').should('have.css', 'outline-color', 'rgb(24, 144, 255)');
        
        // 测试自定义焦点样式
        cy.get('.btn-primary').focus();
        cy.get('.btn-primary').should('have.class', 'focus-visible');
    });
});
```

#### 子测试2: 色彩对比度和可读性测试
```yaml
色彩可访问性测试:
  对比度要求:
    - 正常文本: 4.5:1 最小对比度
    - 大文本(18pt+): 3:1 最小对比度  
    - 非文本元素: 3:1 最小对比度
    - 焦点指示器: 3:1 对比度
    
  色盲友好性:
    - 不依赖颜色传达信息
    - 红绿色盲用户验证
    - 蓝黄色盲用户验证
    - 灰度模式可用性

文本可读性测试:
  字体选择:
    - 主要字体: 无衬线字体优先
    - 字体大小: 最小14px
    - 行高设置: 1.4-1.6倍行高
    - 字符间距: 适当的字母间距
    
  内容结构:
    - 标题层级清晰(H1-H6)
    - 段落长度适中
    - 列表结构合理
    - 链接文本描述性强
```

## 🛠️ 易用性测试工具配置

### 用户测试工具
```yaml
用户行为分析工具:
  热力图分析:
    - Hotjar: 用户点击热力图
    - Crazy Egg: 滚动热力图
    - FullStory: 用户会话录制
    
  A/B测试平台:
    - Google Optimize: 页面版本测试
    - Optimizely: 功能测试
    - VWO: 转化率优化测试
    
  用户反馈收集:
    - UserVoice: 用户建议收集
    - Hotjar Surveys: 页面内调研
    - Typeform: 详细用户调研

可访问性测试工具:
  自动化检测:
    - axe-core: 可访问性规则检测
    - WAVE: Web可访问性评估
    - Lighthouse: 综合性能和可访问性
    - Pa11y: 命令行可访问性测试
    
  手动测试工具:
    - Screen Reader: NVDA, JAWS
    - 键盘导航: 纯键盘操作测试
    - Color Oracle: 色盲模拟器
    - Contrast Checker: 对比度检测
```

### 易用性评估方法
```yaml
定量评估方法:
  任务成功率:
    - 计算公式: 成功完成任务用户数 / 总测试用户数
    - 目标值: 核心任务 >95%, 次要任务 >85%
    
  任务完成时间:
    - 测量方法: 从任务开始到成功完成的时间
    - 对比基准: 与竞品或历史版本对比
    
  错误率:
    - 计算公式: 操作错误次数 / 总操作次数
    - 分类统计: 严重错误 vs 轻微错误

定性评估方法:
  用户满意度调研:
    - SUS量表: 系统可用性量表评分
    - 净推荐值: NPS用户推荐意愿
    - 情感化评估: 用户使用情感反馈
    
  专家评审:
    - 启发式评估: Nielsen 10项原则
    - 认知走查: 用户任务执行分析
    - 可访问性审计: WCAG 2.1标准检查
```

## 📊 易用性测试验收标准

### 核心可用性指标验收
- ✅ **任务成功率**: 核心购物流程>95%，管理功能>90%
- ✅ **完成时间**: 首次购物<5分钟，重复购物<2分钟
- ✅ **用户错误率**: 整体操作错误率<5%
- ✅ **学习曲线**: 新用户3次使用后熟练度>80%

### 用户体验质量验收
- ✅ **用户满意度**: SUS评分>80分，NPS>50分
- ✅ **界面一致性**: 设计模式一致性>95%
- ✅ **信息架构**: 导航寻路成功率>90%
- ✅ **错误恢复**: 错误后恢复成功率>95%

### 可访问性标准验收
- ✅ **键盘导航**: 所有功能键盘可操作
- ✅ **屏幕阅读器**: 支持主流屏幕阅读器
- ✅ **色彩对比度**: 符合WCAG 2.1 AA级标准
- ✅ **文本可读性**: 字体大小>14px，对比度>4.5:1

## 🔧 易用性优化建议

### 交互设计优化
```javascript
// 交互反馈优化示例
const interactionFeedback = {
    // 按钮点击反馈
    buttonClick: (element) => {
        element.classList.add('btn-clicked');
        setTimeout(() => {
            element.classList.remove('btn-clicked');
        }, 150);
    },
    
    // 表单提交状态
    formSubmission: {
        showLoading: () => {
            const submitBtn = document.querySelector('#submit-btn');
            submitBtn.innerHTML = '<span class="spinner"></span> 提交中...';
            submitBtn.disabled = true;
        },
        
        showSuccess: () => {
            showToast('success', '操作成功完成！', 3000);
        },
        
        showError: (message) => {
            showToast('error', message, 5000);
        }
    },
    
    // 实时保存提示
    autoSave: {
        saving: () => showStatus('正在保存...', 'info'),
        saved: () => showStatus('已保存', 'success', 2000),
        error: () => showStatus('保存失败', 'error', 3000)
    }
};

// 用户引导优化
const userGuidance = {
    // 新功能引导
    showFeatureGuide: (feature) => {
        const guide = new IntroJS();
        guide.setOptions({
            steps: getFeatureSteps(feature),
            showBullets: false,
            showProgress: true,
            exitOnOverlayClick: false
        });
        guide.start();
    },
    
    // 空状态指导
    showEmptyState: (container, type) => {
        const emptyState = createEmptyStateComponent(type);
        container.appendChild(emptyState);
    },
    
    // 错误状态帮助
    showErrorHelp: (error) => {
        const helpInfo = getErrorHelpInfo(error.code);
        showHelpDialog(helpInfo);
    }
};
```

### 响应式设计优化
```css
/* 响应式断点优化 */
:root {
    --mobile-breakpoint: 576px;
    --tablet-breakpoint: 768px; 
    --desktop-breakpoint: 992px;
    --large-desktop-breakpoint: 1200px;
}

/* 触摸友好的交互区域 */
.touch-target {
    min-height: 44px;
    min-width: 44px;
    padding: 12px;
}

/* 移动端优化的表单 */
@media (max-width: 576px) {
    .form-group {
        margin-bottom: 24px;
    }
    
    input, select, textarea {
        font-size: 16px; /* 防止iOS缩放 */
        padding: 14px 16px;
    }
    
    .btn {
        min-height: 48px;
        font-size: 16px;
    }
}

/* 可访问性优化 */
.focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
    :root {
        --text-color: #000000;
        --background-color: #ffffff;
        --border-color: #000000;
    }
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

**文档版本**: v1.0  
**创建日期**: 2025-08-05  
**负责人**: Claude  
**审核状态**: 待审核  
**关联任务**: 508.4 (系统ID: 585)  
**项目编号**: 34 (李宁团购管理平台)
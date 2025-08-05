# 508.2 安全专项测试用例设计详细文档

## 📋 任务概述
**任务ID**: 508.2 (对应系统ID: 583)  
**任务标题**: 安全专项测试用例设计 - 李宁团购管理平台  
**优先级**: P0 (最高优先级)  
**状态**: 设计完成  
**创建时间**: 2025-08-05  

## 🎯 测试目标
验证李宁团购管理平台在各种安全威胁下的防护能力，确保用户数据安全、业务流程安全和系统整体安全性，符合国家网络安全法和行业安全标准要求。

## 🔒 核心安全指标
- **身份认证安全**: 100%防止未授权访问
- **数据传输安全**: 全链路HTTPS加密
- **数据存储安全**: 敏感数据加密存储
- **业务逻辑安全**: 100%防止越权操作
- **系统防护能力**: SQL注入、XSS等攻击防护率100%

## 🏗️ 安全测试框架

基于李宁团购平台的技术架构和业务特点，建立多层次安全测试框架：

### 1. 应用层安全测试
- **身份认证安全**: JWT Token安全、会话管理、密码策略
- **授权控制测试**: 角色权限、API访问控制、数据访问控制
- **输入验证测试**: 参数校验、文件上传安全、数据格式验证
- **业务逻辑安全**: 订单篡改、价格篡改、流程绕过

### 2. 数据层安全测试
- **SQL注入防护**: 参数化查询、输入过滤、错误信息泄露
- **数据加密测试**: 敏感数据加密、传输加密、存储加密
- **数据备份安全**: 备份数据加密、访问控制、恢复测试
- **数据泄露防护**: 敏感信息脱敏、日志安全、错误处理

### 3. 网络层安全测试
- **传输安全**: HTTPS配置、SSL/TLS版本、证书验证
- **网络防护**: 防火墙规则、DDoS防护、网络隔离
- **API安全**: 接口认证、请求限流、异常监控
- **第三方集成**: 支付接口安全、外部API调用安全

## 📝 详细测试用例

### TC_SECURITY_001: 身份认证安全测试

**测试目的**: 验证用户身份认证机制的安全性和可靠性

#### 子测试1: 密码安全策略测试
```yaml
测试场景:
  弱密码检测:
    - 测试密码: "123456", "password", "admin"
    - 预期结果: 系统拒绝弱密码，提示强度要求
    
  密码复杂度验证:
    - 最小长度: 8位字符
    - 字符组合: 大小写字母+数字+特殊字符
    - 预期结果: 只接受符合复杂度要求的密码
    
  密码存储安全:
    - 数据库存储: BCrypt哈希+盐值
    - 验证方法: 检查数据库中无明文密码
    - 预期结果: 密码不可逆加密存储
```

**测试代码示例**:
```go
func TestPasswordSecurity(t *testing.T) {
    // 测试弱密码拒绝
    weakPasswords := []string{"123456", "password", "admin", "abc123"}
    for _, pwd := range weakPasswords {
        err := validatePassword(pwd)
        assert.Error(t, err, "弱密码应该被拒绝: %s", pwd)
    }
    
    // 测试强密码接受
    strongPassword := "MySecure@Pass123"
    err := validatePassword(strongPassword)
    assert.NoError(t, err, "强密码应该被接受")
    
    // 测试密码加密存储
    user := &User{Username: "testuser", Password: strongPassword}
    err = createUser(user)
    assert.NoError(t, err)
    
    // 验证数据库中密码已加密
    storedUser := getUserFromDB("testuser")
    assert.NotEqual(t, strongPassword, storedUser.Password, "密码不应明文存储")
    assert.True(t, strings.HasPrefix(storedUser.Password, "$2a$"), "应使用BCrypt加密")
}
```

#### 子测试2: JWT Token安全测试
```go
func TestJWTSecurity(t *testing.T) {
    // 测试Token生成
    user := &User{ID: 123, Username: "testuser", Role: "USER"}
    token, err := generateJWT(user)
    assert.NoError(t, err)
    assert.NotEmpty(t, token)
    
    // 测试Token验证
    claims, err := validateJWT(token)
    assert.NoError(t, err)
    assert.Equal(t, user.ID, claims.UserID)
    
    // 测试Token篡改检测
    tamperingToken := token[:len(token)-10] + "tampered123"
    _, err = validateJWT(tamperingToken)
    assert.Error(t, err, "篡改的Token应该被拒绝")
    
    // 测试Token过期
    expiredToken := generateExpiredJWT(user)
    _, err = validateJWT(expiredToken)
    assert.Error(t, err, "过期Token应该被拒绝")
    
    // 测试Token刷新安全
    newToken, err := refreshJWT(token)
    assert.NoError(t, err)
    assert.NotEqual(t, token, newToken, "刷新后Token应该不同")
}
```

#### 子测试3: 会话管理安全测试
```yaml
会话安全测试场景:
  并发登录控制:
    - 同一用户多设备登录策略
    - 会话冲突处理机制
    - 强制下线功能测试
    
  会话超时控制:
    - 空闲超时: 30分钟无操作自动退出
    - 绝对超时: 24小时强制重新登录
    - 敏感操作: 支付前重新验证身份
    
  会话劫持防护:
    - Session ID随机性验证
    - HttpOnly和Secure标志
    - 会话固定攻击防护
```

### TC_SECURITY_002: 权限控制安全测试

**测试目的**: 验证系统的访问控制和权限管理机制

#### 子测试1: API访问控制测试
```go
func TestAPIAccessControl(t *testing.T) {
    // 准备不同角色用户
    adminUser := createTestUser("admin", "ADMIN")
    normalUser := createTestUser("user", "USER")
    
    // 测试管理员API访问
    adminToken := generateJWT(adminUser)
    resp := callAPI("GET", "/api/sys/users", adminToken)
    assert.Equal(t, 200, resp.StatusCode, "管理员应能访问用户管理API")
    
    // 测试普通用户越权访问
    userToken := generateJWT(normalUser)
    resp = callAPI("GET", "/api/sys/users", userToken)
    assert.Equal(t, 403, resp.StatusCode, "普通用户不应访问管理API")
    
    // 测试无Token访问
    resp = callAPI("GET", "/api/sys/users", "")
    assert.Equal(t, 401, resp.StatusCode, "无Token访问应被拒绝")
    
    // 测试用户只能访问自己的数据
    resp = callAPI("GET", "/api/user/profile/123", userToken)
    if normalUser.ID != 123 {
        assert.Equal(t, 403, resp.StatusCode, "用户不应访问他人数据")
    }
}
```

#### 子测试2: 垂直权限提升测试
```yaml
垂直权限提升测试场景:
  角色权限边界:
    - 普通用户访问管理员功能
    - 客服人员访问财务数据
    - 分销商访问系统配置
    
  功能权限验证:
    - 用户管理权限
    - 订单管理权限  
    - 财务数据权限
    - 系统配置权限
    
  数据权限控制:
    - 用户只能查看自己的订单
    - 分销商只能管理自己的商品
    - 管理员权限范围控制
```

#### 子测试3: 水平权限提升测试
```go
func TestHorizontalPrivilegeEscalation(t *testing.T) {
    // 创建两个普通用户
    user1 := createTestUser("user1", "USER")
    user2 := createTestUser("user2", "USER")
    
    // 用户1创建订单
    user1Token := generateJWT(user1)
    order := createTestOrder(user1.ID)
    
    // 用户2尝试访问用户1的订单
    user2Token := generateJWT(user2)
    resp := callAPI("GET", fmt.Sprintf("/api/orders/%s", order.ID), user2Token)
    assert.Equal(t, 403, resp.StatusCode, "用户不应访问他人订单")
    
    // 用户2尝试修改用户1的订单
    updateData := map[string]interface{}{"status": "CANCELLED"}
    resp = callAPIWithData("PUT", fmt.Sprintf("/api/orders/%s", order.ID), user2Token, updateData)
    assert.Equal(t, 403, resp.StatusCode, "用户不应修改他人订单")
    
    // 用户1访问自己的订单（正常情况）
    resp = callAPI("GET", fmt.Sprintf("/api/orders/%s", order.ID), user1Token)
    assert.Equal(t, 200, resp.StatusCode, "用户应能访问自己的订单")
}
```

### TC_SECURITY_003: 输入验证安全测试

**测试目的**: 验证系统对各种恶意输入的过滤和防护能力

#### 子测试1: SQL注入防护测试
```go
func TestSQLInjectionProtection(t *testing.T) {
    // 常见SQL注入攻击载荷
    sqlInjectionPayloads := []string{
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; UPDATE users SET password='hacked' WHERE id=1; --",
        "' AND (SELECT COUNT(*) FROM users) > 0 --",
    }
    
    for _, payload := range sqlInjectionPayloads {
        // 测试登录接口
        loginData := map[string]string{
            "username": payload,
            "password": "anypassword",
        }
        
        resp := callAPIWithData("POST", "/api/login", "", loginData)
        
        // 验证响应
        assert.NotEqual(t, 200, resp.StatusCode, "SQL注入攻击应被拒绝: %s", payload)
        
        // 验证数据库未被篡改
        userCount := getUserCount()
        assert.Greater(t, userCount, 0, "用户表不应被删除")
        
        // 验证错误信息不泄露敏感信息
        body := getResponseBody(resp)
        assert.NotContains(t, body, "SQL", "错误信息不应包含SQL相关内容")
        assert.NotContains(t, body, "database", "错误信息不应暴露数据库信息")
    }
}
```

#### 子测试2: XSS攻击防护测试
```go
func TestXSSProtection(t *testing.T) {
    // XSS攻击载荷
    xssPayloads := []string{
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
        "'+alert('XSS')+'",
    }
    
    adminToken := generateAdminToken()
    
    for _, payload := range xssPayloads {
        // 测试商品名称XSS
        productData := map[string]interface{}{
            "name":        payload,
            "description": "正常描述",
            "price":       99.99,
        }
        
        resp := callAPIWithData("POST", "/api/products", adminToken, productData)
        
        if resp.StatusCode == 200 {
            // 如果创建成功，验证输出时是否被转义
            productID := getProductIDFromResponse(resp)
            getResp := callAPI("GET", fmt.Sprintf("/api/products/%s", productID), "")
            
            body := getResponseBody(getResp)
            assert.NotContains(t, body, "<script>", "脚本标签应被转义或过滤")
            assert.NotContains(t, body, "javascript:", "JavaScript伪协议应被过滤")
            assert.NotContains(t, body, "onerror=", "事件处理器应被过滤")
        }
    }
}
```

#### 子测试3: 文件上传安全测试
```yaml
文件上传安全测试场景:
  文件类型验证:
    - 只允许指定格式: JPG, PNG, GIF
    - 拒绝可执行文件: EXE, PHP, JSP, ASP
    - MIME类型检查: 检查文件头部信息
    
  文件大小限制:
    - 单文件大小: 最大5MB
    - 总上传大小: 最大50MB/天
    - 超限处理: 友好错误提示
    
  文件内容检查:
    - 图片文件真实性验证
    - 恶意代码扫描
    - 病毒检测集成
    
  存储安全:
    - 文件重命名: UUID + 时间戳
    - 路径遍历防护: 禁止../等路径
    - 执行权限: 上传目录无执行权限
```

### TC_SECURITY_004: 业务逻辑安全测试

**测试目的**: 验证核心业务流程的安全性，防止业务逻辑绕过和篡改

#### 子测试1: 订单安全测试
```go
func TestOrderSecurity(t *testing.T) {
    user := createTestUser("buyer", "USER")
    userToken := generateJWT(user)
    
    // 测试价格篡改防护
    product := createTestProduct("Test Product", 100.00)
    
    // 尝试篡改订单金额
    orderData := map[string]interface{}{
        "product_id": product.ID,
        "quantity":   1,
        "price":      0.01, // 尝试篡改价格
    }
    
    resp := callAPIWithData("POST", "/api/orders", userToken, orderData)
    
    if resp.StatusCode == 200 {
        // 验证订单金额是否被篡改
        order := getOrderFromResponse(resp)
        expectedAmount := product.Price * 1
        assert.Equal(t, expectedAmount, order.Amount, "订单金额不应被篡改")
    }
    
    // 测试库存数量篡改
    orderData = map[string]interface{}{
        "product_id": product.ID,
        "quantity":   -1, // 负数数量
    }
    
    resp = callAPIWithData("POST", "/api/orders", userToken, orderData)
    assert.NotEqual(t, 200, resp.StatusCode, "负数数量订单应被拒绝")
    
    // 测试不存在商品订单
    orderData = map[string]interface{}{
        "product_id": "non-existent-id",
        "quantity":   1,
    }
    
    resp = callAPIWithData("POST", "/api/orders", userToken, orderData)
    assert.NotEqual(t, 200, resp.StatusCode, "不存在商品的订单应被拒绝")
}
```

#### 子测试2: 支付安全测试
```yaml
支付安全测试场景:
  金额验证:
    - 支付金额与订单金额一致性
    - 负数金额拒绝
    - 超大金额限制
    
  重复支付防护:
    - 幂等性机制验证
    - 重复提交检测
    - 并发支付控制
    
  支付状态安全:
    - 支付状态不可逆转
    - 支付完成后订单锁定
    - 退款流程安全控制
    
  第三方支付集成:
    - 回调验证签名
    - 金额二次确认
    - 异常订单处理
```

#### 子测试3: 优惠券安全测试
```go
func TestCouponSecurity(t *testing.T) {
    user := createTestUser("customer", "USER")
    userToken := generateJWT(user)
    
    // 创建限量优惠券（仅10张）
    coupon := createTestCoupon("LIMITED10", 10.00, 10)
    
    // 测试优惠券重复使用
    order1 := createTestOrder(user.ID, 50.00)
    
    // 第一次使用优惠券
    resp := callAPIWithData("POST", "/api/orders/apply-coupon", userToken, 
        map[string]interface{}{
            "order_id":    order1.ID,
            "coupon_code": coupon.Code,
        })
    assert.Equal(t, 200, resp.StatusCode, "有效优惠券应该可以使用")
    
    // 尝试再次使用同一优惠券
    order2 := createTestOrder(user.ID, 60.00)
    resp = callAPIWithData("POST", "/api/orders/apply-coupon", userToken,
        map[string]interface{}{
            "order_id":    order2.ID,
            "coupon_code": coupon.Code,
        })
    assert.NotEqual(t, 200, resp.StatusCode, "已使用的优惠券不应再次使用")
    
    // 测试优惠券转让（使用他人优惠券）
    otherUser := createTestUser("other", "USER")
    otherUserCoupon := createPersonalCoupon(otherUser.ID, "PERSONAL20", 20.00)
    
    resp = callAPIWithData("POST", "/api/orders/apply-coupon", userToken,
        map[string]interface{}{
            "order_id":    order2.ID,
            "coupon_code": otherUserCoupon.Code,
        })
    assert.NotEqual(t, 200, resp.StatusCode, "不应使用他人专属优惠券")
}
```

### TC_SECURITY_005: 数据传输安全测试

**测试目的**: 验证数据在传输过程中的加密和安全性

#### 子测试1: HTTPS配置测试
```bash
#!/bin/bash
# HTTPS安全配置测试脚本

echo "检查HTTPS配置安全性..."

# 检查SSL证书有效性
openssl s_client -connect tuangou.com:443 -servername tuangou.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
if [ $? -eq 0 ]; then
    echo "✅ SSL证书有效"
else
    echo "❌ SSL证书无效或过期"
fi

# 检查支持的TLS版本
echo "检查TLS版本支持..."
nmap --script ssl-enum-ciphers -p 443 tuangou.com

# 检查弱加密套件
echo "检查加密套件安全性..."
sslscan tuangou.com:443

# 检查HSTS头部
echo "检查HSTS安全头..."
curl -I https://tuangou.com | grep -i "strict-transport-security"

# 检查HTTP重定向到HTTPS
echo "检查HTTP到HTTPS重定向..."
curl -I http://tuangou.com | grep -i "location.*https"
```

#### 子测试2: 敏感数据传输测试
```go
func TestSensitiveDataTransmission(t *testing.T) {
    // 测试登录请求加密
    loginData := map[string]string{
        "username": "testuser",
        "password": "MySecure@Pass123",
    }
    
    // 使用HTTP请求（应该被拒绝或重定向）
    httpResp := callHTTPAPI("POST", "http://tuangou.com/api/login", loginData)
    assert.True(t, httpResp.StatusCode == 301 || httpResp.StatusCode == 302, 
        "HTTP请求应被重定向到HTTPS")
    
    // 使用HTTPS请求
    httpsResp := callHTTPSAPI("POST", "https://tuangou.com/api/login", loginData)
    assert.Equal(t, 200, httpsResp.StatusCode, "HTTPS登录请求应该成功")
    
    // 验证响应中没有敏感信息泄露
    body := getResponseBody(httpsResp)
    assert.NotContains(t, body, "password", "响应不应包含密码")
    assert.NotContains(t, body, "MySecure@Pass123", "响应不应包含明文密码")
    
    // 验证传输过程中的加密
    // 通过网络抓包工具验证数据已加密（手工验证）
}
```

## 🛡️ 安全测试工具配置

### 自动化安全测试工具
```yaml
安全测试工具链:
  静态代码分析:
    - SonarQube: 代码安全漏洞扫描
    - Checkmarx: 商业级安全代码扫描
    - Semgrep: 开源安全规则引擎
    
  动态安全测试:
    - OWASP ZAP: Web应用安全扫描
    - Burp Suite: 专业渗透测试工具
    - Nessus: 漏洞扫描器
    
  依赖库安全:
    - npm audit: Node.js依赖安全检查
    - go mod security: Go模块安全扫描
    - Snyk: 多语言依赖安全检查
    
  网络安全测试:
    - Nmap: 端口扫描和服务检测
    - SSLyze: SSL/TLS配置检查
    - Nikto: Web服务器安全扫描
```

### 安全测试环境
```yaml
安全测试环境配置:
  隔离环境:
    - 独立网络环境
    - 模拟生产数据（脱敏）
    - 完整安全配置复制
    
  监控设置:
    - 安全事件日志收集
    - 攻击行为实时监控
    - 异常访问告警
    
  测试数据:
    - 攻击载荷库
    - 恶意文件样本
    - 测试用户账号
```

## 📊 安全测试验收标准

### 安全防护验收标准
- ✅ **身份认证**: 100%防止未授权访问
- ✅ **权限控制**: 100%防止越权操作
- ✅ **输入验证**: 100%防护SQL注入、XSS攻击
- ✅ **业务安全**: 100%防止业务逻辑绕过
- ✅ **数据保护**: 敏感数据100%加密传输和存储

### 合规性验收标准
- ✅ **网络安全法**: 符合国家网络安全法要求
- ✅ **个人信息保护**: 符合个人信息保护法要求
- ✅ **行业标准**: 符合电商行业安全标准
- ✅ **国际标准**: 参考OWASP Top 10安全风险

### 安全事件响应验收
- ✅ **检测能力**: 异常访问5分钟内检测
- ✅ **响应速度**: 安全事件15分钟内响应
- ✅ **处置能力**: 恶意攻击自动阻断
- ✅ **恢复能力**: 系统30分钟内恢复正常

## 🔧 安全加固建议

### 应用层安全加固
```go
// 安全配置示例
type SecurityConfig struct {
    // JWT配置
    JWTSecret     string        `yaml:"jwt_secret"`
    JWTExpiry     time.Duration `yaml:"jwt_expiry"`
    
    // 密码策略
    MinPasswordLength int  `yaml:"min_password_length"`
    RequireUppercase  bool `yaml:"require_uppercase"`
    RequireLowercase  bool `yaml:"require_lowercase"`
    RequireNumbers    bool `yaml:"require_numbers"`
    RequireSymbols    bool `yaml:"require_symbols"`
    
    // 登录安全
    MaxLoginAttempts  int           `yaml:"max_login_attempts"`
    LockoutDuration   time.Duration `yaml:"lockout_duration"`
    
    // 会话安全
    SessionTimeout    time.Duration `yaml:"session_timeout"`
    MaxConcurrentSessions int       `yaml:"max_concurrent_sessions"`
}

// 安全中间件
func SecurityMiddleware() gin.HandlerFunc {
    return gin.HandlerFunc(func(c *gin.Context) {
        // 设置安全头部
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        
        // CSRF防护
        if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "DELETE" {
            csrfToken := c.GetHeader("X-CSRF-Token")
            if !validateCSRFToken(csrfToken, c) {
                c.JSON(403, gin.H{"error": "Invalid CSRF token"})
                c.Abort()
                return
            }
        }
        
        c.Next()
    })
}
```

### 数据库安全加固
```sql
-- 数据库安全配置
-- 1. 创建专用数据库用户
CREATE USER 'tuangou_app'@'%' IDENTIFIED BY 'ComplexPassword123!@#';

-- 2. 最小权限原则
GRANT SELECT, INSERT, UPDATE, DELETE ON tuangou.* TO 'tuangou_app'@'%';
REVOKE ALL PRIVILEGES ON mysql.* FROM 'tuangou_app'@'%';

-- 3. 敏感字段加密
ALTER TABLE sys_user ADD COLUMN phone_encrypted VARBINARY(255);
ALTER TABLE sys_user ADD COLUMN email_encrypted VARBINARY(255);

-- 4. 审计日志配置
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'TABLE';

-- 5. 安全配置参数
SET GLOBAL validate_password_policy = 'STRONG';
SET GLOBAL validate_password_length = 12;
```

### 网络安全加固
```yaml
网络安全配置:
  防火墙规则:
    - 只开放必要端口: 80, 443, 22(限制IP)
    - 禁止不必要服务端口
    - 设置访问频率限制
    
  DDoS防护:
    - 使用CDN分发
    - 限制单IP请求频率
    - 异常流量自动阻断
    
  网络监控:
    - 实时流量监控
    - 异常访问检测
    - 攻击来源追踪
```

---

**文档版本**: v1.0  
**创建日期**: 2025-08-05  
**负责人**: Claude  
**审核状态**: 待审核  
**关联任务**: 508.2 (系统ID: 583)  
**项目编号**: 34 (李宁团购管理平台)
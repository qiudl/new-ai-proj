# Android App AI功能安全审查清单

## 概述

本文档提供Android App AI功能的全面安全审查清单，确保数据传输、存储和处理的安全性。

## 审查范围

- 数据传输安全
- 数据存储安全
- 认证和授权
- API安全
- 客户端安全
- 隐私保护
- 第三方依赖安全

---

## 1. 数据传输安全

### ✅ HTTPS配置

- [ ] **强制使用HTTPS**: 所有API请求必须使用HTTPS
  ```kotlin
  // OkHttpClient配置
  OkHttpClient.Builder()
      .connectionSpecs(listOf(ConnectionSpec.MODERN_TLS))
      .build()
  ```

- [ ] **证书固定 (Certificate Pinning)**: 防止中间人攻击
  ```kotlin
  val certificatePinner = CertificatePinner.Builder()
      .add("proj.joylodging.com", "sha256/AAAAAAAAAA...")
      .build()

  OkHttpClient.Builder()
      .certificatePinner(certificatePinner)
      .build()
  ```

- [ ] **TLS版本**: 最低使用TLS 1.2
  ```kotlin
  ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
      .tlsVersions(TlsVersion.TLS_1_2, TlsVersion.TLS_1_3)
      .build()
  ```

- [ ] **禁用明文流量**: AndroidManifest.xml配置
  ```xml
  <application
      android:usesCleartextTraffic="false"
      android:networkSecurityConfig="@xml/network_security_config">
  ```

### ✅ 网络安全配置

- [ ] **network_security_config.xml**:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <network-security-config>
      <base-config cleartextTrafficPermitted="false">
          <trust-anchors>
              <certificates src="system" />
          </trust-anchors>
      </base-config>
      <domain-config cleartextTrafficPermitted="false">
          <domain includeSubdomains="true">proj.joylodging.com</domain>
          <pin-set expiration="2026-01-01">
              <pin digest="SHA-256">base64==</pin>
              <!-- backup pin -->
              <pin digest="SHA-256">backup-base64==</pin>
          </pin-set>
      </domain-config>
  </network-security-config>
  ```

- [ ] **验证服务器证书**: OkHttp自动验证，但需确保证书有效
- [ ] **防止SSL剥离攻击**: 使用HSTS (HTTP Strict Transport Security)

### ✅ 敏感数据传输

- [ ] **JWT Token加密传输**: 在Authorization header中传输
  ```kotlin
  class AuthInterceptor @Inject constructor(
      private val tokenManager: TokenManager
  ) : Interceptor {
      override fun intercept(chain: Interceptor.Chain): Response {
          val token = tokenManager.getToken()
          val request = chain.request().newBuilder()
              .addHeader("Authorization", "Bearer $token")
              .build()
          return chain.proceed(request)
      }
  }
  ```

- [ ] **不在URL中传递敏感信息**: 使用POST body而非GET参数
- [ ] **API Key保护**: 不在客户端硬编码API密钥

---

## 2. 数据存储安全

### ✅ EncryptedSharedPreferences

- [ ] **Token存储**: 使用EncryptedSharedPreferences
  ```kotlin
  class TokenManager @Inject constructor(
      @ApplicationContext private val context: Context
  ) {
      private val sharedPreferences = EncryptedSharedPreferences.create(
          "auth_prefs",
          MasterKey.DEFAULT_MASTER_KEY_ALIAS,
          context,
          EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
          EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
      )

      fun saveToken(token: String) {
          sharedPreferences.edit()
              .putString("jwt_token", token)
              .apply()
      }
  }
  ```

- [ ] **密码/凭证存储**: 使用EncryptedSharedPreferences
- [ ] **API密钥存储**: 使用EncryptedSharedPreferences或Android Keystore

### ✅ 数据库安全

- [ ] **SQLCipher加密**: 如果使用Room数据库
  ```kotlin
  Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
      .openHelperFactory(SupportFactory(SQLiteDatabase.getBytes(passphrase)))
      .build()
  ```

- [ ] **敏感数据加密**: 在存储前加密敏感字段
- [ ] **数据库文件权限**: 确保只有应用可访问

### ✅ 文件存储安全

- [ ] **私有存储**: 使用app私有目录 (`context.filesDir`)
- [ ] **文件加密**: 敏感文件需加密存储
  ```kotlin
  val masterKey = MasterKey.Builder(context)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build()

  val encryptedFile = EncryptedFile.Builder(
      context,
      File(context.filesDir, "sensitive.txt"),
      masterKey,
      EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
  ).build()

  // 写入加密数据
  encryptedFile.openFileOutput().use { output ->
      output.write(data)
  }
  ```

- [ ] **缓存清理**: 及时清理敏感数据缓存
- [ ] **外部存储避免**: 不在外部存储保存敏感数据

### ✅ 内存安全

- [ ] **敏感数据清零**: 使用后及时清除
  ```kotlin
  val password = CharArray(128)
  try {
      // 使用password
  } finally {
      password.fill('\u0000') // 清零
  }
  ```

- [ ] **避免日志泄露**: 不在日志中打印敏感信息
  ```kotlin
  // ❌ 错误
  Log.d("Auth", "Token: $token")

  // ✅ 正确
  if (BuildConfig.DEBUG) {
      Log.d("Auth", "Token: ${token.take(10)}...")
  }
  ```

- [ ] **防止内存转储攻击**: 使用FLAG_SECURE防止截屏
  ```kotlin
  window.setFlags(
      WindowManager.LayoutParams.FLAG_SECURE,
      WindowManager.LayoutParams.FLAG_SECURE
  )
  ```

---

## 3. 认证和授权

### ✅ JWT Token管理

- [ ] **Token安全存储**: 使用EncryptedSharedPreferences ✓
- [ ] **Token过期处理**: 自动刷新或重新登录
  ```kotlin
  class AuthRepository {
      suspend fun refreshToken(): Result<TokenResponse> {
          val refreshToken = tokenManager.getRefreshToken()
          return try {
              val response = api.refreshToken(RefreshTokenRequest(refreshToken))
              if (response.isSuccessful) {
                  response.body()?.data?.let { token ->
                      tokenManager.saveToken(token.accessToken)
                      tokenManager.saveRefreshToken(token.refreshToken)
                      Result.success(token)
                  } ?: Result.failure(Exception("Empty token"))
              } else {
                  Result.failure(Exception("Refresh failed"))
              }
          } catch (e: Exception) {
              Result.failure(e)
          }
      }
  }
  ```

- [ ] **Token传输安全**: 仅通过Authorization header传输 ✓
- [ ] **Token撤销机制**: 退出登录时清除token并通知服务器

### ✅ 生物识别认证

- [ ] **BiometricPrompt配置**:
  ```kotlin
  val promptInfo = BiometricPrompt.PromptInfo.Builder()
      .setTitle("验证身份")
      .setSubtitle("使用生物识别登录")
      .setNegativeButtonText("使用密码")
      .setAllowedAuthenticators(
          BiometricManager.Authenticators.BIOMETRIC_STRONG or
          BiometricManager.Authenticators.DEVICE_CREDENTIAL
      )
      .build()
  ```

- [ ] **密钥存储**: 生物识别密钥存储在Android Keystore
- [ ] **降级方案**: 生物识别失败时提供密码登录

### ✅ 会话管理

- [ ] **自动登出**: 长时间不活跃自动登出
  ```kotlin
  class SessionManager {
      private val timeout = 30 * 60 * 1000L // 30分钟
      private var lastActivityTime = System.currentTimeMillis()

      fun updateActivity() {
          lastActivityTime = System.currentTimeMillis()
      }

      fun isSessionExpired(): Boolean {
          return System.currentTimeMillis() - lastActivityTime > timeout
      }
  }
  ```

- [ ] **强制单设备登录**: 可选配置
- [ ] **异常登录检测**: 检测异常IP或设备

---

## 4. API安全

### ✅ 请求验证

- [ ] **CSRF防护**: 对于写操作使用CSRF token
- [ ] **重放攻击防护**: 使用timestamp和nonce
  ```kotlin
  val timestamp = System.currentTimeMillis()
  val nonce = UUID.randomUUID().toString()

  request.newBuilder()
      .addHeader("X-Timestamp", timestamp.toString())
      .addHeader("X-Nonce", nonce)
      .build()
  ```

- [ ] **请求签名**: 对关键API使用签名验证
- [ ] **Rate Limiting**: 客户端限制请求频率
  ```kotlin
  class RateLimiter {
      private val requests = mutableListOf<Long>()
      private val maxRequests = 10
      private val timeWindow = 60000L // 1分钟

      fun allowRequest(): Boolean {
          val now = System.currentTimeMillis()
          requests.removeAll { it < now - timeWindow }
          return if (requests.size < maxRequests) {
              requests.add(now)
              true
          } else {
              false
          }
      }
  }
  ```

### ✅ 响应验证

- [ ] **验证响应完整性**: 检查签名或checksum
- [ ] **防止XSS**: 对HTML内容进行转义
- [ ] **防止注入攻击**: 验证和净化服务器返回的数据

### ✅ 错误处理

- [ ] **不泄露敏感信息**: 错误消息不包含内部细节
  ```kotlin
  // ❌ 错误
  catch (e: Exception) {
      showError("Database error: ${e.stackTrace}")
  }

  // ✅ 正确
  catch (e: Exception) {
      Log.e("Error", "Database error", e)
      showError("操作失败，请稍后重试")
  }
  ```

- [ ] **统一错误处理**: 使用拦截器处理通用错误
- [ ] **错误日志记录**: 仅在debug模式详细记录

---

## 5. 客户端安全

### ✅ 代码混淆

- [ ] **ProGuard/R8配置**: 发布版本启用混淆
  ```gradle
  buildTypes {
      release {
          isMinifyEnabled = true
          isShrinkResources = true
          proguardFiles(
              getDefaultProguardFile("proguard-android-optimize.txt"),
              "proguard-rules.pro"
          )
      }
  }
  ```

- [ ] **关键逻辑保护**: 重要算法和密钥生成逻辑混淆
- [ ] **字符串加密**: 敏感字符串不明文存储在APK中

### ✅ Root检测

- [ ] **Root检测实现**:
  ```kotlin
  class RootDetector {
      fun isDeviceRooted(): Boolean {
          return checkBuildTags() ||
                 checkSuperUserApk() ||
                 checkSuBinary() ||
                 checkRWPaths()
      }

      private fun checkSuperUserApk(): Boolean {
          val packages = listOf(
              "com.noshufou.android.su",
              "com.thirdparty.superuser",
              "eu.chainfire.supersu",
              "com.koushikdutta.superuser"
          )
          return packages.any { isPackageInstalled(it) }
      }
  }
  ```

- [ ] **Root设备警告**: 检测到root时警告用户
- [ ] **限制功能**: 可选择限制敏感功能在root设备上使用

### ✅ 调试检测

- [ ] **防调试**:
  ```kotlin
  if (BuildConfig.DEBUG || isDebuggerAttached()) {
      // 调试模式
  } else {
      // 生产模式
      if (isDebuggerAttached()) {
          // 检测到调试器，退出
          exitProcess(0)
      }
  }

  private fun isDebuggerAttached(): Boolean {
      return Debug.isDebuggerConnected() ||
             Debug.waitingForDebugger()
  }
  ```

- [ ] **移除Debug日志**: Release版本移除所有debug日志

### ✅ 组件导出

- [ ] **最小化导出**: 只导出必要的组件
  ```xml
  <activity
      android:name=".MainActivity"
      android:exported="true">
      <!-- Intent filters only if needed -->
  </activity>

  <activity
      android:name=".InternalActivity"
      android:exported="false">
  </activity>
  ```

- [ ] **权限保护**: 导出组件使用权限保护
  ```xml
  <service
      android:name=".MyService"
      android:exported="true"
      android:permission="com.aiproj.mobile.permission.ACCESS_SERVICE">
  </service>
  ```

---

## 6. 隐私保护

### ✅ 数据收集

- [ ] **最小化收集**: 只收集必要的用户数据
- [ ] **用户同意**: 收集前获得用户明确同意
- [ ] **隐私政策**: 提供清晰的隐私政策
  ```kotlin
  // 首次启动时显示
  if (!preferencesManager.hasAcceptedPrivacyPolicy()) {
      showPrivacyPolicyDialog {
          preferencesManager.setPrivacyPolicyAccepted(true)
      }
  }
  ```

- [ ] **数据删除**: 提供账户和数据删除功能

### ✅ 数据使用

- [ ] **AI处理安全**: 确保AI API不存储用户数据
- [ ] **第三方分享**: 明确告知用户哪些数据会分享给第三方
- [ ] **匿名化**: 分析数据时进行匿名化处理

### ✅ 权限管理

- [ ] **运行时权限**: 使用新的权限模型
  ```kotlin
  val permissionLauncher = rememberLauncherForActivityResult(
      ActivityResultContracts.RequestPermission()
  ) { isGranted ->
      if (isGranted) {
          // Permission granted
      } else {
          // Permission denied
      }
  }
  ```

- [ ] **权限说明**: 请求前说明为什么需要权限
- [ ] **最小权限**: 只请求必需的权限
  ```xml
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.USE_BIOMETRIC" />
  <!-- 避免不必要的权限 -->
  ```

---

## 7. 第三方依赖安全

### ✅ 依赖审查

- [ ] **已知漏洞检查**: 使用Dependency Check工具
  ```bash
  ./gradlew dependencyCheckAnalyze
  ```

- [ ] **最新版本**: 保持依赖库更新到安全版本
- [ ] **最小依赖**: 只引入必要的第三方库
- [ ] **官方来源**: 只从官方仓库下载依赖

### ✅ 关键依赖

当前使用的关键依赖及安全考虑:

- [ ] **Retrofit 2.9.0**: 网络请求，检查是否有已知漏洞
- [ ] **OkHttp 4.12.0**: HTTP客户端，配置安全参数 ✓
- [ ] **Hilt 2.50**: 依赖注入，官方库相对安全
- [ ] **Room**: 本地数据库，考虑启用加密
- [ ] **Coil**: 图片加载，检查HTTPS图片加载
- [ ] **Firebase**: 确保配置文件不泄露
- [ ] **Markwon**: Markdown渲染，防止XSS

---

## 8. 安全测试

### ✅ 静态分析

- [ ] **Android Lint**: 运行lint检查
  ```bash
  ./gradlew lint
  ```

- [ ] **FindBugs/SpotBugs**: 检测潜在bug
- [ ] **SonarQube**: 代码质量和安全分析

### ✅ 动态分析

- [ ] **OWASP ZAP**: API安全测试
- [ ] **MobSF**: 移动应用安全框架
- [ ] **Burp Suite**: 拦截和分析流量

### ✅ 渗透测试

- [ ] **Root绕过测试**: 测试root检测是否有效
- [ ] **SSL Pinning绕过**: 测试证书固定
- [ ] **数据提取**: 尝试从设备提取敏感数据
- [ ] **逆向工程**: 尝试反编译和分析APK

---

## 安全审查清单总结

### 必须修复 (P0)
- [ ] 所有API使用HTTPS
- [ ] Token使用EncryptedSharedPreferences存储
- [ ] 生产环境启用代码混淆
- [ ] 移除所有debug日志
- [ ] 配置certificate pinning

### 强烈建议 (P1)
- [ ] 实现session过期机制
- [ ] 添加root检测
- [ ] 配置network security config
- [ ] 使用FLAG_SECURE防截屏
- [ ] 实现请求rate limiting

### 建议优化 (P2)
- [ ] 启用数据库加密
- [ ] 实现请求签名
- [ ] 添加异常登录检测
- [ ] 定期进行安全审计
- [ ] 建立漏洞响应流程

---

## 安全事件响应

### 发现安全问题时的处理流程

1. **评估严重程度**: P0/P1/P2/P3
2. **立即缓解**: 如果是严重问题，立即下架或发布hotfix
3. **根因分析**: 分析问题原因和影响范围
4. **修复实施**: 开发并测试修复方案
5. **发布更新**: 紧急发布安全更新
6. **用户通知**: 如果涉及数据泄露，通知受影响用户
7. **总结改进**: 复盘并改进安全流程

---

## 定期安全审查

- **每月**: 依赖库安全更新检查
- **每季度**: 全面安全审计
- **每半年**: 第三方渗透测试
- **发布前**: 完整安全检查清单review

## 总结

安全是一个持续的过程，需要:
1. 开发阶段就考虑安全
2. 定期进行安全审查
3. 及时更新安全补丁
4. 建立安全响应机制
5. 培养团队安全意识

通过以上安全措施，确保用户数据和隐私得到充分保护。

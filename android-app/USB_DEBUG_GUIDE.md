# Android 物理设备调试指南

## 1. 启用 USB 调试

### Android 设备设置步骤

1. **打开开发者选项**
   - 进入 **设置 > 关于手机**
   - 连续点击 **版本号** 7次
   - 提示 "您已处于开发者模式"

2. **启用 USB 调试**
   - 返回设置主页
   - 进入 **系统 > 开发者选项**
   - 启用 **USB 调试**
   - （可选）启用 **USB 安装** - 允许通过USB安装应用

3. **连接电脑**
   - 使用 USB 数据线连接手机和电脑
   - 手机上会弹出 "允许 USB 调试吗？"
   - 勾选 "始终允许使用这台计算机进行调试"
   - 点击 **允许**

## 2. 验证 ADB 连接

### 检查 ADB 是否可用

```bash
# 检查 ADB 版本
adb version

# 列出已连接的设备
adb devices

# 应该显示类似输出：
# List of devices attached
# 1234567890ABCDEF    device
```

### 如果 ADB 不可用

**macOS (使用 Homebrew)**
```bash
brew install android-platform-tools
```

**Windows**
- 下载 Android SDK Platform Tools
- 添加到系统 PATH 环境变量

**Linux**
```bash
sudo apt-get install android-tools-adb
```

## 3. 常用 ADB 命令

### 设备管理
```bash
# 列出所有设备
adb devices

# 重启 ADB 服务
adb kill-server
adb start-server

# 查看设备信息
adb shell getprop ro.build.version.release  # Android 版本
adb shell getprop ro.product.model           # 设备型号
```

### 应用管理
```bash
# 安装 APK
adb install app-debug.apk

# 卸载应用
adb uninstall com.aiproj.mobile

# 查看应用日志
adb logcat | grep "com.aiproj.mobile"

# 清除应用数据
adb shell pm clear com.aiproj.mobile
```

### 文件传输
```bash
# 从设备拉取文件
adb pull /sdcard/Download/file.txt ./

# 推送文件到设备
adb push ./file.txt /sdcard/Download/
```

## 4. Android Studio 调试

### 运行应用到真机

1. **选择设备**
   - 点击工具栏的设备下拉菜单
   - 选择已连接的物理设备（如 "Pixel 6"）

2. **运行应用**
   - 点击绿色 **Run** 按钮（或 Shift+F10）
   - 应用会自动安装到设备并启动

3. **调试模式**
   - 点击绿色 **Debug** 按钮（或 Shift+F9）
   - 可以设置断点、查看变量等

### Logcat 查看日志

1. 打开 **Logcat** 窗口（View > Tool Windows > Logcat）
2. 选择设备和应用进程
3. 使用过滤器查看特定日志：
   - `tag:FCM` - 查看 FCM 日志
   - `tag:Hilt` - 查看 Hilt 依赖注入日志
   - `level:error` - 只显示错误日志

## 5. 常见问题

### 设备未识别

**问题**: `adb devices` 显示 `unauthorized` 或不显示设备

**解决**:
1. 拔掉 USB 线重新连接
2. 手机上点击 "允许 USB 调试"
3. 重启 ADB: `adb kill-server && adb start-server`
4. 检查 USB 线是否支持数据传输（不是充电线）

### 安装失败

**问题**: `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

**解决**:
```bash
# 完全卸载旧版本
adb uninstall com.aiproj.mobile

# 重新安装
adb install app-debug.apk
```

### 网络配置

**问题**: 真机无法连接到本地开发服务器

**解决**:
1. 确保手机和电脑在同一局域网
2. 使用电脑的局域网 IP 替代 localhost
3. 修改 `build.gradle.kts` 中的 `API_BASE_URL`：
   ```kotlin
   buildConfigField("String", "API_BASE_URL", "\"http://192.168.1.100:8080/api/v1\"")
   ```
4. 重新构建并安装应用

### 权限问题

**问题**: 应用权限被拒绝

**解决**:
```bash
# 手动授予权限
adb shell pm grant com.aiproj.mobile android.permission.CAMERA
adb shell pm grant com.aiproj.mobile android.permission.POST_NOTIFICATIONS
```

## 6. 性能分析

### 使用 Android Profiler

1. 在 Android Studio 中运行应用（调试模式）
2. 打开 **View > Tool Windows > Profiler**
3. 选择设备和应用进程
4. 监控：
   - CPU 使用率
   - 内存占用
   - 网络请求
   - 电量消耗

### 检测内存泄漏

1. 安装 LeakCanary（已在项目中配置）
2. 运行应用到真机
3. LeakCanary 会自动检测并通知内存泄漏

## 7. 调试技巧

### 1. 使用断点调试
- 在代码行号左侧点击设置断点
- Debug 模式运行
- 应用暂停在断点处，可查看变量值

### 2. 远程调试
```bash
# 启用无线调试（Android 11+）
adb tcpip 5555
adb connect <设备IP>:5555
```

### 3. 查看崩溃堆栈
```bash
# 实时查看崩溃日志
adb logcat | grep -E 'AndroidRuntime|FATAL'
```

## 8. 下一步

配置完 USB 调试后，可以：
1. 运行应用到真机测试所有功能
2. 测试生物识别功能（模拟器不支持）
3. 测试推送通知
4. 进行性能分析和优化
5. 准备打包签名 APK 并发布

package com.aiproj.mobile.ui.screens.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiproj.mobile.data.models.User
import com.aiproj.mobile.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 登录页面 ViewModel
 */
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val credentialsManager: com.aiproj.mobile.data.local.CredentialsManager,
    private val biometricManager: com.aiproj.mobile.utils.BiometricManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    /**
     * 用户名输入变化
     */
    fun onUsernameChanged(username: String) {
        _uiState.update { it.copy(username = username, error = null) }
    }

    /**
     * 密码输入变化
     */
    fun onPasswordChanged(password: String) {
        _uiState.update { it.copy(password = password, error = null) }
    }

    /**
     * 记住我复选框变化
     */
    fun onRememberMeChanged(rememberMe: Boolean) {
        _uiState.update { it.copy(rememberMe = rememberMe) }
    }

    /**
     * 执行登录
     */
    fun login() {
        val username = _uiState.value.username.trim()
        val password = _uiState.value.password

        // 验证输入
        if (username.isEmpty()) {
            _uiState.update { it.copy(error = "请输入用户名") }
            return
        }

        if (password.isEmpty()) {
            _uiState.update { it.copy(error = "请输入密码") }
            return
        }

        // 开始登录
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = authRepository.login(username, password)

            result.onSuccess { loginResponse ->
                // 如果勾选了"记住我"，保存凭据用于生物识别
                if (_uiState.value.rememberMe && biometricManager.isBiometricAvailable()) {
                    credentialsManager.saveBiometricCredentials(username, password)
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        loginSuccess = true,
                        user = loginResponse.user
                    )
                }
            }

            result.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "登录失败，请重试"
                    )
                }
            }
        }
    }

    /**
     * 使用生物识别登录
     */
    fun loginWithBiometric() {
        // 检查设备是否支持生物识别
        if (!biometricManager.isBiometricAvailable()) {
            _uiState.update {
                it.copy(error = "设备不支持生物识别或未设置生物识别")
            }
            return
        }

        _uiState.update { it.copy(showBiometricPrompt = true) }
    }

    /**
     * 显示生物识别对话框
     */
    fun showBiometricDialog(activity: androidx.fragment.app.FragmentActivity) {
        biometricManager.showBiometricPrompt(
            activity = activity,
            title = "生物识别登录",
            subtitle = "使用指纹或面部识别",
            onSuccess = { onBiometricSuccess() },
            onError = { error -> onBiometricError(error) }
        )
    }

    /**
     * 生物识别提示已显示（重置状态）
     */
    fun onBiometricPromptShown() {
        _uiState.update { it.copy(showBiometricPrompt = false) }
    }

    /**
     * 生物识别认证成功
     */
    fun onBiometricSuccess() {
        _uiState.update { it.copy(showBiometricPrompt = false) }

        // 从安全存储获取保存的用户名密码，然后自动登录
        viewModelScope.launch {
            val credentials = credentialsManager.getSavedCredentials()
            if (credentials != null) {
                val (username, password) = credentials
                _uiState.update {
                    it.copy(username = username, password = password)
                }
                login()
            } else {
                _uiState.update {
                    it.copy(error = "未找到保存的凭据，请先使用用户名密码登录")
                }
            }
        }
    }

    /**
     * 生物识别认证失败
     */
    fun onBiometricError(error: String) {
        _uiState.update {
            it.copy(
                showBiometricPrompt = false,
                error = "生物识别失败: $error"
            )
        }
    }

    /**
     * 清除错误信息
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

/**
 * 登录页面 UI 状态
 */
data class LoginUiState(
    val username: String = "",
    val password: String = "",
    val rememberMe: Boolean = false,
    val isLoading: Boolean = false,
    val loginSuccess: Boolean = false,
    val error: String? = null,
    val user: User? = null,
    val showBiometricPrompt: Boolean = false
)

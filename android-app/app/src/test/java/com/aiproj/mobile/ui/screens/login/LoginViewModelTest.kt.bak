package com.aiproj.mobile.ui.screens.login

import com.aiproj.mobile.data.local.CredentialsManager
import com.aiproj.mobile.data.models.LoginResponse
import com.aiproj.mobile.data.models.User
import com.aiproj.mobile.data.repository.AuthRepository
import com.aiproj.mobile.utils.BiometricManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * LoginViewModel 单元测试
 */
@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {

    private lateinit var viewModel: LoginViewModel
    private lateinit var authRepository: AuthRepository
    private lateinit var credentialsManager: CredentialsManager
    private lateinit var biometricManager: BiometricManager

    private val testDispatcher = StandardTestDispatcher()

    private val testUser = User(
        id = 1,
        username = "admin",
        email = "admin@test.com",
        displayName = "Administrator",
        avatarUrl = null,
        role = "admin",
        createdAt = null,
        updatedAt = null
    )

    private val testLoginResponse = LoginResponse(
        token = "test_token_123",
        refreshToken = "refresh_token_123",
        user = testUser,
        expiresAt = "2025-10-05T10:00:00Z",
        expiresIn = 3600
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)

        authRepository = mockk()
        credentialsManager = mockk(relaxed = true)
        biometricManager = mockk()

        viewModel = LoginViewModel(
            authRepository = authRepository,
            credentialsManager = credentialsManager,
            biometricManager = biometricManager
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `login with valid credentials should succeed`() = runTest {
        // Given
        val username = "admin"
        val password = "password123"

        coEvery {
            authRepository.login(username, password)
        } returns Result.success(testLoginResponse)

        // When
        viewModel.onUsernameChanged(username)
        viewModel.onPasswordChanged(password)
        viewModel.login()

        advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertTrue(uiState.loginSuccess)
        assertEquals(testUser, uiState.user)
        assertFalse(uiState.isLoading)
        assertEquals(null, uiState.error)
    }

    @Test
    fun `login with empty username should show error`() = runTest {
        // Given
        viewModel.onUsernameChanged("")
        viewModel.onPasswordChanged("password123")

        // When
        viewModel.login()
        advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertFalse(uiState.loginSuccess)
        assertEquals("请输入用户名", uiState.error)
        assertFalse(uiState.isLoading)
    }

    @Test
    fun `login with empty password should show error`() = runTest {
        // Given
        viewModel.onUsernameChanged("admin")
        viewModel.onPasswordChanged("")

        // When
        viewModel.login()
        advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertFalse(uiState.loginSuccess)
        assertEquals("请输入密码", uiState.error)
        assertFalse(uiState.isLoading)
    }

    @Test
    fun `login with network error should show error message`() = runTest {
        // Given
        val username = "admin"
        val password = "password123"
        val errorMessage = "网络连接失败"

        coEvery {
            authRepository.login(username, password)
        } returns Result.failure(Exception(errorMessage))

        // When
        viewModel.onUsernameChanged(username)
        viewModel.onPasswordChanged(password)
        viewModel.login()

        advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertFalse(uiState.loginSuccess)
        assertEquals(errorMessage, uiState.error)
        assertFalse(uiState.isLoading)
    }

    @Test
    fun `remember me should save credentials for biometric when enabled`() = runTest {
        // Given
        val username = "admin"
        val password = "password123"

        coEvery {
            authRepository.login(username, password)
        } returns Result.success(testLoginResponse)

        every { biometricManager.isBiometricAvailable() } returns true
        every { credentialsManager.saveBiometricCredentials(any(), any()) } just runs

        // When
        viewModel.onUsernameChanged(username)
        viewModel.onPasswordChanged(password)
        viewModel.onRememberMeChanged(true)
        viewModel.login()

        advanceUntilIdle()

        // Then
        coVerify { credentialsManager.saveBiometricCredentials(username, password) }
    }

    @Test
    fun `remember me should not save credentials when biometric unavailable`() = runTest {
        // Given
        val username = "admin"
        val password = "password123"

        coEvery {
            authRepository.login(username, password)
        } returns Result.success(testLoginResponse)

        every { biometricManager.isBiometricAvailable() } returns false

        // When
        viewModel.onUsernameChanged(username)
        viewModel.onPasswordChanged(password)
        viewModel.onRememberMeChanged(true)
        viewModel.login()

        advanceUntilIdle()

        // Then
        coVerify(exactly = 0) { credentialsManager.saveBiometricCredentials(any(), any()) }
    }

    @Test
    fun `biometric login with saved credentials should succeed`() = runTest {
        // Given
        val username = "admin"
        val password = "password123"

        every { credentialsManager.getSavedCredentials() } returns Pair(username, password)

        coEvery {
            authRepository.login(username, password)
        } returns Result.success(testLoginResponse)

        // When
        viewModel.onBiometricSuccess()
        advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertTrue(uiState.loginSuccess)
        assertEquals(username, uiState.username)
        assertEquals(password, uiState.password)
    }

    @Test
    fun `biometric login without saved credentials should show error`() = runTest {
        // Given
        every { credentialsManager.getSavedCredentials() } returns null

        // When
        viewModel.onBiometricSuccess()
        advanceUntilIdle()

        // Then
        val uiState = viewModel.uiState.value
        assertFalse(uiState.loginSuccess)
        assertEquals("未找到保存的凭据，请先使用用户名密码登录", uiState.error)
    }

    @Test
    fun `onUsernameChanged should update username and clear error`() = runTest {
        // Given
        val username = "testuser"

        // When
        viewModel.onUsernameChanged(username)

        // Then
        val uiState = viewModel.uiState.value
        assertEquals(username, uiState.username)
        assertEquals(null, uiState.error)
    }

    @Test
    fun `onPasswordChanged should update password and clear error`() = runTest {
        // Given
        val password = "testpassword"

        // When
        viewModel.onPasswordChanged(password)

        // Then
        val uiState = viewModel.uiState.value
        assertEquals(password, uiState.password)
        assertEquals(null, uiState.error)
    }

    @Test
    fun `onRememberMeChanged should update rememberMe state`() = runTest {
        // When
        viewModel.onRememberMeChanged(true)

        // Then
        assertTrue(viewModel.uiState.value.rememberMe)

        // When
        viewModel.onRememberMeChanged(false)

        // Then
        assertFalse(viewModel.uiState.value.rememberMe)
    }

    @Test
    fun `clearError should clear error message`() = runTest {
        // Given - 先设置一个错误
        viewModel.onUsernameChanged("")
        viewModel.login()
        advanceUntilIdle()

        // 验证有错误
        assertEquals("请输入用户名", viewModel.uiState.value.error)

        // When
        viewModel.clearError()

        // Then
        assertEquals(null, viewModel.uiState.value.error)
    }

    @Test
    fun `login should show loading state during network request`() = runTest {
        // Given
        val username = "admin"
        val password = "password123"

        coEvery {
            authRepository.login(username, password)
        } coAnswers {
            kotlinx.coroutines.delay(100)
            Result.success(testLoginResponse)
        }

        // When
        viewModel.onUsernameChanged(username)
        viewModel.onPasswordChanged(password)
        viewModel.login()

        // Then - 登录过程中应该显示loading
        assertTrue(viewModel.uiState.value.isLoading)

        advanceUntilIdle()

        // Then - 登录完成后loading应该消失
        assertFalse(viewModel.uiState.value.isLoading)
    }
}

package com.aiproj.mobile.data.repository

import com.aiproj.mobile.data.api.AuthApi
import com.aiproj.mobile.data.api.TokenProvider
import com.aiproj.mobile.data.models.LoginRequest
import com.aiproj.mobile.data.models.LoginResponse
import com.aiproj.mobile.data.models.User
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Before
import org.junit.Test
import retrofit2.Response
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * AuthRepository 单元测试
 */
class AuthRepositoryTest {

    private lateinit var repository: AuthRepository
    private lateinit var authApi: AuthApi
    private lateinit var tokenProvider: TokenProvider

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
        authApi = mockk()
        tokenProvider = mockk(relaxed = true)
        repository = AuthRepository(authApi, tokenProvider)
    }

    @Test
    fun `login with valid credentials should return success`() = runTest {
        // Given
        val username = "admin"
        val password = "password123"
        val request = LoginRequest(username, password)

        coEvery {
            authApi.login(request)
        } returns Response.success(testLoginResponse)

        // When
        val result = repository.login(username, password)

        // Then
        assertTrue(result.isSuccess)
        assertEquals(testLoginResponse, result.getOrNull())
        coVerify { tokenProvider.saveToken(testLoginResponse.token) }
    }

    @Test
    fun `login with invalid credentials should return failure`() = runTest {
        // Given
        val username = "admin"
        val password = "wrongpassword"
        val request = LoginRequest(username, password)
        val errorBody = "{\"error\":\"Invalid credentials\"}".toResponseBody()

        coEvery {
            authApi.login(request)
        } returns Response.error(401, errorBody)

        // When
        val result = repository.login(username, password)

        // Then
        assertTrue(result.isFailure)
        coVerify(exactly = 0) { tokenProvider.saveToken(any()) }
    }

    @Test
    fun `login with network error should return failure`() = runTest {
        // Given
        val username = "admin"
        val password = "password123"
        val request = LoginRequest(username, password)

        coEvery {
            authApi.login(request)
        } throws Exception("Network error")

        // When
        val result = repository.login(username, password)

        // Then
        assertTrue(result.isFailure)
        assertEquals("Network error", result.exceptionOrNull()?.message)
    }

    @Test
    fun `getCurrentUser with valid token should return user`() = runTest {
        // Given
        coEvery {
            authApi.getCurrentUser()
        } returns Response.success(testUser)

        // When
        val result = repository.getCurrentUser()

        // Then
        assertTrue(result.isSuccess)
        assertEquals(testUser, result.getOrNull())
    }

    @Test
    fun `getCurrentUser with invalid token should return failure`() = runTest {
        // Given
        val errorBody = "{\"error\":\"Unauthorized\"}".toResponseBody()

        coEvery {
            authApi.getCurrentUser()
        } returns Response.error(401, errorBody)

        // When
        val result = repository.getCurrentUser()

        // Then
        assertTrue(result.isFailure)
    }

    @Test
    fun `logout should clear token and call API`() = runTest {
        // Given
        coEvery {
            authApi.logout()
        } returns Response.success(Unit)

        // When
        val result = repository.logout()

        // Then
        assertTrue(result.isSuccess)
        coVerify { authApi.logout() }
        coVerify { tokenProvider.clearToken() }
    }

    @Test
    fun `logout should clear token even if API call fails`() = runTest {
        // Given
        val errorBody = "Server error".toResponseBody()

        coEvery {
            authApi.logout()
        } returns Response.error(500, errorBody)

        // When
        val result = repository.logout()

        // Then
        assertTrue(result.isFailure)
        coVerify { tokenProvider.clearToken() }
    }

    @Test
    fun `logout should clear token even if network error occurs`() = runTest {
        // Given
        coEvery {
            authApi.logout()
        } throws Exception("Network error")

        // When
        val result = repository.logout()

        // Then
        assertTrue(result.isFailure)
        coVerify { tokenProvider.clearToken() }
    }

    @Test
    fun `isLoggedIn should return true when token exists`() = runTest {
        // Given
        coEvery {
            tokenProvider.getToken()
        } returns "test_token_123"

        // When
        val result = repository.isLoggedIn()

        // Then
        assertTrue(result)
    }

    @Test
    fun `isLoggedIn should return false when token is null`() = runTest {
        // Given
        coEvery {
            tokenProvider.getToken()
        } returns null

        // When
        val result = repository.isLoggedIn()

        // Then
        assertFalse(result)
    }

    @Test
    fun `isLoggedIn should return false when token is empty`() = runTest {
        // Given
        coEvery {
            tokenProvider.getToken()
        } returns ""

        // When
        val result = repository.isLoggedIn()

        // Then
        assertFalse(result)
    }

    @Test
    fun `getToken should return token from provider`() = runTest {
        // Given
        val expectedToken = "test_token_123"

        coEvery {
            tokenProvider.getToken()
        } returns expectedToken

        // When
        val result = repository.getToken()

        // Then
        assertEquals(expectedToken, result)
    }

    @Test
    fun `refreshToken should save new token on success`() = runTest {
        // Given
        coEvery {
            authApi.refreshToken()
        } returns Response.success(testLoginResponse)

        // When
        val result = repository.refreshToken()

        // Then
        assertTrue(result.isSuccess)
        assertEquals(testLoginResponse.token, result.getOrNull())
        coVerify { tokenProvider.saveToken(testLoginResponse.token) }
    }

    @Test
    fun `refreshToken should return failure on error`() = runTest {
        // Given
        val errorBody = "{\"error\":\"Token expired\"}".toResponseBody()

        coEvery {
            authApi.refreshToken()
        } returns Response.error(401, errorBody)

        // When
        val result = repository.refreshToken()

        // Then
        assertTrue(result.isFailure)
        coVerify(exactly = 0) { tokenProvider.saveToken(any()) }
    }

    @Test
    fun `refreshToken should handle network error`() = runTest {
        // Given
        coEvery {
            authApi.refreshToken()
        } throws Exception("Network error")

        // When
        val result = repository.refreshToken()

        // Then
        assertTrue(result.isFailure)
        assertEquals("Network error", result.exceptionOrNull()?.message)
    }
}

package com.aiproj.mobile.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import com.aiproj.mobile.ui.screens.login.LoginScreen
import org.junit.Rule
import org.junit.Test

class LoginScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun loginScreen_displaysUsernameAndPasswordFields() {
        composeTestRule.setContent {
            LoginScreen(
                onLoginSuccess = {}
            )
        }

        composeTestRule.onNodeWithText("用户名").assertIsDisplayed()
        composeTestRule.onNodeWithText("密码").assertIsDisplayed()
        composeTestRule.onNodeWithText("登录").assertIsDisplayed()
    }
}

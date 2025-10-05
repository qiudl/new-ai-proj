package com.aiproj.mobile.ui.common

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * UiState单元测试
 */
class UiStateTest {

    @Test
    fun `UiState Idle has correct properties`() {
        val state = UiState.Idle
        assertFalse(state.isLoading)
        assertFalse(state.isSuccess)
        assertFalse(state.isError)
        assertNull(state.getDataOrNull())
        assertNull(state.getErrorOrNull())
    }

    @Test
    fun `UiState Loading has correct properties`() {
        val state = UiState.Loading
        assertTrue(state.isLoading)
        assertFalse(state.isSuccess)
        assertFalse(state.isError)
        assertNull(state.getDataOrNull())
        assertNull(state.getErrorOrNull())
    }

    @Test
    fun `UiState Success has correct properties`() {
        val data = "Test Data"
        val state = UiState.Success(data)
        assertFalse(state.isLoading)
        assertTrue(state.isSuccess)
        assertFalse(state.isError)
        assertEquals(data, state.getDataOrNull())
        assertNull(state.getErrorOrNull())
    }

    @Test
    fun `UiState Error has correct properties`() {
        val exception = RuntimeException("Test error")
        val state = UiState.Error(exception, "Custom error message")
        assertFalse(state.isLoading)
        assertFalse(state.isSuccess)
        assertTrue(state.isError)
        assertNull(state.getDataOrNull())
        assertEquals("Custom error message", state.getErrorOrNull())
    }

    @Test
    fun `UiState Error uses exception message when no custom message provided`() {
        val exception = RuntimeException("Exception message")
        val state = UiState.Error(exception)
        assertEquals("Exception message", state.message)
    }

    @Test
    fun `UiState Error uses default message when exception has no message`() {
        val state = UiState.Error(null, "")
        assertEquals("", state.message)
    }

    @Test
    fun `OperationState Idle has correct properties`() {
        val state = OperationState.Idle
        assertFalse(state.isInProgress)
        assertFalse(state.isSuccess)
        assertFalse(state.isFailure)
    }

    @Test
    fun `OperationState InProgress has correct properties`() {
        val state = OperationState.InProgress
        assertTrue(state.isInProgress)
        assertFalse(state.isSuccess)
        assertFalse(state.isFailure)
    }

    @Test
    fun `OperationState Success has correct properties`() {
        val state = OperationState.Success("操作成功")
        assertFalse(state.isInProgress)
        assertTrue(state.isSuccess)
        assertFalse(state.isFailure)
        assertEquals("操作成功", (state as OperationState.Success).message)
    }

    @Test
    fun `OperationState Failure has correct properties`() {
        val state = OperationState.Failure("操作失败")
        assertFalse(state.isInProgress)
        assertFalse(state.isSuccess)
        assertTrue(state.isFailure)
        assertEquals("操作失败", (state as OperationState.Failure).error)
    }

    @Test
    fun `toUiState converts Result success to UiState Success`() {
        val result = Result.success("Test Data")
        val uiState = result.toUiState()
        assertTrue(uiState is UiState.Success)
        assertEquals("Test Data", (uiState as UiState.Success).data)
    }

    @Test
    fun `toUiState converts Result failure to UiState Error`() {
        val exception = RuntimeException("Test error")
        val result = Result.failure<String>(exception)
        val uiState = result.toUiState()
        assertTrue(uiState is UiState.Error)
        assertEquals("Test error", (uiState as UiState.Error).message)
    }

    @Test
    fun `toOperationState converts Result success to OperationState Success`() {
        val result = Result.success(Unit)
        val operationState = result.toOperationState("操作成功")
        assertTrue(operationState is OperationState.Success)
        assertEquals("操作成功", (operationState as OperationState.Success).message)
    }

    @Test
    fun `toOperationState converts Result success without message`() {
        val result = Result.success(Unit)
        val operationState = result.toOperationState()
        assertTrue(operationState is OperationState.Success)
        assertNull((operationState as OperationState.Success).message)
    }

    @Test
    fun `toOperationState converts Result failure to OperationState Failure`() {
        val exception = RuntimeException("操作失败")
        val result = Result.failure<Unit>(exception)
        val operationState = result.toOperationState()
        assertTrue(operationState is OperationState.Failure)
        assertEquals("操作失败", (operationState as OperationState.Failure).error)
    }

    @Test
    fun `toOperationState handles exception without message`() {
        val exception = RuntimeException()
        val result = Result.failure<Unit>(exception)
        val operationState = result.toOperationState()
        assertTrue(operationState is OperationState.Failure)
        assertEquals("操作失败", (operationState as OperationState.Failure).error)
    }
}

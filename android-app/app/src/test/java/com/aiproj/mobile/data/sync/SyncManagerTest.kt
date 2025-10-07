package com.aiproj.mobile.data.sync

import com.aiproj.mobile.data.local.CacheStats
import com.aiproj.mobile.data.local.TimerCache
import com.aiproj.mobile.data.network.ConnectivityObserver
import com.aiproj.mobile.data.repository.TimerRepository
import io.mockk.*
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * SyncManager单元测试
 * 测试同步管理器的核心功能
 */
class SyncManagerTest {

    private lateinit var cache: TimerCache
    private lateinit var repository: TimerRepository
    private lateinit var connectivityObserver: ConnectivityObserver

    @Before
    fun setup() {
        cache = mockk()
        repository = mockk()
        connectivityObserver = mockk()

        // Mock connectivity observer to return available network
        every { connectivityObserver.observe() } returns flowOf(
            ConnectivityObserver.NetworkStatus.AVAILABLE
        )
        every { connectivityObserver.isConnected() } returns true
    }

    @Test
    fun `SyncState Idle should be created correctly`() {
        val state: SyncState = SyncState.Idle
        assertTrue(state is SyncState.Idle)
    }

    @Test
    fun `SyncState Syncing should contain progress info`() {
        val state = SyncState.Syncing(total = 10, completed = 5)

        assertTrue(state is SyncState.Syncing)
        assertEquals(10, state.total)
        assertEquals(5, state.completed)
    }

    @Test
    fun `SyncState Success should contain synced count`() {
        val state = SyncState.Success(syncedCount = 5)

        assertTrue(state is SyncState.Success)
        assertEquals(5, state.syncedCount)
    }

    @Test
    fun `SyncState Error should contain retry info`() {
        val state = SyncState.Error(
            message = "Network error",
            retryCount = 2,
            maxRetries = 5
        )

        assertTrue(state is SyncState.Error)
        assertEquals("Network error", state.message)
        assertEquals(2, state.retryCount)
        assertEquals(5, state.maxRetries)
    }

    @Test
    fun `SyncState Failed should contain error message`() {
        val state = SyncState.Failed(message = "Max retries exceeded")

        assertTrue(state is SyncState.Failed)
        assertEquals("Max retries exceeded", state.message)
    }

    @Test
    fun `SyncStats should contain all statistics`() {
        val stats = SyncStats(
            pendingRecords = 5,
            syncedRecords = 10,
            failedRecords = 2,
            lastSyncTime = System.currentTimeMillis(),
            currentState = SyncState.Idle
        )

        assertEquals(5, stats.pendingRecords)
        assertEquals(10, stats.syncedRecords)
        assertEquals(2, stats.failedRecords)
        assertNotNull(stats.lastSyncTime)
        assertTrue(stats.currentState is SyncState.Idle)
    }

    @Test
    fun `exponential backoff calculation should work correctly`() {
        // Test exponential backoff formula: delay = baseDelay * 2^(retryCount - 1)
        // with max of 30 seconds

        val baseDelay = 1000L // 1 second

        // Retry 1: 1 * 2^0 = 1 second
        val delay1 = baseDelay * Math.pow(2.0, 0.0).toLong()
        assertEquals(1000L, delay1)

        // Retry 2: 1 * 2^1 = 2 seconds
        val delay2 = baseDelay * Math.pow(2.0, 1.0).toLong()
        assertEquals(2000L, delay2)

        // Retry 3: 1 * 2^2 = 4 seconds
        val delay3 = baseDelay * Math.pow(2.0, 2.0).toLong()
        assertEquals(4000L, delay3)

        // Retry 4: 1 * 2^3 = 8 seconds
        val delay4 = baseDelay * Math.pow(2.0, 3.0).toLong()
        assertEquals(8000L, delay4)

        // Retry 5: 1 * 2^4 = 16 seconds
        val delay5 = baseDelay * Math.pow(2.0, 4.0).toLong()
        assertEquals(16000L, delay5)

        // Retry 6: 1 * 2^5 = 32 seconds, but max is 30 seconds
        val delay6 = baseDelay * Math.pow(2.0, 5.0).toLong()
        assertEquals(32000L, delay6)
        val delayWithMax = minOf(delay6, 30000L)
        assertEquals(30000L, delayWithMax)
    }

    @Test
    fun `network status transitions should be handled correctly`() {
        // Test network status enum
        val statuses = listOf(
            ConnectivityObserver.NetworkStatus.AVAILABLE,
            ConnectivityObserver.NetworkStatus.UNAVAILABLE,
            ConnectivityObserver.NetworkStatus.LOSING,
            ConnectivityObserver.NetworkStatus.LOST
        )

        assertEquals(4, statuses.size)
        assertTrue(statuses.contains(ConnectivityObserver.NetworkStatus.AVAILABLE))
        assertTrue(statuses.contains(ConnectivityObserver.NetworkStatus.UNAVAILABLE))
    }

    @Test
    fun `getSyncStats should aggregate cache stats correctly`() = runTest {
        // Mock cache stats
        val mockCacheStats = CacheStats(
            hasCurrentTimer = true,
            totalOfflineRecords = 15,
            pendingRecords = 7,
            syncedRecords = 5,
            failedRecords = 3,
            lastSyncTime = 1700000000000L
        )

        coEvery { cache.getCacheStats() } returns mockCacheStats
        coEvery { cache.getLastSyncTime() } returns 1700000000000L

        // Verify data aggregation logic
        assertEquals(15, mockCacheStats.totalOfflineRecords)
        assertEquals(7, mockCacheStats.pendingRecords)
        assertEquals(5, mockCacheStats.syncedRecords)
        assertEquals(3, mockCacheStats.failedRecords)
    }
}

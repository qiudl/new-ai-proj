package factories

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// BatchProcessor 批处理器实现
type BatchProcessor struct {
	batchSize   int
	concurrency int
	stats       BatchStats
	mutex       sync.RWMutex
}

// NewBatchProcessor 创建批处理器
func NewBatchProcessor(batchSize, concurrency int) *BatchProcessor {
	if batchSize <= 0 {
		batchSize = 100 // 默认批大小
	}
	if concurrency <= 0 {
		concurrency = 4 // 默认并发数
	}

	return &BatchProcessor{
		batchSize:   batchSize,
		concurrency: concurrency,
		stats:       BatchStats{},
	}
}

// Process 同步批处理
func (bp *BatchProcessor) Process(ctx context.Context, items []interface{}, config BatchProcessConfig) error {
	start := time.Now()
	defer func() {
		bp.updateStats(len(items), time.Since(start), 0)
	}()

	if len(items) == 0 {
		return nil
	}

	// 分批处理
	batches := bp.createBatches(items)
	var totalErrors uint64

	for i, batch := range batches {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if err := bp.processBatch(ctx, batch, config, i); err != nil {
			totalErrors++
			if config.ErrorHandler == "stop" {
				return fmt.Errorf("batch processing stopped at batch %d: %w", i, err)
			}
			// 对于 "skip" 或 "retry" 策略，继续处理其他批次
		}
	}

	if totalErrors > 0 && config.ErrorHandler != "skip" {
		return fmt.Errorf("batch processing completed with %d errors", totalErrors)
	}

	return nil
}

// ProcessAsync 异步批处理
func (bp *BatchProcessor) ProcessAsync(ctx context.Context, items []interface{}, config BatchProcessConfig) (<-chan ProcessResult, error) {
	if len(items) == 0 {
		resultChan := make(chan ProcessResult)
		close(resultChan)
		return resultChan, nil
	}

	resultChan := make(chan ProcessResult, len(items))
	batches := bp.createBatches(items)

	go bp.processAsync(ctx, batches, config, resultChan)

	return resultChan, nil
}

// processAsync 异步处理逻辑
func (bp *BatchProcessor) processAsync(ctx context.Context, batches [][]interface{}, config BatchProcessConfig, resultChan chan<- ProcessResult) {
	defer close(resultChan)

	start := time.Now()
	var wg sync.WaitGroup
	var errorCount uint64
	var successCount uint64

	// 创建工作池
	batchChan := make(chan batchJob, len(batches))
	
	// 启动工作协程
	for i := 0; i < bp.concurrency && i < len(batches); i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range batchChan {
				select {
				case <-ctx.Done():
					bp.sendBatchResults(resultChan, job.batch, job.startIndex, ctx.Err())
					return
				default:
					bp.processBatchAsync(ctx, job, config, resultChan, &errorCount, &successCount)
				}
			}
		}()
	}

	// 发送批次任务
	startIndex := 0
	for i, batch := range batches {
		select {
		case <-ctx.Done():
			break
		case batchChan <- batchJob{batch: batch, batchIndex: i, startIndex: startIndex}:
			startIndex += len(batch)
		}
	}
	close(batchChan)

	// 等待所有协程完成
	wg.Wait()

	// 更新统计信息
	bp.updateStats(len(batches), time.Since(start), errorCount)
}

// batchJob 批次任务
type batchJob struct {
	batch      []interface{}
	batchIndex int
	startIndex int
}

// processBatchAsync 处理单个批次（异步）
func (bp *BatchProcessor) processBatchAsync(ctx context.Context, job batchJob, config BatchProcessConfig, resultChan chan<- ProcessResult, errorCount, successCount *uint64) {
	batchStart := time.Now()
	
	for i, item := range job.batch {
		select {
		case <-ctx.Done():
			resultChan <- ProcessResult{
				Index:  job.startIndex + i,
				Data:   nil,
				Error:  ctx.Err(),
				Timing: time.Since(batchStart),
			}
			return
		default:
		}

		itemStart := time.Now()
		processedItem, err := bp.processItem(ctx, item, config)
		timing := time.Since(itemStart)

		if err != nil {
			*errorCount++
			if config.RetryCount > 0 {
				// 重试逻辑
				for retry := 0; retry < config.RetryCount; retry++ {
					if config.RetryDelay > 0 {
						time.Sleep(config.RetryDelay)
					}
					processedItem, err = bp.processItem(ctx, item, config)
					if err == nil {
						*successCount++
						break
					}
				}
			}
		} else {
			*successCount++
		}

		resultChan <- ProcessResult{
			Index:  job.startIndex + i,
			Data:   processedItem,
			Error:  err,
			Timing: timing,
		}
	}
}

// processBatch 处理单个批次（同步）
func (bp *BatchProcessor) processBatch(ctx context.Context, batch []interface{}, config BatchProcessConfig, batchIndex int) error {
	for i, item := range batch {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		_, err := bp.processItem(ctx, item, config)
		if err != nil {
			if config.ErrorHandler == "stop" {
				return fmt.Errorf("failed to process item %d in batch %d: %w", i, batchIndex, err)
			}
			// 对于其他错误处理策略，记录错误但继续处理
		}
	}
	return nil
}

// processItem 处理单个项目
func (bp *BatchProcessor) processItem(ctx context.Context, item interface{}, config BatchProcessConfig) (interface{}, error) {
	// 这里是处理单个项目的逻辑
	// 在实际应用中，这里会根据具体需求进行处理
	// 目前只是简单返回原项目
	
	// 模拟处理时间
	if config.Timeout > 0 {
		processingCtx, cancel := context.WithTimeout(ctx, config.Timeout)
		defer cancel()
		
		select {
		case <-processingCtx.Done():
			return nil, processingCtx.Err()
		default:
		}
	}
	
	return item, nil
}

// sendBatchResults 发送批次结果
func (bp *BatchProcessor) sendBatchResults(resultChan chan<- ProcessResult, batch []interface{}, startIndex int, err error) {
	for i, item := range batch {
		resultChan <- ProcessResult{
			Index: startIndex + i,
			Data:  item,
			Error: err,
		}
	}
}

// createBatches 创建批次
func (bp *BatchProcessor) createBatches(items []interface{}) [][]interface{} {
	if len(items) == 0 {
		return nil
	}

	var batches [][]interface{}
	for i := 0; i < len(items); i += bp.batchSize {
		end := i + bp.batchSize
		if end > len(items) {
			end = len(items)
		}
		batches = append(batches, items[i:end])
	}
	return batches
}

// updateStats 更新统计信息
func (bp *BatchProcessor) updateStats(itemCount int, duration time.Duration, errorCount uint64) {
	bp.mutex.Lock()
	defer bp.mutex.Unlock()

	bp.stats.BatchCount++
	bp.stats.ItemCount += uint64(itemCount)
	bp.stats.TotalTime += duration
	bp.stats.ErrorCount += errorCount
	bp.stats.SuccessCount += uint64(itemCount) - errorCount
	bp.stats.LastProcessed = time.Now()

	// 更新平均时间
	if bp.stats.BatchCount > 0 {
		bp.stats.AverageTime = bp.stats.TotalTime / time.Duration(bp.stats.BatchCount)
	}
}

// GetBatchSize 获取批大小
func (bp *BatchProcessor) GetBatchSize() int {
	bp.mutex.RLock()
	defer bp.mutex.RUnlock()
	return bp.batchSize
}

// SetBatchSize 设置批大小
func (bp *BatchProcessor) SetBatchSize(size int) {
	if size <= 0 {
		size = 1
	}
	bp.mutex.Lock()
	defer bp.mutex.Unlock()
	bp.batchSize = size
}

// GetConcurrency 获取并发数
func (bp *BatchProcessor) GetConcurrency() int {
	bp.mutex.RLock()
	defer bp.mutex.RUnlock()
	return bp.concurrency
}

// SetConcurrency 设置并发数
func (bp *BatchProcessor) SetConcurrency(concurrency int) {
	if concurrency <= 0 {
		concurrency = 1
	}
	bp.mutex.Lock()
	defer bp.mutex.Unlock()
	bp.concurrency = concurrency
}

// GetStats 获取统计信息
func (bp *BatchProcessor) GetStats() BatchStats {
	bp.mutex.RLock()
	defer bp.mutex.RUnlock()
	return bp.stats
}

// ResetStats 重置统计信息
func (bp *BatchProcessor) ResetStats() {
	bp.mutex.Lock()
	defer bp.mutex.Unlock()
	bp.stats = BatchStats{}
}
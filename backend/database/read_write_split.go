package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ReadWriteSplitter manages master-slave database connections
type ReadWriteSplitter struct {
	master     *gorm.DB  // 主库(读写)
	slave      *gorm.DB  // 从库(只读)
	masterDSN  string
	slaveDSN   string
	useSplit   bool      // 是否启用读写分离
	mu         sync.RWMutex
	logger     *log.Logger
}

// NewReadWriteSplitter creates a new read-write splitter
func NewReadWriteSplitter(masterDSN, slaveDSN string, useSplit bool, logger *log.Logger) (*ReadWriteSplitter, error) {
	if logger == nil {
		logger = log.Default()
	}

	splitter := &ReadWriteSplitter{
		masterDSN: masterDSN,
		slaveDSN:  slaveDSN,
		useSplit:  useSplit,
		logger:    logger,
	}

	// 连接主库
	masterDB, err := gorm.Open(postgres.Open(masterDSN), &gorm.Config{
		Logger: nil, // 使用默认logger或自定义
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to master database: %v", err)
	}
	splitter.master = masterDB
	splitter.logger.Printf("✅ 主库连接成功 (主库用于写操作)")

	// 如果启用读写分离,连接从库
	if useSplit && slaveDSN != "" && slaveDSN != masterDSN {
		slaveDB, err := gorm.Open(postgres.Open(slaveDSN), &gorm.Config{
			Logger: nil,
		})
		if err != nil {
			splitter.logger.Printf("⚠️  从库连接失败,将使用主库进行读操作: %v", err)
			splitter.slave = masterDB // 降级到主库
		} else {
			splitter.slave = slaveDB
			splitter.logger.Printf("✅ 从库连接成功 (从库用于读操作)")

			// 验证从库是否为只读
			var isReadOnly bool
			slaveDB.Raw("SELECT pg_is_in_recovery()").Scan(&isReadOnly)
			if isReadOnly {
				splitter.logger.Printf("✅ 从库验证: 处于只读恢复模式")
			} else {
				splitter.logger.Printf("⚠️  从库验证: 未处于恢复模式,可能不是从库")
			}
		}
	} else {
		// 未启用读写分离,读写都用主库
		splitter.slave = masterDB
		splitter.logger.Printf("ℹ️  读写分离未启用,读写操作都使用主库")
	}

	// 配置连接池
	if err := splitter.configureConnectionPool(); err != nil {
		return nil, err
	}

	return splitter, nil
}

// configureConnectionPool configures database connection pools
func (rw *ReadWriteSplitter) configureConnectionPool() error {
	// 配置主库连接池
	sqlDB, err := rw.master.DB()
	if err != nil {
		return fmt.Errorf("failed to get master sql.DB: %v", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// 配置从库连接池(如果不同于主库)
	if rw.slave != rw.master {
		slaveSQLDB, err := rw.slave.DB()
		if err != nil {
			return fmt.Errorf("failed to get slave sql.DB: %v", err)
		}
		slaveSQLDB.SetMaxIdleConns(20) // 从库可以有更多空闲连接
		slaveSQLDB.SetMaxOpenConns(200) // 从库可以有更多最大连接
		slaveSQLDB.SetConnMaxLifetime(time.Hour)
	}

	return nil
}

// Master returns the master database (for writes)
func (rw *ReadWriteSplitter) Master() *gorm.DB {
	rw.mu.RLock()
	defer rw.mu.RUnlock()
	return rw.master
}

// Slave returns the slave database (for reads)
func (rw *ReadWriteSplitter) Slave() *gorm.DB {
	rw.mu.RLock()
	defer rw.mu.RUnlock()
	return rw.slave
}

// Read returns the appropriate database for read operations
func (rw *ReadWriteSplitter) Read() *gorm.DB {
	if rw.useSplit && rw.slave != nil {
		return rw.Slave()
	}
	return rw.Master()
}

// Write returns the master database for write operations
func (rw *ReadWriteSplitter) Write() *gorm.DB {
	return rw.Master()
}

// Transaction executes a function within a transaction (always on master)
func (rw *ReadWriteSplitter) Transaction(fn func(tx *gorm.DB) error) error {
	return rw.Master().Transaction(fn)
}

// HealthCheck checks the health of master and slave databases
func (rw *ReadWriteSplitter) HealthCheck(ctx context.Context) error {
	// Check master
	masterDB, err := rw.master.DB()
	if err != nil {
		return fmt.Errorf("master db error: %v", err)
	}
	if err := masterDB.PingContext(ctx); err != nil {
		return fmt.Errorf("master ping failed: %v", err)
	}

	// Check slave (if different from master)
	if rw.slave != rw.master {
		slaveDB, err := rw.slave.DB()
		if err != nil {
			return fmt.Errorf("slave db error: %v", err)
		}
		if err := slaveDB.PingContext(ctx); err != nil {
			// 从库连接失败时降级到主库
			rw.logger.Printf("⚠️  从库健康检查失败,降级到主库: %v", err)
			rw.mu.Lock()
			rw.slave = rw.master
			rw.mu.Unlock()
		}
	}

	return nil
}

// GetReplicationLag returns the replication lag in bytes
func (rw *ReadWriteSplitter) GetReplicationLag() (int64, error) {
	if rw.slave == rw.master {
		return 0, nil // No replication
	}

	var receiveLSN, replayLSN string
	if err := rw.slave.Raw("SELECT pg_last_wal_receive_lsn()").Scan(&receiveLSN).Error; err != nil {
		return 0, err
	}
	if err := rw.slave.Raw("SELECT pg_last_wal_replay_lsn()").Scan(&replayLSN).Error; err != nil {
		return 0, err
	}

	var lag int64
	if err := rw.slave.Raw("SELECT pg_wal_lsn_diff(?, ?)", receiveLSN, replayLSN).Scan(&lag).Error; err != nil {
		return 0, err
	}

	return lag, nil
}

// Close closes all database connections
func (rw *ReadWriteSplitter) Close() error {
	var errs []error

	// Close master
	if masterDB, err := rw.master.DB(); err == nil {
		if err := masterDB.Close(); err != nil {
			errs = append(errs, fmt.Errorf("master close error: %v", err))
		}
	}

	// Close slave (if different from master)
	if rw.slave != rw.master {
		if slaveDB, err := rw.slave.DB(); err == nil {
			if err := slaveDB.Close(); err != nil {
				errs = append(errs, fmt.Errorf("slave close error: %v", err))
			}
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("close errors: %v", errs)
	}

	return nil
}

// Stats returns database connection pool statistics
type DBStats struct {
	MasterStats sql.DBStats
	SlaveStats  sql.DBStats
	UseSplit    bool
}

func (rw *ReadWriteSplitter) Stats() (*DBStats, error) {
	stats := &DBStats{
		UseSplit: rw.useSplit && rw.slave != rw.master,
	}

	masterDB, err := rw.master.DB()
	if err != nil {
		return nil, err
	}
	stats.MasterStats = masterDB.Stats()

	if rw.slave != rw.master {
		slaveDB, err := rw.slave.DB()
		if err != nil {
			return nil, err
		}
		stats.SlaveStats = slaveDB.Stats()
	}

	return stats, nil
}

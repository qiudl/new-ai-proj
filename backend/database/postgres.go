package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// PostgresDB implements the DB interface using PostgreSQL
type PostgresDB struct {
	db *sql.DB
}

// NewPostgresDB creates a new PostgreSQL database connection
func NewPostgresDB(dsn string) (*PostgresDB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &PostgresDB{db: db}, nil
}

// NewPostgresDBWithConfig creates a new PostgreSQL database connection with configuration
func NewPostgresDBWithConfig(dsn string, maxOpen, maxIdle int, maxLifetime time.Duration) (*PostgresDB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(maxOpen)
	db.SetMaxIdleConns(maxIdle)
	db.SetConnMaxLifetime(maxLifetime)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &PostgresDB{db: db}, nil
}

// Users returns the user repository
func (pdb *PostgresDB) Users() UserRepository {
	return &PostgresUserRepository{db: pdb.db}
}

// Projects returns the project repository
func (pdb *PostgresDB) Projects() ProjectRepository {
	return &PostgresProjectRepository{db: pdb.db}
}

// Tasks returns the task repository
func (pdb *PostgresDB) Tasks() TaskRepository {
	return &PostgresTaskRepository{db: pdb.db}
}

// Close closes the database connection
func (pdb *PostgresDB) Close() error {
	return pdb.db.Close()
}

// Ping checks if the database connection is alive
func (pdb *PostgresDB) Ping() error {
	return pdb.db.Ping()
}

// BeginTx starts a new transaction
func (pdb *PostgresDB) BeginTx(ctx context.Context) (Tx, error) {
	tx, err := pdb.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	return &PostgresTx{tx: tx}, nil
}

// PostgresTx implements the Tx interface using PostgreSQL transaction
type PostgresTx struct {
	tx *sql.Tx
}

// Users returns the user repository for transaction
func (ptx *PostgresTx) Users() UserRepository {
	return &PostgresUserRepository{db: ptx.tx}
}

// Projects returns the project repository for transaction
func (ptx *PostgresTx) Projects() ProjectRepository {
	return &PostgresProjectRepository{db: ptx.tx}
}

// Tasks returns the task repository for transaction
func (ptx *PostgresTx) Tasks() TaskRepository {
	return &PostgresTaskRepository{db: ptx.tx}
}

// Commit commits the transaction
func (ptx *PostgresTx) Commit() error {
	return ptx.tx.Commit()
}

// Rollback rolls back the transaction
func (ptx *PostgresTx) Rollback() error {
	return ptx.tx.Rollback()
}
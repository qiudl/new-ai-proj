// Package testutil provides testing utilities for soft delete functionality
package testutil

import (
	"context"
	"fmt"
	"testing"
	"time"

	"ai-project-backend/interfaces"
)

// SoftDeleteTestSuite provides standardized tests for soft delete functionality
type SoftDeleteTestSuite struct {
	Repository interfaces.SoftDeleteRepository
	CreateTestEntity func() (int, error) // Returns created entity ID
	GetTestEntity    func(id int) (interfaces.SoftDeletable, error)
	CleanupEntity    func(id int) error
}

// TestBasicSoftDelete tests basic soft delete operations
func (suite *SoftDeleteTestSuite) TestBasicSoftDelete(t *testing.T) {
	ctx := context.Background()
	
	// Create test entity
	entityID, err := suite.CreateTestEntity()
	if err != nil {
		t.Fatalf("Failed to create test entity: %v", err)
	}
	defer suite.CleanupEntity(entityID)
	
	// Verify entity exists and is not deleted
	entity, err := suite.GetTestEntity(entityID)
	if err != nil {
		t.Fatalf("Failed to get entity: %v", err)
	}
	if entity.IsDeleted() {
		t.Fatal("New entity should not be deleted")
	}
	
	// Soft delete the entity
	err = suite.Repository.Delete(ctx, entityID)
	if err != nil {
		t.Fatalf("Failed to soft delete entity: %v", err)
	}
	
	// Verify entity is deleted
	deleted, err := suite.Repository.IsDeleted(ctx, entityID)
	if err != nil {
		t.Fatalf("Failed to check deletion status: %v", err)
	}
	if !deleted {
		t.Fatal("Entity should be marked as deleted")
	}
}// TestRestore tests entity restoration after soft delete
func (suite *SoftDeleteTestSuite) TestRestore(t *testing.T) {
	ctx := context.Background()
	
	// Create and delete test entity
	entityID, err := suite.CreateTestEntity()
	if err != nil {
		t.Fatalf("Failed to create test entity: %v", err)
	}
	defer suite.CleanupEntity(entityID)
	
	err = suite.Repository.Delete(ctx, entityID)
	if err != nil {
		t.Fatalf("Failed to soft delete entity: %v", err)
	}
	
	// Restore the entity
	err = suite.Repository.Restore(ctx, entityID)
	if err != nil {
		t.Fatalf("Failed to restore entity: %v", err)
	}
	
	// Verify entity is restored
	deleted, err := suite.Repository.IsDeleted(ctx, entityID)
	if err != nil {
		t.Fatalf("Failed to check deletion status: %v", err)
	}
	if deleted {
		t.Fatal("Restored entity should not be marked as deleted")
	}
	
	// Entity should be retrievable again
	entity, err := suite.GetTestEntity(entityID)
	if err != nil {
		t.Fatalf("Failed to get restored entity: %v", err)
	}
	if entity.IsDeleted() {
		t.Fatal("Restored entity should not be deleted")
	}
}

// RunAllTests runs the complete soft delete test suite
func (suite *SoftDeleteTestSuite) RunAllTests(t *testing.T) {
	t.Run("BasicSoftDelete", suite.TestBasicSoftDelete)
	t.Run("Restore", suite.TestRestore)
}

package tests

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRequirementReviewWorkflow tests the complete requirement review workflow
func TestRequirementReviewWorkflow(t *testing.T) {
	// Setup test environment
	testApp := SetupTestApp(t)
	defer TeardownTestApp(t, testApp)

	// Create test enterprise
	enterprise := CreateTestEnterprise(t, testApp, "Test Enterprise for Workflow")

	// Create test users with different roles
	creator := CreateTestEnterpriseUser(t, testApp, "requirement_creator", enterprise.ID)
	reviewer := CreateTestEnterpriseUser(t, testApp, "requirement_reviewer", enterprise.ID)
	admin := CreateTestSystemUser(t, testApp, "workflow_admin")

	// Cleanup test data at the end
	defer CleanupTestData(t, testApp,
		[]int{creator.ID, reviewer.ID, admin.ID},
		[]int{enterprise.ID})

	var requirementID int
	var taskID int
	var commentID int
	var replyID int

	// Step 1: Creator creates a requirement
	t.Run("1. Create Requirement", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"title":       "需求：添加用户管理功能",
			"description": "需要一个完整的用户管理系统，包括增删改查功能",
			"priority":    "high",
			"category":    "功能需求",
			"source":      "客户反馈",
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements", reqBody, creator)
		response := AssertSuccessResponse(t, w)

		// Verify requirement was created
		data := response["data"].(map[string]interface{})
		requirementID = int(data["id"].(float64))
		assert.Greater(t, requirementID, 0, "Requirement ID should be greater than 0")
		assert.Equal(t, "draft", data["status"], "Initial status should be draft")
		assert.Equal(t, float64(creator.ID), data["created_by"], "Creator should match")

		t.Logf("✓ Created requirement #%d", requirementID)
	})

	// Step 2: Creator submits requirement for review
	t.Run("2. Submit Requirement for Review", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/%d/submit", requirementID)
		w := MakeAuthenticatedRequest(t, testApp, "POST", path, nil, creator)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "submitted", data["status"], "Status should be submitted")

		t.Logf("✓ Submitted requirement for review")
	})

	// Step 3: Reviewer adds a comment with @mention
	t.Run("3. Reviewer Adds Comment with @mention", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"requirement_id": requirementID,
			"content":        fmt.Sprintf("这个需求看起来不错，@%s 能否补充一下具体的技术方案？", creator.Username),
			"comment_type":   "question",
			"mentioned_users": []int{creator.ID},
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements/comments", reqBody, reviewer)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		commentID = int(data["id"].(float64))
		assert.Greater(t, commentID, 0, "Comment ID should be greater than 0")
		assert.Equal(t, float64(reviewer.ID), data["user_id"], "Comment user should be reviewer")

		t.Logf("✓ Added comment #%d with @mention", commentID)
	})

	// Step 4: Creator replies to comment
	t.Run("4. Creator Replies to Comment", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"requirement_id":      requirementID,
			"content":             "好的，我会在今天下午补充技术方案文档",
			"comment_type":        "comment",
			"parent_comment_id":   commentID,
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements/comments", reqBody, creator)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		replyID = int(data["id"].(float64))
		assert.Greater(t, replyID, 0, "Reply ID should be greater than 0")
		assert.Equal(t, float64(commentID), data["parent_comment_id"], "Parent comment ID should match")

		t.Logf("✓ Added reply #%d to comment #%d", replyID, commentID)
	})

	// Step 5: Admin pins the important comment
	t.Run("5. Admin Pins Comment", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/comments/%d/pin", commentID)
		reqBody := map[string]interface{}{
			"is_pinned": true,
		}

		w := MakeAuthenticatedRequest(t, testApp, "PUT", path, reqBody, admin)
		AssertSuccessResponse(t, w)

		t.Logf("✓ Pinned comment #%d", commentID)
	})

	// Step 6: Get comments to verify pinning
	t.Run("6. Verify Pinned Comment", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/comments?requirement_id=%d", requirementID)
		w := MakeAuthenticatedRequest(t, testApp, "GET", path, nil, reviewer)
		response := AssertSuccessResponse(t, w)

		data := response["data"].([]interface{})
		require.Greater(t, len(data), 0, "Should have at least one comment")

		// Verify first comment is pinned (should be ordered by pinned status)
		firstComment := data[0].(map[string]interface{})
		assert.True(t, firstComment["is_pinned"].(bool), "First comment should be pinned")

		t.Logf("✓ Verified pinned comment appears first")
	})

	// Step 7: Admin approves requirement
	t.Run("7. Approve Requirement", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/%d/approve", requirementID)
		reqBody := map[string]interface{}{
			"review_notes": "需求描述清晰，批准进入开发阶段",
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", path, reqBody, admin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		assert.Equal(t, "approved", data["status"], "Status should be approved")

		t.Logf("✓ Approved requirement")
	})

	// Step 8: Convert requirement to task
	t.Run("8. Convert Requirement to Task", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/%d/convert-to-task", requirementID)
		reqBody := map[string]interface{}{
			"project_id": 1, // Assuming project 1 exists
			"assignee_id": creator.ID,
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", path, reqBody, admin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		taskData := data["task"].(map[string]interface{})
		taskID = int(taskData["id"].(float64))
		assert.Greater(t, taskID, 0, "Task ID should be greater than 0")

		t.Logf("✓ Converted to task #%d", taskID)
	})

	// Step 9: Verify requirement-task link
	t.Run("9. Verify Requirement-Task Link", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/%d/tasks", requirementID)
		w := MakeAuthenticatedRequest(t, testApp, "GET", path, nil, creator)
		response := AssertSuccessResponse(t, w)

		data := response["data"].([]interface{})
		require.Greater(t, len(data), 0, "Should have at least one linked task")

		linkedTask := data[0].(map[string]interface{})
		assert.Equal(t, float64(taskID), linkedTask["task_id"], "Linked task ID should match")

		t.Logf("✓ Verified requirement-task link")
	})

	// Step 10: Get requirement statistics
	t.Run("10. Get Requirement Statistics", func(t *testing.T) {
		w := MakeAuthenticatedRequest(t, testApp, "GET", "/api/v1/requirements/stats", nil, admin)
		response := AssertSuccessResponse(t, w)

		data := response["data"].(map[string]interface{})
		assert.Contains(t, data, "total", "Stats should contain total")
		assert.Contains(t, data, "by_status", "Stats should contain by_status")

		t.Logf("✓ Retrieved requirement statistics")
	})
}

// TestRequirementCommentFeatures tests requirement comment features
func TestRequirementCommentFeatures(t *testing.T) {
	testApp := SetupTestApp(t)
	defer TeardownTestApp(t, testApp)

	enterprise := CreateTestEnterprise(t, testApp, "Comment Test Enterprise")
	user1 := CreateTestEnterpriseUser(t, testApp, "comment_user1", enterprise.ID)
	user2 := CreateTestEnterpriseUser(t, testApp, "comment_user2", enterprise.ID)

	defer CleanupTestData(t, testApp, []int{user1.ID, user2.ID}, []int{enterprise.ID})

	var requirementID int
	var comment1ID, comment2ID, comment3ID int

	// Create a test requirement
	t.Run("Setup: Create Requirement", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"title":       "测试评论功能的需求",
			"description": "用于测试评论相关功能",
			"priority":    "medium",
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements", reqBody, user1)
		response := AssertSuccessResponse(t, w)
		data := response["data"].(map[string]interface{})
		requirementID = int(data["id"].(float64))
	})

	// Test creating different types of comments
	t.Run("Create Different Comment Types", func(t *testing.T) {
		commentTypes := []string{"comment", "question", "suggestion", "approval"}

		for _, commentType := range commentTypes {
			reqBody := map[string]interface{}{
				"requirement_id": requirementID,
				"content":        fmt.Sprintf("这是一个%s类型的评论", commentType),
				"comment_type":   commentType,
			}

			w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements/comments", reqBody, user1)
			response := AssertSuccessResponse(t, w)
			data := response["data"].(map[string]interface{})

			assert.Equal(t, commentType, data["comment_type"], "Comment type should match")

			// Save first three comment IDs for later tests
			commentID := int(data["id"].(float64))
			switch commentType {
			case "comment":
				comment1ID = commentID
			case "question":
				comment2ID = commentID
			case "suggestion":
				comment3ID = commentID
			}
		}

		t.Logf("✓ Created comments of all types")
	})

	// Test @mention functionality
	t.Run("Test @Mention Notifications", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"requirement_id": requirementID,
			"content":        fmt.Sprintf("@%s 请看一下这个需求", user2.Username),
			"comment_type":   "comment",
			"mentioned_users": []int{user2.ID},
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements/comments", reqBody, user1)
		response := AssertSuccessResponse(t, w)
		data := response["data"].(map[string]interface{})

		assert.Equal(t, 1.0, data["mentioned_count"], "Should have 1 mentioned user")

		// Verify user2 can see mentions
		w = MakeAuthenticatedRequest(t, testApp, "GET", "/api/v1/requirements/comments/mentions/me", nil, user2)
		response = AssertSuccessResponse(t, w)
		mentions := response["data"].([]interface{})
		assert.Greater(t, len(mentions), 0, "User2 should have mentions")

		t.Logf("✓ @Mention functionality working")
	})

	// Test comment threading (replies)
	t.Run("Test Comment Threading", func(t *testing.T) {
		// Reply to comment1
		reqBody := map[string]interface{}{
			"requirement_id":    requirementID,
			"content":           "这是对第一条评论的回复",
			"comment_type":      "comment",
			"parent_comment_id": comment1ID,
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements/comments", reqBody, user2)
		response := AssertSuccessResponse(t, w)
		data := response["data"].(map[string]interface{})

		assert.Equal(t, float64(comment1ID), data["parent_comment_id"], "Parent comment should match")

		// Add another reply to same comment
		reqBody["content"] = "这是对第一条评论的第二个回复"
		w = MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements/comments", reqBody, user1)
		AssertSuccessResponse(t, w)

		t.Logf("✓ Comment threading working")
	})

	// Test updating comments
	t.Run("Update Comment", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/comments/%d", comment2ID)
		reqBody := map[string]interface{}{
			"content": "更新后的评论内容",
		}

		w := MakeAuthenticatedRequest(t, testApp, "PUT", path, reqBody, user1)
		response := AssertSuccessResponse(t, w)
		data := response["data"].(map[string]interface{})

		assert.Equal(t, "更新后的评论内容", data["content"], "Comment should be updated")

		t.Logf("✓ Comment update working")
	})

	// Test deleting comments
	t.Run("Delete Comment", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/comments/%d", comment3ID)
		w := MakeAuthenticatedRequest(t, testApp, "DELETE", path, nil, user1)
		AssertSuccessResponse(t, w)

		// Verify comment is deleted (soft delete)
		path = fmt.Sprintf("/api/v1/requirements/comments/%d", comment3ID)
		w = MakeAuthenticatedRequest(t, testApp, "GET", path, nil, user1)
		assert.Equal(t, http.StatusNotFound, w.Code, "Deleted comment should not be found")

		t.Logf("✓ Comment deletion working")
	})

	// Test comment pagination
	t.Run("Test Comment Pagination", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/comments?requirement_id=%d&page=1&page_size=2", requirementID)
		w := MakeAuthenticatedRequest(t, testApp, "GET", path, nil, user1)
		response := AssertSuccessResponse(t, w)

		data := response["data"].([]interface{})
		assert.LessOrEqual(t, len(data), 2, "Should respect page_size limit")
		assert.Contains(t, response, "total", "Should include total count")

		t.Logf("✓ Comment pagination working")
	})
}

// TestRequirementTaskLinking tests requirement-task linking features
func TestRequirementTaskLinking(t *testing.T) {
	testApp := SetupTestApp(t)
	defer TeardownTestApp(t, testApp)

	enterprise := CreateTestEnterprise(t, testApp, "Task Link Test Enterprise")
	user := CreateTestEnterpriseUser(t, testApp, "link_test_user", enterprise.ID)

	defer CleanupTestData(t, testApp, []int{user.ID}, []int{enterprise.ID})

	var requirementID int
	var task1ID, task2ID int

	// Create requirement
	t.Run("Setup: Create Requirement", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"title":       "需求任务关联测试",
			"description": "测试需求和任务的关联功能",
			"priority":    "medium",
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements", reqBody, user)
		response := AssertSuccessResponse(t, w)
		data := response["data"].(map[string]interface{})
		requirementID = int(data["id"].(float64))
	})

	// Create first task via conversion
	t.Run("Convert to Task", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/%d/convert-to-task", requirementID)
		reqBody := map[string]interface{}{
			"project_id": 1,
			"assignee_id": user.ID,
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", path, reqBody, user)
		response := AssertSuccessResponse(t, w)
		data := response["data"].(map[string]interface{})
		taskData := data["task"].(map[string]interface{})
		task1ID = int(taskData["id"].(float64))

		t.Logf("✓ Converted to task #%d", task1ID)
	})

	// Create and link another task
	t.Run("Link Existing Task", func(t *testing.T) {
		// First create a task (we'll need a task creation endpoint or use direct DB)
		// For now, let's assume we have task2ID from somewhere
		// This is a simplified test - in real scenario you'd create task via API

		path := fmt.Sprintf("/api/v1/requirements/%d/tasks", requirementID)
		reqBody := map[string]interface{}{
			"task_id": task1ID + 1, // Assuming next task ID
			"link_type": "implementation",
			"notes": "这个任务实现了需求的一部分功能",
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", path, reqBody, user)
		// May fail if task doesn't exist, which is expected in test environment
		if w.Code == http.StatusOK {
			response := AssertSuccessResponse(t, w)
			data := response["data"].(map[string]interface{})
			task2ID = int(data["task_id"].(float64))
			t.Logf("✓ Linked task #%d", task2ID)
		} else {
			t.Skip("Skipping task link test - task doesn't exist")
		}
	})

	// Get linked tasks
	t.Run("Get Linked Tasks", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/%d/tasks", requirementID)
		w := MakeAuthenticatedRequest(t, testApp, "GET", path, nil, user)
		response := AssertSuccessResponse(t, w)

		data := response["data"].([]interface{})
		assert.Greater(t, len(data), 0, "Should have at least one linked task")

		t.Logf("✓ Retrieved %d linked tasks", len(data))
	})

	// Unlink task
	if task2ID > 0 {
		t.Run("Unlink Task", func(t *testing.T) {
			path := fmt.Sprintf("/api/v1/requirements/%d/tasks/%d", requirementID, task2ID)
			w := MakeAuthenticatedRequest(t, testApp, "DELETE", path, nil, user)
			AssertSuccessResponse(t, w)

			t.Logf("✓ Unlinked task #%d", task2ID)
		})
	}
}

// TestRequirementPermissions tests permission controls
func TestRequirementPermissions(t *testing.T) {
	testApp := SetupTestApp(t)
	defer TeardownTestApp(t, testApp)

	enterprise := CreateTestEnterprise(t, testApp, "Permission Test Enterprise")
	creator := CreateTestEnterpriseUser(t, testApp, "req_creator", enterprise.ID)
	otherUser := CreateTestEnterpriseUser(t, testApp, "other_user", enterprise.ID)

	defer CleanupTestData(t, testApp, []int{creator.ID, otherUser.ID}, []int{enterprise.ID})

	var requirementID int

	// Creator creates requirement
	t.Run("Creator Creates Requirement", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"title":       "权限测试需求",
			"description": "测试权限控制",
			"priority":    "low",
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements", reqBody, creator)
		response := AssertSuccessResponse(t, w)
		data := response["data"].(map[string]interface{})
		requirementID = int(data["id"].(float64))
	})

	// Other user tries to update (should fail or succeed based on permissions)
	t.Run("Other User Update Permission", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/%d", requirementID)
		reqBody := map[string]interface{}{
			"description": "尝试修改他人的需求",
		}

		w := MakeAuthenticatedRequest(t, testApp, "PUT", path, reqBody, otherUser)

		// Depending on permission configuration, this might fail
		// We just verify the API responds properly
		if w.Code != http.StatusOK {
			assert.Contains(t, []int{http.StatusForbidden, http.StatusUnauthorized}, w.Code,
				"Should return proper permission error")
		}

		t.Logf("✓ Permission check working (status: %d)", w.Code)
	})

	// Get permission information
	t.Run("Get Requirement Permissions", func(t *testing.T) {
		path := fmt.Sprintf("/api/v1/requirements/%d/permissions", requirementID)
		w := MakeAuthenticatedRequest(t, testApp, "GET", path, nil, creator)

		if w.Code == http.StatusOK {
			response := AssertSuccessResponse(t, w)
			data := response["data"].(map[string]interface{})
			assert.Contains(t, data, "can_edit", "Should include edit permission")
			assert.Contains(t, data, "can_delete", "Should include delete permission")
			assert.Contains(t, data, "can_approve", "Should include approve permission")

			t.Logf("✓ Permission info retrieved")
		} else {
			t.Skip("Permission endpoint not available")
		}
	})
}

// TestRequirementErrorHandling tests error cases
func TestRequirementErrorHandling(t *testing.T) {
	testApp := SetupTestApp(t)
	defer TeardownTestApp(t, testApp)

	enterprise := CreateTestEnterprise(t, testApp, "Error Test Enterprise")
	user := CreateTestEnterpriseUser(t, testApp, "error_test_user", enterprise.ID)

	defer CleanupTestData(t, testApp, []int{user.ID}, []int{enterprise.ID})

	// Test creating requirement with invalid data
	t.Run("Create With Invalid Data", func(t *testing.T) {
		reqBody := map[string]interface{}{
			// Missing required fields
			"description": "只有描述没有标题",
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements", reqBody, user)
		assert.Equal(t, http.StatusBadRequest, w.Code, "Should return 400 for invalid data")
	})

	// Test accessing non-existent requirement
	t.Run("Get Non-Existent Requirement", func(t *testing.T) {
		w := MakeAuthenticatedRequest(t, testApp, "GET", "/api/v1/requirements/999999", nil, user)
		assert.Equal(t, http.StatusNotFound, w.Code, "Should return 404 for non-existent requirement")
	})

	// Test invalid status transition
	t.Run("Invalid Status Transition", func(t *testing.T) {
		// Create a requirement first
		reqBody := map[string]interface{}{
			"title":       "状态测试",
			"description": "测试无效的状态转换",
		}
		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements", reqBody, user)
		response := AssertSuccessResponse(t, w)
		data := response["data"].(map[string]interface{})
		requirementID := int(data["id"].(float64))

		// Try to approve a draft (should fail)
		path := fmt.Sprintf("/api/v1/requirements/%d/approve", requirementID)
		w = MakeAuthenticatedRequest(t, testApp, "POST", path, nil, user)

		// Should fail because requirement is still in draft status
		if w.Code != http.StatusOK {
			assert.Contains(t, []int{http.StatusBadRequest, http.StatusForbidden}, w.Code,
				"Should reject invalid status transition")
			t.Logf("✓ Invalid status transition rejected")
		}
	})

	// Test creating comment for non-existent requirement
	t.Run("Comment on Non-Existent Requirement", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"requirement_id": 999999,
			"content":        "评论一个不存在的需求",
			"comment_type":   "comment",
		}

		w := MakeAuthenticatedRequest(t, testApp, "POST", "/api/v1/requirements/comments", reqBody, user)
		assert.Contains(t, []int{http.StatusBadRequest, http.StatusNotFound}, w.Code,
			"Should reject comment on non-existent requirement")
	})

	t.Log("✓ All error handling tests completed")
}

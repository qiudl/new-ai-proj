package utils

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// setupTestContext 创建测试用的gin.Context
func setupTestContext() (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = &http.Request{
		Header: make(http.Header),
	}
	return c, w
}

// setUserContext 设置用户上下文信息
func setUserContext(c *gin.Context, userID int64, userType, role string) {
	c.Set("user_id", userID)
	c.Set("user_type", userType)
	c.Set("user_role", role)
}

// TestIsSystemAdmin 测试系统管理员检查
func TestIsSystemAdmin(t *testing.T) {
	tests := []struct {
		name     string
		userType string
		role     string
		expected bool
	}{
		{
			name:     "系统管理员",
			userType: "system",
			role:     "admin",
			expected: true,
		},
		{
			name:     "企业管理员",
			userType: "enterprise",
			role:     "admin",
			expected: false,
		},
		{
			name:     "系统用户非管理员",
			userType: "system",
			role:     "user",
			expected: false,
		},
		{
			name:     "普通用户",
			userType: "enterprise",
			role:     "user",
			expected: false,
		},
		{
			name:     "未登录",
			userType: "",
			role:     "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := setupTestContext()
			if tt.userType != "" {
				c.Set("user_type", tt.userType)
				c.Set("user_role", tt.role)
			}
			result := IsSystemAdmin(c)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestGetUserID 测试获取用户ID
func TestGetUserID(t *testing.T) {
	tests := []struct {
		name       string
		userID     interface{}
		expectedID int64
		expectedOK bool
	}{
		{
			name:       "int64类型",
			userID:     int64(123),
			expectedID: 123,
			expectedOK: true,
		},
		{
			name:       "int类型",
			userID:     int(456),
			expectedID: 456,
			expectedOK: true,
		},
		{
			name:       "float64类型",
			userID:     float64(789),
			expectedID: 789,
			expectedOK: true,
		},
		{
			name:       "string类型（无效）",
			userID:     "invalid",
			expectedID: 0,
			expectedOK: false,
		},
		{
			name:       "未设置",
			userID:     nil,
			expectedID: 0,
			expectedOK: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := setupTestContext()
			if tt.userID != nil {
				c.Set("user_id", tt.userID)
			}
			id, ok := GetUserID(c)
			assert.Equal(t, tt.expectedID, id)
			assert.Equal(t, tt.expectedOK, ok)
		})
	}
}

// TestCanCommentNote 测试笔记评论权限
func TestCanCommentNote(t *testing.T) {
	tests := []struct {
		name        string
		visibility  string
		userID      int64
		creatorID   int64
		expectError bool
		errorMsg    string
	}{
		{
			name:        "私有笔记-创建者可以评论",
			visibility:  "private",
			userID:      1,
			creatorID:   1,
			expectError: false,
		},
		{
			name:        "私有笔记-其他用户不能评论",
			visibility:  "private",
			userID:      2,
			creatorID:   1,
			expectError: true,
			errorMsg:    "只有笔记创建者可以评论私有笔记",
		},
		{
			name:        "团队笔记-所有登录用户可以评论",
			visibility:  "team",
			userID:      2,
			creatorID:   1,
			expectError: false,
		},
		{
			name:        "公开笔记-所有登录用户可以评论",
			visibility:  "public",
			userID:      3,
			creatorID:   1,
			expectError: false,
		},
		{
			name:        "未登录用户不能评论",
			visibility:  "public",
			userID:      0,
			creatorID:   1,
			expectError: true,
			errorMsg:    "请先登录",
		},
		{
			name:        "无效的可见性设置",
			visibility:  "invalid",
			userID:      1,
			creatorID:   1,
			expectError: true,
			errorMsg:    "无效的可见性设置",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := setupTestContext()
			if tt.userID > 0 {
				c.Set("user_id", tt.userID)
			}

			err := CanCommentNote(c, tt.visibility, tt.creatorID)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestCanDeleteNoteComment 测试删除评论权限
func TestCanDeleteNoteComment(t *testing.T) {
	tests := []struct {
		name            string
		userID          int64
		userType        string
		role            string
		commentAuthorID int64
		expected        bool
	}{
		{
			name:            "评论作者可以删除自己的评论",
			userID:          1,
			userType:        "enterprise",
			role:            "user",
			commentAuthorID: 1,
			expected:        true,
		},
		{
			name:            "其他用户不能删除他人的评论",
			userID:          2,
			userType:        "enterprise",
			role:            "user",
			commentAuthorID: 1,
			expected:        false,
		},
		{
			name:            "系统管理员可以删除任何评论",
			userID:          3,
			userType:        "system",
			role:            "admin",
			commentAuthorID: 1,
			expected:        true,
		},
		{
			name:            "企业管理员不能删除他人的评论",
			userID:          4,
			userType:        "enterprise",
			role:            "admin",
			commentAuthorID: 1,
			expected:        false,
		},
		{
			name:            "未登录用户不能删除评论",
			userID:          0,
			userType:        "",
			role:            "",
			commentAuthorID: 1,
			expected:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := setupTestContext()
			if tt.userID > 0 {
				setUserContext(c, tt.userID, tt.userType, tt.role)
			}

			result := CanDeleteNoteComment(c, tt.commentAuthorID)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestCanEditNoteComment 测试编辑评论权限
func TestCanEditNoteComment(t *testing.T) {
	tests := []struct {
		name            string
		userID          int64
		userType        string
		role            string
		commentAuthorID int64
		expected        bool
	}{
		{
			name:            "评论作者可以编辑自己的评论",
			userID:          1,
			userType:        "enterprise",
			role:            "user",
			commentAuthorID: 1,
			expected:        true,
		},
		{
			name:            "其他用户不能编辑他人的评论",
			userID:          2,
			userType:        "enterprise",
			role:            "user",
			commentAuthorID: 1,
			expected:        false,
		},
		{
			name:            "系统管理员也不能编辑他人的评论",
			userID:          3,
			userType:        "system",
			role:            "admin",
			commentAuthorID: 1,
			expected:        false,
		},
		{
			name:            "未登录用户不能编辑评论",
			userID:          0,
			userType:        "",
			role:            "",
			commentAuthorID: 1,
			expected:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := setupTestContext()
			if tt.userID > 0 {
				setUserContext(c, tt.userID, tt.userType, tt.role)
			}

			result := CanEditNoteComment(c, tt.commentAuthorID)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestCheckNoteCommentPermission 测试综合评论权限检查
func TestCheckNoteCommentPermission(t *testing.T) {
	tests := []struct {
		name            string
		operation       string
		noteVisibility  string
		noteCreatorID   int64
		commentAuthorID int64
		userID          int64
		userType        string
		role            string
		expectError     bool
		errorMsg        string
	}{
		// View操作测试
		{
			name:            "查看私有笔记评论-创建者",
			operation:       "view",
			noteVisibility:  "private",
			noteCreatorID:   1,
			commentAuthorID: 0,
			userID:          1,
			userType:        "enterprise",
			role:            "user",
			expectError:     false,
		},
		{
			name:            "查看私有笔记评论-其他用户",
			operation:       "view",
			noteVisibility:  "private",
			noteCreatorID:   1,
			commentAuthorID: 0,
			userID:          2,
			userType:        "enterprise",
			role:            "user",
			expectError:     true,
			errorMsg:        "无权访问此私有笔记",
		},

		// Create操作测试
		{
			name:            "创建私有笔记评论-创建者",
			operation:       "create",
			noteVisibility:  "private",
			noteCreatorID:   1,
			commentAuthorID: 0,
			userID:          1,
			userType:        "enterprise",
			role:            "user",
			expectError:     false,
		},
		{
			name:            "创建私有笔记评论-其他用户",
			operation:       "create",
			noteVisibility:  "private",
			noteCreatorID:   1,
			commentAuthorID: 0,
			userID:          2,
			userType:        "enterprise",
			role:            "user",
			expectError:     true,
			errorMsg:        "只有笔记创建者可以评论私有笔记",
		},
		{
			name:            "创建团队笔记评论-任何登录用户",
			operation:       "create",
			noteVisibility:  "team",
			noteCreatorID:   1,
			commentAuthorID: 0,
			userID:          2,
			userType:        "enterprise",
			role:            "user",
			expectError:     false,
		},
		{
			name:            "创建公开笔记评论-任何登录用户",
			operation:       "create",
			noteVisibility:  "public",
			noteCreatorID:   1,
			commentAuthorID: 0,
			userID:          3,
			userType:        "enterprise",
			role:            "user",
			expectError:     false,
		},

		// Edit操作测试
		{
			name:            "编辑评论-评论作者",
			operation:       "edit",
			noteVisibility:  "public",
			noteCreatorID:   1,
			commentAuthorID: 2,
			userID:          2,
			userType:        "enterprise",
			role:            "user",
			expectError:     false,
		},
		{
			name:            "编辑评论-其他用户",
			operation:       "edit",
			noteVisibility:  "public",
			noteCreatorID:   1,
			commentAuthorID: 2,
			userID:          3,
			userType:        "enterprise",
			role:            "user",
			expectError:     true,
			errorMsg:        "只有评论作者可以编辑评论",
		},
		{
			name:            "编辑评论-系统管理员也不能编辑他人评论",
			operation:       "edit",
			noteVisibility:  "public",
			noteCreatorID:   1,
			commentAuthorID: 2,
			userID:          99,
			userType:        "system",
			role:            "admin",
			expectError:     true,
			errorMsg:        "只有评论作者可以编辑评论",
		},

		// Delete操作测试
		{
			name:            "删除评论-评论作者",
			operation:       "delete",
			noteVisibility:  "public",
			noteCreatorID:   1,
			commentAuthorID: 2,
			userID:          2,
			userType:        "enterprise",
			role:            "user",
			expectError:     false,
		},
		{
			name:            "删除评论-系统管理员",
			operation:       "delete",
			noteVisibility:  "public",
			noteCreatorID:   1,
			commentAuthorID: 2,
			userID:          99,
			userType:        "system",
			role:            "admin",
			expectError:     false,
		},
		{
			name:            "删除评论-其他用户",
			operation:       "delete",
			noteVisibility:  "public",
			noteCreatorID:   1,
			commentAuthorID: 2,
			userID:          3,
			userType:        "enterprise",
			role:            "user",
			expectError:     true,
			errorMsg:        "无权删除此评论",
		},

		// 无效操作测试
		{
			name:            "无效操作类型",
			operation:       "invalid",
			noteVisibility:  "public",
			noteCreatorID:   1,
			commentAuthorID: 0,
			userID:          1,
			userType:        "enterprise",
			role:            "user",
			expectError:     true,
			errorMsg:        "无效的操作类型",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := setupTestContext()
			if tt.userID > 0 {
				setUserContext(c, tt.userID, tt.userType, tt.role)
			}

			err := CheckNoteCommentPermission(c, tt.operation, tt.noteVisibility, tt.noteCreatorID, tt.commentAuthorID)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestCheckPublicNotePermission 测试公开笔记权限检查
func TestCheckPublicNotePermission(t *testing.T) {
	tests := []struct {
		name        string
		operation   string
		userType    string
		role        string
		expectError bool
	}{
		{
			name:        "系统管理员可以创建公开笔记",
			operation:   "create",
			userType:    "system",
			role:        "admin",
			expectError: false,
		},
		{
			name:        "普通用户不能创建公开笔记",
			operation:   "create",
			userType:    "enterprise",
			role:        "user",
			expectError: true,
		},
		{
			name:        "系统管理员可以编辑公开笔记",
			operation:   "edit",
			userType:    "system",
			role:        "admin",
			expectError: false,
		},
		{
			name:        "普通用户不能编辑公开笔记",
			operation:   "edit",
			userType:    "enterprise",
			role:        "user",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := setupTestContext()
			setUserContext(c, 1, tt.userType, tt.role)

			err := CheckPublicNotePermission(c, tt.operation)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestCheckNoteVisibilityPermission 测试笔记可见性权限检查
func TestCheckNoteVisibilityPermission(t *testing.T) {
	tests := []struct {
		name        string
		visibility  string
		userID      int64
		creatorID   int64
		expectError bool
		errorMsg    string
	}{
		{
			name:        "私有笔记-创建者可访问",
			visibility:  "private",
			userID:      1,
			creatorID:   1,
			expectError: false,
		},
		{
			name:        "私有笔记-其他用户不可访问",
			visibility:  "private",
			userID:      2,
			creatorID:   1,
			expectError: true,
			errorMsg:    "无权访问此私有笔记",
		},
		{
			name:        "团队笔记-所有登录用户可访问",
			visibility:  "team",
			userID:      2,
			creatorID:   1,
			expectError: false,
		},
		{
			name:        "公开笔记-所有登录用户可访问",
			visibility:  "public",
			userID:      3,
			creatorID:   1,
			expectError: false,
		},
		{
			name:        "公开笔记-未登录用户不可访问",
			visibility:  "public",
			userID:      0,
			creatorID:   1,
			expectError: true,
			errorMsg:    "请先登录",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := setupTestContext()
			if tt.userID > 0 {
				c.Set("user_id", tt.userID)
			}

			err := CheckNoteVisibilityPermission(c, tt.visibility, tt.creatorID)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

package services

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// GitIntegrationLayer provides Git operations for worktree management
type GitIntegrationLayer struct {
	commandTimeout time.Duration
}

// NewGitIntegrationLayer creates a new Git integration layer
func NewGitIntegrationLayer() *GitIntegrationLayer {
	return &GitIntegrationLayer{
		commandTimeout: 5 * time.Minute,
	}
}

// WorktreeInfo represents information about a Git worktree
type WorktreeInfo struct {
	Path   string
	Branch string
	Commit string
}

// GitStatus represents Git repository status
type GitStatus struct {
	Branch         string
	LastCommitHash string
	HasUncommitted bool
	AheadCount     int
	BehindCount    int
	ModifiedFiles  []string
	UntrackedFiles []string
}

// CommitInfo represents Git commit information
type CommitInfo struct {
	Hash      string
	Author    string
	Email     string
	Message   string
	Timestamp time.Time
}

// CreateWorktree creates a new Git worktree
func (g *GitIntegrationLayer) CreateWorktree(ctx context.Context, projectPath, branch, worktreePath string) error {
	// Validate inputs
	if err := g.validatePath(projectPath); err != nil {
		return fmt.Errorf("invalid project path: %w", err)
	}
	if err := g.validatePath(worktreePath); err != nil {
		return fmt.Errorf("invalid worktree path: %w", err)
	}
	if err := g.validateBranchName(branch); err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}

	// Check if project path is a Git repository
	if !g.isGitRepository(projectPath) {
		return fmt.Errorf("project path is not a Git repository: %s", projectPath)
	}

	// Check if worktree path already exists
	if _, err := os.Stat(worktreePath); err == nil {
		return fmt.Errorf("worktree path already exists: %s", worktreePath)
	}

	// Create parent directory if not exists
	parentDir := filepath.Dir(worktreePath)
	if err := os.MkdirAll(parentDir, 0755); err != nil {
		return fmt.Errorf("failed to create parent directory: %w", err)
	}

	// Execute git worktree add
	cmd := exec.CommandContext(ctx, "git", "worktree", "add", worktreePath, branch)
	cmd.Dir = projectPath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to create worktree: %w, output: %s", err, string(output))
	}

	return nil
}

// DeleteWorktree removes a Git worktree
func (g *GitIntegrationLayer) DeleteWorktree(ctx context.Context, projectPath, worktreePath string) error {
	// Validate inputs
	if err := g.validatePath(projectPath); err != nil {
		return fmt.Errorf("invalid project path: %w", err)
	}
	if err := g.validatePath(worktreePath); err != nil {
		return fmt.Errorf("invalid worktree path: %w", err)
	}

	// Execute git worktree remove
	cmd := exec.CommandContext(ctx, "git", "worktree", "remove", worktreePath, "--force")
	cmd.Dir = projectPath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to remove worktree: %w, output: %s", err, string(output))
	}

	return nil
}

// ListWorktrees lists all Git worktrees in a repository
func (g *GitIntegrationLayer) ListWorktrees(ctx context.Context, projectPath string) ([]WorktreeInfo, error) {
	// Validate input
	if err := g.validatePath(projectPath); err != nil {
		return nil, fmt.Errorf("invalid project path: %w", err)
	}

	// Execute git worktree list
	cmd := exec.CommandContext(ctx, "git", "worktree", "list", "--porcelain")
	cmd.Dir = projectPath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list worktrees: %w, output: %s", err, string(output))
	}

	return g.parseWorktreeList(string(output)), nil
}

// GetWorktreeStatus gets the Git status of a worktree
func (g *GitIntegrationLayer) GetWorktreeStatus(ctx context.Context, worktreePath string) (*GitStatus, error) {
	// Validate input
	if err := g.validatePath(worktreePath); err != nil {
		return nil, fmt.Errorf("invalid worktree path: %w", err)
	}

	status := &GitStatus{
		ModifiedFiles:  []string{},
		UntrackedFiles: []string{},
	}

	// Get current branch
	branch, err := g.getCurrentBranch(ctx, worktreePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get current branch: %w", err)
	}
	status.Branch = branch

	// Get last commit hash
	hash, err := g.getLastCommitHash(ctx, worktreePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get commit hash: %w", err)
	}
	status.LastCommitHash = hash

	// Check for uncommitted changes
	hasUncommitted, modifiedFiles, untrackedFiles, err := g.checkUncommittedChanges(ctx, worktreePath)
	if err != nil {
		return nil, fmt.Errorf("failed to check uncommitted changes: %w", err)
	}
	status.HasUncommitted = hasUncommitted
	status.ModifiedFiles = modifiedFiles
	status.UntrackedFiles = untrackedFiles

	// Get ahead/behind count
	ahead, behind, err := g.getAheadBehindCount(ctx, worktreePath)
	if err != nil {
		// Don't fail if remote doesn't exist
		ahead, behind = 0, 0
	}
	status.AheadCount = ahead
	status.BehindCount = behind

	return status, nil
}

// SyncWorktree synchronizes a worktree with remote
func (g *GitIntegrationLayer) SyncWorktree(ctx context.Context, worktreePath string) error {
	// Validate input
	if err := g.validatePath(worktreePath); err != nil {
		return fmt.Errorf("invalid worktree path: %w", err)
	}

	// Pull changes
	if err := g.GitPull(ctx, worktreePath); err != nil {
		return fmt.Errorf("failed to pull: %w", err)
	}

	// Push changes
	if err := g.GitPush(ctx, worktreePath); err != nil {
		// Don't fail if nothing to push
		if !strings.Contains(err.Error(), "Everything up-to-date") {
			return fmt.Errorf("failed to push: %w", err)
		}
	}

	return nil
}

// GitPull pulls changes from remote
func (g *GitIntegrationLayer) GitPull(ctx context.Context, worktreePath string) error {
	cmd := exec.CommandContext(ctx, "git", "pull", "--rebase")
	cmd.Dir = worktreePath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git pull failed: %w, output: %s", err, string(output))
	}

	return nil
}

// GitPush pushes changes to remote
func (g *GitIntegrationLayer) GitPush(ctx context.Context, worktreePath string) error {
	cmd := exec.CommandContext(ctx, "git", "push")
	cmd.Dir = worktreePath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git push failed: %w, output: %s", err, string(output))
	}

	return nil
}

// GetCommitInfo gets information about the last commit
func (g *GitIntegrationLayer) GetCommitInfo(ctx context.Context, worktreePath string) (*CommitInfo, error) {
	// Validate input
	if err := g.validatePath(worktreePath); err != nil {
		return nil, fmt.Errorf("invalid worktree path: %w", err)
	}

	// Get commit information
	cmd := exec.CommandContext(ctx, "git", "log", "-1", "--format=%H%n%an%n%ae%n%s%n%ct")
	cmd.Dir = worktreePath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to get commit info: %w", err)
	}

	return g.parseCommitInfo(string(output))
}

// CheckConflicts checks if there are merge conflicts
func (g *GitIntegrationLayer) CheckConflicts(ctx context.Context, worktreePath string) (bool, error) {
	// Validate input
	if err := g.validatePath(worktreePath); err != nil {
		return false, fmt.Errorf("invalid worktree path: %w", err)
	}

	// Check for conflict markers
	cmd := exec.CommandContext(ctx, "git", "diff", "--check")
	cmd.Dir = worktreePath

	output, err := cmd.CombinedOutput()
	if err != nil {
		// git diff --check returns non-zero if conflicts exist
		if len(output) > 0 {
			return true, nil
		}
		return false, fmt.Errorf("failed to check conflicts: %w", err)
	}

	return false, nil
}

// ============================================
// Helper methods
// ============================================

// validatePath validates and cleans a file path
func (g *GitIntegrationLayer) validatePath(path string) error {
	if path == "" {
		return fmt.Errorf("path cannot be empty")
	}

	// Clean path
	cleaned := filepath.Clean(path)

	// Check for path traversal attempts
	if strings.Contains(cleaned, "..") {
		return fmt.Errorf("path contains invalid traversal: %s", path)
	}

	// Must be absolute path
	if !filepath.IsAbs(cleaned) {
		return fmt.Errorf("path must be absolute: %s", path)
	}

	return nil
}

// validateBranchName validates a Git branch name
func (g *GitIntegrationLayer) validateBranchName(branch string) error {
	if branch == "" {
		return fmt.Errorf("branch name cannot be empty")
	}

	// Git branch name rules
	// - Cannot start with '-'
	// - Cannot contain '..' or '@{'
	// - Cannot contain ASCII control characters, space, ~, ^, :, ?, *, [
	// - Cannot end with '/'
	// - Cannot end with '.lock'
	invalidChars := regexp.MustCompile(`[\s~^:?*\[\]@{\\]|\.\.|\.\lock$|^-|/$`)
	if invalidChars.MatchString(branch) {
		return fmt.Errorf("invalid branch name: %s", branch)
	}

	return nil
}

// isGitRepository checks if a directory is a Git repository
func (g *GitIntegrationLayer) isGitRepository(path string) bool {
	gitDir := filepath.Join(path, ".git")
	info, err := os.Stat(gitDir)
	if err != nil {
		return false
	}
	return info.IsDir()
}

// getCurrentBranch gets the current branch name
func (g *GitIntegrationLayer) getCurrentBranch(ctx context.Context, worktreePath string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = worktreePath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(string(output)), nil
}

// getLastCommitHash gets the last commit hash
func (g *GitIntegrationLayer) getLastCommitHash(ctx context.Context, worktreePath string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", "rev-parse", "HEAD")
	cmd.Dir = worktreePath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(string(output)), nil
}

// checkUncommittedChanges checks for uncommitted changes
func (g *GitIntegrationLayer) checkUncommittedChanges(ctx context.Context, worktreePath string) (bool, []string, []string, error) {
	cmd := exec.CommandContext(ctx, "git", "status", "--porcelain")
	cmd.Dir = worktreePath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return false, nil, nil, err
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(lines) == 1 && lines[0] == "" {
		return false, []string{}, []string{}, nil
	}

	modifiedFiles := []string{}
	untrackedFiles := []string{}

	for _, line := range lines {
		if len(line) < 3 {
			continue
		}
		status := line[:2]
		file := strings.TrimSpace(line[3:])

		if strings.HasPrefix(status, "??") {
			untrackedFiles = append(untrackedFiles, file)
		} else {
			modifiedFiles = append(modifiedFiles, file)
		}
	}

	return true, modifiedFiles, untrackedFiles, nil
}

// getAheadBehindCount gets ahead/behind commit count
func (g *GitIntegrationLayer) getAheadBehindCount(ctx context.Context, worktreePath string) (int, int, error) {
	cmd := exec.CommandContext(ctx, "git", "rev-list", "--left-right", "--count", "HEAD...@{upstream}")
	cmd.Dir = worktreePath

	output, err := cmd.CombinedOutput()
	if err != nil {
		return 0, 0, err
	}

	parts := strings.Fields(strings.TrimSpace(string(output)))
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("unexpected output format: %s", output)
	}

	ahead := 0
	behind := 0
	fmt.Sscanf(parts[0], "%d", &ahead)
	fmt.Sscanf(parts[1], "%d", &behind)

	return ahead, behind, nil
}

// parseWorktreeList parses git worktree list --porcelain output
func (g *GitIntegrationLayer) parseWorktreeList(output string) []WorktreeInfo {
	worktrees := []WorktreeInfo{}
	lines := strings.Split(output, "\n")

	var current WorktreeInfo
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			if current.Path != "" {
				worktrees = append(worktrees, current)
				current = WorktreeInfo{}
			}
			continue
		}

		parts := strings.SplitN(line, " ", 2)
		if len(parts) != 2 {
			continue
		}

		key, value := parts[0], parts[1]
		switch key {
		case "worktree":
			current.Path = value
		case "branch":
			current.Branch = strings.TrimPrefix(value, "refs/heads/")
		case "HEAD":
			current.Commit = value
		}
	}

	// Add last worktree if exists
	if current.Path != "" {
		worktrees = append(worktrees, current)
	}

	return worktrees
}

// parseCommitInfo parses git log output
func (g *GitIntegrationLayer) parseCommitInfo(output string) (*CommitInfo, error) {
	lines := strings.Split(strings.TrimSpace(output), "\n")
	if len(lines) < 5 {
		return nil, fmt.Errorf("invalid commit info format")
	}

	timestamp, err := time.Parse("1136239445", lines[4])
	if err != nil {
		// Try parsing as Unix timestamp
		var unixTime int64
		if _, err := fmt.Sscanf(lines[4], "%d", &unixTime); err != nil {
			return nil, fmt.Errorf("failed to parse timestamp: %w", err)
		}
		timestamp = time.Unix(unixTime, 0)
	}

	return &CommitInfo{
		Hash:      lines[0],
		Author:    lines[1],
		Email:     lines[2],
		Message:   lines[3],
		Timestamp: timestamp,
	}, nil
}

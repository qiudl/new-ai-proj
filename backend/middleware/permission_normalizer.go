package middleware

import (
	"strings"
)

// NormalizePermissionCode converts various permission code styles to canonical dot notation
// Examples:
// - "task:read" -> "task.read"
// - "project:list" -> "project.list.read"
// - "document:write" -> "document.update"
func NormalizePermissionCode(code string) string {
	c := strings.TrimSpace(strings.ToLower(code))
	if c == "" {
		return c
	}
	// 1) Replace colon with dot
	c = strings.ReplaceAll(c, ":", ".")

	// 2) Expand shorthand "*.list" -> "*.list.read"
	parts := strings.Split(c, ".")
	if len(parts) == 2 && parts[1] == "list" {
		c = parts[0] + ".list.read"
		parts = strings.Split(c, ".")
	}

	// 3) Map common aliases on last segment
	if len(parts) > 0 {
		last := parts[len(parts)-1]
		switch last {
		case "write":
			parts[len(parts)-1] = "update"
		}
		c = strings.Join(parts, ".")
	}

	return c
}

// NormalizePermissionCodes maps and de-duplicates permission codes
func NormalizePermissionCodes(codes []string) []string {
	seen := make(map[string]struct{}, len(codes))
	out := make([]string, 0, len(codes))
	for _, code := range codes {
		n := NormalizePermissionCode(code)
		if _, ok := seen[n]; ok {
			continue
		}
		seen[n] = struct{}{}
		out = append(out, n)
	}
	return out
}
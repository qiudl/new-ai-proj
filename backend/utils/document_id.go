package utils

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// DocumentIDPrefix 文档类型前缀常量
type DocumentIDPrefix string

const (
	PrefixDocument     DocumentIDPrefix = "DOC"  // 任务文档
	PrefixNote         DocumentIDPrefix = "NOTE" // 工作笔记
	PrefixAPI          DocumentIDPrefix = "API"  // API文档
	PrefixSpecification DocumentIDPrefix = "SPEC" // 设计规格
	PrefixFile         DocumentIDPrefix = "FILE" // 通用文档
)

// DisplayIDPattern 正则表达式验证 display_id 格式
var DisplayIDPattern = regexp.MustCompile(`^(DOC|NOTE|API|SPEC|FILE)-(\d+)$`)

// ParseDisplayID 解析 display_id，返回前缀和数字部分
// 例如: "DOC-10001" -> ("DOC", 10001, nil)
func ParseDisplayID(displayID string) (prefix string, number int, err error) {
	if displayID == "" {
		return "", 0, fmt.Errorf("display_id cannot be empty")
	}

	matches := DisplayIDPattern.FindStringSubmatch(displayID)
	if len(matches) != 3 {
		return "", 0, fmt.Errorf("invalid display_id format: %s (expected format: PREFIX-NUMBER)", displayID)
	}

	prefix = matches[1]
	number, err = strconv.Atoi(matches[2])
	if err != nil {
		return "", 0, fmt.Errorf("invalid number in display_id: %s", displayID)
	}

	return prefix, number, nil
}

// IsValidDisplayID 验证 display_id 格式是否正确
func IsValidDisplayID(displayID string) bool {
	_, _, err := ParseDisplayID(displayID)
	return err == nil
}

// IsNumericID 判断输入是否为纯数字ID（内部ID）
func IsNumericID(input string) bool {
	_, err := strconv.Atoi(input)
	return err == nil
}

// FormatDisplayID 格式化生成 display_id
// 例如: ("DOC", 10001) -> "DOC-10001"
func FormatDisplayID(prefix string, number int) string {
	return fmt.Sprintf("%s-%d", strings.ToUpper(prefix), number)
}

// GetPrefixDescription 获取前缀的中文描述
func GetPrefixDescription(prefix string) string {
	switch DocumentIDPrefix(prefix) {
	case PrefixDocument:
		return "任务文档"
	case PrefixNote:
		return "工作笔记"
	case PrefixAPI:
		return "API文档"
	case PrefixSpecification:
		return "设计规格"
	case PrefixFile:
		return "通用文档"
	default:
		return "未知类型"
	}
}

// ValidatePrefix 验证前缀是否有效
func ValidatePrefix(prefix string) bool {
	validPrefixes := []DocumentIDPrefix{
		PrefixDocument,
		PrefixNote,
		PrefixAPI,
		PrefixSpecification,
		PrefixFile,
	}

	for _, validPrefix := range validPrefixes {
		if DocumentIDPrefix(prefix) == validPrefix {
			return true
		}
	}
	return false
}

// NormalizeDocumentID 标准化文档ID输入
// 如果是纯数字，返回内部ID；如果是display_id格式，验证后返回
func NormalizeDocumentID(input string) (isDisplayID bool, value string, err error) {
	input = strings.TrimSpace(input)

	if input == "" {
		return false, "", fmt.Errorf("document ID cannot be empty")
	}

	// 判断是否为纯数字（内部ID）
	if IsNumericID(input) {
		return false, input, nil
	}

	// 验证 display_id 格式
	if IsValidDisplayID(input) {
		return true, input, nil
	}

	return false, "", fmt.Errorf("invalid document ID format: %s", input)
}

// GetSequenceNameByPrefix 根据前缀获取对应的序列名称
func GetSequenceNameByPrefix(prefix string) string {
	switch DocumentIDPrefix(prefix) {
	case PrefixDocument:
		return "seq_doc_documents"
	case PrefixNote:
		return "seq_doc_notes"
	case PrefixAPI:
		return "seq_doc_api"
	case PrefixSpecification:
		return "seq_doc_spec"
	case PrefixFile:
		return "seq_doc_file"
	default:
		return "seq_doc_file" // 默认使用通用文档序列
	}
}

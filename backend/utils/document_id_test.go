package utils

import (
	"testing"
)

func TestParseDisplayID(t *testing.T) {
	tests := []struct {
		name        string
		displayID   string
		wantPrefix  string
		wantNumber  int
		wantErr     bool
	}{
		{
			name:        "Valid DOC ID",
			displayID:   "DOC-10001",
			wantPrefix:  "DOC",
			wantNumber:  10001,
			wantErr:     false,
		},
		{
			name:        "Valid NOTE ID",
			displayID:   "NOTE-20001",
			wantPrefix:  "NOTE",
			wantNumber:  20001,
			wantErr:     false,
		},
		{
			name:        "Valid API ID",
			displayID:   "API-30001",
			wantPrefix:  "API",
			wantNumber:  30001,
			wantErr:     false,
		},
		{
			name:        "Valid SPEC ID",
			displayID:   "SPEC-40001",
			wantPrefix:  "SPEC",
			wantNumber:  40001,
			wantErr:     false,
		},
		{
			name:        "Valid FILE ID",
			displayID:   "FILE-50001",
			wantPrefix:  "FILE",
			wantNumber:  50001,
			wantErr:     false,
		},
		{
			name:        "Invalid prefix",
			displayID:   "INVALID-10001",
			wantPrefix:  "",
			wantNumber:  0,
			wantErr:     true,
		},
		{
			name:        "Invalid format - no dash",
			displayID:   "DOC10001",
			wantPrefix:  "",
			wantNumber:  0,
			wantErr:     true,
		},
		{
			name:        "Invalid format - no number",
			displayID:   "DOC-",
			wantPrefix:  "",
			wantNumber:  0,
			wantErr:     true,
		},
		{
			name:        "Empty string",
			displayID:   "",
			wantPrefix:  "",
			wantNumber:  0,
			wantErr:     true,
		},
		{
			name:        "Number with leading zeros",
			displayID:   "DOC-00123",
			wantPrefix:  "DOC",
			wantNumber:  123,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prefix, number, err := ParseDisplayID(tt.displayID)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseDisplayID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if prefix != tt.wantPrefix {
				t.Errorf("ParseDisplayID() prefix = %v, want %v", prefix, tt.wantPrefix)
			}
			if number != tt.wantNumber {
				t.Errorf("ParseDisplayID() number = %v, want %v", number, tt.wantNumber)
			}
		})
	}
}

func TestIsValidDisplayID(t *testing.T) {
	tests := []struct {
		name      string
		displayID string
		want      bool
	}{
		{"Valid DOC ID", "DOC-10001", true},
		{"Valid NOTE ID", "NOTE-20001", true},
		{"Valid API ID", "API-30001", true},
		{"Valid SPEC ID", "SPEC-40001", true},
		{"Valid FILE ID", "FILE-50001", true},
		{"Invalid prefix", "INVALID-10001", false},
		{"Invalid format", "DOC10001", false},
		{"Empty string", "", false},
		{"Just prefix", "DOC-", false},
		{"Just number", "10001", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsValidDisplayID(tt.displayID); got != tt.want {
				t.Errorf("IsValidDisplayID() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsNumericID(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"Valid numeric ID", "12345", true},
		{"Zero", "0", true},
		{"Negative number", "-123", true},
		{"Display ID format", "DOC-10001", false},
		{"Letters", "abc", false},
		{"Mixed alphanumeric", "123abc", false},
		{"Empty string", "", false},
		{"Decimal", "123.45", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsNumericID(tt.input); got != tt.want {
				t.Errorf("IsNumericID() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatDisplayID(t *testing.T) {
	tests := []struct {
		name   string
		prefix string
		number int
		want   string
	}{
		{"DOC format", "DOC", 10001, "DOC-10001"},
		{"NOTE format", "NOTE", 20001, "NOTE-20001"},
		{"API format", "API", 30001, "API-30001"},
		{"SPEC format", "SPEC", 40001, "SPEC-40001"},
		{"FILE format", "FILE", 50001, "FILE-50001"},
		{"Lowercase prefix", "doc", 10001, "DOC-10001"},
		{"Mixed case prefix", "NoTe", 20001, "NOTE-20001"},
		{"Single digit number", "DOC", 1, "DOC-1"},
		{"Large number", "DOC", 999999, "DOC-999999"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FormatDisplayID(tt.prefix, tt.number); got != tt.want {
				t.Errorf("FormatDisplayID() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetPrefixDescription(t *testing.T) {
	tests := []struct {
		name   string
		prefix string
		want   string
	}{
		{"DOC prefix", "DOC", "任务文档"},
		{"NOTE prefix", "NOTE", "工作笔记"},
		{"API prefix", "API", "API文档"},
		{"SPEC prefix", "SPEC", "设计规格"},
		{"FILE prefix", "FILE", "通用文档"},
		{"Invalid prefix", "INVALID", "未知类型"},
		{"Empty prefix", "", "未知类型"},
		{"Lowercase prefix", "doc", "任务文档"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := GetPrefixDescription(tt.prefix); got != tt.want {
				t.Errorf("GetPrefixDescription() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestValidatePrefix(t *testing.T) {
	tests := []struct {
		name   string
		prefix string
		want   bool
	}{
		{"Valid DOC", "DOC", true},
		{"Valid NOTE", "NOTE", true},
		{"Valid API", "API", true},
		{"Valid SPEC", "SPEC", true},
		{"Valid FILE", "FILE", true},
		{"Invalid prefix", "INVALID", false},
		{"Empty string", "", false},
		{"Lowercase valid", "doc", false}, // Case sensitive
		{"Partial match", "DO", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ValidatePrefix(tt.prefix); got != tt.want {
				t.Errorf("ValidatePrefix() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNormalizeDocumentID(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		wantIsDisplay bool
		wantValue     string
		wantErr       bool
	}{
		{
			name:          "Numeric ID",
			input:         "12345",
			wantIsDisplay: false,
			wantValue:     "12345",
			wantErr:       false,
		},
		{
			name:          "Display ID format",
			input:         "DOC-10001",
			wantIsDisplay: true,
			wantValue:     "DOC-10001",
			wantErr:       false,
		},
		{
			name:          "Display ID with spaces",
			input:         "  DOC-10001  ",
			wantIsDisplay: true,
			wantValue:     "DOC-10001",
			wantErr:       false,
		},
		{
			name:          "Numeric ID with spaces",
			input:         "  12345  ",
			wantIsDisplay: false,
			wantValue:     "12345",
			wantErr:       false,
		},
		{
			name:          "Invalid format",
			input:         "INVALID-FORMAT",
			wantIsDisplay: false,
			wantValue:     "",
			wantErr:       true,
		},
		{
			name:          "Empty string",
			input:         "",
			wantIsDisplay: false,
			wantValue:     "",
			wantErr:       true,
		},
		{
			name:          "Only spaces",
			input:         "   ",
			wantIsDisplay: false,
			wantValue:     "",
			wantErr:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isDisplay, value, err := NormalizeDocumentID(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("NormalizeDocumentID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if isDisplay != tt.wantIsDisplay {
				t.Errorf("NormalizeDocumentID() isDisplay = %v, want %v", isDisplay, tt.wantIsDisplay)
			}
			if value != tt.wantValue {
				t.Errorf("NormalizeDocumentID() value = %v, want %v", value, tt.wantValue)
			}
		})
	}
}

func TestGetSequenceNameByPrefix(t *testing.T) {
	tests := []struct {
		name   string
		prefix string
		want   string
	}{
		{"DOC sequence", "DOC", "seq_doc_documents"},
		{"NOTE sequence", "NOTE", "seq_doc_notes"},
		{"API sequence", "API", "seq_doc_api"},
		{"SPEC sequence", "SPEC", "seq_doc_spec"},
		{"FILE sequence", "FILE", "seq_doc_file"},
		{"Invalid prefix default", "INVALID", "seq_doc_file"},
		{"Empty prefix default", "", "seq_doc_file"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := GetSequenceNameByPrefix(tt.prefix); got != tt.want {
				t.Errorf("GetSequenceNameByPrefix() = %v, want %v", got, tt.want)
			}
		})
	}
}
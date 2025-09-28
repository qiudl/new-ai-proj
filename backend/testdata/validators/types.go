package validators

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"
)

// GetValueType 检测值的类型
func GetValueType(value interface{}) ValueType {
	if value == nil {
		return TypeInterface
	}

	rv := reflect.ValueOf(value)
	rt := rv.Type()

	// 处理指针类型
	for rt.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return TypePointer
		}
		rv = rv.Elem()
		rt = rt.Type()
	}

	switch rt.Kind() {
	case reflect.String:
		return TypeString
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32:
		return TypeInt
	case reflect.Int64:
		return TypeInt64
	case reflect.Float32:
		return TypeFloat32
	case reflect.Float64:
		return TypeFloat64
	case reflect.Bool:
		return TypeBool
	case reflect.Struct:
		if rt == reflect.TypeOf(time.Time{}) {
			return TypeTime
		}
		return TypeStruct
	case reflect.Slice, reflect.Array:
		return TypeSlice
	case reflect.Map:
		return TypeMap
	case reflect.Interface:
		return TypeInterface
	case reflect.Ptr:
		return TypePointer
	default:
		return TypeUnknown
	}
}

// IsNumericType 检查是否为数值类型
func IsNumericType(vt ValueType) bool {
	return vt == TypeInt || vt == TypeInt64 || vt == TypeFloat32 || vt == TypeFloat64
}

// IsStringType 检查是否为字符串类型
func IsStringType(vt ValueType) bool {
	return vt == TypeString
}

// IsBoolType 检查是否为布尔类型
func IsBoolType(vt ValueType) bool {
	return vt == TypeBool
}

// IsTimeType 检查是否为时间类型
func IsTimeType(vt ValueType) bool {
	return vt == TypeTime
}

// IsCollectionType 检查是否为集合类型
func IsCollectionType(vt ValueType) bool {
	return vt == TypeSlice || vt == TypeMap
}

// IsStructType 检查是否为结构体类型
func IsStructType(vt ValueType) bool {
	return vt == TypeStruct
}

// ConvertToString 将值转换为字符串
func ConvertToString(value interface{}) (string, error) {
	if value == nil {
		return "", nil
	}

	switch v := value.(type) {
	case string:
		return v, nil
	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", v), nil
	case float32, float64:
		return fmt.Sprintf("%f", v), nil
	case bool:
		return strconv.FormatBool(v), nil
	case time.Time:
		return v.Format(time.RFC3339), nil
	default:
		return fmt.Sprintf("%v", v), nil
	}
}

// ConvertToFloat64 将值转换为float64
func ConvertToFloat64(value interface{}) (float64, error) {
	if value == nil {
		return 0, fmt.Errorf("cannot convert nil to float64")
	}

	switch v := value.(type) {
	case float64:
		return v, nil
	case float32:
		return float64(v), nil
	case int:
		return float64(v), nil
	case int8:
		return float64(v), nil
	case int16:
		return float64(v), nil
	case int32:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case string:
		return strconv.ParseFloat(v, 64)
	default:
		return 0, fmt.Errorf("cannot convert %T to float64", value)
	}
}

// ConvertToInt64 将值转换为int64
func ConvertToInt64(value interface{}) (int64, error) {
	if value == nil {
		return 0, fmt.Errorf("cannot convert nil to int64")
	}

	switch v := value.(type) {
	case int64:
		return v, nil
	case int:
		return int64(v), nil
	case int8:
		return int64(v), nil
	case int16:
		return int64(v), nil
	case int32:
		return int64(v), nil
	case float32:
		return int64(v), nil
	case float64:
		return int64(v), nil
	case string:
		return strconv.ParseInt(v, 10, 64)
	default:
		return 0, fmt.Errorf("cannot convert %T to int64", value)
	}
}

// ConvertToBool 将值转换为bool
func ConvertToBool(value interface{}) (bool, error) {
	if value == nil {
		return false, nil
	}

	switch v := value.(type) {
	case bool:
		return v, nil
	case string:
		return strconv.ParseBool(strings.ToLower(v))
	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", v) != "0", nil
	case float32, float64:
		return fmt.Sprintf("%f", v) != "0", nil
	default:
		return false, fmt.Errorf("cannot convert %T to bool", value)
	}
}

// ConvertToTime 将值转换为time.Time
func ConvertToTime(value interface{}) (time.Time, error) {
	if value == nil {
		return time.Time{}, fmt.Errorf("cannot convert nil to time.Time")
	}

	switch v := value.(type) {
	case time.Time:
		return v, nil
	case string:
		// 尝试多种时间格式
		layouts := []string{
			time.RFC3339,
			time.RFC3339Nano,
			"2006-01-02 15:04:05",
			"2006-01-02T15:04:05",
			"2006-01-02",
			"15:04:05",
		}
		for _, layout := range layouts {
			if t, err := time.Parse(layout, v); err == nil {
				return t, nil
			}
		}
		return time.Time{}, fmt.Errorf("cannot parse time string: %s", v)
	case int64:
		return time.Unix(v, 0), nil
	default:
		return time.Time{}, fmt.Errorf("cannot convert %T to time.Time", value)
	}
}

// GetCollectionSize 获取集合大小
func GetCollectionSize(value interface{}) (int, error) {
	if value == nil {
		return 0, nil
	}

	rv := reflect.ValueOf(value)
	rt := rv.Type()

	// 处理指针
	for rt.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return 0, nil
		}
		rv = rv.Elem()
		rt = rt.Type()
	}

	switch rt.Kind() {
	case reflect.Slice, reflect.Array, reflect.Map, reflect.String:
		return rv.Len(), nil
	default:
		return 0, fmt.Errorf("value is not a collection type")
	}
}

// IsEmptyValue 检查值是否为空
func IsEmptyValue(value interface{}) bool {
	if value == nil {
		return true
	}

	rv := reflect.ValueOf(value)
	switch rv.Kind() {
	case reflect.String:
		return rv.String() == ""
	case reflect.Slice, reflect.Map, reflect.Array:
		return rv.Len() == 0
	case reflect.Ptr, reflect.Interface:
		return rv.IsNil()
	case reflect.Invalid:
		return true
	default:
		return false
	}
}

// GetFieldValue 获取结构体字段值
func GetFieldValue(obj interface{}, fieldName string) (interface{}, error) {
	if obj == nil {
		return nil, fmt.Errorf("object is nil")
	}

	rv := reflect.ValueOf(obj)
	rt := rv.Type()

	// 处理指针
	for rt.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return nil, fmt.Errorf("object pointer is nil")
		}
		rv = rv.Elem()
		rt = rt.Type()
	}

	if rt.Kind() != reflect.Struct {
		return nil, fmt.Errorf("object is not a struct")
	}

	field := rv.FieldByName(fieldName)
	if !field.IsValid() {
		return nil, fmt.Errorf("field %s not found", fieldName)
	}

	if !field.CanInterface() {
		return nil, fmt.Errorf("field %s cannot be accessed", fieldName)
	}

	return field.Interface(), nil
}

// GetFieldNames 获取结构体所有字段名
func GetFieldNames(obj interface{}) ([]string, error) {
	if obj == nil {
		return nil, fmt.Errorf("object is nil")
	}

	rv := reflect.ValueOf(obj)
	rt := rv.Type()

	// 处理指针
	for rt.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return nil, fmt.Errorf("object pointer is nil")
		}
		rv = rv.Elem()
		rt = rt.Type()
	}

	if rt.Kind() != reflect.Struct {
		return nil, fmt.Errorf("object is not a struct")
	}

	var fieldNames []string
	for i := 0; i < rt.NumField(); i++ {
		field := rt.Field(i)
		if field.PkgPath == "" { // 只包含导出字段
			fieldNames = append(fieldNames, field.Name)
		}
	}

	return fieldNames, nil
}

// CompareValues 比较两个值
func CompareValues(a, b interface{}) (int, error) {
	if a == nil && b == nil {
		return 0, nil
	}
	if a == nil {
		return -1, nil
	}
	if b == nil {
		return 1, nil
	}

	typeA := GetValueType(a)
	typeB := GetValueType(b)

	if typeA != typeB {
		return 0, fmt.Errorf("cannot compare different types: %s vs %s", typeA.String(), typeB.String())
	}

	switch typeA {
	case TypeString:
		sa, _ := ConvertToString(a)
		sb, _ := ConvertToString(b)
		return strings.Compare(sa, sb), nil

	case TypeInt, TypeInt64, TypeFloat32, TypeFloat64:
		fa, err := ConvertToFloat64(a)
		if err != nil {
			return 0, err
		}
		fb, err := ConvertToFloat64(b)
		if err != nil {
			return 0, err
		}
		if fa < fb {
			return -1, nil
		} else if fa > fb {
			return 1, nil
		}
		return 0, nil

	case TypeBool:
		ba, _ := ConvertToBool(a)
		bb, _ := ConvertToBool(b)
		if ba == bb {
			return 0, nil
		}
		if ba {
			return 1, nil
		}
		return -1, nil

	case TypeTime:
		ta, err := ConvertToTime(a)
		if err != nil {
			return 0, err
		}
		tb, err := ConvertToTime(b)
		if err != nil {
			return 0, err
		}
		if ta.Before(tb) {
			return -1, nil
		} else if ta.After(tb) {
			return 1, nil
		}
		return 0, nil

	default:
		return 0, fmt.Errorf("cannot compare values of type %s", typeA.String())
	}
}

// CreateValidationError 创建验证错误
func CreateValidationError(ruleID, ruleName, fieldName, fieldPath, message, code string, severity ErrorSeverity, value interface{}) ValidationError {
	return ValidationError{
		RuleID:    ruleID,
		RuleName:  ruleName,
		FieldName: fieldName,
		FieldPath: fieldPath,
		Message:   message,
		Code:      code,
		Severity:  severity,
		Value:     value,
		Metadata:  make(map[string]interface{}),
		Timestamp: time.Now(),
	}
}

// CreateValidationWarning 创建验证警告
func CreateValidationWarning(ruleID, ruleName, fieldName, fieldPath, message, code string, value interface{}) ValidationWarning {
	return ValidationWarning{
		RuleID:    ruleID,
		RuleName:  ruleName,
		FieldName: fieldName,
		FieldPath: fieldPath,
		Message:   message,
		Code:      code,
		Value:     value,
		Metadata:  make(map[string]interface{}),
		Timestamp: time.Now(),
	}
}

// IsValidValueType 检查是否为有效的值类型
func IsValidValueType(vt ValueType) bool {
	return vt >= TypeUnknown && vt <= TypePointer
}

// GetDefaultValue 获取类型的默认值
func GetDefaultValue(vt ValueType) interface{} {
	switch vt {
	case TypeString:
		return ""
	case TypeInt:
		return 0
	case TypeInt64:
		return int64(0)
	case TypeFloat32:
		return float32(0)
	case TypeFloat64:
		return float64(0)
	case TypeBool:
		return false
	case TypeTime:
		return time.Time{}
	case TypeSlice:
		return []interface{}{}
	case TypeMap:
		return map[string]interface{}{}
	default:
		return nil
	}
}
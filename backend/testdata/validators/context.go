package validators

import (
	"sync"
)

// ValidationContext ŒÁ
‡ž°
type ValidationContext struct {
	mu      sync.RWMutex
	values  map[string]interface{}
	target  ValidationTarget
	options ValidationOptions
}

// NewValidationContext ú°„ŒÁ
‡
func NewValidationContext() IValidationContext {
	return &ValidationContext{
		values: make(map[string]interface{}),
		target: ValidationTarget{
			Metadata: make(map[string]interface{}),
		},
		options: ValidationOptions{
			CustomOptions: make(map[string]interface{}),
		},
	}
}

// NewValidationContextWithOptions (	yúŒÁ
‡
func NewValidationContextWithOptions(options ValidationOptions) IValidationContext {
	ctx := &ValidationContext{
		values:  make(map[string]interface{}),
		target:  ValidationTarget{Metadata: make(map[string]interface{})},
		options: options,
	}
	
	if ctx.options.CustomOptions == nil {
		ctx.options.CustomOptions = make(map[string]interface{})
	}
	
	return ctx
}

// GetValue ·Ö
‡<
func (c *ValidationContext) GetValue(key string) interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.values[key]
}

// SetValue ¾n
‡<
func (c *ValidationContext) SetValue(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.values[key] = value
}

// HasValue Àå/&X(š.
func (c *ValidationContext) HasValue(key string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	_, exists := c.values[key]
	return exists
}

// GetKeys ·Ö@	
‡.
func (c *ValidationContext) GetKeys() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	keys := make([]string, 0, len(c.values))
	for key := range c.values {
		keys = append(keys, key)
	}
	return keys
}

// GetTarget ·ÖŒÁîáo
func (c *ValidationContext) GetTarget() ValidationTarget {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	// úo,åMvÑî9
	target := ValidationTarget{
		ObjectType: c.target.ObjectType,
		FieldName:  c.target.FieldName,
		FieldPath:  c.target.FieldPath,
		Metadata:   make(map[string]interface{}),
	}
	
	for k, v := range c.target.Metadata {
		target.Metadata[k] = v
	}
	
	return target
}

// SetTarget ¾nŒÁîáo
func (c *ValidationContext) SetTarget(target ValidationTarget) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.target = ValidationTarget{
		ObjectType: target.ObjectType,
		FieldName:  target.FieldName,
		FieldPath:  target.FieldPath,
		Metadata:   make(map[string]interface{}),
	}
	
	if target.Metadata != nil {
		for k, v := range target.Metadata {
			c.target.Metadata[k] = v
		}
	}
}

// GetOptions ·ÖŒÁ	y
func (c *ValidationContext) GetOptions() ValidationOptions {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	// úo,åMvÑî9
	options := ValidationOptions{
		StopOnFirstError: c.options.StopOnFirstError,
		IncludeWarnings:  c.options.IncludeWarnings,
		Timeout:          c.options.Timeout,
		MaxConcurrency:   c.options.MaxConcurrency,
		CustomOptions:    make(map[string]interface{}),
	}
	
	for k, v := range c.options.CustomOptions {
		options.CustomOptions[k] = v
	}
	
	return options
}

// SetOptions ¾nŒÁ	y
func (c *ValidationContext) SetOptions(options ValidationOptions) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.options = ValidationOptions{
		StopOnFirstError: options.StopOnFirstError,
		IncludeWarnings:  options.IncludeWarnings,
		Timeout:          options.Timeout,
		MaxConcurrency:   options.MaxConcurrency,
		CustomOptions:    make(map[string]interface{}),
	}
	
	if options.CustomOptions != nil {
		for k, v := range options.CustomOptions {
			c.options.CustomOptions[k] = v
		}
	}
}

// CreateChild úP
‡
func (c *ValidationContext) CreateChild() IValidationContext {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	child := &ValidationContext{
		values: make(map[string]interface{}),
		target: ValidationTarget{
			ObjectType: c.target.ObjectType,
			FieldName:  c.target.FieldName,
			FieldPath:  c.target.FieldPath,
			Metadata:   make(map[string]interface{}),
		},
		options: ValidationOptions{
			StopOnFirstError: c.options.StopOnFirstError,
			IncludeWarnings:  c.options.IncludeWarnings,
			Timeout:          c.options.Timeout,
			MaxConcurrency:   c.options.MaxConcurrency,
			CustomOptions:    make(map[string]interface{}),
		},
	}
	
	// 66
‡„<
	for k, v := range c.values {
		child.values[k] = v
	}
	
	// 6îCpn
	for k, v := range c.target.Metadata {
		child.target.Metadata[k] = v
	}
	
	// 6êšI	y
	for k, v := range c.options.CustomOptions {
		child.options.CustomOptions[k] = v
	}
	
	return child
}

// Merge vvÖ
‡
func (c *ValidationContext) Merge(other IValidationContext) error {
	if other == nil {
		return nil
	}
	
	c.mu.Lock()
	defer c.mu.Unlock()
	
	// v<
	for _, key := range other.GetKeys() {
		c.values[key] = other.GetValue(key)
	}
	
	// vîCpn
	otherTarget := other.GetTarget()
	if otherTarget.Metadata != nil {
		for k, v := range otherTarget.Metadata {
			c.target.Metadata[k] = v
		}
	}
	
	// vêšI	y
	otherOptions := other.GetOptions()
	if otherOptions.CustomOptions != nil {
		for k, v := range otherOptions.CustomOptions {
			c.options.CustomOptions[k] = v
		}
	}
	
	return nil
}

// GetValueWithDefault ·Ö
‡<‚œX(ÔÞØ¤<
func (c *ValidationContext) GetValueWithDefault(key string, defaultValue interface{}) interface{} {
	if value := c.GetValue(key); value != nil {
		return value
	}
	return defaultValue
}

// SetTargetField ¾nîWµáo
func (c *ValidationContext) SetTargetField(fieldName, fieldPath string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	c.target.FieldName = fieldName
	c.target.FieldPath = fieldPath
}

// SetTargetMetadata ¾nîCpn
func (c *ValidationContext) SetTargetMetadata(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if c.target.Metadata == nil {
		c.target.Metadata = make(map[string]interface{})
	}
	c.target.Metadata[key] = value
}

// GetTargetMetadata ·ÖîCpn
func (c *ValidationContext) GetTargetMetadata(key string) interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	if c.target.Metadata == nil {
		return nil
	}
	return c.target.Metadata[key]
}

// SetCustomOption ¾nêšI	y
func (c *ValidationContext) SetCustomOption(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if c.options.CustomOptions == nil {
		c.options.CustomOptions = make(map[string]interface{})
	}
	c.options.CustomOptions[key] = value
}

// GetCustomOption ·ÖêšI	y
func (c *ValidationContext) GetCustomOption(key string) interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	if c.options.CustomOptions == nil {
		return nil
	}
	return c.options.CustomOptions[key]
}
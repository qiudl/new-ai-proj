package core

import (
	"errors"
	"fmt"
	"sync"
)

// ModelRegistry 模型注册中心
type ModelRegistry struct {
	models   map[string]func() IDataModel
	metadata map[string]ModelMetadata
	mutex    sync.RWMutex
}

// NewModelRegistry 创建新的模型注册中心
func NewModelRegistry() *ModelRegistry {
	return &ModelRegistry{
		models:   make(map[string]func() IDataModel),
		metadata: make(map[string]ModelMetadata),
	}
}

// RegisterModel 注册模型
func (r *ModelRegistry) RegisterModel(name string, factory func() IDataModel) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	if name == "" {
		return errors.New("model name cannot be empty")
	}

	if factory == nil {
		return errors.New("factory function cannot be nil")
	}

	// 检查是否已存在
	if _, exists := r.models[name]; exists {
		return fmt.Errorf("model %s already registered", name)
	}

	r.models[name] = factory

	// 创建实例获取元数据
	instance := factory()
	r.metadata[name] = instance.GetMetadata()

	return nil
}

// UnregisterModel 注销模型
func (r *ModelRegistry) UnregisterModel(name string) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	if _, exists := r.models[name]; !exists {
		return fmt.Errorf("model %s not found", name)
	}

	delete(r.models, name)
	delete(r.metadata, name)

	return nil
}

// CreateInstance 创建模型实例
func (r *ModelRegistry) CreateInstance(name string) (IDataModel, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	factory, exists := r.models[name]
	if !exists {
		return nil, fmt.Errorf("model %s not found", name)
	}

	return factory(), nil
}

// ListModels 列出所有注册的模型
func (r *ModelRegistry) ListModels() []string {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	var names []string
	for name := range r.models {
		names = append(names, name)
	}

	return names
}

// GetModelMetadata 获取模型元数据
func (r *ModelRegistry) GetModelMetadata(name string) (ModelMetadata, error) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	metadata, exists := r.metadata[name]
	if !exists {
		return ModelMetadata{}, fmt.Errorf("metadata for model %s not found", name)
	}

	return metadata, nil
}

// Count 获取注册模型数量
func (r *ModelRegistry) Count() int {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	return len(r.models)
}

// Clear 清空所有注册的模型
func (r *ModelRegistry) Clear() {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.models = make(map[string]func() IDataModel)
	r.metadata = make(map[string]ModelMetadata)
}

// Exists 检查模型是否已注册
func (r *ModelRegistry) Exists(name string) bool {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	_, exists := r.models[name]
	return exists
}

// GetModelNames 获取所有模型名称（按字母顺序排序）
func (r *ModelRegistry) GetModelNames() []string {
	names := r.ListModels()

	// 简单排序
	for i := 0; i < len(names)-1; i++ {
		for j := i + 1; j < len(names); j++ {
			if names[i] > names[j] {
				names[i], names[j] = names[j], names[i]
			}
		}
	}

	return names
}
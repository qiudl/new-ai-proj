package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterProductRoutes 注册产品管理路由（SPU、SKU、库存）
func RegisterProductRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// Get handlers
	spuHandler := app.GetSPUHandler()
	skuHandler := app.GetSKUHandler()
	inventoryHandler := app.GetInventoryHandler()

	// SPU路由组
	spuGroup := authorized.Group("/products/spus")
	{
		// SPU基础操作
		spuGroup.POST("", spuHandler.CreateSPU)                   // 创建SPU
		spuGroup.GET("", spuHandler.ListSPUs)                     // 获取SPU列表
		spuGroup.GET("/stats", spuHandler.ListSPUsWithStats)      // 获取SPU列表（含统计）
		spuGroup.GET("/:id", spuHandler.GetSPU)                   // 获取SPU详情
		spuGroup.GET("/:id/detail", spuHandler.GetSPUDetail)      // 获取SPU详情（含统计）
		spuGroup.PUT("/:id", spuHandler.UpdateSPU)                // 更新SPU
		spuGroup.DELETE("/:id", spuHandler.DeleteSPU)             // 删除SPU

		// SPU关联的SKU
		spuGroup.GET("/:spu_id/skus", skuHandler.ListSKUsBySPU)   // 获取SPU下的所有SKU
	}

	// SKU路由组
	skuGroup := authorized.Group("/products/skus")
	{
		// SKU基础操作
		skuGroup.POST("", skuHandler.CreateSKU)                   // 创建SKU
		skuGroup.POST("/batch", skuHandler.BatchCreateSKUs)       // 批量创建SKU
		skuGroup.PUT("/batch", skuHandler.BatchUpdateSKUs)        // 批量更新SKU
		skuGroup.GET("", skuHandler.ListSKUs)                     // 获取SKU列表
		skuGroup.GET("/details", skuHandler.ListSKUsWithDetails)  // 获取SKU列表（含详情）
		skuGroup.GET("/:id", skuHandler.GetSKU)                   // 获取SKU详情
		skuGroup.PUT("/:id", skuHandler.UpdateSKU)                // 更新SKU
		skuGroup.DELETE("/:id", skuHandler.DeleteSKU)             // 删除SKU
	}

	// 库存路由组
	inventoryGroup := authorized.Group("/inventory")
	{
		// 库存操作
		inventoryGroup.POST("/in", inventoryHandler.RecordIn)             // 入库
		inventoryGroup.POST("/out", inventoryHandler.RecordOut)           // 出库
		inventoryGroup.POST("/adjust", inventoryHandler.AdjustInventory)  // 调整/盘点
		inventoryGroup.POST("/lock", inventoryHandler.LockInventory)      // 锁定库存
		inventoryGroup.POST("/unlock", inventoryHandler.UnlockInventory)  // 解锁库存

		// 库存查询
		inventoryGroup.GET("/records", inventoryHandler.ListInventoryRecords)         // 获取库存记录列表
		inventoryGroup.GET("/skus/:sku_id", inventoryHandler.GetInventoryBySKU)       // 获取SKU库存
		inventoryGroup.GET("/transactions", inventoryHandler.GetTransactionHistory)   // 获取库存事务历史
		inventoryGroup.GET("/transactions/:id", inventoryHandler.GetTransaction)      // 获取库存事务详情
	}
}

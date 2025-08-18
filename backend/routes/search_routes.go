package routes

import (
	"database/sql"
	
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
	"ai-project-backend/services"
	"github.com/gin-gonic/gin"
)

// RegisterSearchRoutes 注册搜索相关路由
func RegisterSearchRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 创建增强搜索服务和处理器
	dbConn := app.GetDB().GetDB().(*sql.DB)
	searchService := services.NewEnhancedSearchService(dbConn)
	searchHandler := handlers.NewEnhancedSearchHandler(searchService)

	// 搜索路由组
	search := authorized.Group("/search")
	
	// 基本搜索API
	search.GET("", searchHandler.Search)                    // GET /api/v1/search
	search.GET("/autocomplete", searchHandler.AutoComplete) // GET /api/v1/search/autocomplete
	search.GET("/stats", searchHandler.SearchStats)         // GET /api/v1/search/stats

	// 保存的搜索
	savedSearchGroup := search.Group("/saved")
	{
		savedSearchGroup.GET("", searchHandler.GetSavedSearches)        // GET /api/v1/search/saved
		savedSearchGroup.POST("", searchHandler.SaveSearch)            // POST /api/v1/search/saved
		savedSearchGroup.DELETE("/:id", searchHandler.DeleteSavedSearch) // DELETE /api/v1/search/saved/:id
	}

	// 高级搜索功能 (管理员权限)
	adminSearch := search.Group("")
	adminSearch.Use(middleware.RequirePermission("admin"))
	{
		adminSearch.GET("/index/status", searchHandler.GetIndexStatus)   // GET /api/v1/search/index/status
		adminSearch.POST("/index/rebuild", searchHandler.RebuildIndex)   // POST /api/v1/search/index/rebuild
		adminSearch.GET("/export", searchHandler.ExportResults)          // GET /api/v1/search/export
		adminSearch.POST("/batch", searchHandler.BatchOperation)         // POST /api/v1/search/batch
	}

	// 搜索历史 (用户权限)
	history := search.Group("/history")
	{
		history.GET("", searchHandler.GetSearchHistory)     // GET /api/v1/search/history
		history.DELETE("", searchHandler.ClearSearchHistory) // DELETE /api/v1/search/history
	}

	// 趋势和推荐
	trends := search.Group("/trends")
	{
		trends.GET("", searchHandler.GetTrendingSearches)    // GET /api/v1/search/trends
		trends.GET("/similar/:type/:id", searchHandler.FindSimilarContent) // GET /api/v1/search/trends/similar/:type/:id
	}
}
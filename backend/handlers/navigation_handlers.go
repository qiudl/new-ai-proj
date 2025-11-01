package handlers

import (
	"net/http"
	"strconv"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
)

// NavigationHandler 导航管理处理器
type NavigationHandler struct {
	repo database.NavigationRepository
}

// NewNavigationHandler 创建导航管理处理器
func NewNavigationHandler(repo database.NavigationRepository) *NavigationHandler {
	return &NavigationHandler{
		repo: repo,
	}
}

// ========== 菜单项管理 ==========

// GetMenuItems godoc
// @Summary 获取所有菜单项
// @Description 获取系统中所有的菜单项列表
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Success 200 {object} models.Response{data=[]models.MenuItem}
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-items [get]
// @Security BearerAuth
func (h *NavigationHandler) GetMenuItems(c *gin.Context) {
	items, err := h.repo.GetAllMenuItems()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get menu items", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(items, "Menu items retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetMenuItem godoc
// @Summary 获取单个菜单项
// @Description 根据ID获取菜单项详情
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param id path int true "菜单项ID"
// @Success 200 {object} models.Response{data=models.MenuItem}
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-items/{id} [get]
// @Security BearerAuth
func (h *NavigationHandler) GetMenuItem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid menu item ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	item, err := h.repo.GetMenuItemByID(id)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get menu item", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if item == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Menu item not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	response := models.NewSuccessResponse(item, "Menu item retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateMenuItem godoc
// @Summary 创建菜单项
// @Description 创建新的菜单项
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param menuItem body models.MenuItemRequest true "菜单项信息"
// @Success 201 {object} models.Response{data=models.MenuItem}
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-items [post]
// @Security BearerAuth
func (h *NavigationHandler) CreateMenuItem(c *gin.Context) {
	var req models.MenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	item, err := h.repo.CreateMenuItem(&req)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create menu item: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(item, "Menu item created successfully")
	c.JSON(http.StatusCreated, response)
}

// UpdateMenuItem godoc
// @Summary 更新菜单项
// @Description 更新指定菜单项的信息
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param id path int true "菜单项ID"
// @Param menuItem body models.MenuItemRequest true "菜单项信息"
// @Success 200 {object} models.Response{data=models.MenuItem}
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-items/{id} [put]
// @Security BearerAuth
func (h *NavigationHandler) UpdateMenuItem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid menu item ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.MenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	item, err := h.repo.UpdateMenuItem(id, &req)
	if err != nil {
		if err.Error() == "menu item not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Menu item not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update menu item: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(item, "Menu item updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteMenuItem godoc
// @Summary 删除菜单项
// @Description 删除指定的菜单项
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param id path int true "菜单项ID"
// @Success 200 {object} models.Response
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-items/{id} [delete]
// @Security BearerAuth
func (h *NavigationHandler) DeleteMenuItem(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid menu item ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = h.repo.DeleteMenuItem(id)
	if err != nil {
		if err.Error() == "menu item not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Menu item not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete menu item: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Menu item deleted successfully")
	c.JSON(http.StatusOK, response)
}

// ReorderMenuItems godoc
// @Summary 重新排序菜单项
// @Description 批量更新菜单项的排序
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param items body object{items=[]object{id=int,sort_order=int}} true "菜单项排序信息"
// @Success 200 {object} models.Response
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-items/reorder [post]
// @Security BearerAuth
func (h *NavigationHandler) ReorderMenuItems(c *gin.Context) {
	var req struct {
		Items []struct {
			ID        int `json:"id"`
			SortOrder int `json:"sort_order"`
		} `json:"items"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err := h.repo.ReorderMenuItems(req.Items)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to reorder menu items: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Menu items reordered successfully")
	c.JSON(http.StatusOK, response)
}

// ========== 菜单分组管理 ==========

// GetMenuGroups godoc
// @Summary 获取所有菜单分组
// @Description 获取系统中所有的菜单分组列表
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Success 200 {object} models.Response{data=[]models.MenuGroup}
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-groups [get]
// @Security BearerAuth
func (h *NavigationHandler) GetMenuGroups(c *gin.Context) {
	groups, err := h.repo.GetAllMenuGroups()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get menu groups", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(groups, "Menu groups retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetMenuGroup godoc
// @Summary 获取单个菜单分组
// @Description 根据ID获取菜单分组详情
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param id path int true "菜单分组ID"
// @Success 200 {object} models.Response{data=models.MenuGroup}
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-groups/{id} [get]
// @Security BearerAuth
func (h *NavigationHandler) GetMenuGroup(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid menu group ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	group, err := h.repo.GetMenuGroupByID(id)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get menu group", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if group == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Menu group not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	response := models.NewSuccessResponse(group, "Menu group retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateMenuGroup godoc
// @Summary 创建菜单分组
// @Description 创建新的菜单分组
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param menuGroup body models.MenuGroupRequest true "菜单分组信息"
// @Success 201 {object} models.Response{data=models.MenuGroup}
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-groups [post]
// @Security BearerAuth
func (h *NavigationHandler) CreateMenuGroup(c *gin.Context) {
	var req models.MenuGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	group, err := h.repo.CreateMenuGroup(&req)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create menu group: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(group, "Menu group created successfully")
	c.JSON(http.StatusCreated, response)
}

// UpdateMenuGroup godoc
// @Summary 更新菜单分组
// @Description 更新指定菜单分组的信息
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param id path int true "菜单分组ID"
// @Param menuGroup body models.MenuGroupRequest true "菜单分组信息"
// @Success 200 {object} models.Response{data=models.MenuGroup}
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-groups/{id} [put]
// @Security BearerAuth
func (h *NavigationHandler) UpdateMenuGroup(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid menu group ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.MenuGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	group, err := h.repo.UpdateMenuGroup(id, &req)
	if err != nil {
		if err.Error() == "menu group not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Menu group not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update menu group: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(group, "Menu group updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteMenuGroup godoc
// @Summary 删除菜单分组
// @Description 删除指定的菜单分组
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param id path int true "菜单分组ID"
// @Success 200 {object} models.Response
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/menu-groups/{id} [delete]
// @Security BearerAuth
func (h *NavigationHandler) DeleteMenuGroup(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid menu group ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = h.repo.DeleteMenuGroup(id)
	if err != nil {
		if err.Error() == "menu group not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Menu group not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete menu group: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Menu group deleted successfully")
	c.JSON(http.StatusOK, response)
}

// ========== 路由配置管理 ==========

// GetRoutes godoc
// @Summary 获取所有路由配置
// @Description 获取系统中所有的路由配置列表
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Success 200 {object} models.Response{data=[]models.RouteConfig}
// @Failure 500 {object} models.Response
// @Router /api/v1/system/routes [get]
// @Security BearerAuth
func (h *NavigationHandler) GetRoutes(c *gin.Context) {
	routes, err := h.repo.GetAllRoutes()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get routes", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(routes, "Routes retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetRoute godoc
// @Summary 获取单个路由配置
// @Description 根据ID获取路由配置详情
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param id path int true "路由配置ID"
// @Success 200 {object} models.Response{data=models.RouteConfig}
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/routes/{id} [get]
// @Security BearerAuth
func (h *NavigationHandler) GetRoute(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid route ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	route, err := h.repo.GetRouteByID(id)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get route", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if route == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Route not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	response := models.NewSuccessResponse(route, "Route retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateRoute godoc
// @Summary 创建路由配置
// @Description 创建新的路由配置
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param route body models.RouteConfigRequest true "路由配置信息"
// @Success 201 {object} models.Response{data=models.RouteConfig}
// @Failure 400 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/routes [post]
// @Security BearerAuth
func (h *NavigationHandler) CreateRoute(c *gin.Context) {
	var req models.RouteConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	route, err := h.repo.CreateRoute(&req)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create route: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(route, "Route created successfully")
	c.JSON(http.StatusCreated, response)
}

// UpdateRoute godoc
// @Summary 更新路由配置
// @Description 更新指定路由配置的信息
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param id path int true "路由配置ID"
// @Param route body models.RouteConfigRequest true "路由配置信息"
// @Success 200 {object} models.Response{data=models.RouteConfig}
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/routes/{id} [put]
// @Security BearerAuth
func (h *NavigationHandler) UpdateRoute(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid route ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.RouteConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body: "+err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	route, err := h.repo.UpdateRoute(id, &req)
	if err != nil {
		if err.Error() == "route not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Route not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update route: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(route, "Route updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteRoute godoc
// @Summary 删除路由配置
// @Description 删除指定的路由配置
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Param id path int true "路由配置ID"
// @Success 200 {object} models.Response
// @Failure 400 {object} models.Response
// @Failure 404 {object} models.Response
// @Failure 500 {object} models.Response
// @Router /api/v1/system/routes/{id} [delete]
// @Security BearerAuth
func (h *NavigationHandler) DeleteRoute(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid route ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = h.repo.DeleteRoute(id)
	if err != nil {
		if err.Error() == "route not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Route not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete route: "+err.Error(), nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Route deleted successfully")
	c.JSON(http.StatusOK, response)
}

// ========== 统计信息 ==========

// GetNavigationStats godoc
// @Summary 获取导航统计信息
// @Description 获取导航系统的统计数据
// @Tags System-Navigation
// @Accept json
// @Produce json
// @Success 200 {object} models.Response{data=models.NavigationStats}
// @Failure 500 {object} models.Response
// @Router /api/v1/system/navigation-config/stats [get]
// @Security BearerAuth
func (h *NavigationHandler) GetNavigationStats(c *gin.Context) {
	stats, err := h.repo.GetNavigationStats()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get navigation stats", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(stats, "Navigation stats retrieved successfully")
	c.JSON(http.StatusOK, response)
}

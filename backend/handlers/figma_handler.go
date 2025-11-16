package handlers

import (
  "ai-project-backend/services"
  "github.com/gin-gonic/gin"
  "net/http"
)

type FigmaHandler struct {
  service *services.FigmaService
}

func NewFigmaHandler() *FigmaHandler {
  return &FigmaHandler{service: services.NewFigmaService()}
}

func (h *FigmaHandler) Health(c *gin.Context) {
  c.JSON(http.StatusOK, gin.H{
    "success": true,
    "data": gin.H{ "configured": h.service.IsConfigured() },
  })
}

func (h *FigmaHandler) GetFile(c *gin.Context) {
  if !h.service.IsConfigured() {
    c.JSON(http.StatusBadRequest, gin.H{ "success": false, "message": "Figma API token 未配置" })
    return
  }
  key := c.Param("fileKey")
  data, status, err := h.service.GetFile(key)
  if err != nil {
    c.JSON(status, gin.H{ "success": false, "message": "请求Figma失败", "error": err.Error() })
    return
  }
  c.JSON(http.StatusOK, gin.H{ "success": true, "data": data })
}

func (h *FigmaHandler) GetComponents(c *gin.Context) {
  if !h.service.IsConfigured() {
    c.JSON(http.StatusBadRequest, gin.H{ "success": false, "message": "Figma API token 未配置" })
    return
  }
  key := c.Param("fileKey")
  data, status, err := h.service.GetFileComponents(key)
  if err != nil {
    c.JSON(status, gin.H{ "success": false, "message": "请求Figma失败", "error": err.Error() })
    return
  }
  c.JSON(http.StatusOK, gin.H{ "success": true, "data": data })
}

func (h *FigmaHandler) GetStyles(c *gin.Context) {
  if !h.service.IsConfigured() {
    c.JSON(http.StatusBadRequest, gin.H{ "success": false, "message": "Figma API token 未配置" })
    return
  }
  key := c.Param("fileKey")
  data, status, err := h.service.GetFileStyles(key)
  if err != nil {
    c.JSON(status, gin.H{ "success": false, "message": "请求Figma失败", "error": err.Error() })
    return
  }
  c.JSON(http.StatusOK, gin.H{ "success": true, "data": data })
}

func (h *FigmaHandler) GetVariables(c *gin.Context) {
  if !h.service.IsConfigured() {
    c.JSON(http.StatusBadRequest, gin.H{ "success": false, "message": "Figma API token 未配置" })
    return
  }
  key := c.Param("fileKey")
  data, status, err := h.service.GetFileVariables(key)
  if err != nil {
    c.JSON(status, gin.H{ "success": false, "message": "请求Figma失败", "error": err.Error() })
    return
  }
  c.JSON(http.StatusOK, gin.H{ "success": true, "data": data })
}


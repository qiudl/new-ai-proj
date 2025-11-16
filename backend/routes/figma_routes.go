package routes

import (
  "github.com/gin-gonic/gin"
)

func RegisterFigmaRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
  group := authorized.Group("/integrations/figma")

  figma := app.GetFigmaHandler()
  if figma == nil {
    return
  }

  group.GET("/health", figma.Health)
  group.GET("/files/:fileKey", figma.GetFile)
  group.GET("/files/:fileKey/components", figma.GetComponents)
  group.GET("/files/:fileKey/styles", figma.GetStyles)
  group.GET("/files/:fileKey/variables", figma.GetVariables)
}


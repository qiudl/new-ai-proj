package routes

import (
    "net/http"
    "testing"

    "ai-project-backend/config"
    "ai-project-backend/database"
    "ai-project-backend/handlers"
    "ai-project-backend/utils"
    "github.com/gin-gonic/gin"
)

// dummyApp implements ApplicationInterface minimally for route registration tests
type dummyApp struct{}

// --- Minimal config/DB/JWT ---
func (d *dummyApp) GetConfig() *config.Config { return &config.Config{} }
func (d *dummyApp) GetDB() database.DB       { return nil }
func (d *dummyApp) GetJWTManager() *utils.JWTManager { return nil }

// --- Basic handlers ---
func (d *dummyApp) GetHealthHandler() gin.HandlerFunc  { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetVersionHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetLoginHandler() gin.HandlerFunc   { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetLogoutHandler() gin.HandlerFunc  { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// Dev helpers
func (d *dummyApp) GetDevAccountsHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) DevQuickLoginHandler() gin.HandlerFunc  { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// Today tasks
func (d *dummyApp) GetTodayTasksHandler() gin.HandlerFunc          { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetTodayTasksStatsHandler() gin.HandlerFunc     { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) BulkOperationTodayTasksHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) MarkTodayTaskCompletedHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) PostponeTodayTaskHandler() gin.HandlerFunc      { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) ValidateParentHandler() gin.HandlerFunc         { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// Task handlers
func (d *dummyApp) GetAllTasksHandler() gin.HandlerFunc         { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetTasksHandler() gin.HandlerFunc            { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetTaskHandler() gin.HandlerFunc             { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) CreateTaskHandler() gin.HandlerFunc          { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) UpdateTaskHandler() gin.HandlerFunc          { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) DeleteTaskHandler() gin.HandlerFunc          { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) BulkDeleteTasksHandler() gin.HandlerFunc     { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) BatchUpdateTasksHandler() gin.HandlerFunc    { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) BatchValidateTasksPreviewHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetTaskTreeHandler() gin.HandlerFunc         { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetRootTasksHandler() gin.HandlerFunc        { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) SearchParentTasksHandler() gin.HandlerFunc   { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) BulkImportTasksHandler() gin.HandlerFunc     { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetTaskChildrenHandler() gin.HandlerFunc     { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetTaskDescendantsHandler() gin.HandlerFunc  { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetTaskUpdatesHandler() gin.HandlerFunc      { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) UpdateTaskUpdateHandler() gin.HandlerFunc    { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) DeleteTaskUpdateHandler() gin.HandlerFunc    { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetTaskTimelineHandler() gin.HandlerFunc     { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetTaskProgressHandler() gin.HandlerFunc    { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// Project handlers
func (d *dummyApp) GetProjectsHandler() gin.HandlerFunc   { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) CreateProjectHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetProjectHandler() gin.HandlerFunc    { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) UpdateProjectHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) DeleteProjectHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetProjectStatsHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// Project users
func (d *dummyApp) GetProjectUsersHandler() gin.HandlerFunc  { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) AddProjectUserHandler() gin.HandlerFunc   { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) RemoveProjectUserHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// File
func (d *dummyApp) FileDownloadHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// Document metadata
func (d *dummyApp) GetDocumentProjectsHandler() gin.HandlerFunc   { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetDocumentCustomersHandler() gin.HandlerFunc  { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetDocumentCategoriesHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// Middleware
func (d *dummyApp) MapUserToCompanyUser() gin.HandlerFunc { return func(c *gin.Context) { c.Next() } }

// Module handlers - return zero-value structs; their methods are only referenced, not executed in this test
func (d *dummyApp) GetCustomerHandler() *handlers.CustomerHandler                 { return &handlers.CustomerHandler{} }
func (d *dummyApp) GetCompanyHandler() *handlers.CompanyHandler                   { return &handlers.CompanyHandler{} }
func (d *dummyApp) GetPermissionHandler() *handlers.PermissionHandler             { return &handlers.PermissionHandler{} }
func (d *dummyApp) GetUserManagementHandler() *handlers.UserManagementHandler     { return &handlers.UserManagementHandler{} }
func (d *dummyApp) GetCompanyUserHandler() *handlers.CompanyUserHandler           { return &handlers.CompanyUserHandler{} }
func (d *dummyApp) GetDocumentHandler() *handlers.DocumentHandler                 { return &handlers.DocumentHandler{} }
func (d *dummyApp) GetHybridDocumentHandler() *handlers.HybridDocumentHandler     { return &handlers.HybridDocumentHandler{} }
func (d *dummyApp) GetHybridDocumentFolderHandler() *handlers.HybridDocumentFolderHandler {
    return &handlers.HybridDocumentFolderHandler{}
}
func (d *dummyApp) GetSimpleDocumentHandler() *handlers.SimpleDocumentHandler     { return &handlers.SimpleDocumentHandler{} }
func (d *dummyApp) GetUnifiedDocumentHandler() *handlers.UnifiedDocumentHandler   { return &handlers.UnifiedDocumentHandler{} }
func (d *dummyApp) GetTimerHandler() *handlers.TimerHandler                       { return &handlers.TimerHandler{} }
func (d *dummyApp) GetUserTimerHandler() *handlers.UserTimerHandler               { return &handlers.UserTimerHandler{} }
func (d *dummyApp) GetUnifiedTimerHandler() *handlers.UnifiedTimerHandler         { return &handlers.UnifiedTimerHandler{} }
func (d *dummyApp) GetArchiveHandler() *handlers.ArchiveHandler                   { return &handlers.ArchiveHandler{} }
func (d *dummyApp) GetTaskDocumentFileHandler() *handlers.TaskDocumentFileHandler { return &handlers.TaskDocumentFileHandler{} }
func (d *dummyApp) GetGoogleAuthHandler() *handlers.GoogleAuthHandler             { return &handlers.GoogleAuthHandler{} }
func (d *dummyApp) GetCalendarSyncHandler() *handlers.CalendarSyncHandler         { return &handlers.CalendarSyncHandler{} }
func (d *dummyApp) GetSmartTemplateHandler() *handlers.SmartTemplateHandler       { return &handlers.SmartTemplateHandler{} }
func (d *dummyApp) GetCollaborationHandler() *handlers.DocumentCollaborationHandler {
    return &handlers.DocumentCollaborationHandler{}
}
func (d *dummyApp) GetStatisticsHandler() *handlers.StatisticsHandlers { return &handlers.StatisticsHandlers{} }
func (d *dummyApp) GetAuditHandler() *handlers.AuditHandler           { return &handlers.AuditHandler{} }
func (d *dummyApp) GetAIConfigHandler() *handlers.AIConfigHandler     { return &handlers.AIConfigHandler{} }
func (d *dummyApp) GetAITaskGeneratorHandler() *handlers.AITaskGeneratorHandler {
    return &handlers.AITaskGeneratorHandler{}
}
func (d *dummyApp) GetDashboardHandler() *handlers.DashboardHandler   { return &handlers.DashboardHandler{} }
func (d *dummyApp) GetTaskAnalysisHandler() *handlers.TaskAnalysisHandler { return &handlers.TaskAnalysisHandler{} }
func (d *dummyApp) GetAPIKeyHandler() *handlers.APIKeyHandler         { return &handlers.APIKeyHandler{} }
func (d *dummyApp) GetAnalyticsHandler() *handlers.AnalyticsHandler   { return &handlers.AnalyticsHandler{} }
func (d *dummyApp) GetProgressHandler() *handlers.ProgressHandler     { return &handlers.ProgressHandler{} }
func (d *dummyApp) GetTaskRelationshipHandler() *handlers.TaskRelationshipHandler { return &handlers.TaskRelationshipHandler{} }

// Audit log handlers (gin.HandlerFunc getters)
func (d *dummyApp) GetAuditLogsHandler() gin.HandlerFunc  { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetAuditLogHandler() gin.HandlerFunc   { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetAuditStatsHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) ExportAuditLogsHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// Recycle bin
func (d *dummyApp) GetRecycledProjectsHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetRecycledTasksHandler() gin.HandlerFunc    { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) GetRecycledDocumentsHandler() gin.HandlerFunc { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) RestoreProjectHandler() gin.HandlerFunc      { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) RestoreTaskHandler() gin.HandlerFunc         { return func(c *gin.Context) { c.Status(http.StatusOK) } }
func (d *dummyApp) RestoreDocumentHandler() gin.HandlerFunc     { return func(c *gin.Context) { c.Status(http.StatusOK) } }

// --- Test ---
func TestRegisterWorkNotesRoutes(t *testing.T) {
    gin.SetMode(gin.TestMode)
    r := gin.New()
    api := r.Group("/api/v1")
    app := &dummyApp{}

    // register only the work-notes routes to keep test focused
    registerWorkNotesRoutes(api, app)

    got := map[string]bool{}
    for _, ri := range r.Routes() {
        got[ri.Method+" "+ri.Path] = true
    }

    expected := []string{
        "GET /api/v1/work-notes",
        "POST /api/v1/work-notes",
        "GET /api/v1/work-notes/search",
        "GET /api/v1/work-notes/:id",
        "PUT /api/v1/work-notes/:id",
        "DELETE /api/v1/work-notes/:id",
        "POST /api/v1/work-notes/:id/copy",
        "POST /api/v1/work-notes/:id/toggle-template",
    }

    for _, key := range expected {
        if !got[key] {
            t.Fatalf("expected route not registered: %s", key)
        }
    }
}

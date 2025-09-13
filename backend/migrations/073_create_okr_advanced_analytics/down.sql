-- Migration Rollback: 073_create_okr_advanced_analytics
-- Description: Drop all OKR Phase 3 advanced analytics tables and related objects

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_okr_export_templates_updated_at ON okr_export_templates;
DROP TRIGGER IF EXISTS trigger_okr_comments_updated_at ON okr_comments;
DROP TRIGGER IF EXISTS trigger_okr_team_collaboration_updated_at ON okr_team_collaboration;
DROP TRIGGER IF EXISTS trigger_okr_performance_metrics_updated_at ON okr_performance_metrics;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS okr_export_templates;
DROP TABLE IF EXISTS okr_comments;
DROP TABLE IF EXISTS okr_team_collaboration;
DROP TABLE IF EXISTS okr_analytics_snapshots;
DROP TABLE IF EXISTS okr_performance_metrics;
-- Migration 005: Remove project statistics functionality
-- Remove project_task_stats view since project statistics feature is being removed

DROP VIEW IF EXISTS project_task_stats;

-- Note: We are removing this view as part of simplifying the ProjectDetailPage
-- The frontend no longer displays project statistics, so this view is no longer needed
-- This helps reduce database overhead and simplifies the system architecture
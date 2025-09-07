-- 批量删除未使用的索引
-- 生成时间: 2025-09-07
-- 预期节省空间: ~3.6MB

-- 第1批: Timeline和Task Status相关
DROP INDEX IF EXISTS idx_timeline_events_date;
DROP INDEX IF EXISTS idx_task_status_history_timestamp;
DROP INDEX IF EXISTS idx_task_status_history_metadata;
DROP INDEX IF EXISTS idx_task_status_history_task_id;
DROP INDEX IF EXISTS idx_task_status_history_related_tasks;
DROP INDEX IF EXISTS idx_task_status_history_change_type;
DROP INDEX IF EXISTS idx_task_status_history_new_status;
DROP INDEX IF EXISTS idx_task_status_history_changed_by;
DROP INDEX IF EXISTS idx_task_status_history_parallel_group;
DROP INDEX IF EXISTS idx_task_status_history_workflow_stage;

-- 第2批: Timer相关
DROP INDEX IF EXISTS idx_unified_timer_search;
DROP INDEX IF EXISTS idx_unified_timer_metadata;
DROP INDEX IF EXISTS idx_unified_timer_tags;
DROP INDEX IF EXISTS idx_unified_timer_project;

-- 第3批: Documents相关  
DROP INDEX IF EXISTS idx_documents_project_updated_active;
DROP INDEX IF EXISTS idx_documents_tags;
DROP INDEX IF EXISTS idx_documents_archived;
DROP INDEX IF EXISTS idx_documents_archived_at;
DROP INDEX IF EXISTS idx_documents_category;
DROP INDEX IF EXISTS idx_documents_created_by;
DROP INDEX IF EXISTS idx_documents_customer_id;
DROP INDEX IF EXISTS idx_documents_deleted_at;
DROP INDEX IF EXISTS idx_documents_status;
DROP INDEX IF EXISTS idx_documents_visibility;

-- 第4批: Tasks相关
DROP INDEX IF EXISTS idx_tasks_estimated_hours;
DROP INDEX IF EXISTS idx_tasks_tags;
DROP INDEX IF EXISTS idx_tasks_dependencies;
DROP INDEX IF EXISTS idx_tasks_priority;
DROP INDEX IF EXISTS idx_tasks_actual_minutes;
DROP INDEX IF EXISTS idx_tasks_assignee_id_deleted_at;
DROP INDEX IF EXISTS idx_tasks_due_date_deleted_at;
DROP INDEX IF EXISTS idx_tasks_due_datetime;
DROP INDEX IF EXISTS idx_tasks_estimated_minutes;
DROP INDEX IF EXISTS idx_tasks_start_datetime;
DROP INDEX IF EXISTS idx_tasks_status_deleted_at;
DROP INDEX IF EXISTS idx_tasks_time_range;

-- 第5批: Enterprise相关
DROP INDEX IF EXISTS idx_enterprises_created_at;
DROP INDEX IF EXISTS enterprises_code_key;
DROP INDEX IF EXISTS idx_enterprises_status;
DROP INDEX IF EXISTS idx_enterprises_industry_type;
DROP INDEX IF EXISTS idx_enterprises_business_type;
DROP INDEX IF EXISTS idx_enterprise_users_status;
DROP INDEX IF EXISTS idx_enterprise_users_role_id;
DROP INDEX IF EXISTS idx_enterprise_users_department_id;
DROP INDEX IF EXISTS idx_enterprise_users_is_primary_contact;
DROP INDEX IF EXISTS idx_enterprise_users_created_at;
DROP INDEX IF EXISTS idx_enterprise_users_deleted_at;
DROP INDEX IF EXISTS idx_enterprise_users_invitation_token;
DROP INDEX IF EXISTS idx_enterprise_departments_manager_id;
DROP INDEX IF EXISTS idx_enterprise_departments_status;
DROP INDEX IF EXISTS idx_enterprise_departments_path;
DROP INDEX IF EXISTS idx_enterprise_departments_sort_order;
DROP INDEX IF EXISTS idx_enterprise_departments_created_at;
DROP INDEX IF EXISTS idx_enterprise_departments_deleted_at;

-- 第6批: Company相关
DROP INDEX IF EXISTS uk_company_departments_name;
DROP INDEX IF EXISTS idx_company_departments_company_id;
DROP INDEX IF EXISTS idx_company_departments_manager_id;
DROP INDEX IF EXISTS idx_company_departments_status;
DROP INDEX IF EXISTS idx_company_departments_path;
DROP INDEX IF EXISTS idx_company_users_department_id;
DROP INDEX IF EXISTS idx_company_users_role;
DROP INDEX IF EXISTS idx_company_users_customer_id_active;
DROP INDEX IF EXISTS idx_company_users_primary_contact;
DROP INDEX IF EXISTS idx_company_roles_active;
DROP INDEX IF EXISTS idx_companies_code;
DROP INDEX IF EXISTS idx_companies_created_by;

-- 第7批: System Users相关
DROP INDEX IF EXISTS system_users_username_key;
DROP INDEX IF EXISTS system_users_email_key;
DROP INDEX IF EXISTS system_users_api_key_key;
DROP INDEX IF EXISTS idx_system_users_username;
DROP INDEX IF EXISTS idx_system_users_email;
DROP INDEX IF EXISTS idx_system_users_role;
DROP INDEX IF EXISTS idx_system_users_is_active;
DROP INDEX IF EXISTS idx_system_users_deleted_at;
DROP INDEX IF EXISTS idx_system_users_last_login_at;
DROP INDEX IF EXISTS idx_system_users_session_token;
DROP INDEX IF EXISTS idx_system_users_api_key;

-- 第8批: API Keys相关
DROP INDEX IF EXISTS api_keys_key_hash_key;
DROP INDEX IF EXISTS idx_api_keys_active;
DROP INDEX IF EXISTS idx_api_keys_created_by;
DROP INDEX IF EXISTS idx_api_keys_deleted_at;
DROP INDEX IF EXISTS idx_api_keys_key_hash;
DROP INDEX IF EXISTS idx_api_keys_key_prefix;
DROP INDEX IF EXISTS idx_api_keys_metadata;
DROP INDEX IF EXISTS idx_api_keys_permissions;
DROP INDEX IF EXISTS idx_api_keys_scope_projects;
DROP INDEX IF EXISTS idx_api_keys_tags;
DROP INDEX IF EXISTS idx_api_keys_usage_count;
DROP INDEX IF EXISTS idx_api_keys_last_used;
DROP INDEX IF EXISTS idx_api_keys_expires_at;

-- 第9批: Audit Logs相关
DROP INDEX IF EXISTS audit_logs_event_id_key;
DROP INDEX IF EXISTS idx_audit_logs_project;
DROP INDEX IF EXISTS idx_audit_logs_request;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_session;
DROP INDEX IF EXISTS idx_audit_logs_status;
DROP INDEX IF EXISTS idx_audit_logs_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_correlation;
DROP INDEX IF EXISTS idx_audit_logs_event_id;
DROP INDEX IF EXISTS idx_audit_logs_parent_event;

-- 第10批: API Usage相关
DROP INDEX IF EXISTS idx_api_usage_logs_api_key_id;
DROP INDEX IF EXISTS idx_api_usage_logs_correlation_id;
DROP INDEX IF EXISTS idx_api_usage_logs_endpoint;
DROP INDEX IF EXISTS idx_api_usage_logs_endpoint_time;
DROP INDEX IF EXISTS idx_api_usage_logs_error_status;
DROP INDEX IF EXISTS idx_api_usage_logs_ip_address;
DROP INDEX IF EXISTS idx_api_usage_logs_key_status;
DROP INDEX IF EXISTS idx_api_usage_logs_key_time;
DROP INDEX IF EXISTS idx_api_usage_logs_method;
DROP INDEX IF EXISTS idx_api_usage_logs_project_id;
DROP INDEX IF EXISTS idx_api_usage_logs_rate_limited;
DROP INDEX IF EXISTS idx_api_usage_logs_response_time;
DROP INDEX IF EXISTS idx_api_usage_logs_status;
DROP INDEX IF EXISTS idx_api_usage_logs_timestamp;
DROP INDEX IF EXISTS idx_api_usage_logs_trace_id;
DROP INDEX IF EXISTS idx_api_usage_logs_user_id;
DROP INDEX IF EXISTS idx_api_usage_logs_user_time;

-- 剩余的其他未使用索引
DROP INDEX IF EXISTS idx_timeline_events_type;
DROP INDEX IF EXISTS idx_work_note_folders_sort_order;
DROP INDEX IF EXISTS idx_work_note_folders_parent_id;
DROP INDEX IF EXISTS idx_work_note_folders_project_id;
DROP INDEX IF EXISTS idx_work_note_folders_visibility;
DROP INDEX IF EXISTS idx_work_note_task_relations_work_note_id;
DROP INDEX IF EXISTS idx_work_note_task_relations_task_id;
DROP INDEX IF EXISTS idx_work_note_task_relations_created_at;
DROP INDEX IF EXISTS idx_permissions_active_code;
DROP INDEX IF EXISTS idx_permissions_module;
DROP INDEX IF EXISTS customer_users_customer_id_user_id_key;
DROP INDEX IF EXISTS customers_company_code_key;
DROP INDEX IF EXISTS document_versions_document_id_version_number_key;
DROP INDEX IF EXISTS encryption_keys_key_name_key;
DROP INDEX IF EXISTS project_companies_project_id_company_id_key;
DROP INDEX IF EXISTS uq_audit_configs_resource_action;
DROP INDEX IF EXISTS idx_mv_user_perms_user;
DROP INDEX IF EXISTS idx_mv_user_perms_permission;
DROP INDEX IF EXISTS idx_mv_user_perms_module;
DROP INDEX IF EXISTS uniq_running_timer_family;
DROP INDEX IF EXISTS idx_task_time_logs_user_start_time;
DROP INDEX IF EXISTS permission_cache_cache_key_key;
DROP INDEX IF EXISTS idx_permission_cache_key;
DROP INDEX IF EXISTS idx_permission_cache_expires;
DROP INDEX IF EXISTS idx_projects_enterprise_id;
DROP INDEX IF EXISTS idx_customer_contacts_contact_date;
DROP INDEX IF EXISTS idx_customer_contacts_customer_id;
DROP INDEX IF EXISTS idx_customer_contacts_status;
DROP INDEX IF EXISTS idx_customer_users_customer_id;
DROP INDEX IF EXISTS idx_customer_users_user_id;
DROP INDEX IF EXISTS idx_document_versions_created_at;
DROP INDEX IF EXISTS idx_document_versions_document_id;
DROP INDEX IF EXISTS idx_document_versions_version_number;
DROP INDEX IF EXISTS idx_permission_audit_logs_performed_at;
DROP INDEX IF EXISTS idx_project_companies_company_id;
DROP INDEX IF EXISTS idx_project_companies_project_id;
DROP INDEX IF EXISTS idx_projects_deleted_at;
DROP INDEX IF EXISTS idx_projects_name;
DROP INDEX IF EXISTS idx_task_documents_deleted_at;
DROP INDEX IF EXISTS idx_task_documents_relationship_type;
DROP INDEX IF EXISTS idx_task_time_logs_created_by;
DROP INDEX IF EXISTS idx_task_time_logs_start_time;
DROP INDEX IF EXISTS idx_task_time_logs_task_id;
DROP INDEX IF EXISTS idx_task_time_logs_user_id;
DROP INDEX IF EXISTS idx_task_time_logs_user_task;
DROP INDEX IF EXISTS idx_task_updates_created_at;
DROP INDEX IF EXISTS idx_task_updates_task_created;
DROP INDEX IF EXISTS idx_task_updates_task_id;
DROP INDEX IF EXISTS idx_task_updates_type;
DROP INDEX IF EXISTS idx_task_updates_type_created;
DROP INDEX IF EXISTS idx_time_estimation_history_accuracy;
DROP INDEX IF EXISTS idx_time_estimation_history_task;
DROP INDEX IF EXISTS idx_time_estimation_templates_global;
DROP INDEX IF EXISTS idx_time_estimation_templates_type;
DROP INDEX IF EXISTS idx_time_unit_configs_active;
DROP INDEX IF EXISTS idx_time_unit_configs_code;
DROP INDEX IF EXISTS idx_timer_templates_usage;
DROP INDEX IF EXISTS idx_user_timer_tasks_category;
DROP INDEX IF EXISTS idx_user_timer_tasks_created_at;
DROP INDEX IF EXISTS idx_user_timer_tasks_status;
DROP INDEX IF EXISTS idx_user_timer_tasks_user_id;
DROP INDEX IF EXISTS idx_api_quota_stats_api_key_date;
DROP INDEX IF EXISTS idx_api_quota_stats_api_key_date_hour;
DROP INDEX IF EXISTS idx_api_quota_stats_date;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_created_at;
DROP INDEX IF EXISTS idx_audit_log_entity;
DROP INDEX IF EXISTS idx_audit_log_user_id;
DROP INDEX IF EXISTS ai_configs_provider_key;
DROP INDEX IF EXISTS project_users_project_id_user_id_key;
DROP INDEX IF EXISTS idx_project_users_project_id;
DROP INDEX IF EXISTS idx_project_users_user_id;
DROP INDEX IF EXISTS idx_progress_snapshots_entity;
DROP INDEX IF EXISTS company_user_project_permissions_company_user_id_project_id_key;
DROP INDEX IF EXISTS idx_task_relationships_active;
DROP INDEX IF EXISTS idx_task_relationships_created_at;
DROP INDEX IF EXISTS idx_task_relationships_source;
DROP INDEX IF EXISTS idx_task_relationships_source_type;
DROP INDEX IF EXISTS idx_company_user_project_permissions_project_id;
DROP INDEX IF EXISTS idx_company_user_project_permissions_user_id;
DROP INDEX IF EXISTS idx_task_relationships_status;
DROP INDEX IF EXISTS idx_task_relationships_target;
DROP INDEX IF EXISTS idx_task_relationships_target_type;
DROP INDEX IF EXISTS idx_task_relationships_type;
DROP INDEX IF EXISTS idx_ai_usage_stats_usage_date;
DROP INDEX IF EXISTS idx_ai_usage_stats_provider;
DROP INDEX IF EXISTS idx_ai_usage_stats_config_id;
DROP INDEX IF EXISTS idx_document_folders_deleted_at;
DROP INDEX IF EXISTS idx_document_folders_owner_id;
DROP INDEX IF EXISTS idx_document_folders_parent_id;
DROP INDEX IF EXISTS idx_document_folders_visibility;
DROP INDEX IF EXISTS idx_ai_configs_updated_at;
DROP INDEX IF EXISTS idx_ai_configs_provider;
DROP INDEX IF EXISTS idx_ai_configs_enabled;
DROP INDEX IF EXISTS idx_ai_configs_created_by;
DROP INDEX IF EXISTS api_quota_stats_api_key_id_stat_date_stat_hour_key;
DROP INDEX IF EXISTS unique_task_relationship;

-- 执行完成后的统计
SELECT 'Unused indexes cleanup completed' as status;
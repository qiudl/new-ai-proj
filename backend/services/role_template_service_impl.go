package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
)

// The RoleTemplateService defines rich behavior in role_template_service.go
// Here we provide working helper implementations based on database/sql via
// the provided database.DB and database.Tx abstractions.

func (s *RoleTemplateService) templateCodeExists(ctx context.Context, code string, excludeID int) (bool, error) {
	query := "SELECT 1 FROM role_templates WHERE template_code = $1"
	args := []interface{}{code}
	if excludeID > 0 {
		query += " AND id <> $2"
		args = append(args, excludeID)
	}
	row := s.db.QueryRow(query, args...)
	var one int
	if err := row.Scan(&one); err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (s *RoleTemplateService) validateParentTemplate(ctx context.Context, parentID int) error {
	if parentID <= 0 {
		return fmt.Errorf("invalid parent id")
	}
	_, err := s.getTemplateByID(ctx, parentID)
	return err
}

func (s *RoleTemplateService) validatePermissionCodes(ctx context.Context, codes []string) error {
	if len(codes) == 0 {
		return nil
	}
	// Check each code exists
	for _, c := range codes {
		row := s.db.QueryRow("SELECT 1 FROM permissions WHERE permission_code = $1 AND is_active = true", c)
		var one int
		if err := row.Scan(&one); err != nil {
			return fmt.Errorf("permission not found or inactive: %s", c)
		}
	}
	return nil
}

func (s *RoleTemplateService) getTemplateByID(ctx context.Context, id int) (*models.RoleTemplate, error) {
	var tpl models.RoleTemplate
	// Use DB.Get to map columns to struct via json tags
	err := s.db.Get(&tpl, "SELECT id, template_code, template_name, template_description, category, industry, department, level, parent_template_id, is_system_template, is_active, configuration, metadata, version, created_by, created_at, updated_at FROM role_templates WHERE id = $1", id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("template not found")
		}
		return nil, err
	}
	return &tpl, nil
}

func (s *RoleTemplateService) createTemplateInTx(ctx context.Context, tx database.Tx, template *models.RoleTemplate) (*models.RoleTemplate, error) {
	q := `
		INSERT INTO role_templates (
			template_code, template_name, template_description, category,
			industry, department, level, parent_template_id,
			is_system_template, is_active, configuration, metadata, version, created_by
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
		) RETURNING id, created_at, updated_at`
	row := tx.QueryRow(q,
		template.TemplateCode,
		template.TemplateName,
		template.TemplateDescription,
		template.Category,
		template.Industry,
		template.Department,
		template.Level,
		template.ParentTemplateID,
		template.IsSystemTemplate,
		template.IsActive,
		template.Configuration,
		template.Metadata,
		template.Version,
		template.CreatedBy,
	)
	if err := row.Scan(&template.ID, &template.CreatedAt, &template.UpdatedAt); err != nil {
		return nil, fmt.Errorf("insert role_template: %w", err)
	}
	return template, nil
}

func (s *RoleTemplateService) setTemplatePermissionsInTx(ctx context.Context, tx database.Tx, templateID int, codes []string, settings []models.TemplatePermissionItem) error {
	// Map settings by code
	setMap := map[string]models.TemplatePermissionItem{}
	for _, it := range settings {
		setMap[it.PermissionCode] = it
	}
	// Resolve permission IDs for codes
	for _, code := range codes {
		var permID int
		row := tx.QueryRow("SELECT id FROM permissions WHERE permission_code = $1", code)
		if err := row.Scan(&permID); err != nil {
			return fmt.Errorf("permission code %s not found: %w", code, err)
		}
		it := setMap[code]
		// Upsert
		condJSON, _ := json.Marshal(it.Conditions)
		q := `
			INSERT INTO role_template_permissions (template_id, permission_id, is_required, is_default, priority, conditions)
			VALUES ($1,$2,$3,$4,$5,$6)
			ON CONFLICT (template_id, permission_id)
			DO UPDATE SET is_required = EXCLUDED.is_required,
				is_default = EXCLUDED.is_default,
				priority = EXCLUDED.priority,
				conditions = EXCLUDED.conditions`
		if _, err := tx.Exec(q, templateID, permID, it.IsRequired, it.IsDefault, it.Priority, condJSON); err != nil {
			return fmt.Errorf("upsert template permission %s: %w", code, err)
		}
	}
	return nil
}

func (s *RoleTemplateService) setTemplateTagsInTx(ctx context.Context, tx database.Tx, templateID int, tags []string) error {
	// Clear existing tags then insert
	if _, err := tx.Exec("DELETE FROM role_template_tags WHERE template_id = $1", templateID); err != nil {
		return fmt.Errorf("clear tags: %w", err)
	}
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag == "" {
			continue
		}
		q := `INSERT INTO role_template_tags (template_id, tag_name, tag_category) VALUES ($1,$2,'custom') ON CONFLICT (template_id, tag_name) DO NOTHING`
		if _, err := tx.Exec(q, templateID, tag); err != nil {
			return fmt.Errorf("insert tag %s: %w", tag, err)
		}
	}
	return nil
}

func (s *RoleTemplateService) setupInheritanceInTx(ctx context.Context, tx database.Tx, parentID, childID int, settings *models.TemplateInheritanceItem) error {
	if settings == nil {
		return nil
	}
	var inheritedFields []byte
	if settings.InheritedFields != nil {
		inheritedFields, _ = json.Marshal(settings.InheritedFields)
	}
	q := `
		INSERT INTO role_template_inheritance (parent_template_id, child_template_id, inheritance_type, inherited_fields)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (parent_template_id, child_template_id)
		DO UPDATE SET inheritance_type = EXCLUDED.inheritance_type, inherited_fields = EXCLUDED.inherited_fields`
	_, err := tx.Exec(q, parentID, childID, settings.InheritanceType, inheritedFields)
	return err
}

func (s *RoleTemplateService) createTemplateVersionInTx(ctx context.Context, tx database.Tx, templateID int, changeLog interface{}) error {
	// Load current template snapshot
	tpl, err := s.getTemplateByID(ctx, templateID)
	if err != nil {
		return err
	}
	// Snapshot permissions
	perms, _ := s.getTemplatePermissions(ctx, templateID)
	permSnap, _ := json.Marshal(perms)
	var changeLogStr *string
	switch v := changeLog.(type) {
	case *string:
		changeLogStr = v
	case string:
		cl := v
		changeLogStr = &cl
	default:
		changeLogStr = nil
	}
	q := `
		INSERT INTO role_template_versions (
			template_id, version, template_name, template_description,
			configuration, permission_snapshot, change_log, created_by
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`
	_, err = tx.Exec(q, templateID, tpl.Version, tpl.TemplateName, tpl.TemplateDescription, tpl.Configuration, permSnap, changeLogStr, tpl.CreatedBy)
	return err
}

func (s *RoleTemplateService) getTemplatePermissions(ctx context.Context, templateID int) ([]models.TemplatePermissionResponse, error) {
	q := `
		SELECT p.id AS permission_id, p.permission_code, p.permission_name, p.module,
		       rtp.is_required, rtp.is_default, rtp.priority, rtp.conditions
		FROM role_template_permissions rtp
		JOIN permissions p ON p.id = rtp.permission_id
		WHERE rtp.template_id = $1
		ORDER BY rtp.priority DESC, p.module, p.permission_code`
	rows, err := s.db.Query(q, templateID)
	if err != nil {
		return nil, fmt.Errorf("get template permissions: %w", err)
	}
	defer rows.Close()
	var out []models.TemplatePermissionResponse
	for rows.Next() {
		var item models.TemplatePermissionResponse
		var condJSON sql.NullString
		if err := rows.Scan(&item.PermissionID, &item.PermissionCode, &item.PermissionName, &item.Module, &item.IsRequired, &item.IsDefault, &item.Priority, &condJSON); err != nil {
			return nil, err
		}
		if condJSON.Valid && condJSON.String != "" {
			var m map[string]interface{}
			_ = json.Unmarshal([]byte(condJSON.String), &m)
			item.Conditions = m
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *RoleTemplateService) getTemplateTags(ctx context.Context, templateID int) ([]string, error) {
	q := "SELECT tag_name FROM role_template_tags WHERE template_id = $1 ORDER BY tag_name"
	rows, err := s.db.Query(q, templateID)
	if err != nil {
		return nil, fmt.Errorf("get tags: %w", err)
	}
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, nil
}

func (s *RoleTemplateService) getTemplateChildren(ctx context.Context, templateID int) ([]models.RoleTemplateChildResponse, error) {
	q := `SELECT id, template_code, template_name, level FROM role_templates WHERE parent_template_id = $1 ORDER BY level, template_name`
	rows, err := s.db.Query(q, templateID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var children []models.RoleTemplateChildResponse
	for rows.Next() {
		var c models.RoleTemplateChildResponse
		if err := rows.Scan(&c.ID, &c.TemplateCode, &c.TemplateName, &c.Level); err != nil {
			return nil, err
		}
		children = append(children, c)
	}
	return children, nil
}

func (s *RoleTemplateService) getTemplateUsageCount(ctx context.Context, templateID int) (int, error) {
	q := "SELECT COUNT(*) FROM role_template_usage WHERE template_id = $1 AND is_current_template = true"
	row := s.db.QueryRow(q, templateID)
	var cnt int
	if err := row.Scan(&cnt); err != nil {
		return 0, err
	}
	return cnt, nil
}

func (s *RoleTemplateService) isSystemUser(ctx context.Context, userID int) bool {
	// Minimal check: treat user ID 1 as system in dev
	return userID == 1
}

func (s *RoleTemplateService) listTemplatesWithFilters(ctx context.Context, req *models.RoleTemplateListRequest) ([]models.RoleTemplate, int, error) {
	where := []string{"1=1"}
	args := []interface{}{}
	idx := 1
	if req.Category != nil && *req.Category != "" {
		where = append(where, fmt.Sprintf("category = $%d", idx))
		args = append(args, *req.Category)
		idx++
	}
	if req.Industry != nil && *req.Industry != "" {
		where = append(where, fmt.Sprintf("industry = $%d", idx))
		args = append(args, *req.Industry)
		idx++
	}
	if req.Department != nil && *req.Department != "" {
		where = append(where, fmt.Sprintf("department = $%d", idx))
		args = append(args, *req.Department)
		idx++
	}
	if req.Level != nil && *req.Level > 0 {
		where = append(where, fmt.Sprintf("level = $%d", idx))
		args = append(args, *req.Level)
		idx++
	}
	if req.IsActive != nil {
		where = append(where, fmt.Sprintf("is_active = $%d", idx))
		args = append(args, *req.IsActive)
		idx++
	}
	if req.IsSystem != nil {
		where = append(where, fmt.Sprintf("is_system_template = $%d", idx))
		args = append(args, *req.IsSystem)
		idx++
	}
	if req.Search != nil && strings.TrimSpace(*req.Search) != "" {
		where = append(where, fmt.Sprintf("(template_name ILIKE $%d OR template_code ILIKE $%d)", idx, idx))
		args = append(args, "%"+strings.TrimSpace(*req.Search)+"%")
		idx++
	}
	if req.ParentID != nil {
		where = append(where, fmt.Sprintf("parent_template_id = $%d", idx))
		args = append(args, *req.ParentID)
		idx++
	}
	// Count total
	countQ := fmt.Sprintf("SELECT COUNT(*) FROM role_templates WHERE %s", strings.Join(where, " AND "))
	var total int
	if err := s.db.QueryRow(countQ, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count templates: %w", err)
	}
	// Sorting
	sortCol := "template_name"
	switch req.SortBy {
	case "level":
		sortCol = "level"
	case "created":
		sortCol = "created_at"
	case "name":
		fallthrough
	default:
		sortCol = "template_name"
	}
	sortOrder := "ASC"
	if strings.ToLower(req.SortOrder) == "desc" {
		sortOrder = "DESC"
	}
	// Pagination
	limit := req.Limit
	offset := req.Offset
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	listQ := fmt.Sprintf("SELECT id, template_code, template_name, template_description, category, industry, department, level, parent_template_id, is_system_template, is_active, configuration, metadata, version, created_by, created_at, updated_at FROM role_templates WHERE %s ORDER BY %s %s LIMIT %d OFFSET %d", strings.Join(where, " AND "), sortCol, sortOrder, limit, offset)
	var rows *sql.Rows
	var err error
	rows, err = s.db.Query(listQ, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list templates: %w", err)
	}
	defer rows.Close()
	list := []models.RoleTemplate{}
	for rows.Next() {
		var rt models.RoleTemplate
		if err := rows.Scan(
			&rt.ID, &rt.TemplateCode, &rt.TemplateName, &rt.TemplateDescription, &rt.Category, &rt.Industry, &rt.Department, &rt.Level, &rt.ParentTemplateID, &rt.IsSystemTemplate, &rt.IsActive, &rt.Configuration, &rt.Metadata, &rt.Version, &rt.CreatedBy, &rt.CreatedAt, &rt.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, rt)
	}
	return list, total, nil
}

func (s *RoleTemplateService) buildFiltersMap(req *models.RoleTemplateListRequest) map[string]interface{} {
	m := map[string]interface{}{}
	if req.Category != nil {
		m["category"] = *req.Category
	}
	if req.Industry != nil {
		m["industry"] = *req.Industry
	}
	if req.Department != nil {
		m["department"] = *req.Department
	}
	if req.Level != nil {
		m["level"] = *req.Level
	}
	if req.IsActive != nil {
		m["is_active"] = *req.IsActive
	}
	if req.IsSystem != nil {
		m["is_system"] = *req.IsSystem
	}
	if req.Search != nil {
		m["search"] = *req.Search
	}
	if req.ParentID != nil {
		m["parent_id"] = *req.ParentID
	}
	return m
}

func (s *RoleTemplateService) recordTemplateUsageInTx(ctx context.Context, tx database.Tx, usage *models.RoleTemplateUsage) error {
	q := `INSERT INTO role_template_usage (template_id, role_id, usage_type, customizations, applied_by, is_current_template) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, applied_at`
	cust, _ := json.Marshal(usage.Customizations)
	if err := tx.QueryRow(q, usage.TemplateID, usage.RoleID, usage.UsageType, cust, usage.AppliedBy, usage.IsCurrentTemplate).Scan(&usage.ID, &usage.AppliedAt); err != nil {
		return fmt.Errorf("record usage: %w", err)
	}
	return nil
}

func (s *RoleTemplateService) updateTemplateInTx(ctx context.Context, tx database.Tx, template *models.RoleTemplate) error {
	q := `UPDATE role_templates SET template_name=$2, template_description=$3, category=$4, industry=$5, department=$6, level=$7, configuration=$8, metadata=$9, version=$10, updated_at=CURRENT_TIMESTAMP WHERE id=$1`
	_, err := tx.Exec(q, template.ID, template.TemplateName, template.TemplateDescription, template.Category, template.Industry, template.Department, template.Level, template.Configuration, template.Metadata, template.Version)
	return err
}

func (s *RoleTemplateService) deleteTemplateRelationsInTx(ctx context.Context, tx database.Tx, templateID int) error {
	// Delete in order of FKs
	if _, err := tx.Exec("DELETE FROM role_template_permissions WHERE template_id = $1", templateID); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM role_template_tags WHERE template_id = $1", templateID); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM role_template_inheritance WHERE parent_template_id = $1 OR child_template_id = $1", templateID); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM role_template_versions WHERE template_id = $1", templateID); err != nil {
		return err
	}
	return nil
}

func (s *RoleTemplateService) deleteTemplateInTx(ctx context.Context, tx database.Tx, templateID int) error {
	_, err := tx.Exec("DELETE FROM role_templates WHERE id = $1", templateID)
	return err
}

// Optional: audit helper for template apply
func (s *RoleTemplateService) auditTemplateApplication(ctx context.Context, role *models.CompanyRole, permissionCodes []string, appliedBy int, templateName string) {
	if s.permissionRepo == nil || role == nil {
		return
	}
	oldVal := map[string]interface{}{"action": "apply_template", "template": templateName}
	newVal := map[string]interface{}{"permissions_set": permissionCodes}
	log := &models.PermissionAuditLog{
		CompanyUserID:  nil,
		TargetUserID:   nil,
		ActionType:     "role_template_applied",
		PermissionCode: nil,
		ResourceType:   strPtr("role"),
		ResourceID:     &role.ID,
		OldValue:       models.CustomFields(oldVal),
		NewValue:       models.CustomFields(newVal),
		Reason:         strPtr("template applied"),
		PerformedBy:    &appliedBy,
	}
	_ = s.permissionRepo.LogPermissionChange(ctx, log)
}

func strPtr(s string) *string { return &s }


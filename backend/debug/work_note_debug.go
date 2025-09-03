package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"ai-project-backend/models"

	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

func main() {
	// 连接数据库
	db, err := sql.Open("postgres", "postgresql://dev_user:dev_password_2024@localhost:5433/ai_project_db?sslmode=disable")
	if err != nil {
		log.Fatal("连接数据库失败:", err)
	}
	defer db.Close()

	// 测试数据库连接
	if err = db.Ping(); err != nil {
		log.Fatal("数据库连接测试失败:", err)
	}

	fmt.Println("🔍 开始调试工作笔记查询问题...")

	// 查询工作笔记数据
	query := `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.metadata, d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at, d.deleted_at,
		       d.archived, d.archived_at, d.archived_by, d.unarchived_at, d.unarchived_by
		FROM documents d
		WHERE d.deleted_at IS NULL 
		  AND d.owner_id = $1 
		  AND (d.metadata->>'work_note_type') IS NOT NULL
		ORDER BY d.updated_at DESC
		LIMIT 5`

	rows, err := db.QueryContext(context.Background(), query, 1)
	if err != nil {
		log.Fatal("查询失败:", err)
	}
	defer rows.Close()

	fmt.Printf("📋 开始处理查询结果...\n")

	count := 0
	validCount := 0
	for rows.Next() {
		count++
		fmt.Printf("\n--- 处理第 %d 条记录 ---\n", count)

		var doc models.Document
		var tags pq.StringArray

		err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
			&doc.Metadata, &doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt,
			&doc.Archived, &doc.ArchivedAt, &doc.ArchivedBy, &doc.UnarchivedAt, &doc.UnarchivedBy,
		)
		if err != nil {
			fmt.Printf("❌ 扫描记录失败: %v\n", err)
			continue
		}

		doc.Tags = []string(tags)
		fmt.Printf("✅ 文档ID: %d, 标题: %s\n", doc.ID, doc.Title)

		// 检查metadata
		if doc.Metadata == nil {
			fmt.Printf("❌ metadata 为空\n")
			continue
		}

		fmt.Printf("📄 Metadata 内容: %+v\n", doc.Metadata)

		// 序列化metadata查看详细内容
		metadataJSON, _ := json.MarshalIndent(doc.Metadata, "", "  ")
		fmt.Printf("📄 Metadata JSON:\n%s\n", metadataJSON)

		// 测试IsWorkNote
		isWorkNote := models.IsWorkNote(doc)
		fmt.Printf("🔍 IsWorkNote检查结果: %v\n", isWorkNote)

		if isWorkNote {
			validCount++
			fmt.Printf("✅ 这是一个有效的工作笔记\n")

			// 测试FromDocument转换
			var wn models.WorkNote
			if err := wn.FromDocument(doc); err != nil {
				fmt.Printf("❌ FromDocument转换失败: %v\n", err)
			} else {
				fmt.Printf("✅ 工作笔记转换成功: 类型=%s, 优先级=%s\n", wn.WorkNoteType, wn.Priority)
			}
		} else {
			fmt.Printf("❌ 不是有效的工作笔记\n")
			// 检查metadata中的work_note_type字段
			if val, exists := doc.Metadata["work_note_type"]; exists {
				fmt.Printf("🔍 metadata包含work_note_type字段，值: %v (类型: %T)\n", val, val)
			} else {
				fmt.Printf("❌ metadata不包含work_note_type字段\n")
			}
		}
	}

	fmt.Printf("\n📊 统计结果:\n")
	fmt.Printf("总查询记录数: %d\n", count)
	fmt.Printf("有效工作笔记数: %d\n", validCount)
	fmt.Printf("问题记录数: %d\n", count-validCount)

	fmt.Println("\n🎯 调试完成")
}

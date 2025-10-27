package services

import (
	"context"
	"fmt"
	"log"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"regexp"
	"time"
)

// TaskOrganizationService 任务组织服务
type TaskOrganizationService struct {
	db database.DB
}

// NewTaskOrganizationService 创建任务组织服务实例
func NewTaskOrganizationService(db database.DB) *TaskOrganizationService {
	return &TaskOrganizationService{db: db}
}

// ScanOrphanTasks 扫描孤立任务
func (s *TaskOrganizationService) ScanOrphanTasks(projectID int) (*models.OrphanScanResult, error) {
	// 1. 获取所有周汇总任务
	weekSummaries, err := s.GetWeekSummaryTasks(projectID)
	if err != nil {
		return nil, fmt.Errorf("获取周汇总任务失败: %w", err)
	}

	// 提取周汇总任务ID集合
	weekSummaryIDs := make(map[int]bool)
	for id := range weekSummaries {
		weekSummaryIDs[id] = true
	}

	// 2. 查询所有孤立任务（使用 SQL 查询，排除已删除的任务）
	query := `SELECT id, project_id, title, status, priority, created_at
	          FROM tasks
	          WHERE project_id = $1
	            AND parent_id IS NULL
	            AND status != $2
	            AND deleted_at IS NULL`
	rows, err := s.db.Query(query, projectID, "archived")
	if err != nil {
		return nil, fmt.Errorf("查询孤立任务失败: %w", err)
	}
	defer rows.Close()

	var orphanTasks []models.Task
	for rows.Next() {
		var task models.Task
		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title,
			&task.Status, &task.Priority, &task.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描任务行失败: %w", err)
		}
		orphanTasks = append(orphanTasks, task)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历任务行失败: %w", err)
	}

	// 3. 分析孤立任务
	result := &models.OrphanScanResult{
		TotalOrphans: 0,
		Organizable:  0,
		Archived:     0,
		Preview:      []models.WeekPreview{},
	}

	// 按周次分组任务
	weekTasksMap := make(map[int][]int)           // week_number -> task_ids
	weekTaskDetailsMap := make(map[int][]models.Task) // week_number -> tasks

	for _, task := range orphanTasks {
		// 跳过周汇总任务本身
		if weekSummaryIDs[task.ID] {
			continue
		}

		result.TotalOrphans++

		// 归档任务单独统计
		if task.Status == "archived" {
			result.Archived++
			continue
		}

		// 计算任务所属周次
		_, week := task.CreatedAt.ISOWeek()
		weekTasksMap[week] = append(weekTasksMap[week], task.ID)
		weekTaskDetailsMap[week] = append(weekTaskDetailsMap[week], task)
		result.Organizable++
	}

	// 4. 生成预览数据并预检查缺失的周汇总
	currentYear := time.Now().Year()
	for weekNum, taskIDs := range weekTasksMap {
		if len(taskIDs) == 0 {
			continue
		}

		// 使用当前年份生成周范围
		weekRange := getWeekRangeString(currentYear, weekNum)

		// 查找对应的周汇总任务
		var parentID *int
		for id, info := range weekSummaries {
			if info.WeekNumber == weekNum {
				parentID = &id
				break
			}
		}

		// 🔍 预检查：如果周汇总不存在，自动创建
		if parentID == nil {
			log.Printf("[TaskOrganization] 🔍 扫描发现缺失的周汇总 - Week %d (%s), 将自动创建",
				weekNum, weekRange)

			newParentID, err := s.createWeekSummaryTask(projectID, currentYear, weekNum)
			if err != nil {
				log.Printf("[TaskOrganization] ⚠️ 预创建周汇总失败 - Week %d, Error: %v",
					weekNum, err)
				// 不中断扫描，继续处理其他周
			} else {
				parentID = &newParentID
				log.Printf("[TaskOrganization] ✅ 预创建周汇总成功 - Week %d, ParentID: %d",
					weekNum, newParentID)
			}
		}

		// 构建任务简要信息列表
		tasks := []models.TaskBrief{}
		for _, task := range weekTaskDetailsMap[weekNum] {
			tasks = append(tasks, models.TaskBrief{
				ID:     int64(task.ID),
				Title:  task.Title,
				Status: task.Status,
			})
		}

		preview := models.WeekPreview{
			WeekNumber: weekNum,
			WeekRange:  weekRange,
			ParentID:   parentID,
			TaskCount:  len(taskIDs),
			TaskIDs:    taskIDs,
			Tasks:      tasks,
		}

		result.Preview = append(result.Preview, preview)
	}

	return result, nil
}

// GetWeekSummaryTasks 获取所有周汇总任务
func (s *TaskOrganizationService) GetWeekSummaryTasks(projectID int) (map[int]*models.WeekSummaryInfo, error) {
	// 查询包含"周"或"Week"关键字且无父任务的任务，排除已删除的任务
	query := `SELECT id, title, created_at FROM tasks
	          WHERE project_id = $1
	            AND parent_id IS NULL
	            AND (title LIKE $2 OR title LIKE $3)
	            AND deleted_at IS NULL`

	rows, err := s.db.Query(query, projectID, "%周任务汇总%", "%Week%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var task models.Task
		err := rows.Scan(&task.ID, &task.Title, &task.CreatedAt)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	weekSummaries := make(map[int]*models.WeekSummaryInfo)

	// 解析周次信息
	weekPattern := regexp.MustCompile(`Week\s+(\d+)|第\s*(\d+)\s*周`)

	for _, task := range tasks {
		matches := weekPattern.FindStringSubmatch(task.Title)
		if len(matches) > 0 {
			var weekNum int
			if matches[1] != "" {
				fmt.Sscanf(matches[1], "%d", &weekNum)
			} else if matches[2] != "" {
				fmt.Sscanf(matches[2], "%d", &weekNum)
			}

			if weekNum > 0 {
				weekSummaries[task.ID] = &models.WeekSummaryInfo{
					TaskID:     task.ID,
					WeekNumber: weekNum,
					Title:      task.Title,
				}
			}
		}
	}

	return weekSummaries, nil
}

// OrganizeTasksToWeeks 将任务批量组织到周汇总
func (s *TaskOrganizationService) OrganizeTasksToWeeks(projectID int, req *models.OrganizeRequest) (*models.OrganizeResult, error) {
	result := &models.OrganizeResult{
		Organized: 0,
		Skipped:   0,
		Failed:    0,
		Details:   []models.OrganizeDetail{},
	}

	// 获取周汇总任务映射
	weekSummaries, err := s.GetWeekSummaryTasks(projectID)
	if err != nil {
		return nil, fmt.Errorf("获取周汇总任务失败: %w", err)
	}

	// 创建week_number -> parent_id映射
	weekToParentMap := make(map[int]int)
	for taskID, info := range weekSummaries {
		weekToParentMap[info.WeekNumber] = taskID
	}

	// 处理每个任务
	for _, taskID := range req.TaskIDs {
		detail := s.organizeTask(projectID, taskID, weekToParentMap, req.AutoCreateWeeks)
		result.Details = append(result.Details, detail)

		if detail.Success {
			result.Organized++
		} else {
			if detail.Message == "已有父任务，跳过" {
				result.Skipped++
			} else {
				result.Failed++
			}
		}
	}

	return result, nil
}

// organizeTask 组织单个任务
func (s *TaskOrganizationService) organizeTask(projectID, taskID int, weekToParentMap map[int]int, autoCreate bool) models.OrganizeDetail {
	ctx := context.Background()

	// 使用 TaskRepository 查询任务
	task, err := s.db.Tasks().GetByID(ctx, taskID)
	if err != nil {
		return models.OrganizeDetail{
			TaskID:    taskID,
			TaskTitle: "",
			Success:   false,
			Message:   fmt.Sprintf("任务不存在: %v", err),
		}
	}

	// 检查项目ID匹配
	if task.ProjectID != projectID {
		return models.OrganizeDetail{
			TaskID:    taskID,
			TaskTitle: task.Title,
			Success:   false,
			Message:   "任务不属于该项目",
		}
	}

	// 已有父任务则跳过
	if task.ParentID != nil {
		return models.OrganizeDetail{
			TaskID:    taskID,
			TaskTitle: task.Title,
			Success:   false,
			Message:   "已有父任务，跳过",
		}
	}

	// 计算任务所属周次
	year, week := task.CreatedAt.ISOWeek()

	// 查找对应的周汇总任务
	parentID, exists := weekToParentMap[week]

	// 如果不存在且允许自动创建
	if !exists && autoCreate {
		newParentID, err := s.createWeekSummaryTask(projectID, year, week)
		if err != nil {
			return models.OrganizeDetail{
				TaskID:    taskID,
				TaskTitle: task.Title,
				Success:   false,
				Message:   fmt.Sprintf("创建周汇总任务失败: %v", err),
			}
		}
		parentID = newParentID
		weekToParentMap[week] = newParentID
	}

	if !exists && !autoCreate {
		return models.OrganizeDetail{
			TaskID:    taskID,
			TaskTitle: task.Title,
			Success:   false,
			Message:   fmt.Sprintf("Week %d 的周汇总任务不存在", week),
		}
	}

	// 更新任务的parent_id
	task.ParentID = &parentID
	_, err = s.db.Tasks().Update(ctx, task)
	if err != nil {
		return models.OrganizeDetail{
			TaskID:    taskID,
			TaskTitle: task.Title,
			Success:   false,
			Message:   fmt.Sprintf("更新失败: %v", err),
		}
	}

	return models.OrganizeDetail{
		TaskID:    taskID,
		TaskTitle: task.Title,
		Success:   true,
		Message:   fmt.Sprintf("已组织到 Week %d", week),
		ParentID:  &parentID,
	}
}

// createWeekSummaryTask 创建周汇总任务
func (s *TaskOrganizationService) createWeekSummaryTask(projectID, year, week int) (int, error) {
	ctx := context.Background()
	weekRange := getWeekRangeString(year, week)
	title := fmt.Sprintf("Week %d (%s) 周任务汇总", week, weekRange)
	description := fmt.Sprintf("第%d周（%s）的任务汇总", week, weekRange)

	log.Printf("[TaskOrganization] 开始创建周汇总任务 - ProjectID: %d, Year: %d, Week: %d, Range: %s",
		projectID, year, week, weekRange)

	// 创建周汇总任务
	weekTask := &models.Task{
		ProjectID:          projectID,
		Title:              title,
		Description:        &description,
		Status:             "in_progress",
		Priority:           "medium",
		ParentID:           nil,
		CustomFields:       models.CustomFields{}, // 初始化为空map，避免JSON格式错误
		TimeTrackingMode:   "manual",              // 设置时间追踪模式，避免违反数据库约束
		TimeUnitPreference: "auto",                // 设置默认时间单位偏好
		WorkHoursPerDay:    8.0,                   // 设置默认每日工作时长
	}

	createdTask, err := s.db.Tasks().Create(ctx, weekTask)
	if err != nil {
		log.Printf("[TaskOrganization] ❌ 创建周汇总任务失败 - ProjectID: %d, Week: %d, Error: %v",
			projectID, week, err)
		return 0, fmt.Errorf("创建周汇总任务失败 (Week %d, %s): %w", week, weekRange, err)
	}

	log.Printf("[TaskOrganization] ✅ 成功创建周汇总任务 - TaskID: %d, Title: %s",
		createdTask.ID, title)

	return createdTask.ID, nil
}

// getWeekRangeString 获取周日期范围字符串
func getWeekRangeString(year, week int) string {
	// 获取该年第一天
	jan1 := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)

	// 计算第一个周一
	weekday := int(jan1.Weekday())
	if weekday == 0 {
		weekday = 7 // 周日算作第7天
	}
	daysToMonday := 1 - weekday
	if daysToMonday > 0 {
		daysToMonday -= 7
	}
	firstMonday := jan1.AddDate(0, 0, daysToMonday)

	// 计算目标周的周一
	targetMonday := firstMonday.AddDate(0, 0, (week-1)*7)
	targetSunday := targetMonday.AddDate(0, 0, 6)

	// 格式化为 MM/DD-MM/DD
	return fmt.Sprintf("%02d/%02d-%02d/%02d",
		targetMonday.Month(), targetMonday.Day(),
		targetSunday.Month(), targetSunday.Day())
}

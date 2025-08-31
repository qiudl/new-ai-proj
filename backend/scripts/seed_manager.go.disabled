// 种子数据管理器
// 文件: seed_manager.go
// 描述: 种子数据的Go语言管理器，提供更好的控制和错误处理
// 作者: Claude AI (任务#365)
// 创建时间: 2025-08-27

package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

// 配置结构
type Config struct {
	DBHost     string `json:"db_host"`
	DBPort     string `json:"db_port"`
	DBName     string `json:"db_name"`
	DBUser     string `json:"db_user"`
	DBPassword string `json:"db_password"`
	AppEnv     string `json:"app_env"`
	SeedDir    string `json:"seed_dir"`
	LogLevel   string `json:"log_level"`
}

// 种子脚本信息
type SeedScript struct {
	Filename    string
	Order       int
	Title       string
	Description string
	Environment []string
	DependsOn   []string
	FilePath    string
	Content     string
}

// 种子数据管理器
type SeedManager struct {
	Config    *Config
	DB        *sql.DB
	Logger    *log.Logger
	Scripts   []SeedScript
	Executed  map[string]time.Time
}

// 创建新的种子管理器
func NewSeedManager(configPath string) (*SeedManager, error) {
	config, err := loadConfig(configPath)
	if err != nil {
		return nil, fmt.Errorf("加载配置失败: %v", err)
	}

	logger := log.New(os.Stdout, "[SEED] ", log.LstdFlags|log.Lshortfile)

	manager := &SeedManager{
		Config:   config,
		Logger:   logger,
		Executed: make(map[string]time.Time),
	}

	// 连接数据库
	if err := manager.connectDB(); err != nil {
		return nil, fmt.Errorf("数据库连接失败: %v", err)
	}

	// 加载脚本
	if err := manager.loadScripts(); err != nil {
		return nil, fmt.Errorf("加载脚本失败: %v", err)
	}

	return manager, nil
}

// 加载配置
func loadConfig(configPath string) (*Config, error) {
	// 默认配置
	config := &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5433"),
		DBName:     getEnv("DB_NAME", "ai_project_db"),
		DBUser:     getEnv("DB_USER", "dev_user"),
		DBPassword: getEnv("DB_PASSWORD", "dev_password_2024"),
		AppEnv:     getEnv("APP_ENV", "development"),
		SeedDir:    getEnv("SEED_DIR", "./seed"),
		LogLevel:   getEnv("LOG_LEVEL", "info"),
	}

	// 如果提供了配置文件，则读取
	if configPath != "" {
		if _, err := os.Stat(configPath); err == nil {
			data, err := ioutil.ReadFile(configPath)
			if err != nil {
				return nil, err
			}
			if err := json.Unmarshal(data, config); err != nil {
				return nil, err
			}
		}
	}

	return config, nil
}

// 获取环境变量
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// 连接数据库
func (sm *SeedManager) connectDB() error {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		sm.Config.DBHost,
		sm.Config.DBPort,
		sm.Config.DBUser,
		sm.Config.DBPassword,
		sm.Config.DBName,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return err
	}

	if err := db.Ping(); err != nil {
		return err
	}

	sm.DB = db
	sm.Logger.Printf("数据库连接成功: %s:%s/%s", sm.Config.DBHost, sm.Config.DBPort, sm.Config.DBName)

	return nil
}

// 加载脚本
func (sm *SeedManager) loadScripts() error {
	seedDir := sm.Config.SeedDir
	if !filepath.IsAbs(seedDir) {
		// 相对于当前工作目录
		wd, _ := os.Getwd()
		seedDir = filepath.Join(wd, seedDir)
	}

	files, err := ioutil.ReadDir(seedDir)
	if err != nil {
		return fmt.Errorf("读取种子目录失败: %v", err)
	}

	var scripts []SeedScript

	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".sql") {
			script, err := sm.parseScript(filepath.Join(seedDir, file.Name()))
			if err != nil {
				sm.Logger.Printf("警告: 解析脚本失败 %s: %v", file.Name(), err)
				continue
			}
			scripts = append(scripts, script)
		}
	}

	// 按顺序排序
	sort.Slice(scripts, func(i, j int) bool {
		return scripts[i].Order < scripts[j].Order
	})

	sm.Scripts = scripts
	sm.Logger.Printf("已加载 %d 个种子脚本", len(scripts))

	return nil
}

// 解析脚本
func (sm *SeedManager) parseScript(filePath string) (SeedScript, error) {
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return SeedScript{}, err
	}

	contentStr := string(content)
	filename := filepath.Base(filePath)

	script := SeedScript{
		Filename: filename,
		FilePath: filePath,
		Content:  contentStr,
		Order:    999, // 默认顺序
	}

	// 从文件名提取顺序号
	if parts := strings.SplitN(filename, "_", 2); len(parts) >= 2 {
		if order, err := strconv.Atoi(parts[0]); err == nil {
			script.Order = order
		}
	}

	// 解析头部注释
	lines := strings.Split(contentStr, "\n")
	for i, line := range lines {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "--") {
			break // 不再是注释
		}

		// 解析注释内容
		comment := strings.TrimSpace(strings.TrimPrefix(line, "--"))
		
		if strings.HasPrefix(comment, "描述:") || strings.HasPrefix(comment, "描述：") {
			script.Description = strings.TrimSpace(strings.TrimPrefix(comment, "描述:"))
			script.Description = strings.TrimSpace(strings.TrimPrefix(script.Description, "描述："))
		} else if strings.HasPrefix(comment, "环境:") || strings.HasPrefix(comment, "环境：") {
			envStr := strings.TrimSpace(strings.TrimPrefix(comment, "环境:"))
			envStr = strings.TrimSpace(strings.TrimPrefix(envStr, "环境："))
			script.Environment = strings.Split(envStr, ",")
			for i := range script.Environment {
				script.Environment[i] = strings.TrimSpace(script.Environment[i])
			}
		}

		// 限制解析前20行
		if i >= 20 {
			break
		}
	}

	return script, nil
}

// 检查脚本是否适用于当前环境
func (sm *SeedManager) isScriptApplicable(script SeedScript) bool {
	if len(script.Environment) == 0 {
		return true // 没有环境限制，适用所有环境
	}

	currentEnv := sm.Config.AppEnv
	for _, env := range script.Environment {
		if env == currentEnv || env == "all" {
			return true
		}
		// 环境别名检查
		if (currentEnv == "dev" || currentEnv == "development") && env == "development" {
			return true
		}
		if currentEnv == "prod" && env == "production" {
			return true
		}
	}

	return false
}

// 执行种子数据
func (sm *SeedManager) RunSeeds(force bool, specificScript string) error {
	sm.Logger.Printf("开始执行种子数据，环境: %s", sm.Config.AppEnv)

	// 创建种子执行日志表（如果不存在）
	if err := sm.ensureSeedLogTable(); err != nil {
		return fmt.Errorf("创建种子日志表失败: %v", err)
	}

	// 加载已执行的脚本记录
	if err := sm.loadExecutionHistory(); err != nil {
		return fmt.Errorf("加载执行历史失败: %v", err)
	}

	var scriptsToRun []SeedScript

	if specificScript != "" {
		// 执行指定脚本
		found := false
		for _, script := range sm.Scripts {
			if script.Filename == specificScript {
				scriptsToRun = []SeedScript{script}
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("未找到指定脚本: %s", specificScript)
		}
	} else {
		// 执行所有适用的脚本
		for _, script := range sm.Scripts {
			if !sm.isScriptApplicable(script) {
				sm.Logger.Printf("跳过脚本 %s (环境不适用)", script.Filename)
				continue
			}

			// 检查是否已执行过
			if !force {
				if _, executed := sm.Executed[script.Filename]; executed {
					sm.Logger.Printf("跳过脚本 %s (已执行过)", script.Filename)
					continue
				}
			}

			scriptsToRun = append(scriptsToRun, script)
		}
	}

	sm.Logger.Printf("计划执行 %d 个脚本", len(scriptsToRun))

	// 执行脚本
	for i, script := range scriptsToRun {
		sm.Logger.Printf("[%d/%d] 执行脚本: %s", i+1, len(scriptsToRun), script.Filename)
		if script.Description != "" {
			sm.Logger.Printf("  描述: %s", script.Description)
		}

		startTime := time.Now()
		
		if err := sm.executeScript(script); err != nil {
			return fmt.Errorf("执行脚本 %s 失败: %v", script.Filename, err)
		}

		duration := time.Since(startTime)
		sm.Logger.Printf("  ✓ 完成，耗时: %v", duration)

		// 记录执行日志
		if err := sm.logExecution(script, duration, nil); err != nil {
			sm.Logger.Printf("警告: 记录执行日志失败: %v", err)
		}
	}

	sm.Logger.Printf("种子数据执行完成")
	return nil
}

// 确保种子日志表存在
func (sm *SeedManager) ensureSeedLogTable() error {
	query := `
	CREATE TABLE IF NOT EXISTS seed_execution_log (
		id SERIAL PRIMARY KEY,
		filename VARCHAR(255) NOT NULL,
		environment VARCHAR(50) NOT NULL,
		executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		duration_ms INTEGER,
		status VARCHAR(20) DEFAULT 'success',
		error_message TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(filename, environment, executed_at)
	);
	
	CREATE INDEX IF NOT EXISTS idx_seed_log_filename ON seed_execution_log(filename);
	CREATE INDEX IF NOT EXISTS idx_seed_log_environment ON seed_execution_log(environment);
	CREATE INDEX IF NOT EXISTS idx_seed_log_executed_at ON seed_execution_log(executed_at);
	`

	_, err := sm.DB.Exec(query)
	return err
}

// 加载执行历史
func (sm *SeedManager) loadExecutionHistory() error {
	query := `
	SELECT DISTINCT filename, MAX(executed_at) as last_executed
	FROM seed_execution_log 
	WHERE environment = $1 AND status = 'success'
	GROUP BY filename
	`

	rows, err := sm.DB.Query(query, sm.Config.AppEnv)
	if err != nil {
		// 如果表不存在，忽略错误
		if strings.Contains(err.Error(), "does not exist") {
			return nil
		}
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var filename string
		var lastExecuted time.Time
		if err := rows.Scan(&filename, &lastExecuted); err != nil {
			return err
		}
		sm.Executed[filename] = lastExecuted
	}

	return rows.Err()
}

// 执行单个脚本
func (sm *SeedManager) executeScript(script SeedScript) error {
	// 开始事务
	tx, err := sm.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 设置脚本变量
	if _, err := tx.Exec("SET app_environment = $1", sm.Config.AppEnv); err != nil {
		return err
	}

	// 执行脚本内容
	if _, err := tx.Exec(script.Content); err != nil {
		return err
	}

	// 提交事务
	return tx.Commit()
}

// 记录执行日志
func (sm *SeedManager) logExecution(script SeedScript, duration time.Duration, err error) error {
	status := "success"
	var errorMsg *string
	
	if err != nil {
		status = "failed"
		errStr := err.Error()
		errorMsg = &errStr
	}

	query := `
	INSERT INTO seed_execution_log 
		(filename, environment, duration_ms, status, error_message)
	VALUES ($1, $2, $3, $4, $5)
	ON CONFLICT (filename, environment, executed_at) DO NOTHING
	`

	_, execErr := sm.DB.Exec(query, 
		script.Filename, 
		sm.Config.AppEnv,
		int(duration.Milliseconds()),
		status,
		errorMsg,
	)

	return execErr
}

// 列出脚本
func (sm *SeedManager) ListScripts() error {
	fmt.Printf("种子数据脚本列表 (环境: %s)\n", sm.Config.AppEnv)
	fmt.Printf("========================================\n\n")

	if err := sm.loadExecutionHistory(); err != nil {
		return fmt.Errorf("加载执行历史失败: %v", err)
	}

	for _, script := range sm.Scripts {
		status := "未执行"
		if execTime, executed := sm.Executed[script.Filename]; executed {
			status = fmt.Sprintf("已执行 (%s)", execTime.Format("2006-01-02 15:04:05"))
		}

		applicable := "✓"
		if !sm.isScriptApplicable(script) {
			applicable = "✗ (环境不适用)"
		}

		fmt.Printf("文件: %s\n", script.Filename)
		fmt.Printf("  顺序: %d\n", script.Order)
		fmt.Printf("  状态: %s\n", status)
		fmt.Printf("  适用: %s\n", applicable)
		if script.Description != "" {
			fmt.Printf("  描述: %s\n", script.Description)
		}
		if len(script.Environment) > 0 {
			fmt.Printf("  环境: %v\n", script.Environment)
		}
		fmt.Printf("\n")
	}

	return nil
}

// 清理执行历史
func (sm *SeedManager) CleanHistory(daysOld int) error {
	query := `
	DELETE FROM seed_execution_log 
	WHERE executed_at < NOW() - INTERVAL '%d days'
	`

	result, err := sm.DB.Exec(fmt.Sprintf(query, daysOld))
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	sm.Logger.Printf("清理了 %d 条历史记录", rowsAffected)

	return nil
}

// 关闭资源
func (sm *SeedManager) Close() error {
	if sm.DB != nil {
		return sm.DB.Close()
	}
	return nil
}

// 主函数
func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]
	
	manager, err := NewSeedManager("")
	if err != nil {
		log.Fatalf("初始化种子管理器失败: %v", err)
	}
	defer manager.Close()

	switch command {
	case "run":
		force := false
		specificScript := ""
		
		for i := 2; i < len(os.Args); i++ {
			switch os.Args[i] {
			case "--force":
				force = true
			case "--script":
				if i+1 < len(os.Args) {
					specificScript = os.Args[i+1]
					i++
				}
			}
		}
		
		if err := manager.RunSeeds(force, specificScript); err != nil {
			log.Fatalf("执行种子数据失败: %v", err)
		}

	case "list":
		if err := manager.ListScripts(); err != nil {
			log.Fatalf("列出脚本失败: %v", err)
		}

	case "clean":
		daysOld := 30
		if len(os.Args) > 2 {
			if days, err := strconv.Atoi(os.Args[2]); err == nil {
				daysOld = days
			}
		}
		if err := manager.CleanHistory(daysOld); err != nil {
			log.Fatalf("清理历史失败: %v", err)
		}

	default:
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println(`种子数据管理器 v1.0

用法: seed_manager <command> [options]

命令:
  run                 执行种子数据脚本
    --force           强制执行已执行过的脚本
    --script <name>   只执行指定脚本
  
  list                列出所有脚本及执行状态
  
  clean [days]        清理指定天数前的执行历史 (默认30天)

环境变量:
  DB_HOST             数据库主机 (默认: localhost)
  DB_PORT             数据库端口 (默认: 5433)  
  DB_NAME             数据库名称 (默认: ai_project_db)
  DB_USER             数据库用户 (默认: dev_user)
  DB_PASSWORD         数据库密码 (默认: dev_password_2024)
  APP_ENV             应用环境 (默认: development)
  SEED_DIR            种子脚本目录 (默认: ./seed)

示例:
  seed_manager run                    # 执行所有适用脚本
  seed_manager run --force            # 强制执行所有脚本
  seed_manager run --script 001_basic_seed_data.sql  # 执行指定脚本
  seed_manager list                   # 列出脚本状态
  seed_manager clean 7                # 清理7天前的历史
`)
}
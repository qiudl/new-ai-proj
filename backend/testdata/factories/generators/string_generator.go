package generators

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"sync"
	"time"

	"ai-project-backend/testdata/core"
)

// StringGenerator 字符串生成器
type StringGenerator struct {
	rand      *rand.Rand
	stats     GeneratorStats
	mutex     sync.RWMutex
	uniqueSet map[string]bool // 用于确保唯一性
}

// NewStringGenerator 创建字符串生成器
func NewStringGenerator() *StringGenerator {
	return &StringGenerator{
		rand:      rand.New(rand.NewSource(time.Now().UnixNano())),
		stats:     GeneratorStats{},
		uniqueSet: make(map[string]bool),
	}
}

// Generate 生成字符串值
func (g *StringGenerator) Generate(ctx context.Context, field core.IFieldDefinition, config GeneratorConfig) (interface{}, error) {
	start := time.Now()
	defer func() {
		g.updateStats(time.Since(start))
	}()

	// 检查是否有自定义模式
	if config.Pattern != "" {
		return g.generateByPattern(config.Pattern, config.Unique)
	}

	// 获取长度范围
	minLen, maxLen := g.getLengthRange(field, config)

	// 生成随机长度
	length := minLen
	if maxLen > minLen {
		length = minLen + g.rand.Intn(maxLen-minLen+1)
	}

	// 根据字段名称生成相应类型的字符串
	fieldName := strings.ToLower(field.GetName())
	var result string
	var err error

	switch {
	case strings.Contains(fieldName, "name") && !strings.Contains(fieldName, "username"):
		result, err = g.generateName(config.Locale)
	case strings.Contains(fieldName, "title"):
		result, err = g.generateTitle(length)
	case strings.Contains(fieldName, "description"):
		result, err = g.generateDescription(length)
	case strings.Contains(fieldName, "username"):
		result, err = g.generateUsername(length)
	case strings.Contains(fieldName, "password"):
		result, err = g.generatePassword(length)
	case strings.Contains(fieldName, "email"):
		result, err = g.generateEmail()
	case strings.Contains(fieldName, "phone"):
		result, err = g.generatePhone()
	case strings.Contains(fieldName, "address"):
		result, err = g.generateAddress(config.Locale)
	case strings.Contains(fieldName, "company"):
		result, err = g.generateCompany(config.Locale)
	default:
		result = g.generateRandomString(length)
	}

	if err != nil {
		return nil, err
	}

	// 确保唯一性
	if config.Unique {
		result = g.ensureUnique(result)
	}

	return result, nil
}

// GenerateBatch 批量生成字符串值
func (g *StringGenerator) GenerateBatch(ctx context.Context, field core.IFieldDefinition, count int, config GeneratorConfig) ([]interface{}, error) {
	results := make([]interface{}, count)
	for i := 0; i < count; i++ {
		value, err := g.Generate(ctx, field, config)
		if err != nil {
			return nil, err
		}
		results[i] = value

		// 检查上下文取消
		select {
		case <-ctx.Done():
			return results[:i], ctx.Err()
		default:
		}
	}
	return results, nil
}

// generateByPattern 根据模式生成字符串
func (g *StringGenerator) generateByPattern(pattern string, unique bool) (string, error) {
	result := pattern

	// 替换占位符
	placeholders := map[string]func() string{
		"{random}":     func() string { return g.generateRandomString(8) },
		"{number}":     func() string { return fmt.Sprintf("%d", g.rand.Intn(10000)) },
		"{letter}":     func() string { return string(rune('A' + g.rand.Intn(26))) },
		"{timestamp}":  func() string { return fmt.Sprintf("%d", time.Now().Unix()) },
		"{uuid}":       func() string { return g.generateUUID() },
	}

	for placeholder, generator := range placeholders {
		if strings.Contains(result, placeholder) {
			result = strings.ReplaceAll(result, placeholder, generator())
		}
	}

	if unique {
		result = g.ensureUnique(result)
	}

	return result, nil
}

// generateName 生成姓名
func (g *StringGenerator) generateName(locale string) (string, error) {
	if locale == "zh_CN" || locale == "zh" {
		surnames := []string{
			"王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴",
			"徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗",
		}
		givenNames := []string{
			"伟", "芳", "娜", "秀英", "敏", "静", "丽", "强", "磊", "军",
			"洋", "勇", "艳", "杰", "涛", "明", "超", "娟", "秀兰", "霞",
		}

		surname := surnames[g.rand.Intn(len(surnames))]
		givenName := givenNames[g.rand.Intn(len(givenNames))]
		return surname + givenName, nil
	}

	// 英文名称
	firstNames := []string{
		"John", "Jane", "Michael", "Sarah", "David", "Lisa", "Christopher", "Amy",
		"Daniel", "Emma", "Matthew", "Olivia", "Andrew", "Sophia", "Joshua", "Isabella",
		"James", "Charlotte", "Robert", "Mia", "William", "Abigail", "Benjamin", "Emily",
	}
	lastNames := []string{
		"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
		"Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
		"Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
	}

	firstName := firstNames[g.rand.Intn(len(firstNames))]
	lastName := lastNames[g.rand.Intn(len(lastNames))]
	return fmt.Sprintf("%s %s", firstName, lastName), nil
}

// generateTitle 生成标题
func (g *StringGenerator) generateTitle(maxLen int) (string, error) {
	titles := []string{
		"项目管理系统优化升级",
		"用户界面重构与改进",
		"数据库性能调优实践",
		"RESTful API接口开发",
		"前端组件库设计开发",
		"系统安全防护加固",
		"移动端响应式适配",
		"自动化测试用例编写",
		"技术文档更新维护",
		"代码审查与重构优化",
		"微服务架构设计实现",
		"缓存系统性能优化",
		"日志监控告警系统",
		"容器化部署实践",
		"持续集成流水线搭建",
	}

	title := titles[g.rand.Intn(len(titles))]
	if maxLen > 0 && len(title) > maxLen {
		// 保持中文字符完整性
		runes := []rune(title)
		if len(runes) > maxLen-3 {
			title = string(runes[:maxLen-3]) + "..."
		}
	}

	return title, nil
}

// generateDescription 生成描述
func (g *StringGenerator) generateDescription(maxLen int) (string, error) {
	templates := []string{
		"负责{module}模块的设计开发工作，包括需求分析、技术方案设计、代码实现和单元测试。",
		"对{component}组件进行性能优化改进，提升系统响应速度和用户体验。",
		"实现{feature}功能特性，满足业务需求并确保代码质量和可维护性。",
		"修复{bug}相关问题，深入分析根本原因并提供完整解决方案。",
		"编写{document}技术文档，确保内容准确完整且易于理解。",
		"参与{project}项目开发，协调团队合作完成既定目标。",
		"优化{system}系统架构，提升整体性能和可扩展性。",
		"开发{tool}开发工具，提升团队开发效率和代码质量。",
	}

	template := templates[g.rand.Intn(len(templates))]

	// 替换占位符
	placeholders := map[string][]string{
		"{module}":    {"登录认证", "用户管理", "权限控制", "数据统计", "消息通知", "文件上传", "搜索引擎", "支付结算"},
		"{component}": {"数据库查询", "缓存机制", "用户界面", "后台服务", "第三方集成", "消息队列", "负载均衡", "监控告警"},
		"{feature}":   {"多语言支持", "角色权限", "数据导入", "批量操作", "实时同步", "离线缓存", "自动备份", "智能推荐"},
		"{bug}":       {"内存泄漏", "并发冲突", "数据不一致", "接口超时", "页面卡顿", "登录失败", "文件损坏", "计算错误"},
		"{document}":  {"API接口", "部署指南", "用户手册", "开发规范", "架构设计", "测试方案", "运维文档", "安全指南"},
		"{project}":   {"电商平台", "管理系统", "移动应用", "数据平台", "监控系统", "自动化工具", "客服系统", "财务系统"},
		"{system}":    {"分布式架构", "微服务体系", "数据库集群", "缓存体系", "消息系统", "搜索系统", "存储系统", "计算平台"},
		"{tool}":      {"代码生成", "自动测试", "持续集成", "性能监控", "日志分析", "部署自动化", "代码审查", "文档生成"},
	}

	for placeholder, options := range placeholders {
		if strings.Contains(template, placeholder) {
			replacement := options[g.rand.Intn(len(options))]
			template = strings.Replace(template, placeholder, replacement, -1)
		}
	}

	if maxLen > 0 && len(template) > maxLen {
		runes := []rune(template)
		if len(runes) > maxLen-3 {
			template = string(runes[:maxLen-3]) + "..."
		}
	}

	return template, nil
}

// generateUsername 生成用户名
func (g *StringGenerator) generateUsername(length int) (string, error) {
	prefixes := []string{"user", "admin", "test", "demo", "guest", "member", "client", "account"}
	prefix := prefixes[g.rand.Intn(len(prefixes))]

	// 添加数字后缀
	suffix := fmt.Sprintf("%d", g.rand.Intn(9999)+1)
	username := prefix + suffix

	// 调整长度
	if length > 0 && len(username) > length {
		username = username[:length]
	} else if length > 0 && len(username) < length {
		// 添加随机字符补足长度
		chars := "abcdefghijklmnopqrstuvwxyz0123456789"
		for len(username) < length {
			username += string(chars[g.rand.Intn(len(chars))])
		}
	}

	return username, nil
}

// generatePassword 生成密码
func (g *StringGenerator) generatePassword(length int) (string, error) {
	if length < 8 {
		length = 8 // 最小长度
	}

	// 确保包含各种字符类型
	lowercase := "abcdefghijklmnopqrstuvwxyz"
	uppercase := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	digits := "0123456789"
	symbols := "!@#$%^&*"

	password := ""
	
	// 每种类型至少包含一个字符
	password += string(lowercase[g.rand.Intn(len(lowercase))])
	password += string(uppercase[g.rand.Intn(len(uppercase))])
	password += string(digits[g.rand.Intn(len(digits))])
	password += string(symbols[g.rand.Intn(len(symbols))])

	// 填充剩余长度
	allChars := lowercase + uppercase + digits + symbols
	for len(password) < length {
		password += string(allChars[g.rand.Intn(len(allChars))])
	}

	// 打乱字符顺序
	runes := []rune(password)
	for i := range runes {
		j := g.rand.Intn(i + 1)
		runes[i], runes[j] = runes[j], runes[i]
	}

	return string(runes), nil
}

// generateEmail 生成邮箱
func (g *StringGenerator) generateEmail() (string, error) {
	usernames := []string{"john", "jane", "mike", "sarah", "david", "lisa", "admin", "user", "test"}
	domains := []string{"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "example.com", "test.com"}

	username := usernames[g.rand.Intn(len(usernames))]
	number := g.rand.Intn(9999) + 1
	domain := domains[g.rand.Intn(len(domains))]

	return fmt.Sprintf("%s%d@%s", username, number, domain), nil
}

// generatePhone 生成电话号码
func (g *StringGenerator) generatePhone() (string, error) {
	// 中国手机号格式
	prefixes := []string{"130", "131", "132", "133", "134", "135", "136", "137", "138", "139",
		"150", "151", "152", "153", "155", "156", "157", "158", "159",
		"180", "181", "182", "183", "184", "185", "186", "187", "188", "189"}

	prefix := prefixes[g.rand.Intn(len(prefixes))]
	suffix := fmt.Sprintf("%08d", g.rand.Intn(100000000))

	return prefix + suffix, nil
}

// generateAddress 生成地址
func (g *StringGenerator) generateAddress(locale string) (string, error) {
	if locale == "zh_CN" || locale == "zh" {
		provinces := []string{"北京市", "上海市", "广东省", "浙江省", "江苏省", "山东省", "河北省", "河南省"}
		cities := []string{"海淀区", "朝阳区", "浦东新区", "天河区", "西湖区", "鼓楼区", "历下区", "金水区"}
		streets := []string{"中关村大街", "王府井大街", "南京路", "淮海路", "春熙路", "解放路", "人民路", "中山路"}

		province := provinces[g.rand.Intn(len(provinces))]
		city := cities[g.rand.Intn(len(cities))]
		street := streets[g.rand.Intn(len(streets))]
		number := g.rand.Intn(999) + 1

		return fmt.Sprintf("%s%s%s%d号", province, city, street, number), nil
	}

	// 英文地址
	numbers := g.rand.Intn(9999) + 1
	streets := []string{"Main St", "First Ave", "Second Ave", "Oak St", "Pine St", "Maple Ave", "Elm St", "Park Ave"}
	cities := []string{"New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego"}
	states := []string{"NY", "CA", "IL", "TX", "AZ", "PA", "FL", "OH"}

	street := streets[g.rand.Intn(len(streets))]
	city := cities[g.rand.Intn(len(cities))]
	state := states[g.rand.Intn(len(states))]
	zipCode := fmt.Sprintf("%05d", g.rand.Intn(100000))

	return fmt.Sprintf("%d %s, %s, %s %s", numbers, street, city, state, zipCode), nil
}

// generateCompany 生成公司名
func (g *StringGenerator) generateCompany(locale string) (string, error) {
	if locale == "zh_CN" || locale == "zh" {
		prefixes := []string{"北京", "上海", "深圳", "杭州", "广州", "成都", "南京", "武汉"}
		names := []string{"科技", "信息", "网络", "软件", "数据", "智能", "创新", "发展"}
		suffixes := []string{"有限公司", "股份有限公司", "科技有限公司", "信息技术有限公司"}

		prefix := prefixes[g.rand.Intn(len(prefixes))]
		name := names[g.rand.Intn(len(names))]
		suffix := suffixes[g.rand.Intn(len(suffixes))]

		return prefix + name + suffix, nil
	}

	// 英文公司名
	prefixes := []string{"Advanced", "Global", "Digital", "Smart", "Innovative", "Future", "Prime", "Elite"}
	names := []string{"Tech", "Solutions", "Systems", "Dynamics", "Networks", "Software", "Data", "Cloud"}
	suffixes := []string{"Inc.", "Corp.", "LLC", "Ltd.", "Co."}

	prefix := prefixes[g.rand.Intn(len(prefixes))]
	name := names[g.rand.Intn(len(names))]
	suffix := suffixes[g.rand.Intn(len(suffixes))]

	return fmt.Sprintf("%s %s %s", prefix, name, suffix), nil
}

// generateRandomString 生成随机字符串
func (g *StringGenerator) generateRandomString(length int) string {
	chars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = chars[g.rand.Intn(len(chars))]
	}
	return string(result)
}

// generateUUID 生成UUID
func (g *StringGenerator) generateUUID() string {
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%12x",
		g.rand.Uint32(),
		g.rand.Uint32()&0xffff,
		g.rand.Uint32()&0x0fff|0x4000,
		g.rand.Uint32()&0x3fff|0x8000,
		uint64(g.rand.Uint32())<<32|uint64(g.rand.Uint32()))
}

// ensureUnique 确保唯一性
func (g *StringGenerator) ensureUnique(value string) string {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	original := value
	counter := 1

	for g.uniqueSet[value] {
		value = fmt.Sprintf("%s_%d", original, counter)
		counter++
	}

	g.uniqueSet[value] = true
	return value
}

// getLengthRange 获取长度范围
func (g *StringGenerator) getLengthRange(field core.IFieldDefinition, config GeneratorConfig) (int, int) {
	minLen, maxLen := 1, 50 // 默认范围

	// 从字段约束中获取长度限制
	for _, constraint := range field.GetConstraints() {
		params := constraint.GetParams()
		switch constraint.GetType() {
		case core.ConstraintTypeLength:
			if min, ok := params["min"].(int); ok {
				minLen = min
			}
			if max, ok := params["max"].(int); ok {
				maxLen = max
			}
		}
	}

	// 从配置中获取范围
	if config.Range.Min != nil {
		if min, ok := config.Range.Min.(int); ok {
			minLen = min
		}
	}
	if config.Range.Max != nil {
		if max, ok := config.Range.Max.(int); ok {
			maxLen = max
		}
	}

	if minLen > maxLen {
		minLen, maxLen = maxLen, minLen
	}

	return minLen, maxLen
}

// updateStats 更新统计信息
func (g *StringGenerator) updateStats(duration time.Duration) {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	g.stats.GenerationCount++
	g.stats.TotalTime += duration
	if g.stats.GenerationCount > 0 {
		g.stats.AverageTime = g.stats.TotalTime / time.Duration(g.stats.GenerationCount)
	}
	g.stats.LastGenerated = time.Now()
}

// GetType 获取类型
func (g *StringGenerator) GetType() core.FieldType {
	return core.FieldTypeString
}

// GetName 获取名称
func (g *StringGenerator) GetName() string {
	return "string_generator"
}

// Validate 验证配置
func (g *StringGenerator) Validate(config GeneratorConfig) error {
	return nil
}

// GetStats 获取统计信息
func (g *StringGenerator) GetStats() GeneratorStats {
	g.mutex.RLock()
	defer g.mutex.RUnlock()
	return g.stats
}

// ResetStats 重置统计
func (g *StringGenerator) ResetStats() {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	g.stats = GeneratorStats{}
	g.uniqueSet = make(map[string]bool)
}

// SetSeed 设置种子
func (g *StringGenerator) SetSeed(seed int64) {
	g.mutex.Lock()
	defer g.mutex.Unlock()
	g.rand = rand.New(rand.NewSource(seed))
}

// Clone 克隆生成器
func (g *StringGenerator) Clone() *StringGenerator {
	return &StringGenerator{
		rand:      rand.New(rand.NewSource(time.Now().UnixNano())),
		stats:     GeneratorStats{},
		uniqueSet: make(map[string]bool),
	}
}

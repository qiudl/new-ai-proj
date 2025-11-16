package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// EmailService handles email sending functionality
type EmailService struct {
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string
	Enabled      bool // Allow disabling email in development
}

// NewEmailService creates a new email service from environment variables
func NewEmailService() *EmailService {
	enabled := os.Getenv("EMAIL_ENABLED") != "false" // Default to enabled

	return &EmailService{
		SMTPHost:     getEmailEnvOrDefault("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEmailEnvOrDefault("SMTP_PORT", "587"),
		SMTPUsername: getEmailEnvOrDefault("SMTP_USERNAME", ""),
		SMTPPassword: getEmailEnvOrDefault("SMTP_PASSWORD", ""),
		FromEmail:    getEmailEnvOrDefault("SMTP_FROM_EMAIL", "noreply@aiproj.com"),
		FromName:     getEmailEnvOrDefault("SMTP_FROM_NAME", "AI-Proj Team"),
		Enabled:      enabled,
	}
}

// EmailData represents data for email templates
type EmailData struct {
	To            string
	Subject       string
	Body          string
	ResetLink     string
	ExpiryMinutes int
	ResetTime     time.Time
	IPAddress     string
	Username      string
}

// SendPasswordResetEmail sends a password reset email
func (s *EmailService) SendPasswordResetEmail(to string, resetLink string, expiryMinutes int) error {
	if !s.Enabled {
		log.Printf("[Email] Disabled - Would send password reset to: %s", to)
		log.Printf("[Email] Reset link: %s", resetLink)
		return nil
	}

	subject := "重置您的密码 - AI-Proj"

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1890ff; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f5f5f5; padding: 30px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        .warning { background-color: #fff7e6; border-left: 4px solid #faad14; padding: 12px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>密码重置请求</h1>
        </div>
        <div class="content">
            <p>您好,</p>
            <p>我们收到了重置您 <strong>AI-Proj</strong> 账户密码的请求。</p>
            <p>请点击下面的按钮重置您的密码：</p>
            <p style="text-align: center;">
                <a href="%s" class="button">重置密码</a>
            </p>
            <p>或复制以下链接到浏览器中打开：</p>
            <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">%s</p>
            <div class="warning">
                <strong>⚠️ 重要提示：</strong>
                <ul style="margin: 10px 0;">
                    <li>此链接将在 <strong>%d 分钟</strong>后失效</li>
                    <li>链接仅可使用一次</li>
                    <li>如果您没有请求重置密码，请忽略此邮件</li>
                </ul>
            </div>
            <p style="margin-top: 20px;">为了您的账户安全，请勿将此链接分享给他人。</p>
        </div>
        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复</p>
            <p>&copy; 2025 AI-Proj. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`, resetLink, resetLink, expiryMinutes)

	return s.SendHTMLEmail(to, subject, body)
}

// SendPasswordResetSuccessEmail sends a notification after successful password reset
func (s *EmailService) SendPasswordResetSuccessEmail(to string, resetTime time.Time, ipAddress string) error {
	if !s.Enabled {
		log.Printf("[Email] Disabled - Would send reset success notification to: %s", to)
		return nil
	}

	subject := "密码已成功重置 - AI-Proj"

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #52c41a; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f5f5f5; padding: 30px; }
        .info-box { background-color: #fff; border: 1px solid #d9d9d9; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        .alert { background-color: #fff1f0; border-left: 4px solid #ff4d4f; padding: 12px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ 密码重置成功</h1>
        </div>
        <div class="content">
            <p>您好,</p>
            <p>您的 <strong>AI-Proj</strong> 账户密码已成功重置。</p>
            <div class="info-box">
                <p><strong>重置详情：</strong></p>
                <ul style="list-style: none; padding: 0;">
                    <li>🕐 重置时间: %s</li>
                    <li>🌐 IP 地址: %s</li>
                </ul>
            </div>
            <div class="alert">
                <p><strong>⚠️ 如果这不是您本人的操作：</strong></p>
                <p>请立即联系我们的支持团队，您的账户可能存在安全风险。</p>
            </div>
            <p>为了账户安全，建议您：</p>
            <ul>
                <li>定期更换密码（建议90天更换一次）</li>
                <li>使用强密码（至少8个字符，包含大小写字母、数字和特殊字符）</li>
                <li>不要在多个网站使用相同密码</li>
            </ul>
        </div>
        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复</p>
            <p>&copy; 2025 AI-Proj. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`, resetTime.Format("2006-01-02 15:04:05"), ipAddress)

	return s.SendHTMLEmail(to, subject, body)
}

// SendHTMLEmail sends an HTML email
func (s *EmailService) SendHTMLEmail(to string, subject string, htmlBody string) error {
	if !s.Enabled {
		log.Printf("[Email] Disabled - Would send to: %s, subject: %s", to, subject)
		return nil
	}

	// Validate configuration
	if s.SMTPUsername == "" || s.SMTPPassword == "" {
		return fmt.Errorf("SMTP credentials not configured")
	}

	// Build email message
	from := fmt.Sprintf("%s <%s>", s.FromName, s.FromEmail)

	msg := []byte(fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n"+
			"%s",
		from, to, subject, htmlBody,
	))

	// SMTP authentication
	auth := smtp.PlainAuth("", s.SMTPUsername, s.SMTPPassword, s.SMTPHost)

	// Send email
	addr := fmt.Sprintf("%s:%s", s.SMTPHost, s.SMTPPort)
	err := smtp.SendMail(addr, auth, s.FromEmail, []string{to}, msg)

	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("[Email] Successfully sent to: %s, subject: %s", to, subject)
	return nil
}

// SendPlainEmail sends a plain text email
func (s *EmailService) SendPlainEmail(to string, subject string, body string) error {
	if !s.Enabled {
		log.Printf("[Email] Disabled - Would send plain email to: %s", to)
		return nil
	}

	from := fmt.Sprintf("%s <%s>", s.FromName, s.FromEmail)

	msg := []byte(fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"\r\n"+
			"%s",
		from, to, subject, body,
	))

	auth := smtp.PlainAuth("", s.SMTPUsername, s.SMTPPassword, s.SMTPHost)
	addr := fmt.Sprintf("%s:%s", s.SMTPHost, s.SMTPPort)

	return smtp.SendMail(addr, auth, s.FromEmail, []string{to}, msg)
}

// SendTemplateEmail sends an email using a template
func (s *EmailService) SendTemplateEmail(to string, subject string, templateStr string, data interface{}) error {
	tmpl, err := template.New("email").Parse(templateStr)
	if err != nil {
		return fmt.Errorf("failed to parse template: %w", err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("failed to execute template: %w", err)
	}

	return s.SendHTMLEmail(to, subject, buf.String())
}

// Helper function to get environment variable with default
func getEmailEnvOrDefault(key string, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// MaskEmail masks an email address for privacy
// Example: john.doe@example.com -> j***@example.com
func MaskEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return "***@***"
	}

	username := parts[0]
	domain := parts[1]

	if len(username) <= 1 {
		return "*@" + domain
	}

	masked := string(username[0]) + "***"
	return masked + "@" + domain
}

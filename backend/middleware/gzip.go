package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

const (
	// 默认压缩级别 - 平衡压缩率和性能
	DefaultCompressionLevel = gzip.DefaultCompression
	// 最小压缩大小 - 小于此大小的响应不压缩
	MinContentLength = 1024 // 1KB
)

var gzipWriterPool = sync.Pool{
	New: func() interface{} {
		gz, _ := gzip.NewWriterLevel(io.Discard, DefaultCompressionLevel)
		return gz
	},
}

// GzipConfig gzip压缩配置
type GzipConfig struct {
	// CompressionLevel 压缩级别 (1-9, 默认 gzip.DefaultCompression = -1)
	CompressionLevel int
	// MinContentLength 最小压缩大小（字节），小于此大小不压缩
	MinContentLength int
	// ExcludedExtensions 排除的文件扩展名
	ExcludedExtensions []string
	// ExcludedPaths 排除的路径
	ExcludedPaths []string
}

// DefaultGzipConfig 默认配置
func DefaultGzipConfig() GzipConfig {
	return GzipConfig{
		CompressionLevel: DefaultCompressionLevel,
		MinContentLength: MinContentLength,
		ExcludedExtensions: []string{
			".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
			".woff", ".woff2", ".ttf", ".eot",
			".mp4", ".webm", ".ogg", ".mp3", ".wav",
			".zip", ".tar", ".gz", ".rar", ".7z",
		},
		ExcludedPaths: []string{
			"/metrics", // Prometheus metrics通常已经很小
			"/health",  // 健康检查不需要压缩
		},
	}
}

// Gzip 返回gzip压缩中间件
func Gzip() gin.HandlerFunc {
	return GzipWithConfig(DefaultGzipConfig())
}

// GzipWithConfig 使用自定义配置创建gzip中间件
func GzipWithConfig(config GzipConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查客户端是否支持gzip
		if !shouldCompress(c.Request, config) {
			c.Next()
			return
		}

		// 使用对象池获取gzip writer
		gz := gzipWriterPool.Get().(*gzip.Writer)
		defer gzipWriterPool.Put(gz)
		gz.Reset(c.Writer)

		// 包装原始ResponseWriter
		c.Writer = &gzipWriter{
			ResponseWriter: c.Writer,
			writer:         gz,
			config:         config,
		}

		// 设置响应头
		c.Header("Content-Encoding", "gzip")
		c.Header("Vary", "Accept-Encoding")

		defer func() {
			// 确保所有数据都被写入
			gz.Close()
			c.Header("Content-Length", "")
		}()

		c.Next()
	}
}

// shouldCompress 判断是否应该压缩
func shouldCompress(req *http.Request, config GzipConfig) bool {
	// 检查Accept-Encoding头
	if !strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") {
		return false
	}

	// SSE (Server-Sent Events) 不应该被压缩
	if strings.Contains(req.URL.Path, "/sse") {
		return false
	}

	// 检查是否是排除的路径
	for _, path := range config.ExcludedPaths {
		if strings.HasPrefix(req.URL.Path, path) {
			return false
		}
	}

	// 检查是否是排除的文件扩展名
	for _, ext := range config.ExcludedExtensions {
		if strings.HasSuffix(req.URL.Path, ext) {
			return false
		}
	}

	return true
}

// gzipWriter 包装的ResponseWriter
type gzipWriter struct {
	gin.ResponseWriter
	writer         *gzip.Writer
	config         GzipConfig
	wroteHeader    bool
	shouldCompress bool
}

// Write 实现io.Writer接口
func (g *gzipWriter) Write(data []byte) (int, error) {
	// 第一次写入时决定是否压缩
	if !g.wroteHeader {
		g.wroteHeader = true

		// 如果响应太小，不压缩
		if len(data) < g.config.MinContentLength {
			g.shouldCompress = false
			// 移除gzip相关的header
			g.ResponseWriter.Header().Del("Content-Encoding")
			g.ResponseWriter.Header().Del("Vary")
		} else {
			g.shouldCompress = true
		}
	}

	// 根据决定进行写入
	if g.shouldCompress {
		return g.writer.Write(data)
	}
	return g.ResponseWriter.Write(data)
}

// WriteString 实现gin.ResponseWriter接口
func (g *gzipWriter) WriteString(s string) (int, error) {
	return g.Write([]byte(s))
}

// WriteHeader 实现http.ResponseWriter接口
func (g *gzipWriter) WriteHeader(code int) {
	// 如果是某些状态码，不需要压缩
	if code == http.StatusNoContent || code == http.StatusNotModified {
		g.ResponseWriter.Header().Del("Content-Encoding")
		g.ResponseWriter.Header().Del("Vary")
	}
	g.ResponseWriter.WriteHeader(code)
}

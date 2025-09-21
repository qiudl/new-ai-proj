/**
 * 日志中间件
 */

export const loggerMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now()
  const { method, url, headers, body } = req
  
  console.log(`[${new Date().toISOString()}] ${method} ${url}`)
  
  // 如果有请求体，记录下来
  if (body && Object.keys(body).length > 0) {
    console.log('Request Body:', JSON.stringify(body, null, 2))
  }
  
  // 响应结束时记录响应时间
  res.on('finish', () => {
    const duration = Date.now() - start
    const { statusCode } = res
    console.log(`[${new Date().toISOString()}] ${method} ${url} ${statusCode} - ${duration}ms`)
  })
  
  next()
}
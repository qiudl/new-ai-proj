/**
 * GXLF Platform Admin - Mock Server (JavaScript Version)
 * 统一模拟后端服务
 */

const jsonServer = require('json-server')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const server = jsonServer.create()
const middlewares = jsonServer.defaults({
  noCors: false
})

// 配置CORS
server.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  optionsSuccessStatus: 200
}))

// 应用默认中间件
server.use(middlewares)

// 解析JSON请求体
server.use(jsonServer.bodyParser)

// 日志中间件
server.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// 统一响应格式中间件 - 只对特定路径生效
server.use('/api/v1', (req, res, next) => {
  // 跳过已经格式化的响应
  if (req.url.includes('/api/v1') && req.url !== '/api/v1/health' && req.url !== '/api/v1/auth/login') {
    const originalSend = res.send
    
    res.send = function(data) {
      if (data && typeof data === 'object' && data.hasOwnProperty('success')) {
        return originalSend.call(this, data)
      }
      
      const response = {
        success: true,
        data: data,
        timestamp: Date.now(),
        requestId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      return originalSend.call(this, response)
    }
  }
  
  next()
})

// 健康检查
server.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    message: 'Service is healthy',
    timestamp: Date.now(),
    requestId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })
})

// 认证登录
server.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body
  
  if (!username || !password) {
    return res.status(422).json({
      success: false,
      error: {
        code: '42200',
        message: '用户名和密码不能为空',
        details: { fields: ['username', 'password'] }
      },
      timestamp: Date.now(),
      requestId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })
  }
  
  if (username === 'admin' && password === 'admin123') {
    const loginResponse = {
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@gxlf.com',
        name: '系统管理员',
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin'],
        avatar: 'https://via.placeholder.com/64x64/007ACC/ffffff?text=A'
      },
      token: `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refreshToken: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expiresIn: 3600
    }
    
    res.json({
      success: true,
      data: loginResponse,
      message: '登录成功',
      timestamp: Date.now(),
      requestId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })
  } else {
    res.status(401).json({
      success: false,
      error: {
        code: '40100',
        message: '用户名或密码错误'
      },
      timestamp: Date.now(),
      requestId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })
  }
})

// 创建简单的数据库文件
const dbFile = './mock-db.json'
if (!fs.existsSync(dbFile)) {
  const initialData = {
    users: [
      {
        id: 1,
        username: 'admin',
        email: 'admin@gxlf.com',
        name: '系统管理员',
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ],
    tenants: [
      {
        id: 1,
        name: '测试租户',
        code: 'TEST001',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ]
  }
  
  fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2))
  console.log('🗄️  Mock database initialized')
}

// 使用JSON Server路由
const router = jsonServer.router(dbFile)
server.use('/api/v1', router)

const PORT = process.env.MOCK_PORT || 9099
const HOST = process.env.MOCK_HOST || 'localhost'

server.listen(PORT, () => {
  console.log(`🚀 Mock Server running on http://${HOST}:${PORT}`)
  console.log(`📊 API Base: http://${HOST}:${PORT}/api/v1`)
  console.log(`🔑 Login: POST http://${HOST}:${PORT}/api/v1/auth/login`)
  console.log(`❤️  Health: GET http://${HOST}:${PORT}/api/v1/health`)
})
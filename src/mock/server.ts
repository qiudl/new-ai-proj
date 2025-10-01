/**
 * GXLF Platform Admin - Mock Server
 * 统一模拟后端服务
 */

import jsonServer from 'json-server'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { authMiddleware } from './middleware/auth'
import { responseMiddleware } from './middleware/response'
import { loggerMiddleware } from './middleware/logger'
import { routeConfig } from './config/routes'
import { initializeDatabase } from './config/database'

const server = jsonServer.create()
const router = jsonServer.router('src/mock/data/db.json')
const middlewares = jsonServer.defaults({
  static: './src/mock/public', // 静态文件目录
  noCors: false
})

// 配置CORS
server.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
  optionsSuccessStatus: 200
}))

// 应用默认中间件
server.use(middlewares)

// 解析JSON请求体
server.use(jsonServer.bodyParser)

// 自定义中间件
server.use(loggerMiddleware)
server.use(responseMiddleware)
server.use(authMiddleware)

// 添加请求ID到所有请求
server.use((req: any, res: any, next: any) => {
  req.requestId = uuidv4()
  next()
})

// 自定义路由配置
routeConfig(server)

// 应用默认REST路由
server.use('/api/v1', router)

// 初始化数据库
initializeDatabase()

const PORT = process.env.MOCK_PORT || 9099
const HOST = process.env.MOCK_HOST || 'localhost'

server.listen(PORT, () => {
  console.log(`🚀 Mock Server running on http://${HOST}:${PORT}`)
  console.log(`📊 Dashboard: http://${HOST}:${PORT}/api/v1/dashboard`)
  console.log(`👥 Users: http://${HOST}:${PORT}/api/v1/users`)
  console.log(`🏢 Tenants: http://${HOST}:${PORT}/api/v1/tenants`)
  console.log(`🔑 Auth: http://${HOST}:${PORT}/api/v1/auth/login`)
})

export default server
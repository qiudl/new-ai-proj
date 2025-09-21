/**
 * 路由配置
 */

import { createSuccessResponse, createErrorResponse, ErrorCodes, simulateDelay } from '../utils/response'

export const routeConfig = (server: any) => {
  
  // 健康检查
  server.get('/api/v1/health', async (req: any, res: any) => {
    await simulateDelay(50, 100)
    res.json(createSuccessResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }, 'Service is healthy', req.requestId))
  })

  // 认证登录
  server.post('/api/v1/auth/login', async (req: any, res: any) => {
    await simulateDelay(200, 500)
    
    const { username, password } = req.body
    
    // 模拟登录验证
    if (!username || !password) {
      const errorResponse = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        '用户名和密码不能为空',
        { fields: ['username', 'password'] },
        req.requestId
      )
      return res.status(422).json(errorResponse)
    }
    
    // 模拟用户验证
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
      
      res.json(createSuccessResponse(loginResponse, '登录成功', req.requestId))
    } else {
      const errorResponse = createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        '用户名或密码错误',
        null,
        req.requestId
      )
      res.status(401).json(errorResponse)
    }
  })

  // 获取当前用户信息
  server.get('/api/v1/auth/me', async (req: any, res: any) => {
    await simulateDelay(100, 200)
    
    const userInfo = {
      id: req.user?.id || 1,
      username: req.user?.username || 'admin',
      email: 'admin@gxlf.com',
      name: '系统管理员',
      role: req.user?.role || 'admin',
      permissions: req.user?.permissions || ['read', 'write', 'delete', 'admin'],
      avatar: 'https://via.placeholder.com/64x64/007ACC/ffffff?text=A',
      lastLoginAt: new Date().toISOString(),
      settings: {
        theme: 'light',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai'
      }
    }
    
    res.json(createSuccessResponse(userInfo, '获取用户信息成功', req.requestId))
  })

  // 退出登录
  server.post('/api/v1/auth/logout', async (req: any, res: any) => {
    await simulateDelay(100, 200)
    res.json(createSuccessResponse(null, '退出登录成功', req.requestId))
  })

  // 刷新Token
  server.post('/api/v1/auth/refresh', async (req: any, res: any) => {
    await simulateDelay(100, 300)
    
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      const errorResponse = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Refresh token is required',
        null,
        req.requestId
      )
      return res.status(422).json(errorResponse)
    }
    
    const tokenResponse = {
      token: `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refreshToken: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expiresIn: 3600
    }
    
    res.json(createSuccessResponse(tokenResponse, 'Token刷新成功', req.requestId))
  })

  // 仪表盘数据
  server.get('/api/v1/dashboard', async (req: any, res: any) => {
    await simulateDelay(300, 600)
    
    const dashboardData = {
      stats: {
        totalUsers: 1250,
        activeTenants: 85,
        totalRevenue: 1250000,
        growthRate: 15.6
      },
      recentActivities: [
        {
          id: 1,
          type: 'user_login',
          description: '用户 admin 登录系统',
          timestamp: new Date().toISOString(),
          user: 'admin'
        },
        {
          id: 2,
          type: 'tenant_created',
          description: '新增租户: 测试公司',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'admin'
        }
      ],
      chartData: {
        userGrowth: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          value: Math.floor(Math.random() * 100) + 50
        })),
        revenue: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(2024, i, 1).toLocaleDateString('zh-CN', { month: 'short' }),
          value: Math.floor(Math.random() * 100000) + 50000
        }))
      }
    }
    
    res.json(createSuccessResponse(dashboardData, '获取仪表盘数据成功', req.requestId))
  })

}
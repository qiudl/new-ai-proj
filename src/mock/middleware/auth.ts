/**
 * 认证中间件
 */

import { createErrorResponse, ErrorCodes } from '../utils/response'

// 需要认证的路径
const protectedPaths = [
  '/api/v1/users',
  '/api/v1/tenants',
  '/api/v1/dashboard',
  '/api/v1/system'
]

// 跳过认证的路径
const publicPaths = [
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/health'
]

export const authMiddleware = (req: any, res: any, next: any) => {
  const { method, url } = req
  
  // OPTIONS请求直接通过
  if (method === 'OPTIONS') {
    return next()
  }
  
  // 检查是否是公开路径
  const isPublicPath = publicPaths.some(path => url.startsWith(path))
  if (isPublicPath) {
    return next()
  }
  
  // 检查是否需要认证
  const needsAuth = protectedPaths.some(path => url.startsWith(path))
  if (!needsAuth) {
    return next()
  }
  
  // 检查Authorization头
  const authorization = req.headers.authorization
  if (!authorization || !authorization.startsWith('Bearer ')) {
    const errorResponse = createErrorResponse(
      ErrorCodes.UNAUTHORIZED,
      '缺少认证令牌',
      { path: url },
      req.requestId
    )
    return res.status(401).json(errorResponse)
  }
  
  // 简单的token验证（实际项目中应该验证JWT）
  const token = authorization.substring(7)
  if (token === 'invalid' || token.length < 10) {
    const errorResponse = createErrorResponse(
      ErrorCodes.INVALID_TOKEN,
      '无效的认证令牌',
      { path: url },
      req.requestId
    )
    return res.status(401).json(errorResponse)
  }
  
  // 模拟用户信息
  req.user = {
    id: 1,
    username: 'admin',
    role: 'admin',
    permissions: ['read', 'write', 'delete']
  }
  
  next()
}
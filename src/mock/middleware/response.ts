/**
 * 统一响应格式中间件
 */

import { createSuccessResponse, generateRequestId } from '../utils/response'

export const responseMiddleware = (req: any, res: any, next: any) => {
  // 保存原始的发送方法
  const originalSend = res.send
  const originalJson = res.json
  
  // 重写send方法
  res.send = function(data: any) {
    // 如果已经是错误响应格式，直接发送
    if (data && typeof data === 'object' && data.hasOwnProperty('success')) {
      return originalSend.call(this, data)
    }
    
    // 对于正常响应，包装成统一格式
    const response = createSuccessResponse(data, undefined, req.requestId)
    return originalSend.call(this, response)
  }
  
  // 重写json方法
  res.json = function(data: any) {
    // 如果已经是错误响应格式，直接发送
    if (data && typeof data === 'object' && data.hasOwnProperty('success')) {
      return originalJson.call(this, data)
    }
    
    // 对于正常响应，包装成统一格式
    const response = createSuccessResponse(data, undefined, req.requestId)
    return originalJson.call(this, response)
  }
  
  next()
}
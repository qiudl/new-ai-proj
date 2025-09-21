/**
 * 数据库配置和初始化
 */

import { faker } from '@faker-js/faker'
import * as fs from 'fs'
import * as path from 'path'

// 设置faker为中文
faker.setLocale('zh_CN')

/**
 * 生成用户数据
 */
function generateUsers(count: number = 50) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    username: faker.internet.userName(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    avatar: `https://via.placeholder.com/64x64/${faker.color.rgb().replace('#', '')}/ffffff?text=${faker.person.firstName().charAt(0)}`,
    role: faker.helpers.arrayElement(['admin', 'user', 'moderator']),
    status: faker.helpers.arrayElement(['active', 'inactive', 'suspended']),
    phone: faker.phone.number(),
    department: faker.company.name(),
    position: faker.person.jobTitle(),
    lastLoginAt: faker.date.recent().toISOString(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString()
  }))
}

/**
 * 生成租户数据
 */
function generateTenants(count: number = 20) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: faker.company.name(),
    code: faker.string.alphanumeric(8).toUpperCase(),
    status: faker.helpers.arrayElement(['active', 'inactive', 'suspended']),
    type: faker.helpers.arrayElement(['enterprise', 'startup', 'government']),
    contactPerson: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    website: faker.internet.url(),
    description: faker.company.buzzPhrase(),
    settings: {
      theme: faker.helpers.arrayElement(['light', 'dark']),
      language: faker.helpers.arrayElement(['zh-CN', 'en-US']),
      timezone: 'Asia/Shanghai',
      features: faker.helpers.arrayElements(['dashboard', 'analytics', 'reports', 'integrations'], { min: 2, max: 4 })
    },
    subscription: {
      plan: faker.helpers.arrayElement(['basic', 'professional', 'enterprise']),
      status: faker.helpers.arrayElement(['active', 'expired', 'trial']),
      startDate: faker.date.past().toISOString(),
      endDate: faker.date.future().toISOString()
    },
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString()
  }))
}

/**
 * 生成系统配置数据
 */
function generateSystemConfig() {
  return {
    site: {
      name: 'GXLF Platform Admin',
      description: 'GXLF平台管理系统',
      logo: 'https://via.placeholder.com/120x40/007ACC/ffffff?text=GXLF',
      favicon: 'https://via.placeholder.com/32x32/007ACC/ffffff?text=G',
      keywords: ['管理系统', '平台', 'GXLF'],
      author: 'GXLF Team'
    },
    security: {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      sessionTimeout: 3600,
      maxLoginAttempts: 5,
      lockoutDuration: 900
    },
    features: {
      registration: true,
      emailVerification: true,
      twoFactorAuth: false,
      socialLogin: ['google', 'github'],
      maintenance: false
    },
    notifications: {
      email: {
        enabled: true,
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'noreply@gxlf.com'
      },
      sms: {
        enabled: false,
        provider: 'aliyun'
      },
      push: {
        enabled: true,
        provider: 'firebase'
      }
    }
  }
}

/**
 * 初始化数据库
 */
export function initializeDatabase() {
  const dataDir = path.join(process.cwd(), 'src/mock/data')
  const dbFile = path.join(dataDir, 'db.json')
  
  // 确保数据目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  // 如果数据库文件不存在，创建初始数据
  if (!fs.existsSync(dbFile)) {
    const initialData = {
      users: generateUsers(),
      tenants: generateTenants(),
      system: generateSystemConfig(),
      // 为分页测试添加更多数据
      posts: Array.from({ length: 100 }, (_, index) => ({
        id: index + 1,
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(3),
        author: faker.person.fullName(),
        category: faker.helpers.arrayElement(['技术', '产品', '设计', '运营']),
        tags: faker.helpers.arrayElements(['React', 'Vue', 'Node.js', 'TypeScript', 'JavaScript'], { min: 1, max: 3 }),
        status: faker.helpers.arrayElement(['draft', 'published', 'archived']),
        views: faker.number.int({ min: 0, max: 10000 }),
        likes: faker.number.int({ min: 0, max: 1000 }),
        createdAt: faker.date.past().toISOString(),
        updatedAt: faker.date.recent().toISOString()
      }))
    }
    
    fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2))
    console.log('🗄️  Mock database initialized with sample data')
  } else {
    console.log('🗄️  Mock database already exists')
  }
}

/**
 * 重置数据库
 */
export function resetDatabase() {
  const dbFile = path.join(process.cwd(), 'src/mock/data/db.json')
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile)
    console.log('🗑️  Mock database reset')
  }
  initializeDatabase()
}
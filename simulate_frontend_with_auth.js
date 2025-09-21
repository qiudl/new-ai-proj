// Simulate exactly what the frontend does WITH authentication
const https = require('https');
const http = require('http');

// Simulate API client with interceptor and auth
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async post(path, data) {
    const url = `${this.baseURL}${path}`;
    console.log(`[ApiClient] POST ${url}`);
    
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: url.replace(/https?:\/\//, '').split('/')[0],
        path: url.replace(/https?:\/\/[^\/]+/, ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length,
        }
      };
      
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async get(path) {
    const url = `${this.baseURL}${path}`;
    console.log(`[ApiClient] GET ${url}`);
    
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      const options = {
        hostname: url.replace(/https?:\/\//, '').split('/')[0],
        path: url.replace(/https?:\/\/[^\/]+/, ''),
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        }
      };
      
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            console.log(`[ApiClient] Raw response:`, parsed);
            
            // Simulate API interceptor logic (from api.ts line 82-84)
            let processedResponse = parsed;
            if (parsed && typeof parsed === 'object' && 'success' in parsed && 'data' in parsed) {
              processedResponse = parsed.data;
              console.log(`[ApiClient] API Interceptor: Unwrapped response.data`);
            }
            
            console.log(`[ApiClient] Final processed response:`, processedResponse);
            resolve(processedResponse);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', reject);
      req.end();
    });
  }
}

// Simulate DailyFocusTasksService
class DailyFocusTasksService {
  constructor(api) {
    this.api = api;
    this.basePath = '/api/v1/daily-focus-tasks';
  }

  async getRecommendations() {
    try {
      console.log('[DailyFocusTasksService] Getting recommendations...');
      const response = await this.api.get(`${this.basePath}/recommendations`);
      
      console.log('[DailyFocusTasksService] Raw API response:', response);
      
      // Handle the actual API response structure: {data: {suggestions: [{task: ...}]}}
      if (response && response.suggestions && Array.isArray(response.suggestions)) {
        const tasks = response.suggestions.map(suggestion => suggestion.task).filter(Boolean);
        console.log('[DailyFocusTasksService] Extracted tasks:', tasks.length, tasks);
        return tasks;
      }
      
      console.log('[DailyFocusTasksService] No valid suggestions structure, returning empty array');
      return [];
    } catch (error) {
      console.error('[DailyFocusTasksService] Error getting recommendations:', error);
      throw error;
    }
  }
}

// Simulate the hook
class DailyFocusTasksHook {
  constructor() {
    this.api = new ApiClient('http://localhost:8081');
    this.service = new DailyFocusTasksService(this.api);
    this.recommendations = [];
  }

  async authenticate() {
    console.log('[Auth] Getting authentication token...');
    const authResponse = await this.api.post('/api/v1/auth/dev/quick-login', {
      username: 'admin'
    });
    
    if (authResponse.success) {
      const token = authResponse.data.access_token;
      this.api.setToken(token);
      console.log('[Auth] ✅ Authentication successful');
      return true;
    }
    
    console.log('[Auth] ❌ Authentication failed');
    return false;
  }

  async loadRecommendations() {
    try {
      console.log('[useDailyFocusTasks] Loading recommendations...');
      const recommendations = await this.service.getRecommendations();
      console.log('[useDailyFocusTasks] Got recommendations:', recommendations.length, recommendations);
      this.recommendations = recommendations;
      return recommendations;
    } catch (err) {
      console.error('[useDailyFocusTasks] Failed to load recommendations:', err);
      this.recommendations = [];
      return [];
    }
  }
}

// Test the complete flow
async function testFrontendFlow() {
  console.log('=== 模拟前端完整推荐流程（含认证）===\n');
  
  try {
    const hook = new DailyFocusTasksHook();
    
    // First authenticate
    const authSuccess = await hook.authenticate();
    if (!authSuccess) {
      throw new Error('认证失败');
    }
    
    // Then load recommendations
    const recommendations = await hook.loadRecommendations();
    
    console.log('\n=== 最终结果 ===');
    console.log(`推荐任务数量: ${recommendations.length}`);
    
    if (recommendations.length > 0) {
      console.log('✅ 前端应该显示推荐提示和模态框');
      console.log('推荐任务列表:');
      recommendations.forEach((task, index) => {
        console.log(`  ${index + 1}. #${task.id} ${task.title}`);
      });
    } else {
      console.log('❌ 前端不会显示推荐任务');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testFrontendFlow();
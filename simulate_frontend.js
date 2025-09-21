// Simulate exactly what the frontend does
const https = require('https');
const http = require('http');

// Simulate API client with interceptor
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async get(path) {
    const url = `${this.baseURL}${path}`;
    console.log(`[ApiClient] GET ${url}`);
    
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      client.get(url, (res) => {
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
      }).on('error', reject);
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
  console.log('=== 模拟前端完整推荐流程 ===\n');
  
  try {
    const hook = new DailyFocusTasksHook();
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
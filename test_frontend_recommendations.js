// Test frontend recommendations API call
const axios = require('axios');

async function testRecommendations() {
  try {
    // Get auth token
    console.log('1. Getting auth token...');
    const authResponse = await axios.post('http://localhost:8081/api/v1/auth/dev/quick-login', {
      username: 'admin'
    });
    
    const token = authResponse.data.data.access_token;
    console.log('✅ Got token:', token.substring(0, 20) + '...');
    
    // Test recommendations API directly
    console.log('\n2. Testing recommendations API directly...');
    const apiResponse = await axios.get('http://localhost:8081/api/v1/daily-focus-tasks/recommendations', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Direct API response structure:');
    console.log('- Success:', apiResponse.data.success);
    console.log('- Suggestions count:', apiResponse.data.data?.suggestions?.length || 0);
    if (apiResponse.data.data?.suggestions?.length > 0) {
      console.log('- First suggestion task title:', apiResponse.data.data.suggestions[0].task?.title);
    }
    
    // Test what frontend would receive after API interceptor
    console.log('\n3. Testing frontend service simulation...');
    const response = apiResponse.data.data; // This simulates what frontend gets after API interceptor
    
    if (response && response.suggestions && Array.isArray(response.suggestions)) {
      const tasks = response.suggestions.map(suggestion => suggestion.task).filter(Boolean);
      console.log('✅ Frontend would receive', tasks.length, 'tasks');
      tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. #${task.id} ${task.title}`);
      });
    } else {
      console.log('❌ No valid suggestions structure found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testRecommendations();
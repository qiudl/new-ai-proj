#!/usr/bin/env node

/**
 * Archive Functionality Diagnostic Tool
 * 
 * This script tests the archive functionality end-to-end to identify
 * the exact cause of the 404/401 error reported by the user.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';

class ArchiveTestSuite {
  constructor() {
    this.token = null;
  }

  async authenticate() {
    console.log('🔐 Step 1: Authenticating...');
    
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'password123'
      });
      
      if (response.data && response.data.data && response.data.data.token) {
        this.token = response.data.data.token;
        console.log('✅ Authentication successful');
        console.log(`📝 Token length: ${this.token.length}`);
        return true;
      } else {
        console.log('❌ Authentication failed - no token in response');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return false;
      }
    } catch (error) {
      console.log('❌ Authentication failed');
      console.log('Error:', error.response?.data || error.message);
      return false;
    }
  }

  async testArchiveRoutes() {
    if (!this.token) {
      console.log('❌ Cannot test archive routes - no authentication token');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };

    console.log('\n📋 Step 2: Testing Archive Routes...');

    // Test 1: Archive a specific task (the one from user's error)
    await this.testSingleArchive(headers, 1, 45);

    // Test 2: Get archived tasks list
    await this.testGetArchivedTasks(headers, 1);

    // Test 3: Archive statistics
    await this.testArchiveStatistics(headers, 1);

    // Test 4: Create and immediately archive a test task
    await this.testCreateAndArchive(headers, 1);
  }

  async testSingleArchive(headers, projectId, taskId) {
    console.log(`\n🗃️ Testing single task archive: Project ${projectId}, Task ${taskId}`);
    
    try {
      const response = await axios.post(
        `${BASE_URL}/projects/${projectId}/tasks/${taskId}/archive`,
        { reason: 'Testing archive functionality' },
        { headers }
      );
      
      console.log('✅ Archive request successful');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      console.log(`❌ Archive request failed with status ${status}`);
      console.log('Error details:', JSON.stringify(data, null, 2));
      
      if (status === 401) {
        console.log('🔍 Diagnosis: Authentication issue - token may be invalid or expired');
      } else if (status === 404) {
        console.log('🔍 Diagnosis: Route not found or task does not exist');
      } else if (status === 400) {
        console.log('🔍 Diagnosis: Bad request - check task exists and is not already archived');
      }
    }
  }

  async testGetArchivedTasks(headers, projectId) {
    console.log(`\n📋 Testing get archived tasks: Project ${projectId}`);
    
    try {
      const response = await axios.get(
        `${BASE_URL}/projects/${projectId}/tasks/archived`,
        { headers }
      );
      
      console.log('✅ Get archived tasks successful');
      console.log(`📊 Found ${response.data.data?.tasks?.length || 0} archived tasks`);
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      console.log(`❌ Get archived tasks failed with status ${status}`);
      console.log('Error details:', JSON.stringify(data, null, 2));
    }
  }

  async testArchiveStatistics(headers, projectId) {
    console.log(`\n📊 Testing archive statistics: Project ${projectId}`);
    
    try {
      const response = await axios.get(
        `${BASE_URL}/projects/${projectId}/archive/stats`,
        { headers }
      );
      
      console.log('✅ Archive statistics successful');
      console.log('Stats:', JSON.stringify(response.data.data, null, 2));
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      console.log(`❌ Archive statistics failed with status ${status}`);
      console.log('Error details:', JSON.stringify(data, null, 2));
    }
  }

  async testCreateAndArchive(headers, projectId) {
    console.log(`\n🛠️ Testing create and archive workflow: Project ${projectId}`);
    
    try {
      // Step 1: Create a test task
      console.log('📝 Creating test task...');
      const createResponse = await axios.post(
        `${BASE_URL}/projects/${projectId}/tasks`,
        {
          title: 'Archive Test Task',
          description: 'This task is created specifically for testing archive functionality',
          status: 'todo',
          custom_fields: {
            priority: 'low',
            category: 'testing'
          }
        },
        { headers }
      );
      
      if (!createResponse.data.success) {
        console.log('❌ Failed to create test task');
        return;
      }
      
      const taskId = createResponse.data.data.id;
      console.log(`✅ Test task created with ID: ${taskId}`);
      
      // Step 2: Archive the test task
      console.log('🗃️ Archiving test task...');
      const archiveResponse = await axios.post(
        `${BASE_URL}/projects/${projectId}/tasks/${taskId}/archive`,
        { reason: 'Automated test archive' },
        { headers }
      );
      
      console.log('✅ Test task archived successfully');
      console.log('Archive response:', JSON.stringify(archiveResponse.data, null, 2));
      
      // Step 3: Verify the task is in archived list
      console.log('🔍 Verifying task appears in archived list...');
      const archivedResponse = await axios.get(
        `${BASE_URL}/projects/${projectId}/tasks/archived`,
        { headers }
      );
      
      const archivedTasks = archivedResponse.data.data?.tasks || [];
      const foundTask = archivedTasks.find(task => task.id === taskId);
      
      if (foundTask) {
        console.log('✅ Test task found in archived list');
        console.log(`📋 Task: ${foundTask.title} (archived at: ${foundTask.archived_at})`);
      } else {
        console.log('❌ Test task not found in archived list');
      }
      
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      console.log(`❌ Create and archive workflow failed with status ${status}`);
      console.log('Error details:', JSON.stringify(data, null, 2));
    }
  }

  async checkBackendStatus() {
    console.log('🏥 Step 0: Checking backend health...');
    
    try {
      const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`);
      console.log('✅ Backend is healthy');
      console.log('Health status:', response.data);
      return true;
    } catch (error) {
      console.log('❌ Backend health check failed');
      console.log('Error:', error.message);
      return false;
    }
  }

  async run() {
    console.log('🚀 Archive Functionality Diagnostic Test Suite');
    console.log('='.repeat(60));
    
    // Check backend health first
    const backendHealthy = await this.checkBackendStatus();
    if (!backendHealthy) {
      console.log('\n❌ Cannot proceed - backend is not responding');
      return;
    }
    
    // Authenticate
    const authenticated = await this.authenticate();
    if (!authenticated) {
      console.log('\n❌ Cannot proceed - authentication failed');
      return;
    }
    
    // Test archive functionality
    await this.testArchiveRoutes();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Diagnostic Summary:');
    console.log('• If all tests pass: Archive functionality is working correctly');
    console.log('• If 401 errors: Check frontend token storage and transmission');
    console.log('• If 404 errors: Check backend route registration');
    console.log('• If 400 errors: Check task existence and current status');
    console.log('\n📝 Check the specific error messages above for detailed diagnosis');
  }
}

// Run the test suite
const testSuite = new ArchiveTestSuite();
testSuite.run().catch(error => {
  console.error('❌ Test suite failed:', error.message);
});
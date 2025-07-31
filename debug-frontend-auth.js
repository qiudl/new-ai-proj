#!/usr/bin/env node

/**
 * Frontend Authentication Debug Script
 * This script helps debug authentication issues in the frontend
 */

const https = require('https');
const http = require('http');

// Test API endpoints
const baseUrl = 'http://localhost';
const apiUrl = `${baseUrl}/api/v1`;

// Test user credentials
const testUser = {
    username: 'qiudl',
    password: '123456'
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsedBody = JSON.parse(body);
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: parsedBody
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: body
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function debugAuthentication() {
    console.log('🔍 Starting Frontend Authentication Debug...\n');

    try {
        // Step 1: Test login endpoint
        console.log('1. Testing login endpoint...');
        const loginOptions = {
            hostname: 'localhost',
            port: 80,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const loginResult = await makeRequest(loginOptions, testUser);
        console.log(`   Status: ${loginResult.status}`);
        
        if (loginResult.status === 200 && loginResult.data.success) {
            console.log('   ✅ Login successful');
            const token = loginResult.data.data.token;
            const user = loginResult.data.data.user;
            console.log(`   👤 User: ${user.username} (${user.user_type})`);
            console.log(`   🎫 Token: ${token.substring(0, 20)}...`);

            // Step 2: Test user profile endpoint
            console.log('\n2. Testing user profile endpoint...');
            const profileOptions = {
                hostname: 'localhost',
                port: 80,
                path: '/api/v1/users/profile',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            };

            const profileResult = await makeRequest(profileOptions);
            console.log(`   Status: ${profileResult.status}`);
            
            if (profileResult.status === 200 && profileResult.data.success) {
                console.log('   ✅ Profile fetch successful');
                console.log(`   📊 Profile: ${JSON.stringify(profileResult.data.data, null, 2)}`);
            } else {
                console.log('   ❌ Profile fetch failed');
                console.log(`   Error: ${JSON.stringify(profileResult.data, null, 2)}`);
            }

            // Step 3: Test projects endpoint  
            console.log('\n3. Testing projects endpoint...');
            const projectsOptions = {
                hostname: 'localhost',
                port: 80,
                path: '/api/v1/projects/1',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            };

            const projectsResult = await makeRequest(projectsOptions);
            console.log(`   Status: ${projectsResult.status}`);
            
            if (projectsResult.status === 200 && projectsResult.data.success) {
                console.log('   ✅ Projects fetch successful');
                console.log(`   📁 Project: ${projectsResult.data.data.name}`);
            } else {
                console.log('   ❌ Projects fetch failed');
                console.log(`   Error: ${JSON.stringify(projectsResult.data, null, 2)}`);
            }

            // Step 4: Provide frontend commands
            console.log('\n4. Frontend integration commands:');
            console.log('   Run these commands in your browser console:');
            console.log(`   localStorage.setItem('token', '${token}');`);
            console.log(`   localStorage.setItem('currentUser', '${JSON.stringify(user)}');`);
            console.log(`   window.location.reload();`);

        } else {
            console.log('   ❌ Login failed');
            console.log(`   Error: ${JSON.stringify(loginResult.data, null, 2)}`);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }

    console.log('\n🏁 Debug completed!');
}

// Run the debug
debugAuthentication();

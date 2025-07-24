// Debug script for timer functionality
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozNCwidXNlcm5hbWUiOiJxaXVkbCIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6InFpdWRsIiwiZXhwIjoxNzUzNDQ0NDQ3LCJuYmYiOjE3NTMzNTgwNDcsImlhdCI6MTc1MzM1ODA0N30.NiB-Zt4yT3vRPRXxaL4e0CENvXOt4JoeIe_Dyp7Gnxs";
const baseUrl = "http://localhost:8080/api/v1";

async function testTimerAPI() {
  console.log("=== Testing Timer API ===");
  
  try {
    // Test current timer
    console.log("1. Getting current timer status...");
    const currentResponse = await fetch(`${baseUrl}/timer/current`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const currentData = await currentResponse.json();
    console.log("Current timer:", currentData);
    
    // Test getting available tasks
    console.log("\n2. Getting available tasks...");
    const tasksResponse = await fetch(`${baseUrl}/tasks?status=todo,in_progress&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tasksData = await tasksResponse.json();
    console.log("Available tasks count:", tasksData.data?.data?.length || 0);
    
    if (tasksData.data?.data?.length > 0) {
      const firstTask = tasksData.data.data[0];
      console.log("First task:", firstTask.id, firstTask.title);
      
      // Test starting timer
      console.log("\n3. Starting timer for task", firstTask.id);
      const startResponse = await fetch(`${baseUrl}/timer/start`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task_id: firstTask.id })
      });
      const startData = await startResponse.json();
      console.log("Start timer result:", startData);
      
      // Wait a moment then check status
      console.log("\n4. Waiting 2 seconds then checking status...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`${baseUrl}/timer/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusData = await statusResponse.json();
      console.log("Timer status after start:", statusData);
      
      // Stop timer
      console.log("\n5. Stopping timer...");
      const stopResponse = await fetch(`${baseUrl}/timer/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const stopData = await stopResponse.json();
      console.log("Stop timer result:", stopData);
    }
    
  } catch (error) {
    console.error("API test failed:", error);
  }
}

testTimerAPI();
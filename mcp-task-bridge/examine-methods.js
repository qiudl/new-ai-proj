import { TaskMCPServer } from './task-mcp.js';

async function examineTaskServer() {
  const taskServer = new TaskMCPServer();
  
  // List all available methods
  console.log('Available TaskMCPServer methods:');
  const methods = Object.getOwnPropertyNames(TaskMCPServer.prototype).filter(name => name !== 'constructor');
  methods.forEach(method => console.log('  -', method));
  
  // Check document-related methods
  const docMethods = methods.filter(method => method.toLowerCase().includes('document'));
  console.log('\nDocument-related methods:', docMethods);
  
  // Test if createOrUpdateTaskDocument exists
  if (typeof taskServer.createOrUpdateTaskDocument === 'function') {
    console.log('\n✅ createOrUpdateTaskDocument method is available');
  } else {
    console.log('\n❌ createOrUpdateTaskDocument method is NOT available');
  }
}

examineTaskServer().catch(console.error);
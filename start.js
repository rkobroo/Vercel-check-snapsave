
#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5000;

console.log('🚀 Starting SnapSave API...');
console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
console.log(`Port: ${port}`);

try {
  // Install dependencies if needed
  if (!existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('pnpm install', { stdio: 'inherit' });
  }

  // Build the project if dist doesn't exist
  if (!existsSync('dist')) {
    console.log('🔨 Building project...');
    execSync('pnpm build', { stdio: 'inherit' });
  }

  // Install preview dependencies
  if (!existsSync('preview/node_modules')) {
    console.log('📦 Installing preview dependencies...');
    execSync('cd preview && pnpm install', { stdio: 'inherit' });
  }

  // Start the server
  console.log('🌐 Starting server...');
  process.chdir('preview');
  
  // Set PORT environment variable for the server
  process.env.PORT = port;
  
  // Import and start the server
  await import('./server.js');
  
} catch (error) {
  console.error('❌ Error starting application:', error.message);
  process.exit(1);
}

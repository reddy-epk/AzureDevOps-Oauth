// Import the required modules
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import './app.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Open the browser after a short delay to ensure server is up
setTimeout(() => {
  console.log('Opening browser to http://localhost:3978');
  exec('start http://localhost:3978', (error) => {
    if (error) {
      console.error('Failed to open browser:', error);
    }
  });
}, 1000);
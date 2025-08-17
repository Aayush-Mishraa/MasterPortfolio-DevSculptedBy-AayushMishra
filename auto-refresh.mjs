#!/usr/bin/env node

/**
 * Auto-refresh GitHub data fetcher
 * This script automatically updates your GitHub repository data
 * Run this periodically (e.g., every 15 minutes) using cron or Task Scheduler
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const DATA_FETCHER_PATH = path.join(SCRIPT_DIR, 'git_data_fetcher.mjs');
const LOG_FILE = path.join(SCRIPT_DIR, 'auto-refresh.log');

async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(logMessage.trim());
  
  try {
    await fs.appendFile(LOG_FILE, logMessage);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

async function runDataFetcher() {
  return new Promise((resolve, reject) => {
    exec(`node "${DATA_FETCHER_PATH}"`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      resolve({ stdout, stderr });
    });
  });
}

async function checkForUpdates() {
  try {
    await log('Starting auto-refresh...');
    
    const result = await runDataFetcher();
    
    if (result.stdout) {
      await log(`Data fetcher output: ${result.stdout}`);
    }
    
    if (result.stderr) {
      await log(`Data fetcher warnings: ${result.stderr}`);
    }
    
    await log('Auto-refresh completed successfully');
    
  } catch (error) {
    await log(`Auto-refresh failed: ${error.message}`);
    throw error;
  }
}

// Main execution
checkForUpdates()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Auto-refresh failed:', error);
    process.exit(1);
  });

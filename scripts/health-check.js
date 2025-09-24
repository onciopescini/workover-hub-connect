#!/usr/bin/env node

/**
 * Health Check Script
 * Used by monitoring systems to verify application health
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const config = {
  timeout: 5000,
  retries: 3,
  endpoints: [
    {
      name: 'Main App',
      url: process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health',
      expected: 'healthy'
    },
    {
      name: 'Supabase Connection',
      url: `${process.env.VITE_SUPABASE_URL || 'https://khtqwzvrxzsgfhsslwyz.supabase.co'}/rest/v1/`,
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || ''}`
      },
      expected: null, // Just check for 200 status
      timeout: 10000
    }
  ]
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: options.timeout || config.timeout,
      headers: options.headers || {}
    };

    const req = lib.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data.trim(),
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function checkEndpoint(endpoint, attempt = 1) {
  try {
    log(`Checking ${endpoint.name}... (attempt ${attempt})`, 'blue');
    
    const response = await makeRequest(endpoint.url, {
      headers: endpoint.headers,
      timeout: endpoint.timeout || config.timeout
    });
    
    // Check status code
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`HTTP ${response.statusCode}`);
    }
    
    // Check expected response (if specified)
    if (endpoint.expected && !response.data.includes(endpoint.expected)) {
      throw new Error(`Expected "${endpoint.expected}" but got "${response.data}"`);
    }
    
    log(`✓ ${endpoint.name} is healthy`, 'green');
    return { success: true, endpoint: endpoint.name };
    
  } catch (error) {
    if (attempt < config.retries) {
      log(`⚠ ${endpoint.name} failed (${error.message}), retrying...`, 'yellow');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return checkEndpoint(endpoint, attempt + 1);
    } else {
      log(`✗ ${endpoint.name} is unhealthy: ${error.message}`, 'red');
      return { success: false, endpoint: endpoint.name, error: error.message };
    }
  }
}

async function runHealthChecks() {
  log('Starting health checks...', 'blue');
  console.log('='.repeat(50));
  
  const results = [];
  
  for (const endpoint of config.endpoints) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
  }
  
  console.log('='.repeat(50));
  
  const healthyCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  if (healthyCount === totalCount) {
    log(`All ${totalCount} health checks passed!`, 'green');
    process.exit(0);
  } else {
    log(`${healthyCount}/${totalCount} health checks passed`, 'red');
    
    // Log failed checks
    const failedChecks = results.filter(r => !r.success);
    failedChecks.forEach(check => {
      log(`Failed: ${check.endpoint} - ${check.error}`, 'red');
    });
    
    process.exit(1);
  }
}

// Additional system checks
async function checkSystemHealth() {
  const checks = [];
  
  // Memory usage
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.rss / 1024 / 1024);
  checks.push({
    name: 'Memory Usage',
    value: `${memUsageMB} MB`,
    status: memUsageMB < 512 ? 'healthy' : 'warning'
  });
  
  // Uptime
  const uptimeSeconds = process.uptime();
  const uptimeMinutes = Math.round(uptimeSeconds / 60);
  checks.push({
    name: 'Process Uptime',
    value: `${uptimeMinutes} minutes`,
    status: 'healthy'
  });
  
  // Environment
  checks.push({
    name: 'Environment',
    value: process.env.NODE_ENV || 'development',
    status: 'healthy'
  });
  
  // Node version
  checks.push({
    name: 'Node Version',
    value: process.version,
    status: 'healthy'
  });
  
  log('\nSystem Health:', 'blue');
  checks.forEach(check => {
    const color = check.status === 'healthy' ? 'green' : 'yellow';
    log(`  ${check.name}: ${check.value}`, color);
  });
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Health Check Script');
    console.log('');
    console.log('Usage:');
    console.log('  node health-check.js              Run all health checks');
    console.log('  node health-check.js --system     Include system health info');
    console.log('  node health-check.js --json       Output in JSON format');
    console.log('');
    console.log('Environment Variables:');
    console.log('  HEALTH_CHECK_URL                  Override default health check URL');
    console.log('  VITE_SUPABASE_URL                 Supabase project URL');
    console.log('  VITE_SUPABASE_ANON_KEY           Supabase anonymous key');
    return;
  }
  
  try {
    await runHealthChecks();
    
    if (args.includes('--system')) {
      await checkSystemHealth();
    }
    
  } catch (error) {
    log(`Health check failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('\nHealth check interrupted', 'yellow');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\nHealth check terminated', 'yellow');
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkEndpoint, runHealthChecks, checkSystemHealth };
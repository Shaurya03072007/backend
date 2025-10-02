const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

/**
 * Detailed health check
 * GET /api/health/detailed
 */
router.get('/detailed', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };

  // Check required environment variables
  const requiredEnvVars = [
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    health.status = 'unhealthy';
    health.missingEnvironmentVariables = missingEnvVars;
    return res.status(503).json(health);
  }

  res.json(health);
});

module.exports = router;

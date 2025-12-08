
// Load environment variables first
require('dotenv').config();

const express = require('express');
const path = require('path');
const Profile = require('./models/profile');
const fs = require('fs');
const log = require('./utils/logger');

// Security middleware imports
const { helmetConfig, sanitizeBody, sanitizeQuery } = require('./utils/sanitization');
const { generalLimiter } = require('./utils/rateLimiting');

// Version middleware import
const { versionMiddleware } = require('./middleware/versionMiddleware');

const app = express();
const PORT = process.env.PORT || 3131;
const NODE_ENV = process.env.NODE_ENV || 'development';
const AUTO_OPEN_BROWSER = process.env.AUTO_OPEN_BROWSER !== 'false'; // Default to true unless explicitly disabled
const CHROME_APP_MODE = process.env.CHROME_APP_MODE !== 'false'; // Default to true unless explicitly disabled
const profileFile = path.join(__dirname, 'data/profile.json');

// Log application startup
log.info('Application starting', {
  source: 'ExpressApp',
  port: PORT,
  nodeVersion: process.version,
  platform: process.platform,
  env: NODE_ENV,
  autoOpenBrowser: AUTO_OPEN_BROWSER,
  chromeAppMode: CHROME_APP_MODE
});


// Middleware
// Security middleware (must be first)
app.use(helmetConfig);
app.use(generalLimiter);

// Body parsing and static files
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware - temporarily disabled for debugging
// app.use(sanitizeBody);
// app.use(sanitizeQuery);

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Version middleware - makes version info available to all views
app.use(versionMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    log.request(req, res, startTime);
  });
  
  next();
});

// Handle Chrome DevTools requests to prevent 404 warnings
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(404).json({ error: 'DevTools configuration not available' });
});

log.info('Express middleware configured', { source: 'ExpressApp' });


// Auth routes
const authRoutes = require('./routes/auth-routes');
app.use('/auth', authRoutes);
log.debug('Auth routes mounted', { source: 'ExpressApp' });

// Profile API routes
const profileRoutes = require('./routes/profile-api-routes');
app.use('/api/profile', profileRoutes);
log.debug('Profile API routes mounted', { source: 'ExpressApp' });

// Profile EJS view routes
const profileEjsRoutes = require('./routes/profile-ejs-routes');
app.use('/profile', profileEjsRoutes);
log.debug('Profile EJS routes mounted', { source: 'ExpressApp' });

// Matching routes
const matchingRoutes = require('./routes/matching-routes');
app.use('/matching', matchingRoutes);
log.debug('Matching routes mounted', { source: 'ExpressApp' });

// Export routes
const exportRoutes = require('./routes/export-routes');
app.use('/export', exportRoutes);
log.debug('Export routes mounted', { source: 'ExpressApp' });

// Backup routes
const backupRoutes = require('./routes/backup-routes');
app.use('/backup', backupRoutes);
log.debug('Backup routes mounted', { source: 'ExpressApp' });

// Common data routes
const commonRoutes = require('./routes/common-routes');
app.use('/common', commonRoutes);
log.debug('Common routes mounted', { source: 'ExpressApp' });

// Users routes (legacy/demo)
const userRoutes = require('./routes/users');
app.use('/users', userRoutes);
log.debug('User routes mounted', { source: 'ExpressApp' });

log.info('All application routes configured', { source: 'ExpressApp' });

// API routes for profile are now handled in routes/profile-api-routes.js

// Welcome screen route
app.get('/', (req, res) => {
  log.debug('Rendering welcome page', { 
    feature: 'SYSTEM',
    source: 'ExpressApp',
    page: 'welcome',
    route: '/'
  });
  res.render('welcome');
});

// Main application route
app.get('/main', (req, res) => {
  log.debug('Rendering main application page', { 
    feature: 'SYSTEM',
    source: 'ExpressApp',
    page: 'main',
    route: '/main'
  });
  res.render('index', { title: 'Hindu Matrimony - Nakshatra Matching' });
});

// Global Error Handling Middleware (must be last)
const { globalErrorHandler, notFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler } = require('./middleware/errorMiddleware');

// Setup process-level error handlers first
const setupProcessErrorHandlers = () => {
  // Uncaught Exception Handler
  process.on('uncaughtException', (error) => {
    log.error('[CRITICAL] Uncaught Exception - Server will shutdown', { error: error.message }, error);
    process.exit(1);
  });

  // Unhandled Promise Rejection Handler
  process.on('unhandledRejection', (reason, promise) => {
    log.error('[CRITICAL] Unhandled Promise Rejection - Server will shutdown', { 
      reason: reason?.message || reason,
      promise: promise?.toString() || 'Unknown promise'
    }, reason);
    process.exit(1);
  });
};

setupProcessErrorHandlers();

// 404 handler for unknown routes (must be after all route definitions)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  log.info('Server started successfully', {
    source: 'ExpressApp',
    port: PORT,
    url: `http://localhost:${PORT}`,
    environment: NODE_ENV
  });
  
  // Open Chrome in app mode if enabled
  if (AUTO_OPEN_BROWSER) {
    const open = require('child_process').exec;
    const url = `http://localhost:${PORT}`;
    
    try {
      if (CHROME_APP_MODE) {
        // Windows Chrome app mode
        const pathJoin = (...args) => args.filter(Boolean).join('\\');
        const chromePaths = [
          pathJoin(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
          pathJoin(process.env['PROGRAMFILES'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
          pathJoin(process.env['LOCALAPPDATA'], 'Google', 'Chrome', 'Application', 'chrome.exe')
        ];
        
        const chrome = chromePaths.find(p => p && require('fs').existsSync(p));
        if (chrome) {
          log.info('Opening Chrome in app mode', { 
            source: 'ExpressApp', 
            chromePath: chrome, 
            url 
          });
          open(`"${chrome}" --app=${url}`);
        } else {
          log.warn('Chrome not found, attempting to open default browser', { 
            source: 'ExpressApp' 
          });
          // fallback: open default browser
          require('open')(url);
        }
      } else {
        log.info('Opening default browser', { 
          source: 'ExpressApp', 
          url 
        });
        try {
          require('open')(url);
        } catch (openError) {
          log.warn('Open package failed, trying fallback browser opening', { 
            source: 'ExpressApp', 
            error: openError.message 
          });
          // Fallback: Windows start command
          open(`start ${url}`);
        }
      }
    } catch (error) {
      log.error('Failed to open browser automatically', { 
        source: 'ExpressApp', 
        url 
      }, error);
    }
  } else {
    log.info('Auto-open browser disabled', { 
      source: 'ExpressApp', 
      url: `http://localhost:${PORT}` 
    });
  }
});

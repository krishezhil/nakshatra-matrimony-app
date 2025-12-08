const { handleControllerError, ERROR_TYPES, ERROR_MESSAGES } = require('../utils/errorHandler');
const log = require('../utils/logger');

/**
 * Global Error Middleware for Express
 * Handles all unhandled errors and provides consistent error responses
 */

/**
 * Global error handler middleware
 * This should be the last middleware in the stack
 */
const globalErrorHandler = (err, req, res, next) => {
  // If response was already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }
  
  // Log the unhandled error
  log.error('[ERROR] Unhandled error caught by global middleware', {
    errorMessage: err.message,
    errorStack: err.stack,
    errorName: err.name,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    source: 'ErrorMiddleware'
  }, err);
  
  // Use the centralized error handler
  return handleControllerError(err, 'GLOBAL', 'UNHANDLED_ERROR', req, res);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  // Skip logging for Chrome DevTools requests to reduce noise
  const isDevToolsRequest = req.url.includes('/.well-known/appspecific/com.chrome.devtools.json');
  
  if (!isDevToolsRequest) {
    log.warn('[WARN] 404 - Route not found', {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      source: 'ErrorMiddleware'
    });
  }
  
  const statusCode = 404;
  const message = `Route ${req.method} ${req.url} not found`;
  
  if (req.accepts('html')) {
    return res.status(statusCode).render('error', {
      title: 'Page Not Found',
      error: 'Page not found',
      message: 'The page you are looking for does not exist.',
      statusCode
    });
  } else {
    return res.status(statusCode).json({
      success: false,
      message,
      statusCode
    });
  }
};

/**
 * Request timeout handler
 */
const timeoutHandler = (req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      log.error('[ERROR] Request timeout', {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        source: 'ErrorMiddleware'
      });
      
      return handleControllerError(
        new Error(ERROR_MESSAGES.TIMEOUT_ERROR),
        'TIMEOUT',
        'REQUEST_TIMEOUT',
        req,
        res
      );
    }
  }, 30000); // 30 seconds timeout
  
  // Clear timeout when response is finished
  res.on('finish', () => {
    clearTimeout(timeout);
  });
  
  next();
};

/**
 * Request size limiter error handler
 */
const requestSizeErrorHandler = (err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    log.error('[ERROR] Request entity too large', {
      url: req.url,
      method: req.method,
      contentLength: req.get('Content-Length'),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      source: 'ErrorMiddleware'
    }, err);
    
    return handleControllerError(
      new Error('Request too large. Please reduce the size of your data.'),
      'REQUEST_SIZE',
      'ENTITY_TOO_LARGE',
      req,
      res
    );
  }
  
  next(err);
};

/**
 * Uncaught exception handler
 */
const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', (err) => {
    log.error('[CRITICAL] Uncaught Exception - Server will shutdown', {
      errorMessage: err.message,
      errorStack: err.stack,
      errorName: err.name,
      source: 'ErrorMiddleware'
    }, err);
    
    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Unhandled promise rejection handler
 */
const unhandledRejectionHandler = () => {
  process.on('unhandledRejection', (reason, promise) => {
    log.error('[CRITICAL] Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString(),
      source: 'ErrorMiddleware'
    }, reason instanceof Error ? reason : new Error(String(reason)));
    
    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Setup all error handlers
 */
const setupErrorHandlers = (app) => {
  // Setup process-level error handlers
  uncaughtExceptionHandler();
  unhandledRejectionHandler();
  
  // Request timeout middleware (should be early in middleware stack)
  app.use(timeoutHandler);
  
  // Request size error handler
  app.use(requestSizeErrorHandler);
  
  // 404 handler (should be after all routes)
  app.use(notFoundHandler);
  
  // Global error handler (should be last)
  app.use(globalErrorHandler);
  
  log.info('Global error handlers configured', { source: 'ErrorMiddleware' });
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  timeoutHandler,
  requestSizeErrorHandler,
  setupErrorHandlers
};
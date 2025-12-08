const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const { getLogsPath, initializeAppData } = require('./appData');
const { getConfig } = require('./config');

/**
 * Comprehensive Winston-based logging system with trace level and sensitive data masking
 * Provides structured logging with file rotation, console output, and runtime configuration
 */

let logger = null;
let currentConfig = null;

/**
 * Sensitive data patterns to mask in logs
 */
const SENSITIVE_PATTERNS = {
  phone: /(\+?[\d\s\-\(\)]{10,15})/g,
  email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  contact: /(?:contact_no|additional_contact_no|phone|mobile).*?['":][\s]*['"]([^'"]+)['"]/gi
};

/**
 * Feature contexts for logging organization
 */
const FEATURE_CONTEXTS = {
  CREATE_PROFILE: 'CREATE_PROFILE',
  SEARCH_PROFILE: 'SEARCH_PROFILE', 
  FIND_MATCHING: 'FIND_MATCHING',
  EXPORT: 'EXPORT',
  AUTH: 'AUTH',
  SYSTEM: 'SYSTEM',
  PROFILE: 'PROFILE'
};

/**
 * Mask sensitive data in strings
 * @param {any} data - Data to mask
 * @returns {any} Masked data
 */
function maskSensitiveData(data) {
  if (typeof data === 'string') {
    let masked = data;
    
    // Mask phone numbers
    masked = masked.replace(SENSITIVE_PATTERNS.phone, (match) => {
      return match.substring(0, 3) + '*'.repeat(Math.max(0, match.length - 6)) + match.substring(Math.max(3, match.length - 3));
    });
    
    // Mask email addresses  
    masked = masked.replace(SENSITIVE_PATTERNS.email, (match) => {
      const [local, domain] = match.split('@');
      return local.substring(0, 2) + '*'.repeat(Math.max(0, local.length - 2)) + '@' + domain;
    });
    
    return masked;
  }
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(item => maskSensitiveData(item));
    }
    
    const masked = {};
    for (const [key, value] of Object.entries(data)) {
      // Mask specific fields
      if (['contact_no', 'additional_contact_no', 'phone', 'mobile'].includes(key.toLowerCase())) {
        masked[key] = typeof value === 'string' && value.length > 3 
          ? value.substring(0, 3) + '*'.repeat(Math.max(0, value.length - 6)) + value.substring(Math.max(3, value.length - 3))
          : value;
      } else if (['email'].includes(key.toLowerCase())) {
        if (typeof value === 'string' && value.includes('@')) {
          const [local, domain] = value.split('@');
          masked[key] = local.substring(0, 2) + '*'.repeat(Math.max(0, local.length - 2)) + '@' + domain;
        } else {
          masked[key] = value;
        }
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  
  return data;
}

/**
 * Create feature-specific logger context
 * @param {string} feature - Feature context
 * @returns {object} Logger with feature context
 */
function createFeatureLogger(feature) {
  const baseLogger = getLogger();
  
  return {
    trace: (message, meta = {}, error = null) => logWithContext('trace', message, { ...meta, feature }, error),
    debug: (message, meta = {}, error = null) => logWithContext('debug', message, { ...meta, feature }, error),
    info: (message, meta = {}, error = null) => logWithContext('info', message, { ...meta, feature }, error),
    warn: (message, meta = {}, error = null) => logWithContext('warn', message, { ...meta, feature }, error),
    error: (message, meta = {}, error = null) => logWithContext('error', message, { ...meta, feature }, error),
    
    // Feature-specific entry/exit logging
    featureStart: (operation, meta = {}) => {
      logWithContext('info', `[INFO] Starting ${feature} flow - ${operation}`, { 
        ...meta, 
        feature, 
        operation,
        phase: 'START'
      });
    },
    
    featureEnd: (operation, meta = {}, duration = null) => {
      logWithContext('info', `[INFO] Completed ${feature} flow - ${operation}`, { 
        ...meta, 
        feature, 
        operation,
        duration: duration ? `${duration}ms` : undefined,
        phase: 'END'
      });
    },
    
    methodEntry: (methodName, params = {}) => {
      logWithContext('trace', `[TRACE] Entered ${methodName}()`, {
        feature,
        method: methodName,
        params: maskSensitiveData(params),
        phase: 'ENTRY'
      });
    },
    
    methodExit: (methodName, result = {}) => {
      logWithContext('trace', `[TRACE] Exited ${methodName}()`, {
        feature,
        method: methodName,
        result: maskSensitiveData(result),
        phase: 'EXIT'
      });
    },
    
    apiCall: (endpoint, requestData = {}, responseData = {}) => {
      logWithContext('debug', `[DEBUG] API Call to ${endpoint}`, {
        feature,
        endpoint,
        request: maskSensitiveData(requestData),
        response: maskSensitiveData(responseData),
        type: 'API_CALL'
      });
    }
  };
}

/**
 * Internal logging function with context
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} meta - Metadata
 * @param {Error} error - Error object
 */
function logWithContext(level, message, meta = {}, error = null) {
  const baseLogger = getLogger();
  const maskedMeta = maskSensitiveData(meta);
  
  const logEntry = {
    ...maskedMeta
  };
  
  if (error) {
    logEntry.error = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }
  
  baseLogger[level](message, logEntry);
}

/**
 * Create and configure Winston logger with file rotation and console output
 * @returns {winston.Logger} Configured winston logger instance
 */
function createLogger() {
  try {
    // Initialize AppData directories
    initializeAppData();
    
    // Get current configuration
    const config = getConfig();
    currentConfig = config;
    
    const logsPath = getLogsPath();
    
    // Create format for structured logging
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint({ colorize: false, depth: 5 })
    );
    
    // Console format for development - HUMAN READABLE
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, feature, operation, method, phase, duration, statusCode, resultsCount, ...meta }) => {
        let logMessage = `${timestamp} [${level}]`;
        
        // Add feature context with better formatting
        if (feature) {
          logMessage += ` 📁[${feature}]`;
        }
        
        // Add operation context
        if (operation && operation !== feature) {
          logMessage += ` 🔄[${operation}]`;
        }
        
        // Add method context  
        if (method) {
          logMessage += ` 🔧[${method}]`;
        }
        
        // Add phase indicator
        if (phase) {
          const phaseEmoji = {
            'START': '🚀',
            'END': '✅', 
            'ENTRY': '➡️',
            'EXIT': '⬅️',
            'FILTERING': '🔍',
            'DATA_LOADING': '📁',
            'DATA_PROCESSING': '⚙️',
            'ERROR': '❌'
          };
          logMessage += ` ${phaseEmoji[phase] || '📍'}[${phase}]`;
        }
        
        logMessage += `: ${message}`;
        
        // Add key metrics in readable format
        const metrics = [];
        if (duration) metrics.push(`⏱️${duration}`);
        if (statusCode) metrics.push(`📊${statusCode}`);
        if (resultsCount !== undefined) metrics.push(`📋${resultsCount} results`);
        
        if (metrics.length > 0) {
          logMessage += ` | ${metrics.join(' ')}`;
        }
        
        // Add remaining metadata in compact format (excluding already displayed fields)
        const { timestamp: _, level: __, message: ___, feature: ____, operation: _____, method: ______, phase: _______, duration: ________, statusCode: _________, resultsCount: __________, ...remainingMeta } = meta;
        if (Object.keys(remainingMeta).length > 0) {
          // Show only essential fields in a compact way
          const essential = {};
          if (remainingMeta.url) essential.url = remainingMeta.url;
          if (remainingMeta.error) essential.error = remainingMeta.error.message || remainingMeta.error;
          if (remainingMeta.beforeCount !== undefined && remainingMeta.afterCount !== undefined) {
            essential.filter = `${remainingMeta.beforeCount}→${remainingMeta.afterCount}`;
          }
          if (remainingMeta.profileId) essential.id = remainingMeta.profileId;
          
          if (Object.keys(essential).length > 0) {
            logMessage += ` 📝${JSON.stringify(essential)}`;
          }
        }
        
        return logMessage;
      })
    );
    
    // File format - Keep structured JSON for machine processing with timestamp first
    const fileFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.printf((info) => {
        // Create ordered object with timestamp first to ensure consistent positioning
        // Field order: timestamp, feature, source, message, other metadata, level
        const { timestamp, level, feature, source, message, ...meta } = info;
        const orderedLog = {
          timestamp,                   // Position 1
          ...(feature && { feature }), // Position 2 (if present)
          ...(source && { source }),   // Position 3 (if present)
          message,                     // Position 4
          ...meta,                     // Position 5+ (other metadata)
          level                        // Last position
        };
        // Compact single-line JSON for better file parsing
        return JSON.stringify(orderedLog);
      })
    );
    
    // Create transports
    const transports = [];
    
    // Console transport (always enabled in development)
    transports.push(
      new winston.transports.Console({
        level: config.consoleLevel || 'info',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, feature, operation, method, phase, duration, statusCode, resultsCount, ...meta }) => {
            let logMessage = `${timestamp} [${level}]`;
            
            // Add feature context with better formatting
            if (feature) {
              logMessage += ` 📁[${feature}]`;
            }
            
            // Add operation context
            if (operation && operation !== feature) {
              logMessage += ` 🔄[${operation}]`;
            }
            
            // Add method context  
            if (method) {
              logMessage += ` 🔧[${method}]`;
            }
            
            // Add phase indicator
            if (phase) {
              const phaseEmojis = {
                'START': '🚀',
                'END': '✅', 
                'ENTRY': '📥',
                'EXIT': '📤',
                'ERROR': '❌'
              };
              logMessage += ` ${phaseEmojis[phase] || '🔄'}[${phase}]`;
            }
            
            // Add main message
            logMessage += `: ${message}`;
            
            // Add key metrics
            const metrics = [];
            if (duration) metrics.push(`Duration: ${duration}`);
            if (statusCode) metrics.push(`Status: ${statusCode}`);
            if (resultsCount !== undefined) metrics.push(`Results: ${resultsCount}`);
            
            if (metrics.length > 0) {
              logMessage += ` | ${metrics.join(', ')}`;
            }
            
            // Add essential metadata
            const { timestamp: _, level: __, message: ___, feature: ____, operation: _____, method: ______, phase: _______, duration: ________, statusCode: _________, resultsCount: __________, ...remainingMeta } = meta;
            if (remainingMeta.url) {
              logMessage += ` | URL: ${remainingMeta.url}`;
            }
            if (remainingMeta.error) {
              logMessage += ` | Error: ${remainingMeta.error.message || remainingMeta.error}`;
            }
            
            return logMessage;
          })
        ),
        handleExceptions: true,
        handleRejections: true
      })
    );
    
    // File transport with rotation
    if (config.enableFileLogging) {
      // Main application log
      transports.push(
        new DailyRotateFile({
          filename: path.join(logsPath, 'app-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config.maxFileSize || '10m',
          maxFiles: config.maxFiles || '7d',
          level: config.fileLevel || 'debug',
          format: fileFormat,
          handleExceptions: true,
          handleRejections: true
        })
      );
      
      // Error-only log
      transports.push(
        new DailyRotateFile({
          filename: path.join(logsPath, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config.maxFileSize || '10m',
          maxFiles: config.maxFiles || '30d',
          level: 'error',
          format: fileFormat
        })
      );
      
      // Trace-level log for detailed debugging
      transports.push(
        new DailyRotateFile({
          filename: path.join(logsPath, 'trace-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config.maxFileSize || '10m',
          maxFiles: config.maxFiles || '3d',
          level: 'trace',
          format: fileFormat
        })
      );
      
      // Human-readable log for easier debugging
      transports.push(
        new DailyRotateFile({
          filename: path.join(logsPath, 'readable-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: config.maxFileSize || '10m',
          maxFiles: config.maxFiles || '3d',
          level: 'debug',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
            winston.format.printf(({ timestamp, level, message, feature, operation, method, phase, duration, statusCode, resultsCount, ...meta }) => {
              let logMessage = `${timestamp} [${level.toUpperCase()}]`;
              
              // Add feature context
              if (feature) {
                logMessage += ` [${feature}]`;
              }
              
              // Add phase indicator
              if (phase) {
                logMessage += ` [${phase}]`;
              }
              
              logMessage += `: ${message}`;
              
              // Add key metrics
              const metrics = [];
              if (duration) metrics.push(`Duration: ${duration}`);
              if (statusCode) metrics.push(`Status: ${statusCode}`);
              if (resultsCount !== undefined) metrics.push(`Results: ${resultsCount}`);
              
              if (metrics.length > 0) {
                logMessage += ` | ${metrics.join(', ')}`;
              }
              
              // Add essential metadata
              const { timestamp: _, level: __, message: ___, feature: ____, operation: _____, method: ______, phase: _______, duration: ________, statusCode: _________, resultsCount: __________, ...remainingMeta } = meta;
              if (remainingMeta.url) {
                logMessage += ` | URL: ${remainingMeta.url}`;
              }
              if (remainingMeta.error) {
                logMessage += ` | Error: ${remainingMeta.error.message || remainingMeta.error}`;
              }
              
              return logMessage;
            })
          )
        })
      );
    }
    
    // Create logger with custom levels including trace
    const customLevels = {
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4
      },
      colors: {
        error: 'red',
        warn: 'yellow', 
        info: 'green',
        debug: 'blue',
        trace: 'magenta'
      }
    };
    
    winston.addColors(customLevels.colors);
    
    const newLogger = winston.createLogger({
      levels: customLevels.levels,
      level: config.logLevel || 'info',
      transports,
      exitOnError: false,
      rejectionHandlers: transports.filter(t => t.handleRejections),
      exceptionHandlers: transports.filter(t => t.handleExceptions)
    });
    
    return newLogger;
    
  } catch (error) {
    console.error('Failed to initialize logger:', error);
    // Return a basic console logger as fallback
    return winston.createLogger({
      level: 'info',
      transports: [new winston.transports.Console()],
      exitOnError: false
    });
  }
}

/**
 * Get the logger instance (singleton pattern)
 * @returns {winston.Logger} Winston logger instance
 */
function getLogger() {
  if (!logger) {
    logger = createLogger();
  }
  return logger;
}

/**
 * Update logger configuration and recreate logger
 * @param {object} newConfig - New configuration object
 */
function updateLoggerConfig(newConfig) {
  if (newConfig) {
    currentConfig = { ...currentConfig, ...newConfig };
    logger = createLogger();
  }
}

/**
 * Initialize the logger with current configuration
 */
function initializeLogger() {
  // Initialize AppData directories
  initializeAppData();
  
  // Load configuration
  currentConfig = getConfig();
  
  // Create initial logger instance
  logger = createLogger();
  
  // Log initialization
  logger.info('[SYSTEM] Logger initialized successfully', {
    feature: FEATURE_CONTEXTS.SYSTEM,
    config: {
      logLevel: currentConfig.logLevel,
      enableFileLogging: currentConfig.enableFileLogging,
      consoleLevel: currentConfig.consoleLevel,
      fileLevel: currentConfig.fileLevel
    },
    source: 'Logger'
  });
}

/**
 * Create feature-specific logger instances for the main application features
 */
// Legacy profile-specific loggers (maintained for backward compatibility)
const createProfileLogger = () => createFeatureLogger(FEATURE_CONTEXTS.CREATE_PROFILE);
const searchProfileLogger = () => createFeatureLogger(FEATURE_CONTEXTS.SEARCH_PROFILE);  

// Active feature loggers
const findMatchingLogger = () => createFeatureLogger(FEATURE_CONTEXTS.FIND_MATCHING);
const exportLogger = () => createFeatureLogger(FEATURE_CONTEXTS.EXPORT);
const authLogger = () => createFeatureLogger(FEATURE_CONTEXTS.AUTH);
const systemLogger = () => createFeatureLogger(FEATURE_CONTEXTS.SYSTEM);

// Unified profile logger (RECOMMENDED for all profile operations)
const profileLogger = () => createFeatureLogger(FEATURE_CONTEXTS.PROFILE);

/**
 * Performance timing helper
 * @param {string} operation - Operation name
 * @param {number} startTime - Start time from Date.now()
 * @param {object} meta - Additional metadata
 */
function logPerformance(operation, startTime, meta = {}) {
  const duration = Date.now() - startTime;
  const logger = getLogger();
  
  if (currentConfig.performance && currentConfig.performance.enabled) {
    const level = duration > (currentConfig.performance.slowThreshold || 1000) ? 'warn' : 'debug';
    logger[level](`Performance: ${operation}`, {
      ...meta,
      duration: `${duration}ms`,
      slow: duration > (currentConfig.performance.slowThreshold || 1000)
    });
  }
}

/**
 * Request logging helper
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {number} startTime - Request start time
 */
function logRequest(req, res, startTime) {
  const duration = Date.now() - startTime;
  const logger = getLogger();
  
  if (currentConfig.features && currentConfig.features.requestTracking) {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      source: 'Logger'
    });
  }
}

/**
 * Database operation logging
 * @param {string} operation - Database operation
 * @param {string} collection - Collection/table name
 * @param {object} meta - Additional metadata
 * @param {number} startTime - Operation start time
 */
function logDatabaseOperation(operation, collection, meta = {}, startTime = null) {
  const logger = getLogger();
  
  const logData = {
    operation,
    collection,
    ...meta
  };

  if (startTime) {
    logData.duration = `${Date.now() - startTime}ms`;
  }

  logData.source = 'Logger';
  logger.debug('Database operation', logData);
}

/**
 * Export convenience methods and feature loggers
 */
const log = {
  // Standard logging methods
  trace: (message, meta) => logWithContext('trace', message, meta),
  debug: (message, meta) => logWithContext('debug', message, meta),
  info: (message, meta) => logWithContext('info', message, meta),
  warn: (message, meta) => logWithContext('warn', message, meta),
  error: (message, meta, error) => logWithContext('error', message, meta, error),

  // Feature-specific loggers
  createProfile: createProfileLogger,  // Legacy - use log.profile() instead
  searchProfile: searchProfileLogger,  // Legacy - use log.profile() instead  
  findMatching: findMatchingLogger,
  export: exportLogger,
  auth: authLogger,
  system: systemLogger,
  profile: profileLogger,              // RECOMMENDED for all profile operations

  // Specialized logging methods
  performance: logPerformance,
  request: logRequest,
  database: logDatabaseOperation,

  // Configuration management
  updateConfig: updateLoggerConfig,
  getConfig: () => currentConfig,

  // Direct logger access
  getLogger: getLogger,

  // Feature contexts
  FEATURES: FEATURE_CONTEXTS,

  // Utility functions
  maskSensitive: maskSensitiveData
};

// Initialize logger on module load
initializeLogger();

module.exports = log;
const log = require('./logger');

/**
 * Comprehensive Error Handling Utilities
 * Provides standardized error response handling, logging, and user-friendly error messages
 */

/**
 * Standard error response format
 */
const createErrorResponse = (message, details = null, statusCode = 500) => {
  return {
    success: false,
    message,
    details,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

/**
 * User-friendly error messages for common error types
 */
const ERROR_MESSAGES = {
  // Database/File System Errors
  DB_CONNECTION_FAILED: 'Unable to connect to the database. Please try again later.',
  FILE_NOT_FOUND: 'Required data file not found. Please contact system administrator.',
  FILE_READ_ERROR: 'Unable to read data files. Please try again later.',
  FILE_WRITE_ERROR: 'Unable to save data. Please try again later.',
  DATA_CORRUPTION: 'Data integrity issue detected. Please contact support.',
  
  // Validation Errors
  INVALID_INPUT: 'Invalid input provided. Please check your data and try again.',
  MISSING_REQUIRED_FIELDS: 'Required fields are missing. Please fill in all mandatory fields.',
  INVALID_DATE_FORMAT: 'Invalid date format. Please use YYYY-MM-DD format.',
  INVALID_EMAIL_FORMAT: 'Invalid email format. Please enter a valid email address.',
  INVALID_PHONE_FORMAT: 'Invalid phone number format. Please enter a valid phone number.',
  
  // Profile Management Errors
  PROFILE_NOT_FOUND: 'Profile not found. Please check the profile ID and try again.',
  PROFILE_ALREADY_EXISTS: 'A profile with this information already exists.',
  PROFILE_CREATION_FAILED: 'Unable to create profile. Please try again later.',
  PROFILE_UPDATE_FAILED: 'Unable to update profile. Please try again later.',
  PROFILE_DELETE_FAILED: 'Unable to delete profile. Please try again later.',
  
  // Search/Matching Errors
  SEARCH_FAILED: 'Search operation failed. Please try again later.',
  NO_MATCHING_PROFILES: 'No matching profiles found for your criteria. Try adjusting your search filters.',
  MATCHING_ALGORITHM_ERROR: 'Unable to process matching algorithm. Please try again later.',
  INVALID_SEARCH_CRITERIA: 'Invalid search criteria provided. Please check your filters.',
  
  // Export Errors
  EXPORT_FAILED: 'Export operation failed. Please try again later.',
  INVALID_EXPORT_FORMAT: 'Invalid export format specified. Please select a valid format.',
  EXPORT_DATA_EMPTY: 'No data available to export. Please ensure you have matching profiles.',
  
  // Authentication Errors
  UNAUTHORIZED_ACCESS: 'Unauthorized access. Please log in and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
  
  // General System Errors
  INTERNAL_SERVER_ERROR: 'An internal server error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
  TIMEOUT_ERROR: 'Operation timed out. Please try again later.',
  NETWORK_ERROR: 'Network error occurred. Please check your connection and try again.',
  
  // Rate Limiting
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment before trying again.'
};

/**
 * Error types for classification
 */
const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  DATABASE: 'DATABASE_ERROR',
  FILE_SYSTEM: 'FILE_SYSTEM_ERROR',
  NETWORK: 'NETWORK_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  BUSINESS_LOGIC: 'BUSINESS_LOGIC_ERROR',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE_ERROR',
  SYSTEM: 'SYSTEM_ERROR'
};

/**
 * Async wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Enhanced error class with additional context
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorType = ERROR_TYPES.SYSTEM, details = null, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error handler for controllers
 */
const handleControllerError = (error, feature, operation, req, res, customLogger = null) => {
  const logger = customLogger || log;
  const startTime = Date.now();
  
  // Determine error type and appropriate response
  let statusCode = 500;
  let userMessage = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  let errorType = ERROR_TYPES.SYSTEM;
  
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    userMessage = error.message;
    errorType = error.errorType;
  } else if (error.code) {
    // Handle specific Node.js error codes
    switch (error.code) {
      case 'ENOENT':
        statusCode = 404;
        userMessage = ERROR_MESSAGES.FILE_NOT_FOUND;
        errorType = ERROR_TYPES.FILE_SYSTEM;
        break;
      case 'EACCES':
        statusCode = 403;
        userMessage = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
        errorType = ERROR_TYPES.AUTHORIZATION;
        break;
      case 'EMFILE':
      case 'ENFILE':
        statusCode = 503;
        userMessage = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
        errorType = ERROR_TYPES.SYSTEM;
        break;
      case 'ECONNREFUSED':
      case 'ENOTFOUND':
        statusCode = 503;
        userMessage = ERROR_MESSAGES.NETWORK_ERROR;
        errorType = ERROR_TYPES.NETWORK;
        break;
      default:
        statusCode = 500;
        userMessage = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
        errorType = ERROR_TYPES.SYSTEM;
    }
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    userMessage = ERROR_MESSAGES.INVALID_INPUT;
    errorType = ERROR_TYPES.VALIDATION;
  } else if (error.name === 'SyntaxError') {
    statusCode = 400;
    userMessage = ERROR_MESSAGES.INVALID_INPUT;
    errorType = ERROR_TYPES.VALIDATION;
  }
  
  // Log the error with full context
  logger.error(`[ERROR] ${feature} - ${operation} failed`, {
    feature,
    operation,
    errorType,
    errorMessage: error.message,
    errorStack: error.stack,
    statusCode,
    userMessage,
    requestMethod: req?.method,
    requestUrl: req?.url,
    requestBody: req?.body ? log.maskSensitive(req.body) : undefined,
    requestQuery: req?.query ? log.maskSensitive(req.query) : undefined,
    userAgent: req?.get('User-Agent'),
    ip: req?.ip || req?.connection?.remoteAddress,
    errorCode: error.code,
    errorName: error.name,
    timestamp: new Date().toISOString(),
    source: 'ErrorHandler'
  }, error);
  
  // Create standardized error response
  let errorDetails = null;
  
  // Include validation details for API responses and development mode
  if (error instanceof AppError && error.details) {
    // Support both array and object formats for validation errors
    errorDetails = error.details;
  } else if (process.env.NODE_ENV === 'development') {
    errorDetails = error.message;
  }
  
  const errorResponse = createErrorResponse(
    userMessage,
    errorDetails,
    statusCode
  );

  // Send appropriate response based on request type
  if (req && res) {
    // Log for debugging
    logger.debug('[DEBUG] Error handler response decision', {
      feature,
      reqUrl: req.url,
      reqPath: req.path,
      reqOriginalUrl: req.originalUrl,
      contentType: req.get('Content-Type'),
      acceptHeader: req.get('Accept'),
      acceptsHtml: req.accepts('html'),
      acceptsJson: req.accepts('json'),
      isApiRoute: req.url && req.url.startsWith('/api/'),
      userMessage,
      hasErrorDetails: !!error.details,
      errorDetails: error.details
    });
    
    // Force JSON response for API routes or JSON requests
    if ((req.url && req.url.startsWith('/api/')) || 
        req.get('Content-Type') === 'application/json' ||
        req.get('Accept') === '*/*') {
      return res.status(statusCode).json(errorResponse);
    }    
    
    if (req.accepts('html')) {
      // For HTML requests, render error page or redirect with error
      if (feature === 'CREATE_PROFILE') {
        logger.debug('[DEBUG] Rendering create-profile with errors', {
          userMessage,
          fieldErrorsCount: error.details ? Object.keys(error.details).length : 0,
          fieldErrors: error.details
        });
        
        return res.status(statusCode).render('create-profile', {
          error: userMessage,
          fieldErrors: error.details || {},
          formData: req.body || {}
        });
      } else if (feature === 'SEARCH_PROFILE') {
        // NOTE: search-profile page is created for future use - advanced search functionality will be implemented
        return res.status(statusCode).render('search-profile', {
          error: userMessage,
          results: [],
          searchCriteria: req.query || {}
        });
      } else if (feature === 'FIND_MATCHING') {
        return res.status(statusCode).render('find-matching', {
          error: userMessage,
          profiles: [],
          form: req.body || req.query || {}
        });
      } else {
        return res.status(statusCode).render('error', {
          title: 'Error',
          error: userMessage,
          statusCode,
          message: userMessage
        });
      }
    } else {
      // For API requests, send JSON response
      return res.status(statusCode).json(errorResponse);
    }
  }
  
  return errorResponse;
};

/**
 * Validation error handler
 */
const handleValidationError = (errors, feature, logger = null) => {
  const loggerInstance = logger || log;
  
  // Transform array format to object format for UI compatibility
  const fieldErrorsObject = {};
  if (Array.isArray(errors)) {
    errors.forEach(error => {
      if (error.field && error.message) {
        fieldErrorsObject[error.field] = error.message;
      }
    });
  }
  
  loggerInstance.error(`[ERROR] ${feature} - Validation failed`, {
    feature,
    operation: 'VALIDATION',
    errorType: ERROR_TYPES.VALIDATION,
    validationErrors: errors,
    fieldErrorsObject: fieldErrorsObject,
    totalErrors: Array.isArray(errors) ? errors.length : 0,
    failedFields: Array.isArray(errors) ? errors.map(e => e.field) : [],
    timestamp: new Date().toISOString()
  });
  
  return new AppError(
    ERROR_MESSAGES.INVALID_INPUT,
    400,
    ERROR_TYPES.VALIDATION,
    fieldErrorsObject  // Pass object format instead of array
  );
};

/**
 * File system operation error handler
 */
const handleFileSystemError = (error, operation, filePath, feature, logger = null) => {
  const loggerInstance = logger || log;
  
  loggerInstance.error(`[ERROR] ${feature} - File system operation failed`, {
    feature,
    operation,
    filePath,
    errorType: ERROR_TYPES.FILE_SYSTEM,
    errorMessage: error.message,
    errorCode: error.code,
    timestamp: new Date().toISOString()
  }, error);
  
  let userMessage = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  let statusCode = 500;
  
  switch (error.code) {
    case 'ENOENT':
      userMessage = ERROR_MESSAGES.FILE_NOT_FOUND;
      statusCode = 404;
      break;
    case 'EACCES':
      userMessage = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
      statusCode = 403;
      break;
    case 'EMFILE':
    case 'ENFILE':
      userMessage = ERROR_MESSAGES.SERVICE_UNAVAILABLE;
      statusCode = 503;
      break;
    default:
      if (operation.includes('read')) {
        userMessage = ERROR_MESSAGES.FILE_READ_ERROR;
      } else if (operation.includes('write')) {
        userMessage = ERROR_MESSAGES.FILE_WRITE_ERROR;
      }
  }
  
  return new AppError(
    userMessage,
    statusCode,
    ERROR_TYPES.FILE_SYSTEM,
    { operation, filePath, code: error.code }
  );
};

/**
 * Network/HTTP request error handler
 */
const handleNetworkError = (error, url, feature, logger = null) => {
  const loggerInstance = logger || log;
  
  loggerInstance.error(`[ERROR] ${feature} - Network request failed`, {
    feature,
    operation: 'NETWORK_REQUEST',
    url,
    errorType: ERROR_TYPES.NETWORK,
    errorMessage: error.message,
    timestamp: new Date().toISOString()
  }, error);
  
  return new AppError(
    ERROR_MESSAGES.NETWORK_ERROR,
    503,
    ERROR_TYPES.NETWORK,
    { url }
  );
};

/**
 * Export error handlers
 */
const handleExportError = (error, format, profilesCount, feature, logger = null) => {
  const loggerInstance = logger || log;
  
  loggerInstance.error(`[ERROR] ${feature} - Export operation failed`, {
    feature,
    operation: 'EXPORT',
    format,
    profilesCount,
    errorType: ERROR_TYPES.SYSTEM,
    errorMessage: error.message,
    timestamp: new Date().toISOString()
  }, error);
  
  return new AppError(
    ERROR_MESSAGES.EXPORT_FAILED,
    500,
    ERROR_TYPES.SYSTEM,
    { format, profilesCount }
  );
};

module.exports = {
  AppError,
  ERROR_MESSAGES,
  ERROR_TYPES,
  createErrorResponse,
  handleControllerError,
  asyncHandler,
  handleValidationError,
  handleFileSystemError,
  handleNetworkError,
  handleExportError
};
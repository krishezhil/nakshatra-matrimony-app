const rateLimit = require('express-rate-limit');
const log = require('./logger');

/**
 * Rate Limiting Configuration
 * DEFAULT: Rate limiting DISABLED for admin app performance
 * To ENABLE rate limiting, set ENABLE_RATE_LIMITING=false in environment
 */

// Rate limiting disabled by default - only enabled when explicitly set to false
const RATE_LIMITING_DISABLED = process.env.ENABLE_RATE_LIMITING !== 'false';
const noOpLimiter = (req, res, next) => next();

/**
 * General API rate limiting (excluding exports)
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (increased from 100)
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for export/download routes
  skip: (req) => {
    return req.path.startsWith('/export/') || req.path.includes('download') || req.path.includes('pdf') || req.path.includes('excel');
  },
  handler: (req, res) => {
    log.warn('[WARN] Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      source: 'RateLimiting'
    });
    
    if (req.accepts('html')) {
      return res.status(429).render('error', {
        title: 'Rate Limit Exceeded',
        error: 'Too Many Requests',
        message: 'You have made too many requests. Please try again later.',
        statusCode: 429,
        retryAfter: '15 minutes'
      });
    } else {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      });
    }
  }
});

/**
 * Strict rate limiting for profile creation
 */
const createProfileLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 profile creations per hour
  message: {
    success: false,
    message: 'Profile creation limit reached. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    log.warn('[WARN] Profile creation rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      source: 'RateLimiting'
    });
    
    if (req.accepts('html')) {
      return res.status(429).render('error', {
        title: 'Profile Creation Limit Reached',
        error: 'Profile Creation Limit Reached',
        message: 'You have reached the maximum number of profile creations for this hour. Please try again later.',
        statusCode: 429,
        retryAfter: '1 hour'
      });
    } else {
      return res.status(429).json({
        success: false,
        message: 'Profile creation limit reached. Please try again later.',
        retryAfter: '1 hour'
      });
    }
  }
});

/**
 * Moderate rate limiting for search operations
 */
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Limit each IP to 200 searches per 5 minutes (increased from 50)
  message: {
    success: false,
    message: 'Search limit reached. Please try again in a few minutes.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Very strict rate limiting for export operations
 */
const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit each IP to 20 exports per 10 minutes (increased from 5)
  message: {
    success: false,
    message: 'Export limit reached. Please try again later.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    log.warn('[WARN] Export rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      source: 'RateLimiting'
    });
    
    if (req.accepts('html')) {
      return res.status(429).render('error', {
        title: 'Export Limit Reached',
        error: 'Export Limit Reached',
        message: 'You have reached the maximum number of exports. Please try again later.',
        statusCode: 429,
        retryAfter: '10 minutes'
      });
    } else {
      return res.status(429).json({
        success: false,
        message: 'Export limit reached. Please try again later.',
        retryAfter: '10 minutes'
      });
    }
  }
});

module.exports = {
  generalLimiter: RATE_LIMITING_DISABLED ? noOpLimiter : generalLimiter,
  createProfileLimiter: RATE_LIMITING_DISABLED ? noOpLimiter : createProfileLimiter,
  searchLimiter: RATE_LIMITING_DISABLED ? noOpLimiter : searchLimiter,
  exportLimiter: RATE_LIMITING_DISABLED ? noOpLimiter : exportLimiter
};
const { body, param, query, validationResult } = require('express-validator');
const createDOMPurify = require('dompurify');
const helmet = require('helmet');

/**
 * Comprehensive Input Sanitization and Validation Utilities
 * Protects against XSS, injection attacks, and malformed data
 */

// Initialize DOMPurify with a minimal window object (PKG-compatible)
// Instead of JSDOM, create a minimal window-like object
const createMinimalWindow = () => {
  return {
    document: {
      implementation: {
        createHTMLDocument: () => ({
          createElement: (tag) => ({
            tagName: tag.toUpperCase(),
            setAttribute: () => {},
            getAttribute: () => null,
            removeAttribute: () => {},
            appendChild: () => {},
            removeChild: () => {},
            textContent: '',
            innerHTML: ''
          }),
          createTextNode: (text) => ({ textContent: text, nodeType: 3 }),
          body: { appendChild: () => {}, removeChild: () => {} }
        })
      }
    },
    HTMLElement: function() {},
    Element: function() {},
    DocumentFragment: function() {},
    Node: {
      ELEMENT_NODE: 1,
      TEXT_NODE: 3,
      DOCUMENT_FRAGMENT_NODE: 11
    }
  };
};

const window = createMinimalWindow();
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} input - Raw HTML input
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(input) {
  if (typeof input !== 'string') return input;
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

/**
 * Sanitize plain text to remove potentially harmful characters
 * @param {string} input - Raw text input
 * @returns {string} Sanitized text
 */
function sanitizeText(input) {
  if (typeof input !== 'string') return input;
  
  // Remove null bytes, control characters, and script tags
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize phone numbers to allow only valid characters
 * @param {string} phone - Phone number input
 * @returns {string} Sanitized phone number
 */
function sanitizePhoneNumber(phone) {
  if (typeof phone !== 'string') return phone;
  
  // Allow only digits, +, -, spaces, and parentheses
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

/**
 * Sanitize name fields to prevent injection
 * @param {string} name - Name input
 * @returns {string} Sanitized name
 */
function sanitizeName(name) {
  if (typeof name !== 'string') return name;
  
  // Allow only letters, spaces, dots, and common name characters
  return name
    .replace(/[^\p{L}\s.''-]/gu, '') // Unicode letter support
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Validation rules for profile creation
 */
const profileValidationRules = [
  body('serial_no')
    .isLength({ min: 1, max: 20 })
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Serial number must contain only alphanumeric characters, underscores, or hyphens'),
  
  body('name')
    .isLength({ min: 2, max: 100 })
    .matches(/^[\p{L}\s.''\(\)-]+$/u)
    .withMessage('Name must contain only letters, spaces, and common punctuation'),
  
  body('father_name')
    .optional()
    .isLength({ max: 100 })
    .matches(/^[\p{L}\s.''\(\)-]*$/u)
    .withMessage('Father name must contain only letters, spaces, and common punctuation'),
  
  body('mother_name')
    .optional()
    .isLength({ max: 100 })
    .matches(/^[\p{L}\s.''\(\)-]*$/u)
    .withMessage('Mother name must contain only letters, spaces, and common punctuation'),
  
  body('contact_no')
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  
  body('birth_date')
    .isISO8601()
    .withMessage('Birth date must be in valid date format'),
  
  body('birth_time')
    .notEmpty()
    .withMessage('Birth time is required')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Birth time must be in HH:MM format'),
  
  body('qualification')
    .isIn(['School', 'Diploma', 'UG', 'PG', 'PHD', 'Doctor', 'Others'])
    .withMessage('Invalid qualification value'),
  
  body('region')
    .isIn(['Chennai', 'Chengalpattu', 'Thiruvallur', 'Kancheepuram', 'Vellore', 'Other Districts in TN', 'Pondicherry', 'Andhra Pradesh', 'Other States in India', 'Overseas', 'Others(TN)', 'Others(IND)'])
    .withMessage('Invalid region value'),
  
  body('gender')
    .isIn(['Male', 'Female'])
    .withMessage('Gender must be either Male or Female'),
  
  body('nakshatraid')
    .isInt({ min: 1, max: 27 })
    .withMessage('Nakshatra ID must be between 1 and 27'),
  
  body('monthly_income')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly income must be a positive number'),
  
  body('is_remarried')
    .optional()
    .isBoolean()
    .withMessage('Remarried status must be true or false'),
  
  body('rasi_lagnam')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Rasi Lagnam must be between 1 and 12'),
  
  body('navamsam_lagnam')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Navamsam Lagnam must be between 1 and 12')
];

/**
 * Validation rules for search/matching parameters
 * Supports both GET (query) and POST (body) requests
 */
const searchValidationRules = [
  // Region validation (query and body) - most important for our fix
  query('region')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty values
      const validRegions = ['Chennai', 'Chengalpattu', 'Thiruvallur', 'Kancheepuram', 'Vellore', 'Other Districts in TN', 'Pondicherry', 'Andhra Pradesh', 'Other States in India', 'Overseas', 'Others(TN)', 'Others(IND)'];
      return validRegions.includes(value);
    })
    .withMessage('Invalid region value'),
  body('region')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty values
      const validRegions = ['Chennai', 'Chengalpattu', 'Thiruvallur', 'Kancheepuram', 'Vellore', 'Other Districts in TN', 'Pondicherry', 'Andhra Pradesh', 'Other States in India', 'Overseas', 'Others(TN)', 'Others(IND)'];
      return validRegions.includes(value);
    })
    .withMessage('Invalid region value'),
  
  // Gender validation (query and body) - relaxed
  query('gender')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty values
      return ['Male', 'Female'].includes(value);
    })
    .withMessage('Gender must be either Male or Female'),
  body('gender')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty values
      return ['Male', 'Female'].includes(value);
    })
    .withMessage('Gender must be either Male or Female'),
  
  // Qualification validation (query and body) - relaxed
  query('qualification')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty values
      return ['School', 'Diploma', 'UG', 'PG', 'PHD', 'Doctor', 'Others'].includes(value);
    })
    .withMessage('Invalid qualification value'),
  body('qualification')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty values
      return ['School', 'Diploma', 'UG', 'PG', 'PHD', 'Doctor', 'Others'].includes(value);
    })
    .withMessage('Invalid qualification value'),
    
  // Nakshatra ID validation (query and body) - relaxed
  query('nakshatraid')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty values
      const num = parseInt(value);
      return !isNaN(num) && num >= 1 && num <= 36; // Allow up to 36 for extended nakshatras
    })
    .withMessage('Nakshatra ID must be between 1 and 36'),
  body('nakshatraid')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty values
      const num = parseInt(value);
      return !isNaN(num) && num >= 1 && num <= 36; // Allow up to 36 for extended nakshatras
    })
    .withMessage('Nakshatra ID must be between 1 and 36')
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    // Log validation errors (without sensitive data)
    const log = require('./logger');
    log.warn('[WARN] Input validation failed', {
      url: req.url,
      method: req.method,
      errors: errorMessages.map(e => ({ field: e.field, message: e.message })),
      ip: req.ip,
      source: 'Sanitization'
    });
    
    if (req.accepts('html')) {
      return res.status(400).render('error', {
        title: 'Validation Error',
        error: 'Invalid input data',
        message: 'The data you submitted contains invalid information. Please check and try again.',
        details: errorMessages,
        statusCode: 400
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorMessages
      });
    }
  }
  
  next();
};

/**
 * Middleware to sanitize request body
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        switch (key) {
          case 'name':
          case 'father_name':
          case 'mother_name':
            req.body[key] = sanitizeName(value);
            break;
          case 'contact_no':
            req.body[key] = sanitizePhoneNumber(value);
            break;
          case 'additional_contact_no':
            req.body[key] = sanitizeText(value); // Allow flexible formats
            break;
          case 'job_details':
          case 'qualification_details':
          case 'address':
            req.body[key] = sanitizeHtml(value);
            break;
          default:
            req.body[key] = sanitizeText(value);
        }
      }
    }
  }
  next();
};

/**
 * Middleware to sanitize query parameters
 */
const sanitizeQuery = (req, res, next) => {
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeText(value);
      }
    }
  }
  next();
};

/**
 * Configure Helmet for security headers
 * Temporarily relaxed for download functionality debugging
 */
const helmetConfig = helmet({
  contentSecurityPolicy: false, // Completely disable CSP temporarily
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Disable headers that might interfere with downloads
  noSniff: false,
  xssFilter: false,
  frameguard: false
});

module.exports = {
  sanitizeHtml,
  sanitizeText,
  sanitizePhoneNumber,
  sanitizeName,
  profileValidationRules,
  searchValidationRules,
  handleValidationErrors,
  sanitizeBody,
  sanitizeQuery,
  helmetConfig
};
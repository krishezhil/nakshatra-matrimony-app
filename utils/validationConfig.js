/**
 * Validation Configuration Module
 * Centralized configuration for all validation rules and constraints
 */

const VALIDATION_CONFIG = {
  // Age constraints for matrimony profiles
  AGE_RANGE: {
    min: 18,
    max: 75,
    errorMessages: {
      tooYoung: 'Age must be at least {min} years for matrimony profiles',
      tooOld: 'Age must be less than {max} years for matrimony profiles'
    }
  },

  // Indian matrimonial age filtering standards
  AGE_FILTERING: {
    MALE_SEEKER: {
      description: 'Male seeking female - candidates should be younger or same age',
      minCandidateAge: 18, // Configurable minimum
      maxCandidateAge: 'seekerAge', // Dynamic - seeker's age
      logic: 'candidateAge <= seekerAge'
    },
    FEMALE_SEEKER: {
      description: 'Female seeking male - candidates should be older or same age', 
      minCandidateAge: 'seekerAge', // Dynamic - seeker's age
      maxCandidateAge: 75, // Configurable maximum
      logic: 'candidateAge >= seekerAge'
    },
    FALLBACK: {
      description: 'Fallback for edge cases',
      tolerance: 5 // ±5 years
    }
  },

  // Field length constraints
  FIELD_LENGTHS: {
    name: 100,
    father_name: 100,
    mother_name: 100,
    address: 500,
    job_details: 300,
    qualification_details: 200,
    serial_no: 20,
    gothram: 50,
    birth_place: 100,
    siblings: 200
  },

  // Validation patterns
  PATTERNS: {
    phone: /^[6-9]\d{9}$/,
    serial: /^[A-Za-z0-9\-_]+$/,
    name: /^[a-zA-Z\s\.\(\)\-\']+$/,
    time: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },

  // Required fields list
  REQUIRED_FIELDS: [
    'name', 
    'serial_no', 
    'gender', 
    'birth_date', 
    'contact_no', 
    'nakshatraid', 
    'gothram', 
    'father_name', 
    'mother_name',
    'birth_time',
    'birth_place'
  ],

  // Valid enum values
  ENUMS: {
    gender: ['Male', 'Female'],
    qualification: ['School', 'Diploma', 'UG', 'PG', 'PHD', 'Doctor'],
    region: [
      'Chennai', 'Chengalpattu', 'Thiruvallur', 'Kancheepuram', 
      'Vellore', 'Other Districts in TN', 'Pondicherry', 
      'Andhra Pradesh', 'Other States in India', 'Overseas', 
      'Others(TN)', 'Others(IND)'
    ],
    boolean: ['true', 'false', '1', '0', 'yes', 'no']
  },

  // Nakshatra configuration
  NAKSHATRA: {
    defaultMaxId: 36,
    minId: 1
  },

  // Error message templates
  ERROR_TEMPLATES: {
    required: '{field} is required',
    minLength: '{field} must be at least {min} characters',
    maxLength: '{field} must be less than {max} characters',
    invalidFormat: 'Invalid {field} format. {hint}',
    invalidEnum: 'Invalid {field} value',
    invalidRange: '{field} must be between {min} and {max}',
    futureDate: '{field} cannot be in the future',
    invalidDate: 'Invalid {field} format (use YYYY-MM-DD)'
  }
};

/**
 * Helper function to format error messages with placeholders
 * @param {string} template - Message template with placeholders
 * @param {Object} values - Values to replace placeholders
 * @returns {string} Formatted message
 */
function formatErrorMessage(template, values = {}) {
  let message = template;
  Object.keys(values).forEach(key => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), values[key]);
  });
  return message;
}

/**
 * Get field display name (converts snake_case to readable format)
 * @param {string} fieldName - Field name in snake_case
 * @returns {string} Human-readable field name
 */
function getFieldDisplayName(fieldName) {
  const displayNames = {
    serial_no: 'Serial Number',
    father_name: 'Father Name',
    mother_name: 'Mother Name',
    birth_date: 'Birth Date',
    birth_time: 'Birth Time',
    birth_place: 'Birth Place',
    contact_no: 'Contact Number',
    additional_contact_no: 'Additional Contact Number',
    job_details: 'Job Details',
    qualification_details: 'Qualification Details',
    monthly_income: 'Monthly Income',
    is_active: 'Active Status',
    is_remarried: 'Remarried Status',
    nakshatraid: 'Nakshatra ID',
    rasi_lagnam: 'Rasi Lagnam',
    navamsam_lagnam: 'Navamsam Lagnam'
  };
  
  return displayNames[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
}

module.exports = {
  VALIDATION_CONFIG,
  formatErrorMessage,
  getFieldDisplayName
};
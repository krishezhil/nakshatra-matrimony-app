/**
 * Validation Helper Library
 * Reusable validation functions for profile data
 */

const fs = require('fs');
const path = require('path');
const { VALIDATION_CONFIG, formatErrorMessage, getFieldDisplayName } = require('./validationConfig');

/**
 * Field Validator Class
 * Contains static methods for common validation patterns
 */
class FieldValidator {
  
  /**
   * Validate if a field is required and not empty
   * @param {*} value - Field value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validateRequired(value, fieldName) {
    const errors = [];
    const displayName = getFieldDisplayName(fieldName);
    
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.required, {
          field: displayName
        })
      });
    }
    
    return errors;
  }

  /**
   * Validate field length constraints
   * @param {string} value - Field value
   * @param {string} fieldName - Field name
   * @param {number} minLength - Minimum length (optional)
   * @param {number} maxLength - Maximum length (optional)
   * @returns {Array} Array of error objects
   */
  static validateLength(value, fieldName, minLength = null, maxLength = null) {
    const errors = [];
    const displayName = getFieldDisplayName(fieldName);
    
    if (!value || typeof value !== 'string') {
      return errors; // Skip length validation if value is empty (handled by required validation)
    }
    
    const trimmedValue = value.trim();
    
    if (minLength !== null && trimmedValue.length < minLength) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.minLength, {
          field: displayName,
          min: minLength
        })
      });
    }
    
    if (maxLength !== null && trimmedValue.length > maxLength) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.maxLength, {
          field: displayName,
          max: maxLength
        })
      });
    }
    
    return errors;
  }

  /**
   * Validate field against regex pattern
   * @param {string} value - Field value
   * @param {string} fieldName - Field name
   * @param {RegExp} pattern - Regex pattern
   * @param {string} hint - Hint message for users
   * @returns {Array} Array of error objects
   */
  static validatePattern(value, fieldName, pattern, hint = '') {
    const errors = [];
    const displayName = getFieldDisplayName(fieldName);
    
    if (!value || typeof value !== 'string') {
      return errors; // Skip pattern validation if value is empty
    }
    
    if (!pattern.test(value.trim())) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.invalidFormat, {
          field: displayName,
          hint: hint
        })
      });
    }
    
    return errors;
  }

  /**
   * Validate enum values
   * @param {*} value - Field value
   * @param {string} fieldName - Field name
   * @param {Array} allowedValues - Array of allowed values
   * @returns {Array} Array of error objects
   */
  static validateEnum(value, fieldName, allowedValues) {
    const errors = [];
    const displayName = getFieldDisplayName(fieldName);
    
    if (!value) {
      return errors; // Skip enum validation if value is empty
    }
    
    if (!allowedValues.includes(value)) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.invalidEnum, {
          field: displayName
        })
      });
    }
    
    return errors;
  }

  /**
   * Validate person name (father_name, mother_name, name)
   * @param {string} value - Name value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validatePersonName(value, fieldName) {
    const errors = [];
    
    // Check if required
    errors.push(...this.validateRequired(value, fieldName));
    
    if (!value || typeof value !== 'string') {
      return errors;
    }
    
    // Length validation
    const maxLength = VALIDATION_CONFIG.FIELD_LENGTHS[fieldName] || VALIDATION_CONFIG.FIELD_LENGTHS.name;
    errors.push(...this.validateLength(value, fieldName, 2, maxLength));
    
    // Pattern validation
    errors.push(...this.validatePattern(
      value, 
      fieldName, 
      VALIDATION_CONFIG.PATTERNS.name,
      'should only contain letters, spaces, periods, parentheses, and hyphens'
    ));
    
    return errors;
  }

  /**
   * Validate gothram field
   * @param {string} value - Gothram value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validateGothram(value, fieldName = 'gothram') {
    const errors = [];
    
    // Check if required
    errors.push(...this.validateRequired(value, fieldName));
    
    if (!value || typeof value !== 'string') {
      return errors;
    }
    
    // Length validation
    errors.push(...this.validateLength(value, fieldName, 2, VALIDATION_CONFIG.FIELD_LENGTHS.gothram));
    
    // Pattern validation
    errors.push(...this.validatePattern(
      value, 
      fieldName, 
      VALIDATION_CONFIG.PATTERNS.name,
      'should only contain letters and spaces'
    ));
    
    return errors;
  }

  /**
   * Validate birth date with age constraints
   * @param {string} value - Birth date value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validateBirthDate(value, fieldName = 'birth_date') {
    const errors = [];
    
    // Check if required
    errors.push(...this.validateRequired(value, fieldName));
    
    if (!value || typeof value !== 'string') {
      return errors;
    }
    
    // Validate date format
    const birthDate = new Date(value);
    if (isNaN(birthDate.getTime())) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.invalidDate, {
          field: getFieldDisplayName(fieldName)
        })
      });
      return errors;
    }
    
    // Check if date is not in future
    const today = new Date();
    if (birthDate > today) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.futureDate, {
          field: getFieldDisplayName(fieldName)
        })
      });
      return errors;
    }
    
    // Calculate age and validate range
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    const { min, max, errorMessages } = VALIDATION_CONFIG.AGE_RANGE;
    
    if (age < min) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(errorMessages.tooYoung, { min })
      });
    } else if (age > max) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(errorMessages.tooOld, { max })
      });
    }
    
    return errors;
  }

  /**
   * Validate phone number
   * @param {string} value - Phone number value
   * @param {string} fieldName - Field name
   * @param {boolean} isRequired - Whether field is required
   * @returns {Array} Array of error objects
   */
  static validatePhone(value, fieldName, isRequired = false) {
    const errors = [];
    
    if (isRequired) {
      errors.push(...this.validateRequired(value, fieldName));
    }
    
    if (!value || typeof value !== 'string') {
      return errors;
    }
    
    // Clean phone number (remove non-digits)
    const cleanPhone = value.replace(/\D/g, '');
    
    // Pattern validation
    errors.push(...this.validatePattern(
      cleanPhone,
      fieldName,
      VALIDATION_CONFIG.PATTERNS.phone,
      'format: 10 digits starting with 6-9'
    ));
    
    return errors;
  }

  /**
   * Validate serial number
   * @param {string} value - Serial number value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validateSerialNumber(value, fieldName = 'serial_no') {
    const errors = [];
    
    // Check if required
    errors.push(...this.validateRequired(value, fieldName));
    
    if (!value || typeof value !== 'string') {
      return errors;
    }
    
    // Length validation
    errors.push(...this.validateLength(value, fieldName, null, VALIDATION_CONFIG.FIELD_LENGTHS.serial_no));
    
    // Pattern validation
    errors.push(...this.validatePattern(
      value,
      fieldName,
      VALIDATION_CONFIG.PATTERNS.serial,
      'should only contain letters, numbers, hyphens, and underscores'
    ));
    
    return errors;
  }

  /**
   * Validate nakshatra ID with dynamic range
   * @param {*} value - Nakshatra ID value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validateNakshatraId(value, fieldName = 'nakshatraid') {
    const errors = [];
    
    // Check if required
    errors.push(...this.validateRequired(value, fieldName));
    
    if (!value) {
      return errors;
    }
    
    // Parse to number
    const nakshatraId = parseInt(value);
    if (isNaN(nakshatraId)) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.invalidFormat, {
          field: getFieldDisplayName(fieldName),
          hint: 'must be a number'
        })
      });
      return errors;
    }
    
    // Get dynamic range
    let maxNakshatraId = VALIDATION_CONFIG.NAKSHATRA.defaultMaxId;
    try {
      const nakshatraData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/nakshatra.json')));
      const femaleMatchingData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/female_matching_uthamam.json')));
      if (femaleMatchingData && femaleMatchingData.length > 0) {
        const maxFromMatching = Math.max(...femaleMatchingData.map(item => 
          Math.max(...item.matching.map(m => m.female_nakshatra_id))
        ));
        maxNakshatraId = Math.max(maxNakshatraId, maxFromMatching);
      }
    } catch (err) {
      // Use default range if file loading fails
    }
    
    // Range validation
    if (nakshatraId < VALIDATION_CONFIG.NAKSHATRA.minId || nakshatraId > maxNakshatraId) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.invalidRange, {
          field: getFieldDisplayName(fieldName),
          min: VALIDATION_CONFIG.NAKSHATRA.minId,
          max: maxNakshatraId
        })
      });
    }
    
    return errors;
  }

  /**
   * Validate boolean field
   * @param {*} value - Boolean value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validateBoolean(value, fieldName) {
    const errors = [];
    
    if (value === undefined || value === null || value === '') {
      return errors; // Optional field
    }
    
    const normalizedValue = String(value).toLowerCase().trim();
    if (!VALIDATION_CONFIG.ENUMS.boolean.includes(normalizedValue)) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.invalidEnum, {
          field: getFieldDisplayName(fieldName)
        }) + ' (must be true/false, yes/no, or 1/0)'
      });
    }
    
    return errors;
  }

  /**
   * Validate birth time format
   * @param {string} value - Birth time value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validateBirthTime(value, fieldName = 'birth_time') {
    const errors = [];
    
    // Check if required
    errors.push(...this.validateRequired(value, fieldName));
    
    if (!value || typeof value !== 'string') {
      return errors;
    }
    
    errors.push(...this.validatePattern(
      value,
      fieldName,
      VALIDATION_CONFIG.PATTERNS.time,
      'Use HH:MM (24-hour format, e.g., 14:30)'
    ));
    
    return errors;
  }

  /**
   * Validate birth place
   * @param {string} value - Birth place value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validateBirthPlace(value, fieldName = 'birth_place') {
    const errors = [];
    
    // Check if required
    errors.push(...this.validateRequired(value, fieldName));
    
    if (!value || typeof value !== 'string') {
      return errors;
    }
    
    // Length validation
    const maxLength = VALIDATION_CONFIG.FIELD_LENGTHS[fieldName] || 100;
    errors.push(...this.validateLength(value, fieldName, 2, maxLength));
    
    return errors;
  }

  /**
   * Validate monthly income
   * @param {string} value - Monthly income value
   * @param {string} fieldName - Field name
   * @returns {Array} Array of error objects
   */
  static validateMonthlyIncome(value, fieldName = 'monthly_income') {
    const errors = [];
    
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return errors; // Optional field
    }
    
    const income = parseFloat(value);
    if (isNaN(income) || income < 0) {
      errors.push({
        field: fieldName,
        message: formatErrorMessage(VALIDATION_CONFIG.ERROR_TEMPLATES.invalidFormat, {
          field: getFieldDisplayName(fieldName),
          hint: 'must be a valid positive number'
        })
      });
    }
    
    return errors;
  }
}

module.exports = {
  FieldValidator
};
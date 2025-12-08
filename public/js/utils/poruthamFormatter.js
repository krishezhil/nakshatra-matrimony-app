/**
 * Porutham Formatter Utility
 * Transforms porutham numeric values to display format for UI
 * 
 * Transformation Rules:
 * - 4 → "M" (Mathimam)
 * - 11 → "U" (Uthamam) 
 * - Other values → No change (keep original)
 * 
 * @author Nakshatra Matching System
 * @version 1.0.0
 */

/**
 * Configuration for porutham display format
 * @type {Object}
 */
const PORUTHAM_CONFIG = {
  // Display format: 'short' for "M"/"U" or 'full' for "Mathimam"/"Uthamam"
  displayFormat: 'full', // Change this to 'full' for full names
  
  formats: {
    short: {
      mathimam: "M",
      uthamam: "U"
    },
    full: {
      mathimam: "Mathimam", 
      uthamam: "Uthamam"
    }
  }
};

/**
 * Transforms porutham value for display purposes with configurable format
 * @param {number|string} value - The porutham value to transform
 * @param {string} [format] - Optional format override ('short' or 'full')
 * @returns {string|number} Transformed value based on configuration
 * 
 * @example
 * // With displayFormat: 'short'
 * transformPorutham(4)           // Returns "M"
 * transformPorutham(11)          // Returns "U"
 * 
 * // With displayFormat: 'full' 
 * transformPorutham(4)           // Returns "Mathimam"
 * transformPorutham(11)          // Returns "Uthamam"
 * 
 * // With format override
 * transformPorutham(4, 'full')   // Returns "Mathimam" regardless of config
 * transformPorutham(11, 'short') // Returns "U" regardless of config
 * 
 * transformPorutham(8.5)         // Returns 8.5 (unchanged)
 * transformPorutham(null)        // Returns null
 */
function transformPorutham(value, format) {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === '') {
    return value;
  }
  
  // Convert to number for comparison (handles string inputs)
  const numValue = parseFloat(value);
  
  // Handle invalid numbers
  if (isNaN(numValue)) {
    return value;
  }
  
  // Determine which format to use
  const useFormat = format || PORUTHAM_CONFIG.displayFormat;
  const formatConfig = PORUTHAM_CONFIG.formats[useFormat] || PORUTHAM_CONFIG.formats.short;
  
  // Apply transformation rules
  if (numValue === 4) {
    return formatConfig.mathimam;
  } else if (numValue === 11) {
    return formatConfig.uthamam;
  } else {
    // Return original value (maintain type - number if it was number)
    return value;
  }
}

/**
 * Transforms porutham value with additional context for debugging
 * @param {number|string} value - The porutham value to transform
 * @returns {Object} Object with transformed value and metadata
 * 
 * @example
 * transformPoruthamWithInfo(4)  
 * // Returns { value: "M", original: 4, transformed: true, type: "Mathimam" }
 */
function transformPoruthamWithInfo(value) {
  const original = value;
  const transformed = transformPorutham(value);
  const isTransformed = transformed !== original;
  
  let type = null;
  if (transformed === "M") {
    type = "Mathimam";
  } else if (transformed === "U") {
    type = "Uthamam";
  }
  
  return {
    value: transformed,
    original: original,
    transformed: isTransformed,
    type: type
  };
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    transformPorutham,
    transformPoruthamWithInfo
  };
} else {
  // Browser environment - attach to window object
  window.PoruthamFormatter = {
    transformPorutham,
    transformPoruthamWithInfo
  };
}
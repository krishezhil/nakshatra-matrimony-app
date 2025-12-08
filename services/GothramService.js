const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');
const { FieldValidator } = require('../utils/validationHelpers');
const { getDataFilePath, ensureDirectoryExists, getDataPath } = require('../utils/appData');

/**
 * Gothram Service
 * Handles loading and management of Gothram data from AppData/data directory
 */

let gothrams = [];

/**
 * Get the gothram file path in AppData/data
 */
function getGothramPath() {
  return getDataFilePath('gothram.json');
}

/**
 * Initialize gothram file with default data if it doesn't exist
 */
function initializeGothramFile() {
  const gothramPath = getGothramPath();
  
  // Ensure data directory exists
  ensureDirectoryExists(getDataPath());
  
  // If gothram.json doesn't exist in AppData, copy from data folder
  if (!fs.existsSync(gothramPath)) {
    const defaultGothramPath = path.join(__dirname, '../data/gothram.json');
    
    if (fs.existsSync(defaultGothramPath)) {
      // Copy default gothram data to AppData
      const defaultData = fs.readFileSync(defaultGothramPath, 'utf8');
      fs.writeFileSync(gothramPath, defaultData, 'utf8');
      
      log.info('Initialized gothram.json in AppData from default data', {
        source: 'GothramService',
        appDataPath: gothramPath,
        defaultPath: defaultGothramPath
      });
    } else {
      // Create empty array if no default data exists
      fs.writeFileSync(gothramPath, JSON.stringify([], null, 2), 'utf8');
      
      log.warn('No default gothram data found, created empty gothram.json', {
        source: 'GothramService',
        appDataPath: gothramPath
      });
    }
  }
}

/**
 * Load Gothram data from JSON file in AppData
 */
function loadGothramData() {
  try {
    // Initialize file if needed
    initializeGothramFile();
    
    const gothramPath = getGothramPath();
    
    if (!fs.existsSync(gothramPath)) {
      throw new Error(`Gothram data file not found at: ${gothramPath}`);
    }
    
    const gothramData = fs.readFileSync(gothramPath, 'utf8');
    gothrams = JSON.parse(gothramData);
    
    // Validate data structure
    if (!Array.isArray(gothrams)) {
      throw new Error('Gothram data must be an array');
    }
    
    // Validate each gothram entry
    gothrams.forEach((gothram, index) => {
      if (!gothram.id || !gothram.name) {
        throw new Error(`Invalid gothram entry at index ${index}: missing id or name`);
      }
    });
    
    log.debug('Successfully loaded Gothram data', {
      source: 'GothramService',
      gothramCount: gothrams.length,
      filePath: gothramPath
    });
    
    return gothrams;
  } catch (error) {
    log.error('Failed to load Gothram data', {
      source: 'GothramService',
      error: error.message,
      stack: error.stack
    }, error);
    
    // Return empty array as fallback
    gothrams = [];
    return gothrams;
  }
}

/**
 * Get all Gothrams
 * @returns {Array} Array of gothram objects with id and name
 */
function getAllGothrams() {
  return gothrams;
}

/**
 * Get Gothram by ID
 * @param {number} id - The gothram ID
 * @returns {Object|null} Gothram object or null if not found
 */
function getGothramById(id) {
  const gothramId = parseInt(id);
  return gothrams.find(gothram => gothram.id === gothramId) || null;
}

/**
 * Get Gothram by name (case-insensitive partial match)
 * @param {string} name - The gothram name to search for
 * @returns {Array} Array of matching gothram objects
 */
function getGothramsByName(name) {
  if (!name || typeof name !== 'string') {
    return [];
  }
  
  const searchName = name.toLowerCase().trim();
  return gothrams.filter(gothram => 
    gothram.name.toLowerCase().includes(searchName)
  );
}

/**
 * Get total count of Gothrams
 * @returns {number} Total number of gothrams
 */
function getGothramCount() {
  return gothrams.length;
}

/**
 * Reload Gothram data from file
 * Useful for refreshing data without server restart
 * @returns {Array} Updated gothram array
 */
function reloadGothramData() {
  log.info('Reloading Gothram data from file', { source: 'GothramService' });
  return loadGothramData();
}

/**
 * Check if gothram name already exists (case-insensitive)
 * @param {string} name - Gothram name to check
 * @returns {boolean} True if exists
 */
function gothramExists(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  const searchName = name.toLowerCase().trim();
  return gothrams.some(gothram => 
    gothram.name.toLowerCase().trim() === searchName
  );
}

/**
 * Validate new gothram name format using existing validation system
 * @param {string} name - Gothram name
 * @returns {Array} Validation errors array
 */
function validateNewGothram(name) {
  const errors = [];
  
  // Use existing validation system for consistency
  const fieldValidationErrors = FieldValidator.validateGothram(name, 'name');
  errors.push(...fieldValidationErrors);
  
  // Add duplicate checking (not part of standard field validation)
  if (name && typeof name === 'string') {
    const trimmedName = name.trim();
    if (trimmedName && gothramExists(trimmedName)) {
      errors.push({ field: 'name', message: 'This gothram already exists' });
    }
  }
  
  return errors;
}

/**
 * Add new gothram to the system
 * @param {string} name - Gothram name
 * @returns {Object} Result object with success status and data
 */
function addGothram(name) {
  try {
    // Validate the new gothram
    const validationErrors = validateNewGothram(name);
    if (validationErrors.length > 0) {
      log.warn('Gothram creation failed - validation errors', {
        source: 'GothramService',
        name: name,
        errors: validationErrors
      });
      return {
        success: false,
        errors: validationErrors,
        data: null
      };
    }
    
    const trimmedName = name.trim();
    
    // Generate new ID (get max existing ID + 1)
    const maxId = gothrams.length > 0 ? Math.max(...gothrams.map(g => g.id)) : 0;
    const newId = maxId + 1;
    
    // Create new gothram object
    const newGothram = {
      id: newId,
      name: trimmedName
    };
    
    // Add to in-memory array
    gothrams.push(newGothram);
    
    // Save to file in AppData
    const gothramPath = getGothramPath();
    fs.writeFileSync(gothramPath, JSON.stringify(gothrams, null, 2), 'utf8');
    
    log.info('New gothram added successfully', {
      source: 'GothramService',
      id: newId,
      name: trimmedName,
      totalGothrams: gothrams.length
    });
    
    return {
      success: true,
      errors: [],
      data: newGothram
    };
    
  } catch (error) {
    log.error('Failed to add new gothram', {
      source: 'GothramService',
      name: name,
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      errors: [{ field: 'system', message: 'Failed to save gothram. Please try again.' }],
      data: null
    };
  }
}

// Initialize service
log.info('Gothram service initialized', {
  source: 'GothramService',
  availableFunctions: [
    'getAllGothrams',
    'getGothramById', 
    'getGothramsByName',
    'getGothramCount',
    'reloadGothramData',
    'addGothram',
    'gothramExists',
    'validateNewGothram'
  ]
});

// Load initial data
loadGothramData();

module.exports = {
  getAllGothrams,
  getGothramById,
  getGothramsByName,
  getGothramCount,
  reloadGothramData,
  // New functions for gothram creation
  addGothram,
  gothramExists,
  validateNewGothram,
  // Export array for backward compatibility if needed
  gothrams: () => gothrams
};
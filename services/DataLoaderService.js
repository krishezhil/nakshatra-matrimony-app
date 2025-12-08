const fs = require("fs");
const log = require('../utils/logger');
const { 
  AppError, 
  ERROR_TYPES, 
  handleFileSystemError
} = require('../utils/errorHandler');

/**
 * Data Loader Service
 * Extracted from matchingController.js - maintains exact same functionality
 * Handles JSON file loading with comprehensive error handling
 */

// Helper function to safely load JSON files
function loadJsonFile(filePath, description) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new AppError(
        `${description} file not found: ${filePath}`,
        404,
        ERROR_TYPES.FILE_SYSTEM,
        { filePath, description }
      );
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    if (!fileContent.trim()) {
      throw new AppError(
        `${description} file is empty: ${filePath}`,
        500,
        ERROR_TYPES.FILE_SYSTEM,
        { filePath, description }
      );
    }
    
    const data = JSON.parse(fileContent);
    
    if (!Array.isArray(data)) {
      throw new AppError(
        `${description} file does not contain valid array data: ${filePath}`,
        500,
        ERROR_TYPES.FILE_SYSTEM,
        { filePath, description, dataType: typeof data }
      );
    }
    
    log.debug(`Successfully loaded ${description}`, { 
      feature: 'SYSTEM',
      filePath, 
      recordsCount: data.length 
    });
    
    return data;
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new AppError(
        `${description} file contains invalid JSON: ${filePath}`,
        500,
        ERROR_TYPES.FILE_SYSTEM,
        { filePath, description, error: error.message }
      );
    }
    
    throw handleFileSystemError(error, 'loadJsonFile', filePath, 'FIND_MATCHING');
  }
}

module.exports = {
  loadJsonFile
};
const log = require('../utils/logger');
const { ERROR_TYPES } = require('../utils/errorHandler');
const { loadJsonFile } = require('./DataLoaderService');
const { 
  maleUthamamPath, 
  maleMathimamPath, 
  femaleUthamamPath, 
  femaleMathimamPath 
} = require('../utils/dataPaths');

/**
 * Matching Data Service
 * Extracted from matchingController.js - maintains exact same functionality
 * Handles loading of nakshatra matching data files
 */

let maleUthamamData, maleMathimamData, femaleUthamamData, femaleMathimamData;

try {
  maleUthamamData = loadJsonFile(maleUthamamPath, 'Male Uthamam matching data');
  maleMathimamData = loadJsonFile(maleMathimamPath, 'Male Mathimam matching data');
  femaleUthamamData = loadJsonFile(femaleUthamamPath, 'Female Uthamam matching data');
  femaleMathimamData = loadJsonFile(femaleMathimamPath, 'Female Mathimam matching data');
  
  log.info('Matching data service initialized', {
    source: 'MatchingDataService',
    maleDataLoaded: maleUthamamData.length + maleMathimamData.length,
    femaleDataLoaded: femaleUthamamData.length + femaleMathimamData.length
  });
  
} catch (error) {
  log.error('Failed to load matching data files', {
    source: 'MatchingDataService',
    errorMessage: error.message,
    errorType: error.errorType || ERROR_TYPES.FILE_SYSTEM
  }, error);
  
  // Set fallback values
  maleUthamamData = [];
  maleMathimamData = [];
  femaleUthamamData = [];
  femaleMathimamData = [];
}

module.exports = {
  maleUthamamData,
  maleMathimamData,
  femaleUthamamData,
  femaleMathimamData
};
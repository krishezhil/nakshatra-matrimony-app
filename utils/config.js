const fs = require('fs');
const path = require('path');
const { getConfigFilePath, ensureDirectoryExists, getConfigPath } = require('./appData');

/**
 * Configuration management for logging system
 * Handles loading, saving, and runtime updates of logging configuration
 */

const CONFIG_FILENAME = 'logging.json';
const CONFIG_FILE_PATH = getConfigFilePath(CONFIG_FILENAME);

/**
 * Default logging configuration
 */
const DEFAULT_CONFIG = {
  logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'trace', // Enable trace logging
  consoleLevel: process.env.NODE_ENV === 'production' ? 'info' : 'trace', // Enable trace in console
  fileLevel: 'trace', // Enable trace in files
  enableFileLogging: true,
  console: {
    enabled: process.env.NODE_ENV !== 'production',
    colorize: true,
    timestamp: true
  },
  file: {
    enabled: true,
    maxSize: '20m',
    maxFiles: 14,
    datePattern: 'YYYY-MM-DD'
  },
  rotation: {
    enabled: true,
    frequency: 'daily'
  },
  performance: {
    enabled: process.env.NODE_ENV !== 'production',
    slowThreshold: 1000 // ms
  },
  features: {
    requestTracking: true,
    errorStackTrace: true,
    structuredLogging: true
  },
  lastUpdated: new Date().toISOString(),
  version: '2.0.0'
};

/**
 * Current configuration cache
 */
let currentConfig = null;

/**
 * Load configuration from file or create default
 * @returns {object} Configuration object
 */
function loadConfig() {
  try {
    // Ensure config directory exists
    ensureDirectoryExists(getConfigPath());

    // Try to load existing config
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const config = JSON.parse(configData);
      
      // Merge with defaults to ensure all properties exist
      currentConfig = { ...DEFAULT_CONFIG, ...config };
      
      // Update with any missing default properties
      if (hasNewProperties(currentConfig, DEFAULT_CONFIG)) {
        saveConfig(currentConfig);
      }
    } else {
      // Create default config file
      currentConfig = { ...DEFAULT_CONFIG };
      saveConfig(currentConfig);
    }
  } catch (error) {
    console.error('Error loading logging configuration, using defaults:', error.message);
    currentConfig = { ...DEFAULT_CONFIG };
  }

  // Override with environment variables if present
  applyEnvironmentOverrides();

  return currentConfig;
}

/**
 * Save configuration to file
 * @param {object} config - Configuration object to save
 */
function saveConfig(config) {
  try {
    ensureDirectoryExists(getConfigPath());
    config.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
    currentConfig = config;
  } catch (error) {
    console.error('Error saving logging configuration:', error.message);
  }
}

/**
 * Get current configuration
 * @returns {object} Current configuration
 */
function getConfig() {
  if (!currentConfig) {
    return loadConfig();
  }
  return currentConfig;
}

/**
 * Update configuration at runtime
 * @param {object} updates - Configuration updates
 * @returns {object} Updated configuration
 */
function updateConfig(updates) {
  const config = getConfig();
  const updatedConfig = { ...config, ...updates };
  saveConfig(updatedConfig);
  return updatedConfig;
}

/**
 * Update log level at runtime
 * @param {string} level - New log level (debug, info, warn, error)
 * @returns {object} Updated configuration
 */
function updateLogLevel(level) {
  const validLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLevels.includes(level)) {
    throw new Error(`Invalid log level: ${level}. Valid levels: ${validLevels.join(', ')}`);
  }
  
  return updateConfig({ logLevel: level });
}

/**
 * Apply environment variable overrides
 */
function applyEnvironmentOverrides() {
  if (!currentConfig) return;

  // Override log level from environment
  if (process.env.LOG_LEVEL) {
    const envLevel = process.env.LOG_LEVEL.toLowerCase();
    const validLevels = ['debug', 'info', 'warn', 'error'];
    if (validLevels.includes(envLevel)) {
      currentConfig.logLevel = envLevel;
    }
  }

  // Override console logging
  if (process.env.CONSOLE_LOGGING !== undefined) {
    currentConfig.console.enabled = process.env.CONSOLE_LOGGING === 'true';
  }

  // Override file logging
  if (process.env.FILE_LOGGING !== undefined) {
    currentConfig.file.enabled = process.env.FILE_LOGGING === 'true';
  }
}

/**
 * Check if default config has new properties that current config lacks
 * @param {object} current - Current configuration
 * @param {object} defaults - Default configuration
 * @returns {boolean} True if new properties exist
 */
function hasNewProperties(current, defaults) {
  return JSON.stringify(Object.keys(defaults).sort()) !== 
         JSON.stringify(Object.keys(current).sort());
}

/**
 * Reset configuration to defaults
 * @returns {object} Reset configuration
 */
function resetConfig() {
  const config = { ...DEFAULT_CONFIG };
  saveConfig(config);
  return config;
}

/**
 * Get configuration file path
 * @returns {string} Configuration file path
 */
function getConfigurationFilePath() {
  return CONFIG_FILE_PATH;
}

/**
 * Validate configuration object
 * @param {object} config - Configuration to validate
 * @returns {boolean} True if valid
 */
function validateConfig(config) {
  try {
    const requiredKeys = ['logLevel', 'console', 'file'];
    return requiredKeys.every(key => key in config);
  } catch (error) {
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  updateConfig,
  updateLogLevel,
  resetConfig,
  getConfigurationFilePath,
  validateConfig,
  DEFAULT_CONFIG
};
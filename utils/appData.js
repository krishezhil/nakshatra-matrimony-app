const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Cross-platform AppData directory utilities
 * Handles Windows, macOS, and Linux AppData locations
 */

const APP_NAME = 'matrimony';

/**
 * Get the platform-specific AppData directory
 * @returns {string} AppData directory path
 */
function getAppDataPath() {
  const platform = os.platform();
  let appDataPath;

  switch (platform) {
    case 'win32':
      // Windows: %APPDATA% or fallback
      appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      break;
    case 'darwin':
      // macOS: ~/Library/Application Support
      appDataPath = path.join(os.homedir(), 'Library', 'Application Support');
      break;
    case 'linux':
    default:
      // Linux: $XDG_CONFIG_HOME or ~/.config
      appDataPath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
      break;
  }

  return path.join(appDataPath, APP_NAME);
}

/**
 * Get the application config directory
 * @returns {string} Config directory path
 */
function getConfigPath() {
  return path.join(getAppDataPath(), 'config');
}

/**
 * Get the application logs directory
 * @returns {string} Logs directory path
 */
function getLogsPath() {
  return path.join(getAppDataPath(), 'logs');
}

/**
 * Get the application data directory (for user data files)
 * @returns {string} Data directory path
 */
function getDataPath() {
  return path.join(getAppDataPath(), 'data');
}

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path to ensure
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Initialize AppData directory structure
 * Creates all necessary directories for the application
 */
function initializeAppData() {
  const appDataPath = getAppDataPath();
  const configPath = getConfigPath();
  const logsPath = getLogsPath();
  const dataPath = getDataPath();

  // Create directories
  ensureDirectoryExists(appDataPath);
  ensureDirectoryExists(configPath);
  ensureDirectoryExists(logsPath);
  ensureDirectoryExists(dataPath);

  return {
    appData: appDataPath,
    config: configPath,
    logs: logsPath,
    data: dataPath
  };
}

/**
 * Get file path within config directory
 * @param {string} filename - Config file name
 * @returns {string} Full file path
 */
function getConfigFilePath(filename) {
  return path.join(getConfigPath(), filename);
}

/**
 * Get file path within logs directory
 * @param {string} filename - Log file name
 * @returns {string} Full file path
 */
function getLogFilePath(filename) {
  return path.join(getLogsPath(), filename);
}

/**
 * Get file path within data directory
 * @param {string} filename - Data file name
 * @returns {string} Full file path
 */
function getDataFilePath(filename) {
  return path.join(getDataPath(), filename);
}

module.exports = {
  getAppDataPath,
  getConfigPath,
  getLogsPath,
  getDataPath,
  ensureDirectoryExists,
  initializeAppData,
  getConfigFilePath,
  getLogFilePath,
  getDataFilePath,
  APP_NAME
};
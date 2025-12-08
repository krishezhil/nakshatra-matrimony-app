const path = require("path");
const { getDataFilePath } = require('./appData');

/**
 * Data Paths Configuration
 * Centralized configuration for all data file paths used in the matrimony application
 */

// Path to profiles.json using cross-platform AppData utility
const profilesPath = getDataFilePath("profile.json");

// Paths to matching files
const maleUthamamPath = path.join(__dirname, "..", "data", "male_matching_uthamam.json");
const maleMathimamPath = path.join(__dirname, "..", "data", "male_matching_mathimam.json");

const femaleUthamamPath = path.join(__dirname, "..", "data", "female_matching_uthamam.json");
const femaleMathimamPath = path.join(__dirname, "..", "data", "female_matching_mathimam.json");

// Path to nakshatra data
const nakshatraPath = path.join(__dirname, "..", "data", "nakshatra.json");

module.exports = {
  profilesPath,
  maleUthamamPath,
  maleMathimamPath,
  femaleUthamamPath,
  femaleMathimamPath,
  nakshatraPath
};
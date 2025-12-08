const log = require('../utils/logger');

/**
 * Rasi Compatibility Service
 * Extracted from matchingController.js - maintains exact same functionality
 * Handles traditional Rasi/Lagnam compatibility rules and logic
 */

// Advanced Rasi/Lagnam Compatibility Function
function checkSingleCompatibility(maleVal, femaleVal) {
  const toSet = (val) => new Set(val.split("/").map((v) => v.trim()));
  const isOnly = (set, val) => set.size === 1 && set.has(val);
  const intersects = (set1, set2) => [...set1].some((v) => set2.has(v));

  const riskItems = new Set(["Sani", "Sevai", "Kethu", "Raghu"]);

  const maleSet = toSet(maleVal);
  const femaleSet = toSet(femaleVal);

  // Rule 1: If male is only Suth, female must also be only Suth
  if (isOnly(maleSet, "Suth")) {
    return isOnly(femaleSet, "Suth");
  }

  // Rule 2: For risk items, female must have at least one of male's risk items
  const maleRisks = new Set([...maleSet].filter((item) => riskItems.has(item)));
  const femaleRisks = new Set(
    [...femaleSet].filter((item) => riskItems.has(item))
  );

  return intersects(maleRisks, femaleRisks);
}

// Initialize service
log.info('Rasi compatibility service initialized', {
  source: 'RasiCompatibilityService',
  availableFunctions: ['checkSingleCompatibility']
});

module.exports = {
  checkSingleCompatibility
};
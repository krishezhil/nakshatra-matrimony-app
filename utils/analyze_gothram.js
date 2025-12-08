#!/usr/bin/env node

/**
 * Gothram Data Analyzer
 * Checks for invalid entries in gothram.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const GOTHRAM_PATH = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'matrimony',
  'data',
  'gothram.json'
);

console.log('🔍 Gothram Data Analyzer');
console.log('=' .repeat(50));
console.log(`📂 Analyzing: ${GOTHRAM_PATH}`);
console.log('');

try {
  // Check if file exists
  if (!fs.existsSync(GOTHRAM_PATH)) {
    console.error('❌ Error: Gothram file not found!');
    console.error(`   Expected path: ${GOTHRAM_PATH}`);
    process.exit(1);
  }

  // Read and parse the data
  console.log('📖 Reading gothram data...');
  const fileContent = fs.readFileSync(GOTHRAM_PATH, 'utf8');
  const gothrams = JSON.parse(fileContent);

  if (!Array.isArray(gothrams)) {
    console.error('❌ Error: Gothram data is not an array!');
    console.error(`   Type: ${typeof gothrams}`);
    process.exit(1);
  }

  console.log(`✅ Successfully loaded ${gothrams.length} gothram entries`);
  console.log('');

  // === VALIDATE ENTRIES ===
  console.log('🔍 VALIDATING ENTRIES');
  console.log('-'.repeat(30));

  let validCount = 0;
  let invalidCount = 0;
  const invalidEntries = [];

  gothrams.forEach((gothram, index) => {
    const hasId = gothram && typeof gothram.id !== 'undefined' && gothram.id !== null && gothram.id !== '';
    const hasName = gothram && typeof gothram.name !== 'undefined' && gothram.name !== null && gothram.name !== '';

    if (!hasId || !hasName) {
      invalidCount++;
      invalidEntries.push({
        index,
        entry: gothram,
        issues: {
          missingId: !hasId,
          missingName: !hasName
        }
      });
    } else {
      validCount++;
    }
  });

  console.log(`✅ Valid entries: ${validCount}`);
  console.log(`❌ Invalid entries: ${invalidCount}`);
  console.log('');

  // === SHOW INVALID ENTRIES ===
  if (invalidEntries.length > 0) {
    console.log('❌ INVALID ENTRIES DETAILS');
    console.log('-'.repeat(30));

    invalidEntries.forEach((item) => {
      console.log(`Index ${item.index}:`);
      console.log(`  Entry: ${JSON.stringify(item.entry)}`);
      console.log(`  Issues:`);
      if (item.issues.missingId) {
        console.log(`    - Missing or empty id`);
      }
      if (item.issues.missingName) {
        console.log(`    - Missing or empty name`);
      }
      console.log('');
    });

    // === FOCUS ON INDEX 219 ===
    const problematicEntry = invalidEntries.find(item => item.index === 219);
    if (problematicEntry) {
      console.log('🎯 INDEX 219 ANALYSIS (The Error Location)');
      console.log('-'.repeat(40));
      console.log(`Entry: ${JSON.stringify(problematicEntry.entry, null, 2)}`);
      console.log(`Type: ${typeof problematicEntry.entry}`);
      
      if (problematicEntry.entry) {
        console.log('Properties:');
        Object.keys(problematicEntry.entry).forEach(key => {
          const value = problematicEntry.entry[key];
          console.log(`  ${key}: "${value}" (type: ${typeof value}, length: ${value ? value.length : 'N/A'})`);
        });
      }
      console.log('');
    } else {
      console.log('ℹ️  Index 219 appears to be valid (error might be elsewhere)');
      // Show entry at index 219 anyway
      if (gothrams[219]) {
        console.log('📋 ENTRY AT INDEX 219');
        console.log('-'.repeat(25));
        console.log(JSON.stringify(gothrams[219], null, 2));
      }
      console.log('');
    }
  }

  // === RECOMMENDATIONS ===
  console.log('💡 RECOMMENDATIONS');
  console.log('-'.repeat(20));
  
  if (invalidCount > 0) {
    console.log('🔧 Issues found that need fixing:');
    console.log(`1. Remove or fix ${invalidCount} invalid entries`);
    console.log('2. Ensure all entries have both "id" and "name" properties');
    console.log('3. Check for null, undefined, or empty string values');
    console.log('');
    console.log('🔧 Quick fix options:');
    console.log('1. Remove invalid entries from the JSON file');
    console.log('2. Add missing id/name values to incomplete entries');
  } else {
    console.log('✅ All gothram entries appear to be valid!');
    console.log('   The error might be caused by something else.');
  }

} catch (error) {
  console.error('❌ Error analyzing gothram data:', error.message);
  
  if (error instanceof SyntaxError) {
    console.error('   The JSON file appears to be corrupted or malformed.');
  }
  
  console.error('\n📋 Error Details:');
  console.error(error.stack);
  process.exit(1);
}

console.log('');
console.log('🏁 Analysis complete!');
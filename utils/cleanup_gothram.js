#!/usr/bin/env node

/**
 * Gothram Data Cleanup Script
 * Removes invalid entries and renumbers IDs sequentially
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

const BACKUP_PATH = GOTHRAM_PATH + '.backup.' + Date.now();

console.log('🔧 Gothram Data Cleanup Tool');
console.log('=' .repeat(50));
console.log(`📂 Source: ${GOTHRAM_PATH}`);
console.log(`💾 Backup: ${BACKUP_PATH}`);
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
    process.exit(1);
  }

  console.log(`✅ Successfully loaded ${gothrams.length} gothram entries`);

  // Create backup
  console.log('💾 Creating backup...');
  fs.writeFileSync(BACKUP_PATH, fileContent, 'utf8');
  console.log(`✅ Backup created: ${BACKUP_PATH}`);
  console.log('');

  // === FILTER VALID ENTRIES ===
  console.log('🔍 FILTERING VALID ENTRIES');
  console.log('-'.repeat(30));

  let validCount = 0;
  let invalidCount = 0;
  const invalidIndexes = [];

  const validGothrams = gothrams.filter((gothram, index) => {
    const hasId = gothram && typeof gothram.id !== 'undefined' && gothram.id !== null && gothram.id !== '';
    const hasName = gothram && typeof gothram.name !== 'undefined' && gothram.name !== null && gothram.name !== '';
    const hasValidName = hasName && gothram.name.trim() !== '';

    const isValid = hasId && hasValidName;

    if (!isValid) {
      invalidCount++;
      invalidIndexes.push(index);
      console.log(`❌ Removing index ${index}: ${JSON.stringify(gothram)}`);
    } else {
      validCount++;
    }

    return isValid;
  });

  console.log('');
  console.log(`✅ Valid entries: ${validCount}`);
  console.log(`❌ Invalid entries removed: ${invalidCount}`);
  console.log(`📊 Retention rate: ${((validCount / gothrams.length) * 100).toFixed(1)}%`);
  console.log('');

  // === RENUMBER IDs ===
  console.log('🔢 RENUMBERING IDs');
  console.log('-'.repeat(20));

  const cleanedGothrams = validGothrams.map((gothram, index) => {
    const newId = index + 1; // Start from 1
    const oldId = gothram.id;
    
    if (oldId !== newId) {
      console.log(`🔄 ID ${oldId} → ${newId}: "${gothram.name}"`);
    }
    
    return {
      ...gothram,
      id: newId
    };
  });

  console.log(`✅ Renumbered ${cleanedGothrams.length} entries (1 to ${cleanedGothrams.length})`);
  console.log('');

  // === PREVIEW RESULTS ===
  console.log('👀 PREVIEW OF CLEANED DATA');
  console.log('-'.repeat(30));
  
  console.log('First 5 entries:');
  cleanedGothrams.slice(0, 5).forEach(g => {
    console.log(`  ID ${g.id}: "${g.name}"`);
  });
  
  console.log('...');
  
  console.log('Last 5 entries:');
  cleanedGothrams.slice(-5).forEach(g => {
    console.log(`  ID ${g.id}: "${g.name}"`);
  });
  
  console.log('');

  // === SAVE CLEANED DATA ===
  console.log('💾 SAVING CLEANED DATA');
  console.log('-'.repeat(25));

  const cleanedContent = JSON.stringify(cleanedGothrams, null, 2);
  fs.writeFileSync(GOTHRAM_PATH, cleanedContent, 'utf8');

  console.log(`✅ Successfully saved ${cleanedGothrams.length} cleaned entries`);
  console.log(`📁 File: ${GOTHRAM_PATH}`);
  console.log('');

  // === SUMMARY ===
  console.log('📊 CLEANUP SUMMARY');
  console.log('-'.repeat(20));
  console.log(`Original entries: ${gothrams.length}`);
  console.log(`Valid entries: ${validCount}`);
  console.log(`Removed entries: ${invalidCount}`);
  console.log(`Final entries: ${cleanedGothrams.length}`);
  console.log(`ID range: 1 to ${cleanedGothrams.length}`);
  console.log('');

  if (invalidCount > 0) {
    console.log('🗑️  REMOVED ENTRIES');
    console.log('-'.repeat(18));
    console.log(`Indexes removed: ${invalidIndexes.join(', ')}`);
    console.log('');
  }

  console.log('🎉 SUCCESS!');
  console.log('-'.repeat(10));
  console.log('✅ Gothram data has been cleaned and renumbered');
  console.log('✅ Backup created for safety');
  console.log('✅ All entries now have valid id and name fields');
  console.log('✅ IDs are sequential from 1 to ' + cleanedGothrams.length);
  console.log('');
  console.log('🔄 Restart your application to see the changes take effect.');

} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
  console.error(error.stack);
  process.exit(1);
}

console.log('');
console.log('🏁 Cleanup complete!');
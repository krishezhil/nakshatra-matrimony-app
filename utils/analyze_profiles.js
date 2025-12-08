#!/usr/bin/env node

/**
 * Standalone Profile Data Analyzer
 * Identifies discrepancies in profile gender filtering
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const PROFILE_PATH = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'matrimony',
  'data',
  'profile.json'
);

console.log('🔍 Profile Data Analyzer');
console.log('=' .repeat(50));
console.log(`📂 Analyzing: ${PROFILE_PATH}`);
console.log('');

try {
  // Check if file exists
  if (!fs.existsSync(PROFILE_PATH)) {
    console.error('❌ Error: Profile file not found!');
    console.error(`   Expected path: ${PROFILE_PATH}`);
    process.exit(1);
  }

  // Read and parse the data
  console.log('📖 Reading profile data...');
  const fileContent = fs.readFileSync(PROFILE_PATH, 'utf8');
  const profiles = JSON.parse(fileContent);

  if (!Array.isArray(profiles)) {
    console.error('❌ Error: Profile data is not an array!');
    process.exit(1);
  }

  console.log(`✅ Successfully loaded ${profiles.length} profiles`);
  console.log('');

  // === BASIC STATISTICS ===
  console.log('📊 BASIC STATISTICS');
  console.log('-'.repeat(30));
  
  const totalProfiles = profiles.length;
  const maleProfiles = profiles.filter(p => p.gender === 'Male').length;
  const femaleProfiles = profiles.filter(p => p.gender === 'Female').length;
  
  console.log(`Total Profiles: ${totalProfiles}`);
  console.log(`Male Profiles (exact match): ${maleProfiles}`);
  console.log(`Female Profiles (exact match): ${femaleProfiles}`);
  console.log(`Accounted: ${maleProfiles + femaleProfiles}`);
  console.log(`Unaccounted: ${totalProfiles - (maleProfiles + femaleProfiles)}`);
  console.log('');

  // === GENDER FIELD ANALYSIS ===
  console.log('🔍 GENDER FIELD ANALYSIS');
  console.log('-'.repeat(30));

  // Find all unique gender values
  const genderValues = new Map();
  const noGenderField = [];
  const emptyGender = [];

  profiles.forEach((profile, index) => {
    if (!profile.hasOwnProperty('gender')) {
      noGenderField.push({ index, id: profile.id, name: profile.name });
    } else if (!profile.gender || profile.gender === '') {
      emptyGender.push({ index, id: profile.id, name: profile.name, gender: profile.gender });
    } else {
      const genderValue = profile.gender;
      if (genderValues.has(genderValue)) {
        genderValues.set(genderValue, genderValues.get(genderValue) + 1);
      } else {
        genderValues.set(genderValue, 1);
      }
    }
  });

  console.log('Unique Gender Values Found:');
  for (const [gender, count] of genderValues.entries()) {
    const isStandard = gender === 'Male' || gender === 'Female';
    console.log(`  "${gender}": ${count} ${isStandard ? '✅' : '⚠️'}`);
  }

  if (noGenderField.length > 0) {
    console.log(`\n❌ Profiles missing gender field: ${noGenderField.length}`);
    noGenderField.slice(0, 5).forEach(p => {
      console.log(`  - Index ${p.index}: ID=${p.id}, Name="${p.name}"`);
    });
    if (noGenderField.length > 5) {
      console.log(`  ... and ${noGenderField.length - 5} more`);
    }
  }

  if (emptyGender.length > 0) {
    console.log(`\n❌ Profiles with empty gender: ${emptyGender.length}`);
    emptyGender.slice(0, 5).forEach(p => {
      console.log(`  - Index ${p.index}: ID=${p.id}, Name="${p.name}", Gender="${p.gender}"`);
    });
    if (emptyGender.length > 5) {
      console.log(`  ... and ${emptyGender.length - 5} more`);
    }
  }

  console.log('');

  // === MALE PROFILES DETAILED ANALYSIS ===
  console.log('👨 MALE PROFILES ANALYSIS');
  console.log('-'.repeat(30));

  // Find all profiles that could be considered "Male"
  const exactMales = profiles.filter(p => p.gender === 'Male');
  const caseMales = profiles.filter(p => p.gender && p.gender.toLowerCase() === 'male');
  const trimmedMales = profiles.filter(p => p.gender && p.gender.trim() === 'Male');
  const allPossibleMales = profiles.filter(p => 
    p.gender && p.gender.toString().trim().toLowerCase() === 'male'
  );

  console.log(`Exact "Male": ${exactMales.length}`);
  console.log(`Case-insensitive "male": ${caseMales.length}`);
  console.log(`Trimmed "Male": ${trimmedMales.length}`);
  console.log(`All possible males: ${allPossibleMales.length}`);

  // Find the problematic ones
  const problematicMales = profiles.filter(p => {
    if (!p.gender) return false;
    const normalized = p.gender.toString().trim().toLowerCase();
    return normalized === 'male' && p.gender !== 'Male';
  });

  if (problematicMales.length > 0) {
    console.log(`\n⚠️  Problematic male profiles: ${problematicMales.length}`);
    problematicMales.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i+1}. ID=${p.id}, Name="${p.name}", Gender="${p.gender}" (length: ${p.gender.length})`);
    });
    if (problematicMales.length > 10) {
      console.log(`  ... and ${problematicMales.length - 10} more`);
    }
  }

  console.log('');

  // === SIMULATION: API FILTER BEHAVIOR ===
  console.log('🔬 SIMULATING API FILTER BEHAVIOR');
  console.log('-'.repeat(40));

  // Simulate the current filter logic from the API
  function simulateCurrentFilter(profiles, targetGender) {
    if (!targetGender || targetGender.trim() === '') {
      return profiles;
    }

    if (!['Male', 'Female'].includes(targetGender)) {
      console.log(`⚠️  Invalid gender value: "${targetGender}"`);
      return profiles;
    }

    return profiles.filter(p => p.gender === targetGender);
  }

  // Simulate improved filter logic
  function simulateImprovedFilter(profiles, targetGender) {
    if (!targetGender || targetGender.trim() === '') {
      return profiles;
    }

    const normalizedTarget = targetGender.trim().toLowerCase();
    if (!['male', 'female'].includes(normalizedTarget)) {
      console.log(`⚠️  Invalid gender value: "${targetGender}"`);
      return profiles;
    }

    return profiles.filter(p => 
      p.gender && p.gender.toString().trim().toLowerCase() === normalizedTarget
    );
  }

  const currentMaleFilter = simulateCurrentFilter(profiles, 'Male');
  const improvedMaleFilter = simulateImprovedFilter(profiles, 'Male');

  console.log(`Current filter result (Male): ${currentMaleFilter.length}`);
  console.log(`Improved filter result (Male): ${improvedMaleFilter.length}`);
  console.log(`Difference: ${improvedMaleFilter.length - currentMaleFilter.length} more profiles found`);

  console.log('');

  // === MISSING PROFILES ANALYSIS ===
  if (improvedMaleFilter.length > currentMaleFilter.length) {
    console.log('🔍 MISSING PROFILES DETAILS');
    console.log('-'.repeat(30));

    const currentIds = new Set(currentMaleFilter.map(p => p.id));
    const missingProfiles = improvedMaleFilter.filter(p => !currentIds.has(p.id));

    console.log(`Missing profiles: ${missingProfiles.length}`);
    missingProfiles.forEach((p, i) => {
      const genderBytes = Array.from(p.gender).map(c => c.charCodeAt(0)).join(',');
      console.log(`  ${i+1}. ID=${p.id}, Name="${p.name}"`);
      console.log(`      Gender: "${p.gender}" (length: ${p.gender.length})`);
      console.log(`      Bytes: [${genderBytes}]`);
      
      // Check for invisible characters
      const hasInvisible = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/.test(p.gender);
      if (hasInvisible) {
        console.log(`      ⚠️  Contains invisible characters!`);
      }
      
      console.log('');
    });
  }

  // === RECOMMENDATIONS ===
  console.log('💡 RECOMMENDATIONS');
  console.log('-'.repeat(20));
  
  if (improvedMaleFilter.length > currentMaleFilter.length) {
    console.log('✅ Issue identified: Gender field contains non-standard values');
    console.log('');
    console.log('🔧 Recommended fixes:');
    console.log('1. Update filter logic to handle case insensitivity and whitespace');
    console.log('2. Clean up data to use standard "Male"/"Female" values');
    console.log('3. Add data validation during profile creation');
    console.log('');
    console.log('🔧 Filter logic improvement:');
    console.log('   Change: p.gender === targetGender');
    console.log('   To: p.gender && p.gender.trim().toLowerCase() === targetGender.toLowerCase()');
  } else {
    console.log('🤔 No obvious gender filtering issues found.');
    console.log('   The missing profiles might be due to other factors.');
  }

} catch (error) {
  console.error('❌ Error analyzing profiles:', error.message);
  console.error(error.stack);
  process.exit(1);
}

console.log('');
console.log('🏁 Analysis complete!');
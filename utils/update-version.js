#!/usr/bin/env node
/**
 * Version Update Script
 * Updates all version references across the application
 * Run this script after changing the version in utils/version.js
 */

const fs = require('fs');
const path = require('path');
const { VERSION, APP_NAME, RELEASE_DATE, getVersionInfo } = require('./version');

console.log('🔧 Updating application version references...');
console.log(`📝 Target Version: ${VERSION}`);
console.log(`📅 Release Date: ${RELEASE_DATE}`);
console.log('');

const versionInfo = getVersionInfo();

// Files to update with their patterns
const filesToUpdate = [
  {
    file: 'package.json',
    updates: [
      {
        pattern: /"version":\s*"[^"]+"/,
        replacement: `"version": "${VERSION}"`
      }
    ]
  },
  {
    file: '.env',
    updates: [
      {
        pattern: /APP_VERSION=.*/,
        replacement: `APP_VERSION=${VERSION}`
      }
    ]
  },

  {
    file: 'utils/config.js',
    updates: [
      {
        pattern: /version: '[0-9.]+'/,
        replacement: `version: '${VERSION}'`
      }
    ]
  }
];

let updatesCount = 0;
let errorsCount = 0;

// Process each file
filesToUpdate.forEach(({ file, updates }) => {
  const filePath = file.startsWith('utils/') 
    ? path.join(__dirname, file.replace('utils/', ''))
    : path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    errorsCount++;
    return;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileUpdated = false;
    
    updates.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        fileUpdated = true;
        updatesCount++;
      }
    });
    
    if (fileUpdated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${file}`);
    } else {
      console.log(`📝 No changes: ${file}`);
    }
    
  } catch (error) {
    console.log(`❌ Error updating ${file}: ${error.message}`);
    errorsCount++;
  }
});

// Update package-lock.json version references
try {
  const packageLockPath = path.join(__dirname, '..', 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    let packageLock = fs.readFileSync(packageLockPath, 'utf8');
    const versionPattern = /"version":\s*"1\.[0-9]+\.[0-9]+"/g;
    const matches = packageLock.match(versionPattern);
    
    if (matches) {
      packageLock = packageLock.replace(versionPattern, `"version": "${VERSION}"`);
      fs.writeFileSync(packageLockPath, packageLock, 'utf8');
      console.log(`✅ Updated: package-lock.json (${matches.length} references)`);
      updatesCount += matches.length;
    }
  }
} catch (error) {
  console.log(`❌ Error updating package-lock.json: ${error.message}`);
  errorsCount++;
}

console.log('');
console.log('📊 Update Summary:');
console.log(`✅ Successful updates: ${updatesCount}`);
console.log(`❌ Errors: ${errorsCount}`);
console.log('');

if (errorsCount === 0) {
  console.log('🎉 All version references updated successfully!');
  console.log(`📦 Ready to build version ${VERSION}`);
} else {
  console.log('⚠️  Some updates failed. Please check the errors above.');
}

console.log('');
console.log('📋 Next Steps:');
console.log('1. Review the changes');
console.log('2. Run: npx pkg . --target node18-win-x64 --output dist/nakshatra-matrimony-win64.exe');
console.log('3. Test the application');
console.log('4. Deploy to clients');
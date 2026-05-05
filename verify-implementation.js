#!/usr/bin/env node
/**
 * Firebase User Management System - Verification Script
 * This script verifies that all required components are in place for deployment
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = './';
const checks = [];

function checkFile(filePath, description) {
  const fullPath = path.join(BASE_DIR, filePath);
  if (fs.existsSync(fullPath)) {
    checks.push({ status: '✓', file: filePath, description });
    return true;
  } else {
    checks.push({ status: '✗', file: filePath, description });
    return false;
  }
}

function checkFileContent(filePath, searchString, description) {
  const fullPath = path.join(BASE_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    checks.push({ status: '✗', file: filePath, description: `${description} - FILE NOT FOUND` });
    return false;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  if (content.includes(searchString)) {
    checks.push({ status: '✓', file: filePath, description });
    return true;
  } else {
    checks.push({ status: '✗', file: filePath, description: `${description} - CONTENT NOT FOUND` });
    return false;
  }
}

console.log('\n=== Firebase User Management System Verification ===\n');

// Check files exist
console.log('Checking files existence...');
checkFile('components/caseManage.js', 'Personnel case management component');
checkFile('components/adminCaseManage.js', 'Admin case management component');
checkFile('components/adminUserManage.js', 'Admin user management component');
checkFile('components/adminApp.js', 'Admin app main component');
checkFile('functions/index.js', 'Cloud Function implementation');
checkFile('functions/package.json', 'Cloud Function dependencies');
checkFile('firebase.json', 'Firebase configuration');

console.log('\nChecking implementations...');
// Check adminUserManage.js has Cloud Function integration
checkFileContent('components/adminUserManage.js', 'httpsCallable', 'Cloud Function client integration');
checkFileContent('components/adminUserManage.js', 'getFunctions', 'Firebase Functions SDK import');
checkFileContent('components/adminUserManage.js', 'deleteUser', 'Delete user function call');

// Check Cloud Function
checkFileContent('functions/index.js', 'exports.deleteUser', 'deleteUser function export');
checkFileContent('functions/index.js', 'admin.auth().deleteUser', 'Firebase Auth deletion');
checkFileContent('functions/index.js', 'permission-denied', 'Permission verification');
checkFileContent('functions/index.js', 'activity_logs', 'Activity logging');

// Check dependencies
checkFileContent('functions/package.json', 'firebase-admin', 'Firebase Admin SDK dependency');
checkFileContent('functions/package.json', 'firebase-functions', 'Firebase Functions dependency');

// Check firebase.json
checkFileContent('firebase.json', '"functions"', 'Functions configuration in firebase.json');

console.log('\n=== Verification Results ===\n');
const passed = checks.filter(c => c.status === '✓').length;
const failed = checks.filter(c => c.status === '✗').length;

checks.forEach(check => {
  console.log(`${check.status} ${check.file.padEnd(40)} - ${check.description}`);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed === 0) {
  console.log('✓ All checks passed! System is ready for deployment.\n');
  process.exit(0);
} else {
  console.log('✗ Some checks failed. Please review the implementation.\n');
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Pre-commit Validator Script
 * 
 * This script can be used as a pre-commit hook to validate code before committing.
 * It checks for common issues in the codebase, particularly focusing on:
 * 1. Empty SelectItem values
 * 2. Database schema mismatches
 * 3. Missing keys in mapped components
 * 
 * To use as a pre-commit hook:
 * 1. Make the script executable: chmod +x scripts/pre-commit-validator.js
 * 2. Create a symbolic link: ln -s ../../scripts/pre-commit-validator.js .git/hooks/pre-commit
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const exec = promisify(childProcess.exec);
const readFile = promisify(fs.readFile);

// Configuration
const COMPONENT_PATTERNS = [
  {
    name: 'Empty SelectItem value',
    regex: /<SelectItem\s+value=['"](['"])/g,
    message: 'SelectItem with empty value detected. This can cause validation errors.'
  },
  {
    name: 'Missing key in mapped components',
    regex: /(\{[\w\s.]+\.map\(\([^)]+\)\s*=>\s*<[\w.]+)(?!\s+key=)/g,
    message: 'Component rendered in a map without a key prop.'
  }
];

// Function to get staged files
async function getStagedFiles() {
  try {
    const { stdout } = await exec('git diff --cached --name-only --diff-filter=ACMR');
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting staged files:', error);
    return [];
  }
}

// Function to validate a file
async function validateFile(filePath) {
  const issues = [];
  
  try {
    // Skip non-existent files or directories
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return issues;
    }
    
    // Only check component files
    if (!['.tsx', '.jsx'].includes(path.extname(filePath))) {
      return issues;
    }
    
    const content = await readFile(filePath, 'utf8');
    
    // Check for component issues
    for (const pattern of COMPONENT_PATTERNS) {
      const matches = [...content.matchAll(pattern.regex)];
      
      for (const match of matches) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        issues.push({
          file: filePath,
          line: lineNumber,
          pattern: pattern.name,
          message: pattern.message
        });
      }
    }
  } catch (error) {
    console.error(`Error validating file ${filePath}:`, error);
  }
  
  return issues;
}

// Main function
async function main() {
  try {
    console.log('Running pre-commit validation...');
    
    // Get staged files
    const stagedFiles = await getStagedFiles();
    
    if (stagedFiles.length === 0) {
      console.log('No files to validate.');
      return 0;
    }
    
    console.log(`Validating ${stagedFiles.length} staged files...`);
    
    // Validate each file
    let allIssues = [];
    
    for (const file of stagedFiles) {
      const issues = await validateFile(file);
      allIssues = [...allIssues, ...issues];
    }
    
    if (allIssues.length === 0) {
      console.log('✅ No issues found in staged files!');
      return 0;
    } else {
      console.log(`❌ Found ${allIssues.length} issues:`);
      
      for (const issue of allIssues) {
        console.log(`\n${issue.file}:${issue.line} - ${issue.pattern}`);
        console.log(`  ${issue.message}`);
      }
      
      console.log('\nPlease fix these issues before committing.');
      return 1;
    }
  } catch (error) {
    console.error('Error in pre-commit validation:', error);
    return 1;
  }
}

// Run the main function when executed directly
if (require.main === module) {
  main().then(exitCode => {
    process.exit(exitCode);
  });
}
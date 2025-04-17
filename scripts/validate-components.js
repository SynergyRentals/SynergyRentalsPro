/**
 * Component Validator Script
 * 
 * This script scans React component files to identify potential issues,
 * particularly focusing on common problems like empty SelectItem values.
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// Configuration
const COMPONENTS_DIR = path.join(process.cwd(), 'client/src/components');
const PATTERNS = [
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

// Function to check if a path is a directory
async function isDirectory(filePath) {
  try {
    const stats = await stat(filePath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

// Function to get all files in a directory recursively
async function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = await readdir(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    
    if (await isDirectory(filePath)) {
      arrayOfFiles = await getAllFiles(filePath, arrayOfFiles);
    } else if (
      filePath.endsWith('.tsx') || 
      filePath.endsWith('.jsx') || 
      filePath.endsWith('.ts') || 
      filePath.endsWith('.js')
    ) {
      arrayOfFiles.push(filePath);
    }
  }
  
  return arrayOfFiles;
}

// Function to scan a file for patterns
async function scanFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const issues = [];
    
    for (const pattern of PATTERNS) {
      const matches = [...content.matchAll(pattern.regex)];
      
      for (const match of matches) {
        issues.push({
          file: path.relative(process.cwd(), filePath),
          line: getLineNumber(content, match.index),
          pattern: pattern.name,
          message: pattern.message,
          snippet: getSnippet(content, match.index)
        });
      }
    }
    
    return issues;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
    return [];
  }
}

// Function to get the line number from a position in the content
function getLineNumber(content, position) {
  const lines = content.slice(0, position).split('\n');
  return lines.length;
}

// Function to get a code snippet around the issue
function getSnippet(content, position) {
  const lines = content.split('\n');
  const lineNumber = getLineNumber(content, position);
  
  // Get 2 lines before and after for context
  const startLine = Math.max(0, lineNumber - 3);
  const endLine = Math.min(lines.length - 1, lineNumber + 2);
  
  return lines.slice(startLine, endLine + 1)
    .map((line, index) => `${startLine + index + 1}: ${line}`)
    .join('\n');
}

// Main function
async function main() {
  try {
    console.log('Scanning component files for potential issues...');
    
    const files = await getAllFiles(COMPONENTS_DIR);
    console.log(`Found ${files.length} files to scan.`);
    
    let allIssues = [];
    
    for (const file of files) {
      const issues = await scanFile(file);
      allIssues = [...allIssues, ...issues];
    }
    
    if (allIssues.length === 0) {
      console.log('✅ No issues found in component files!');
    } else {
      console.log(`❌ Found ${allIssues.length} potential issues:`);
      
      for (const issue of allIssues) {
        console.log(`\nFile: ${issue.file} (Line ${issue.line})`);
        console.log(`Issue: ${issue.pattern}`);
        console.log(`Message: ${issue.message}`);
        console.log('Code Snippet:');
        console.log(issue.snippet);
        console.log('-'.repeat(80));
      }
      
      console.log('\nPlease review these issues to prevent potential bugs.');
    }
  } catch (error) {
    console.error('Error scanning component files:', error);
  }
}

main();
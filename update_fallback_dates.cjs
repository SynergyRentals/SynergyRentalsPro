const fs = require('fs');

// Read the routes.ts file
const filePath = 'server/routes.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Perform the replacement for all instances of the fallback date pattern
const oldPattern = /\/\/ Fallback to current date and next day if date processing fails\s+startDate = new Date\(\);\s+endDate = new Date\(startDate\);\s+endDate\.setDate\(endDate\.getDate\(\) \+ 1\);\s+checkoutDate = new Date\(startDate\);/g;
const newReplacement = `// Use standardized fallback date utility for consistent error handling
              const fallbackDates = createFallbackDates();
              startDate = fallbackDates.start;
              endDate = fallbackDates.end;
              checkoutDate = fallbackDates.checkout;`;

// Replace all occurrences
const updatedContent = content.replace(oldPattern, newReplacement);

// Write the updated content back to the file
fs.writeFileSync(filePath, updatedContent, 'utf8');

console.log('File updated successfully');

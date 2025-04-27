const fs = require('fs');
const path = require('path');

// Check if python-embedded exists
const pythonEmbeddedDir = path.join(__dirname, 'python-embedded');
if (!fs.existsSync(pythonEmbeddedDir)) {
  console.error('python-embedded directory does not exist!');
  process.exit(1);
}

// List contents
console.log('python-embedded directory exists with the following contents:');
fs.readdirSync(pythonEmbeddedDir).forEach(file => {
  console.log(`- ${file}`);
});

console.log('\nReady to build!'); 
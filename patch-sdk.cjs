const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'node_modules', '@midnight-ntwrk', 'compact-runtime', 'dist', 'circuit-context.js');

try {
  let content = fs.readFileSync(target, 'utf8');
  content = content.replace('else if (contractState instanceof ocrt.ContractState)', 'else if (contractState && contractState.data)');
  fs.writeFileSync(target, content);
  console.log('Successfully patched @midnight-ntwrk/compact-runtime circuit-context.js');
} catch (e) {
  console.error('Failed to patch compact-runtime:', e.message);
}

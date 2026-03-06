const fs = require('fs');
let code = fs.readFileSync('client/src/components/PostCard.jsx', 'utf8');

const anchor1 = '    const match = url.match(regExp)';
const anchor2 = '  return (match && match[2].length === 11) ? match[2] : null';

const startIdx = code.indexOf(anchor1) + anchor1.length;
const endIdx = code.indexOf(anchor2);

code = code.substring(0, startIdx) + '\n  ' + code.substring(endIdx);

fs.writeFileSync('client/src/components/PostCard.jsx', code);
console.log("Fixed the injected mess at the top");

const fs = require('fs');
const path = require('path');

const dir = 'client/src';
const walk = (d) => {
  let results = [];
  const list = fs.readdirSync(d);
  list.forEach(file => {
    file = path.join(d, file);
    if (fs.statSync(file).isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk(dir);

let changedFiles = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let originalContent = content;
  
  // Clean up `-solid -icon` artifacts from our first regex run
  content = content.replace(/-solid -[a-z\-]+/g, '');
  content = content.replace(/-regular -[a-z\-]+/g, '');
  
  if (content !== originalContent) {
    fs.writeFileSync(f, content, 'utf8');
    changedFiles++;
  }
});
console.log('Fixed artifacts in ' + changedFiles + ' files');

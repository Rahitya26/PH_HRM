const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInDir(filePath);
    } else if (filePath.endsWith('.jsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('http://localhost:5000')) {
        content = content.replace(/http:\/\/localhost:5000/g, '');
        fs.writeFileSync(filePath, content);
        console.log('Updated', filePath);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'client', 'src'));
console.log('Finished updating URLs');

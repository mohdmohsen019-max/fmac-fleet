const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, '../src/components'), (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace class names like mr-2, ml-4, pl-2, pr-4, mr-auto, ml-auto
    content = content.replace(/(["'`\s]|className={[^{}]*?["'`])mr-([a-zA-Z0-9.]+)(["'`\s}])/g, '$1me-$2$3');
    content = content.replace(/(["'`\s]|className={[^{}]*?["'`])ml-([a-zA-Z0-9.]+)(["'`\s}])/g, '$1ms-$2$3');
    content = content.replace(/(["'`\s]|className={[^{}]*?["'`])pr-([a-zA-Z0-9.]+)(["'`\s}])/g, '$1pe-$2$3');
    content = content.replace(/(["'`\s]|className={[^{}]*?["'`])pl-([a-zA-Z0-9.]+)(["'`\s}])/g, '$1ps-$2$3');
    content = content.replace(/(["'`\s]|className={[^{}]*?["'`])left-([a-zA-Z0-9.]+)(["'`\s}])/g, '$1start-$2$3');
    content = content.replace(/(["'`\s]|className={[^{}]*?["'`])right-([a-zA-Z0-9.]+)(["'`\s}])/g, '$1end-$2$3');
    content = content.replace(/(["'`\s]|className={[^{}]*?["'`])text-left(["'`\s}])/g, '$1text-start$2');
    content = content.replace(/(["'`\s]|className={[^{}]*?["'`])text-right(["'`\s}])/g, '$1text-end$2');

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
